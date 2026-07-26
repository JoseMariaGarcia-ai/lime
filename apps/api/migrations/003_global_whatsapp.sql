-- El proveedor de WhatsApp (YCloud o Baileys) deja de elegirse por cliente
-- — Lime opera un único WhatsApp propio para hablar con los contactos de
-- todos sus clientes, configurado una sola vez en Configuración de cuenta.

ALTER TABLE account_settings
  ADD COLUMN IF NOT EXISTS whatsapp_provider TEXT NOT NULL DEFAULT 'ycloud' CHECK (whatsapp_provider IN ('ycloud', 'baileys'));

ALTER TABLE clients DROP COLUMN IF EXISTS whatsapp_provider;
ALTER TABLE clients DROP COLUMN IF EXISTS ycloud_api_key_enc;
ALTER TABLE clients DROP COLUMN IF EXISTS ycloud_wa_number;

-- whatsapp_connections pasa de ser por (client_id, provider) a un único
-- registro global por proveedor — ya no hace falta recrearla por cliente.
DROP TABLE IF EXISTS whatsapp_connections;
CREATE TABLE whatsapp_connections (
  provider   TEXT PRIMARY KEY CHECK (provider IN ('ycloud', 'baileys')),
  status     TEXT NOT NULL DEFAULT 'desconectado' CHECK (status IN ('desconectado', 'conectando', 'conectado', 'error')),
  qr_code    TEXT,
  last_error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Un mensaje entrante ahora se resuelve a un cliente buscando por su
-- teléfono (ver lib/whatsappCore.ts) — si no hay ningún cliente con ese
-- teléfono todavía, la conversación queda sin cliente asignado en vez de
-- fallar, para no perder el mensaje.
ALTER TABLE whatsapp_conversations ALTER COLUMN client_id DROP NOT NULL;
