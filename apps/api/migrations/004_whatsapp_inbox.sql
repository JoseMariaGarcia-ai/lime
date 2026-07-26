-- Bandeja única de WhatsApp (ya no se navega cliente por cliente): hace
-- falta poder marcar una conversación como "pendiente de gestión",
-- independiente de si está leída o no (una conversación ya leída puede
-- seguir pendiente de que alguien la resuelva).
ALTER TABLE whatsapp_conversations
  ADD COLUMN IF NOT EXISTS is_pending BOOLEAN NOT NULL DEFAULT false;
