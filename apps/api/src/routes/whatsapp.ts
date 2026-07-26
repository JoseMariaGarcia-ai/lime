import { Router } from 'express'
import { query, queryOne } from '../lib/db'
import { decryptSecret } from '../lib/crypto'
import { sendViaYCloud } from '../lib/ycloud'
import { recordInboundMessage, recordOutboundMessage, ensureConversation } from '../lib/whatsappCore'
import { connectClientBaileys, disconnectClientBaileys, sendViaBaileys } from '../services/baileysManager'

const router = Router()
export const webhookRouter = Router()

// GET /api/whatsapp/clients — clientes con su total de mensajes sin leer,
// para el selector del panel.
router.get('/clients', async (_req, res) => {
  try {
    const data = await query(
      `SELECT c.id, c.nombre, c.empresa, c.whatsapp_provider,
         COALESCE((SELECT SUM(wc.unread_count) FROM whatsapp_conversations wc WHERE wc.client_id = c.id), 0) AS unread
       FROM clients c ORDER BY c.nombre`
    )
    return res.json(data)
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

router.get('/conversations', async (req, res) => {
  try {
    const { clientId } = req.query
    if (!clientId) return res.status(400).json({ error: 'clientId es requerido' })
    const data = await query(
      'SELECT * FROM whatsapp_conversations WHERE client_id = $1 ORDER BY last_message_at DESC NULLS LAST',
      [clientId]
    )
    return res.json(data)
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

router.get('/conversations/:id/messages', async (req, res) => {
  try {
    const data = await query(
      'SELECT * FROM whatsapp_messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [req.params.id]
    )
    await query('UPDATE whatsapp_conversations SET unread_count = 0 WHERE id = $1', [req.params.id])
    return res.json(data)
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

// GET /api/whatsapp/connections/:clientId — estado de YCloud (configurado o
// no) y de Baileys (desconectado/conectando con QR/conectado) para un cliente.
router.get('/connections/:clientId', async (req, res) => {
  try {
    const client = await queryOne<any>('SELECT * FROM clients WHERE id = $1', [req.params.clientId])
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' })
    const baileysConn = await queryOne(
      `SELECT status, qr_code, last_error, updated_at FROM whatsapp_connections WHERE client_id = $1 AND provider = 'baileys'`,
      [req.params.clientId]
    )
    const ycloudConfigured = !!(client.ycloud_api_key_enc && client.ycloud_wa_number)
    return res.json({
      provider: client.whatsapp_provider,
      ycloud: { configured: ycloudConfigured },
      baileys: baileysConn ?? { status: 'desconectado', qr_code: null, last_error: null },
    })
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

router.post('/connections/:clientId/baileys/connect', async (req, res) => {
  try {
    connectClientBaileys(req.params.clientId).catch(err =>
      console.error(`[whatsapp] fallo iniciando Baileys para cliente ${req.params.clientId}:`, err.message))
    return res.status(202).json({ ok: true, message: 'Conectando — consulta el QR en unos segundos' })
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

router.post('/connections/:clientId/baileys/disconnect', async (req, res) => {
  try {
    await disconnectClientBaileys(req.params.clientId)
    return res.json({ ok: true })
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

// POST /api/whatsapp/send — { clientId, phone, body, contactName? }
router.post('/send', async (req, res) => {
  try {
    const { clientId, phone, body, contactName } = req.body
    if (!clientId || !phone || !body) return res.status(400).json({ error: 'clientId, phone y body son requeridos' })

    const client = await queryOne<any>('SELECT * FROM clients WHERE id = $1', [clientId])
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' })

    const conversationId = await ensureConversation(clientId, phone, client.whatsapp_provider, contactName ?? null)

    try {
      let providerMessageId: string | null = null
      if (client.whatsapp_provider === 'baileys') {
        providerMessageId = await sendViaBaileys(clientId, phone, body)
      } else {
        const apiKey = decryptSecret(client.ycloud_api_key_enc)
        const waNumber = client.ycloud_wa_number
        if (!apiKey || !waNumber) {
          return res.status(400).json({ error: 'Este cliente no tiene configurado YCloud (clave de API y número) en su ficha' })
        }
        providerMessageId = await sendViaYCloud(apiKey, waNumber, phone, body)
      }
      const message = await recordOutboundMessage(conversationId, body, 'sent', providerMessageId)
      return res.status(201).json(message)
    } catch (sendErr: any) {
      const message = await recordOutboundMessage(conversationId, body, 'failed', null)
      return res.status(502).json({ error: `Fallo al enviar el mensaje: ${sendErr.message}`, message })
    }
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

// POST /api/whatsapp-webhook/:clientId — webhook público de YCloud (formato
// WhatsApp Cloud API que YCloud replica, ver nota en ConsentsPro
// whatsapp.ts). Cada cliente de Lime que use YCloud necesita configurar esta
// URL (con su clientId) como webhook en su cuenta de YCloud.
webhookRouter.post('/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params
    const payload = req.body
    const msg = payload?.whatsappInboundMessage ?? payload
    const phone = msg?.from
    const text = msg?.text?.body ?? msg?.body ?? ''
    if (!phone) return res.status(200).json({ ok: true })

    const client = await queryOne('SELECT id FROM clients WHERE id = $1', [clientId])
    if (!client) return res.status(200).json({ ok: true }) // clientId desconocido — se ignora sin dar pistas

    res.status(200).json({ ok: true }) // responde ya a YCloud, evita reintentos por timeout
    await recordInboundMessage(clientId, phone, text, 'ycloud', msg?.id ?? null)
    return
  } catch (err: any) {
    console.error('[whatsapp webhook] fallo procesando evento:', err.message)
    return res.status(200).json({ ok: true })
  }
})

export default router
