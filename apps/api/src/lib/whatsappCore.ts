import { query, queryOne } from './db'

// Helpers compartidos entre el webhook de YCloud y el gestor de Baileys —
// ambos proveedores acaban escribiendo en las mismas tablas
// whatsapp_conversations / whatsapp_messages, solo cambia cómo llega el
// mensaje entrante.

export async function ensureConversation(
  clientId: string, phone: string, provider: 'ycloud' | 'baileys', contactName?: string | null
): Promise<string> {
  const existing = await queryOne<{ id: string }>(
    'SELECT id FROM whatsapp_conversations WHERE client_id = $1 AND phone = $2', [clientId, phone]
  )
  if (existing) return existing.id
  const created = await queryOne<{ id: string }>(
    `INSERT INTO whatsapp_conversations (client_id, phone, contact_name, provider) VALUES ($1,$2,$3,$4) RETURNING id`,
    [clientId, phone, contactName ?? null, provider]
  )
  return created!.id
}

export async function recordInboundMessage(
  clientId: string, phone: string, body: string, provider: 'ycloud' | 'baileys', providerMessageId?: string | null
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
