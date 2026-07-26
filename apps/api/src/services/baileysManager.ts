import fs from 'fs'
import path from 'path'
import QRCode from 'qrcode'
import { query } from '../lib/db'
import { recordInboundMessage } from '../lib/whatsappCore'

// Gestor de sesiones de Baileys (WhatsApp Web no oficial) — una conexión por
// cliente, guardada en memoria de este proceso (Map) y reflejada en la tabla
// whatsapp_connections para que el frontend pueda consultar el estado/QR sin
// mantener un socket abierto.
//
// ⚠️ Las credenciales de sesión (useMultiFileAuthState) se guardan en disco
// bajo data/baileys/<clientId>/ — en Railway hace falta un volumen
// persistente en esa ruta o la sesión se pierde en cada redeploy (ver
// README.md de este proyecto).
const sockets = new Map<string, any>()

// Import dinámico: @whiskeysockets/baileys es CommonJS con muchas
// dependencias nativas opcionales — cargarlo perezosamente evita que un
// fallo de una dependencia opcional (p.ej. audio) tumbe el arranque de todo
// el backend si el módulo de WhatsApp no llega a usarse todavía.
async function loadBaileys() {
  return await import('@whiskeysockets/baileys')
}

function dataDir(clientId: string): string {
  const dir = path.resolve(__dirname, '../../data/baileys', clientId)
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

async function upsertConnectionStatus(
  clientId: string, status: 'desconectado' | 'conectando' | 'conectado' | 'error', qrCode: string | null, lastError: string | null
) {
  await query(
    `INSERT INTO whatsapp_connections (client_id, provider, status, qr_code, last_error)
     VALUES ($1,'baileys',$2,$3,$4)
     ON CONFLICT (client_id, provider) DO UPDATE SET
       status = $2, qr_code = $3, last_error = $4, updated_at = NOW()`,
    [clientId, status, qrCode, lastError]
  )
}

export function isConnected(clientId: string): boolean {
  return sockets.has(clientId)
}

export async function connectClientBaileys(clientId: string): Promise<void> {
  if (sockets.has(clientId)) return

  const baileys = await loadBaileys()
  const makeWASocket = baileys.default
  const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = baileys

  const dir = dataDir(clientId)
  const { state, saveCreds } = await useMultiFileAuthState(dir)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    browser: ['Lime AI Studio', 'Chrome', '1.0.0'],
  })
  sockets.set(clientId, sock)
  await upsertConnectionStatus(clientId, 'conectando', null, null)

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (update: any) => {
    const { connection, lastDisconnect, qr } = update
    if (qr) {
      const qrDataUrl = await QRCode.toDataURL(qr)
      await upsertConnectionStatus(clientId, 'conectando', qrDataUrl, null)
    }
    if (connection === 'open') {
      await upsertConnectionStatus(clientId, 'conectado', null, null)
    }
    if (connection === 'close') {
      sockets.delete(clientId)
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode
      const loggedOut = statusCode === DisconnectReason.loggedOut
      if (loggedOut) {
        fs.rmSync(dir, { recursive: true, force: true })
        await upsertConnectionStatus(clientId, 'desconectado', null, null)
      } else {
        await upsertConnectionStatus(clientId, 'error', null, 'Conexión perdida — reintentando automáticamente')
        connectClientBaileys(clientId).catch(err =>
          console.error(`[baileys] fallo al reconectar cliente ${clientId}:`, err.message))
      }
    }
  })

  sock.ev.on('messages.upsert', async ({ messages, type }: any) => {
    if (type !== 'notify') return
    for (const msg of messages) {
      try {
        if (!msg.message || msg.key.fromMe) continue
        const remoteJid: string = msg.key.remoteJid ?? ''
        if (remoteJid.endsWith('@g.us')) continue // ignora mensajes de grupo
        const phone = remoteJid.split('@')[0]
        if (!phone) continue
        const text =
          msg.message.conversation ??
          msg.message.extendedTextMessage?.text ??
          msg.message.imageMessage?.caption ??
          msg.message.videoMessage?.caption ?? ''
        if (!text) continue
        await recordInboundMessage(clientId, phone, text, 'baileys', msg.key.id ?? null)
      } catch (err: any) {
        console.error(`[baileys] fallo procesando mensaje entrante de cliente ${clientId}:`, err.message)
      }
    }
  })
}

export async function disconnectClientBaileys(clientId: string): Promise<void> {
  const sock = sockets.get(clientId)
  if (sock) {
    try { await sock.logout() } catch { /* ya podía estar desconectado */ }
    sockets.delete(clientId)
  }
  fs.rmSync(dataDir(clientId), { recursive: true, force: true })
  await upsertConnectionStatus(clientId, 'desconectado', null, null)
}

export async function sendViaBaileys(clientId: string, phone: string, body: string): Promise<string | null> {
  const sock = sockets.get(clientId)
  if (!sock) throw new Error('Este cliente no tiene una sesión de Baileys conectada — escanea el QR en WhatsApp primero')
  const jid = phone.includes('@') ? phone : `${phone.replace(/\D/g, '')}@s.whatsapp.net`
  const result = await sock.sendMessage(jid, { text: body })
  return result?.key?.id ?? null
}
