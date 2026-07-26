import { query, queryOne } from './db'

// Helpers compartidos entre el webhook de YCloud y el gestor de Baileys —
// ambos proveedores acaban escribiendo en las mismas tablas
// whatsapp_conversations / whatsapp_messages, solo cambia cómo llega el
// mensaje entrante. El proveedor (YCloud/Baileys) es una elección global de
// la cuenta (ver account_settings.whatsapp_provider) — clientId aquí es
// solo para saber a qué cliente pertenece la conversación, no qué WhatsApp
// se usó para mandarla.

// Busca a qué cliente pertenece un teléfono entrante, comparando solo
// dígitos (para no fallar por un "+", espacios o prefijos distintos entre
// cómo se guardó clients.telefono y cómo llega el remitente de WhatsApp).
export async function findClientIdByPhone(phone: string): Promise<string | null> {
  const row = await queryOne<{ id: string }>(
    `SELECT id FROM clients
     WHERE telefono IS NOT NULL AND regexp_replace(telefono, '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g')
     LIMIT 1`,
    [phone]
  )
  return row?.id ?? null
}

export async function ensureConversation(
  clientId: string | null, phone: string, provider: 'ycloud' | 'baileys', contactName?: string | null
): Promise<string> {
  const existing = clientId
    ? await queryOne<{ id: string }>(
        'SELECT id FROM whatsapp_conversations WHERE client_id = $1 AND phone = $2', [clientId, phone]
      )
    : await queryOne<{ id: string }>(
        'SELECT id FROM whatsapp_conversations WHERE client_id IS NULL AND phone = $1', [phone]
      )
  if (existing) return existing.id
  const created = await queryOne<{ id: string }>(
    `INSERT INTO whatsapp_conversations (client_id, phone, contact_name, provider) VALUES ($1,$2,$3,$4) RETURNING id`,
    [clientId, phone, contactName ?? null, provider]
  )
  return created!.id
}

export async function recordInboundMessage(
  clientId: string | null, phone: string, body: string, provider: 'ycloud' | 'baileys', providerMessageId?: string | null
): Promise<string> {
  const conversationId = await ensureConversation(clientId, phone, provider)
  await query(
    `INSERT INTO whatsapp_messages (conversation_id, direction, body, status, provider_message_id)
     VALUES ($1,'inbound',$2,'received',$3)`,
    [conversationId, body, providerMessageId ?? null]
  )
  await query(
    `UPDATE whatsapp_conversations SET last_message_at = NOW(), last_message_preview = $1, unread_count = unread_count + 1 WHERE id = $2`,
    [body.slice(0, 120), conversationId]
  )
  return conversationId
}

export async function recordOutboundMessage(
  conversationId: string, body: string, status: 'sent' | 'failed', providerMessageId?: string | null
) {
  const row = await queryOne(
    `INSERT INTO whatsapp_messages (conversation_id, direction, body, status, provider_message_id)
     VALUES ($1,'outbound',$2,$3,$4) RETURNING *`,
    [conversationId, body, status, providerMessageId ?? null]
  )
  await query(
    `UPDATE whatsapp_conversations SET last_message_at = NOW(), last_message_preview = $1 WHERE id = $2`,
    [body.slice(0, 120), conversationId]
  )
  return row
}
