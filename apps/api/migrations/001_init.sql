-- Esquema inicial de Lime AI Studio. Todas las sentencias son idempotentes
-- (IF NOT EXISTS) para poder reaplicarse sin error, igual que en ConsentsPro.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS lime_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'staff')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Clientes de Lime AI Studio (las empresas/personas a las que se les presta
-- el servicio de automatización), no confundir con "lime_users" (el
-- personal de Lime que usa este panel).
CREATE TABLE IF NOT EXISTS clients (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre              TEXT NOT NULL,
  apellidos           TEXT,
  empresa             TEXT,
  telefono            TEXT,
  email               TEXT,
  notas               TEXT,
  -- Claves de API conocidas, cifradas en reposo (ver lib/crypto.ts) — se
  -- guardan como texto cifrado, nunca en claro.
  n8n_url             TEXT,
  n8n_api_key_enc     TEXT,
  openrouter_api_key_enc TEXT,
  claude_api_key_enc  TEXT,
  ycloud_api_key_enc  TEXT,
  ycloud_wa_number    TEXT,
  whatsapp_provider   TEXT NOT NULL DEFAULT 'ycloud' CHECK (whatsapp_provider IN ('ycloud', 'baileys')),
  -- Campos personalizables definidos libremente (ver client_custom_field_defs).
  custom_fields       JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Definición de campos personalizables adicionales para clientes — se crea
-- una vez desde el panel y automáticamente aparece en la ficha de todos los
-- clientes (los valores viven en clients.custom_fields, indexados por
-- field_key).
CREATE TABLE IF NOT EXISTS client_custom_field_defs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key  TEXT UNIQUE NOT NULL,
  label      TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text' CHECK (field_type IN ('text', 'number', 'password', 'url', 'textarea')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Configuración global de la cuenta de Lime (singleton, id siempre 1) — las
-- claves con las que Lime opera su propio entorno de IA/automatización,
-- distintas de las claves particulares de cada cliente.
CREATE TABLE IF NOT EXISTS account_settings (
  id                     INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  ycloud_api_key_enc     TEXT,
  ycloud_wa_number       TEXT,
  openrouter_api_key_enc TEXT,
  claude_api_key_enc     TEXT,
  n8n_url                TEXT,
  n8n_api_key_enc        TEXT,
  custom_fields          JSONB NOT NULL DEFAULT '{}',
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO account_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS account_custom_field_defs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key  TEXT UNIQUE NOT NULL,
  label      TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text' CHECK (field_type IN ('text', 'number', 'password', 'url', 'textarea')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID REFERENCES clients(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  description TEXT,
  start_at    TIMESTAMPTZ NOT NULL,
  end_at      TIMESTAMPTZ NOT NULL,
  location    TEXT,
  status      TEXT NOT NULL DEFAULT 'programada' CHECK (status IN ('programada', 'completada', 'cancelada')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_appointments_start_at ON appointments(start_at);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);

CREATE TABLE IF NOT EXISTS workflows (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  description  TEXT,
  trigger_type TEXT NOT NULL DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'webhook', 'n8n', 'schedule')),
  config       JSONB NOT NULL DEFAULT '{}',
  active       BOOLEAN NOT NULL DEFAULT true,
  client_id    UUID REFERENCES clients(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_workflows_client_id ON workflows(client_id);

-- Estado de conexión de WhatsApp por cliente y proveedor (un cliente puede,
-- en teoría, tener configurado YCloud y Baileys a la vez, aunque solo uno
-- esté marcado como activo en clients.whatsapp_provider).
CREATE TABLE IF NOT EXISTS whatsapp_connections (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  provider     TEXT NOT NULL CHECK (provider IN ('ycloud', 'baileys')),
  status       TEXT NOT NULL DEFAULT 'desconectado' CHECK (status IN ('desconectado', 'conectando', 'conectado', 'error')),
  qr_code      TEXT,
  last_error   TEXT,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, provider)
);

CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id            UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  phone                TEXT NOT NULL,
  contact_name         TEXT,
  provider             TEXT NOT NULL DEFAULT 'ycloud' CHECK (provider IN ('ycloud', 'baileys')),
  last_message_at      TIMESTAMPTZ,
  last_message_preview TEXT,
  unread_count         INT NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, phone)
);
CREATE INDEX IF NOT EXISTS idx_wa_conversations_client_id ON whatsapp_conversations(client_id);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id     UUID NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  direction           TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  body                TEXT,
  status              TEXT NOT NULL DEFAULT 'sent',
  provider_message_id TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wa_messages_conversation_id ON whatsapp_messages(conversation_id);
