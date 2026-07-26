-- Claves de API adicionales por cliente, con nombre libre (a diferencia de
-- las claves fijas de clients.*_api_key_enc, aquí el usuario define cuántas
-- quiera y cómo se llaman) — cifradas igual que el resto, ver lib/crypto.ts.
CREATE TABLE IF NOT EXISTS client_api_keys (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  value_enc  TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, name)
);
CREATE INDEX IF NOT EXISTS idx_client_api_keys_client_id ON client_api_keys(client_id);
