import { Router } from 'express'
import { query, queryOne } from '../lib/db'
import { decryptSecret } from '../lib/crypto'
import { sendViaYCloud } from '../lib/ycloud'
import { recordInboundMessage, recordOutboundMessage, findClientIdByPhone } from '../lib/whatsappCore'
import { connectAccountBaileys, disconnectAccountBaileys, sendViaBaileys } from '../services/baileysManager'

const router = Router()
export const webhookRouter = Router()

// GET /api/whatsapp/conversations?filter=unread|pending — bandeja ÚNICA de
// todas las conversaciones (ya no hay que elegir cliente antes), con el
// nombre del cliente si el teléfono se pudo resolver a uno.
router.get('/conversations', async (req, res) => {
  try {
    const { filter } = req.query
    const where =
      filter === 'unread' ? 'WHERE wc.unread_count > 0' :
      filter === 'pending' ? 'WHERE wc.is_pending = true' : ''
    const data = await query(
      `SELECT wc.*, c.nombre AS client_nombre, c.empresa AS client_empresa
       FROM whatsapp_conversations wc LEFT JOIN clients c ON c.id = wc.client_id
       ${where}
       ORDER BY wc.last_message_at DESC NULLS LAST`
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

// POST /api/whatsapp/conversations/:id/pending — { pending: boolean } —
// marcar/desmarcar como pendiente de gestión, independiente de si está leída.
router.post('/conversations/:id/pending', async (req, res) => {
  try {
    const row = await queryOne(
      'UPDATE whatsapp_conversations SET is_pending = $1 WHERE id = $2 RETURNING *',
      [!!req.body.pending, req.params.id]
    )
    if (!row) return res.status(404).json({ error: 'Conversación no encontrada' })
    return res.json(row)
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

// GET /api/whatsapp/connections — estado GLOBAL de la cuenta: qué proveedor
// está elegido, si YCloud está configurado, y el estado de Baileys si es
// ese el proveedor activo.
router.get('/connections', async (_req, res) => {
  try {
    const settings = await queryOne<any>('SELECT * FROM account_settings WHERE id = 1')
    const baileysConn = await queryOne(
      `SELECT status, qr_code, last_error, updated_at FROM whatsapp_connections WHERE provider = 'baileys'`
    )
    return res.json({
      provider: settings.whatsapp_provider,
      ycloud: { configured: !!(settings.ycloud_api_key_enc && settings.ycloud_wa_number) },
      baileys: baileysConn ?? { status: 'desconectado', qr_code: null, last_error: null },
    })
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

router.post('/connections/baileys/connect', async (_req, res) => {
  try {
    connectAccountBaileys().catch(err =>
      console.error('[whatsapp] fallo iniciando Baileys:', err.message))
    return res.status(202).json({ ok: true, message: 'Conectando — consulta el QR en unos segundos' })
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

router.post('/connections/baileys/disconnect', async (_req, res) => {
  try {
    await disconnectAccountBaileys()
    return res.json({ ok: true })
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

// POST /api/whatsapp/send — { conversationId, body } — responde dentro de
// una conversación ya existente de la bandeja; el proveedor real de envío
// (YCloud/Baileys) se decide por la configuración GLOBAL de la cuenta.
router.post('/send', async (req, res) => {
  try {
    const { conversationId, body } = req.body
    if (!conversationId || !body) return res.status(400).json({ error: 'conversationId y body son requeridos' })

    const conversation = await queryOne<{ phone: string }>(
      'SELECT phone FROM whatsapp_conversations WHERE id = $1', [conversationId]
    )
    if (!conversation) return res.status(404).json({ error: 'Conversación no encontrada' })

    const settings = await queryOne<any>('SELECT * FROM account_settings WHERE id = 1')

    try {
      let providerMessageId: string | null = null
      if (settings.whatsapp_provider === 'baileys') {
        providerMessageId = await sendViaBaileys(conversation.phone, body)
      } else {
        const apiKey = decryptSecret(settings.ycloud_api_key_enc)
        const waNumber = settings.ycloud_wa_number
        if (!apiKey || !waNumber) {
          return res.status(400).json({ error: 'YCloud no está configurado — añade la clave de API y el número en Configuración' })
        }
        providerMessageId = await sendViaYCloud(apiKey, waNumber, conversation.phone, body)
      }
      const message = await recordOutboundMessage(conversationId, body, 'sent', providerMessageId)
      return res.status(201).json(message)
    } catch (sendErr: any) {
      const message = await recordOutboundMessage(conversationId, body, 'failed', null)
      return res.status(502).json({ error: `Fallo al enviar el mensaje: ${sendErr.message}`, message })
    }
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

// POST /api/whatsapp-webhook — webhook público de YCloud (formato WhatsApp
// Cloud API que YCloud replica). Un único número/cuenta de YCloud para todo
// Lime — el cliente al que pertenece el mensaje se resuelve comparando el
// teléfono remitente con clients.telefono; si no coincide con ninguno, la
// conversación queda sin cliente asignado (no se pierde el mensaje).
webhookRouter.post('/', async (req, res) => {
  try {
    const payload = req.body
    const msg = payload?.whatsappInboundMessage ?? payload
    const phone = msg?.from
    const text = msg?.text?.body ?? msg?.body ?? ''
    if (!phone) return res.status(200).json({ ok: true })

    res.status(200).json({ ok: true }) // responde ya a YCloud, evita reintentos por timeout
    const clientId = await findClientIdByPhone(phone)
    await recordInboundMessage(clientId, phone, text, 'ycloud', msg?.id ?? null)
    return
  } catch (err: any) {
    console.error('[whatsapp webhook] fallo procesando evento:', err.message)
    return res.status(200).json({ ok: true })
  }
})

export default router
