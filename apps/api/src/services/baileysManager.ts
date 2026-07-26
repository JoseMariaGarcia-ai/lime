import fs from 'fs'
import path from 'path'
import QRCode from 'qrcode'
import { query } from '../lib/db'
import { findClientIdByPhone, recordInboundMessage } from '../lib/whatsappCore'

// Gestor de la sesión de Baileys (WhatsApp Web no oficial) — ÚNICA para
// toda la cuenta de Lime (no una por cliente): Lime opera un solo WhatsApp
// propio para hablar con los contactos de todos sus clientes, elegido en
// Configuración de cuenta (account_settings.whatsapp_provider).
//
// ⚠️ Las credenciales de sesión (useMultiFileAuthState) se guardan en disco
// bajo data/baileys/account/ — en Railway hace falta un volumen persistente
// en esa ruta o la sesión se pierde en cada redeploy (ver README.md).
let currentSocket: any = null

async function loadBaileys() {
  return await import('@whiskeysockets/baileys')
}

function dataDir(): string {
  const dir = path.resolve(__dirname, '../../data/baileys/account')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

async function upsertConnectionStatus(
  status: 'desconectado' | 'conectando' | 'conectado' | 'error', qrCode: string | null, lastError: string | null
) {
  await query(
    `INSERT INTO whatsapp_connections (provider, status, qr_code, last_error)
     VALUES ('baileys',$1,$2,$3)
     ON CONFLICT (provider) DO UPDATE SET
       status = $1, qr_code = $2, last_error = $3, updated_at = NOW()`,
    [status, qrCode, lastError]
  )
}

export function isConnected(): boolean {
  return !!currentSocket
}

export async function connectAccountBaileys(): Promise<void> {
  if (currentSocket) return

  const baileys = await loadBaileys()
  const makeWASocket = baileys.default
  const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = baileys

  const dir = dataDir()
  const { state, saveCreds } = await useMultiFileAuthState(dir)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    browser: ['Lime AI Studio', 'Chrome', '1.0.0'],
  })
  currentSocket = sock
  await upsertConnectionStatus('conectando', null, null)

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (update: any) => {
    const { connection, lastDisconnect, qr } = update
    if (qr) {
      const qrDataUrl = await QRCode.toDataURL(qr)
      await upsertConnectionStatus('conectando', qrDataUrl, null)
    }
    if (connection === 'open') {
      await upsertConnectionStatus('conectado', null, null)
    }
    if (connection === 'close') {
      currentSocket = null
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode
      const loggedOut = statusCode === DisconnectReason.loggedOut
      if (loggedOut) {
        fs.rmSync(dir, { recursive: true, force: true })
        await upsertConnectionStatus('desconectado', null, null)
      } else {
        await upsertConnectionStatus('error', null, 'Conexión perdida — reintentando automáticamente')
        connectAccountBaileys().catch(err =>
          console.error('[baileys] fallo al reconectar:', err.message))
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
        const clientId = await findClientIdByPhone(phone)
        await recordInboundMessage(clientId, phone, text, 'baileys', msg.key.id ?? null)
      } catch (err: any) {
        console.error('[baileys] fallo procesando mensaje entrante:', err.message)
      }
    }
  })
}

export async function disconnectAccountBaileys(): Promise<void> {
  if (currentSocket) {
    try { await currentSocket.logout() } catch { /* ya podía estar desconectado */ }
    currentSocket = null
  }
  fs.rmSync(dataDir(), { recursive: true, force: true })
  await upsertConnectionStatus('desconectado', null, null)
}

export async function sendViaBaileys(phone: string, body: string): Promise<string | null> {
  if (!currentSocket) throw new Error('WhatsApp (Baileys) no está conectado — escanea el QR en Configuración primero')
  const jid = phone.includes('@') ? phone : `${phone.replace(/\D/g, '')}@s.whatsapp.net`
  const result = await currentSocket.sendMessage(jid, { text: body })
  return result?.key?.id ?? null
}
