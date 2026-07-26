import { Router } from 'express'
import { query, queryOne } from '../lib/db'
import { encryptSecretOrNull, decryptSecret } from '../lib/crypto'

const router = Router()

const LIST_COLUMNS = `
  id, nombre, apellidos, empresa, telefono, email, whatsapp_provider, created_at, updated_at,
  (n8n_api_key_enc IS NOT NULL) AS has_n8n_key,
  (openrouter_api_key_enc IS NOT NULL) AS has_openrouter_key,
  (claude_api_key_enc IS NOT NULL) AS has_claude_key,
  (ycloud_api_key_enc IS NOT NULL) AS has_ycloud_key
`

// GET /api/clients — listado sin las claves de API en claro (solo si están
// configuradas o no), para no exponer secretos de todos los clientes en una
// sola respuesta.
router.get('/', async (_req, res) => {
  try {
    const data = await query(`SELECT ${LIST_COLUMNS} FROM clients ORDER BY nombre ASC`)
    return res.json(data)
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

function decryptClient(row: any) {
  return {
    ...row,
    n8n_api_key: decryptSecret(row.n8n_api_key_enc),
    openrouter_api_key: decryptSecret(row.openrouter_api_key_enc),
    claude_api_key: decryptSecret(row.claude_api_key_enc),
    ycloud_api_key: decryptSecret(row.ycloud_api_key_enc),
    n8n_api_key_enc: undefined,
    openrouter_api_key_enc: undefined,
    claude_api_key_enc: undefined,
    ycloud_api_key_enc: undefined,
  }
}

// GET /api/clients/:id — ficha completa, con las claves de API descifradas
// (aquí sí, porque es la vista de un único cliente para poder gestionarlas).
router.get('/:id', async (req, res) => {
  try {
    const row = await queryOne('SELECT * FROM clients WHERE id = $1', [req.params.id])
    if (!row) return res.status(404).json({ error: 'Cliente no encontrado' })
    const extraKeys = await query(
      'SELECT id, name, value, created_at, updated_at FROM client_api_keys WHERE client_id = $1 ORDER BY created_at ASC',
      [req.params.id]
    )
    return res.json({ ...decryptClient(row), extra_api_keys: extraKeys })
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

router.post('/', async (req, res) => {
  try {
    const b = req.body
    if (!b.nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido' })
    const row = await queryOne(
      `INSERT INTO clients (
        nombre, apellidos, empresa, telefono, email, notas,
        n8n_url, n8n_api_key_enc, openrouter_api_key_enc, claude_api_key_enc,
        ycloud_api_key_enc, ycloud_wa_number, whatsapp_provider, custom_fields
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING *`,
      [
        b.nombre, b.apellidos ?? null, b.empresa ?? null, b.telefono ?? null, b.email ?? null, b.notas ?? null,
        b.n8n_url ?? null, encryptSecretOrNull(b.n8n_api_key), encryptSecretOrNull(b.openrouter_api_key),
        encryptSecretOrNull(b.claude_api_key), encryptSecretOrNull(b.ycloud_api_key), b.ycloud_wa_number ?? null,
        b.whatsapp_provider ?? 'ycloud', JSON.stringify(b.custom_fields ?? {}),
      ]
    )

    const extraApiKeysInput: Array<{ name?: string; value?: string }> = Array.isArray(b.extra_api_keys) ? b.extra_api_keys : []
    const extraApiKeys = []
    for (const k of extraApiKeysInput) {
      if (!k.name?.trim() || !k.value?.trim()) continue
      const inserted = await queryOne<any>(
        `INSERT INTO client_api_keys (client_id, name, value) VALUES ($1,$2,$3)
         ON CONFLICT (client_id, name) DO NOTHING RETURNING id, name, value, created_at, updated_at`,
        [row.id, k.name.trim(), k.value]
      )
      if (inserted) extraApiKeys.push(inserted)
    }

    return res.status(201).json({ ...decryptClient(row), extra_api_keys: extraApiKeys })
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

// PUT /api/clients/:id — actualización parcial: un campo de clave de API
// que llega como undefined (no se tocó en el formulario) conserva el valor
// cifrado ya guardado; solo se re-cifra si el frontend manda un valor nuevo
// explícito (o null/'' para borrarlo).
router.put('/:id', async (req, res) => {
  try {
    const existing = await queryOne<any>('SELECT * FROM clients WHERE id = $1', [req.params.id])
    if (!existing) return res.status(404).json({ error: 'Cliente no encontrado' })
    const b = req.body

    const resolveKey = (incoming: any, currentEnc: string | null) =>
      incoming === undefined ? currentEnc : encryptSecretOrNull(incoming)

    const row = await queryOne(
      `UPDATE clients SET
        nombre = $1, apellidos = $2, empresa = $3, telefono = $4, email = $5, notas = $6,
        n8n_url = $7, n8n_api_key_enc = $8, openrouter_api_key_enc = $9, claude_api_key_enc = $10,
        ycloud_api_key_enc = $11, ycloud_wa_number = $12, whatsapp_provider = $13, custom_fields = $14,
        updated_at = NOW()
       WHERE id = $15 RETURNING *`,
      [
        b.nombre ?? existing.nombre, b.apellidos ?? existing.apellidos, b.empresa ?? existing.empresa,
        b.telefono ?? existing.telefono, b.email ?? existing.email, b.notas ?? existing.notas,
        b.n8n_url ?? existing.n8n_url,
        resolveKey(b.n8n_api_key, existing.n8n_api_key_enc),
        resolveKey(b.openrouter_api_key, existing.openrouter_api_key_enc),
        resolveKey(b.claude_api_key, existing.claude_api_key_enc),
        resolveKey(b.ycloud_api_key, existing.ycloud_api_key_enc),
        b.ycloud_wa_number ?? existing.ycloud_wa_number,
        b.whatsapp_provider ?? existing.whatsapp_provider,
        JSON.stringify(b.custom_fields ?? existing.custom_fields ?? {}),
        req.params.id,
      ]
    )
    return res.json(decryptClient(row))
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM clients WHERE id = $1', [req.params.id])
    return res.status(204).send()
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

// --- Claves de API adicionales por cliente (nombre libre) ---

router.post('/:id/api-keys', async (req, res) => {
  try {
    const { name, value } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'El nombre de la clave es requerido' })
    if (!value?.trim()) return res.status(400).json({ error: 'El valor de la clave es requerido' })
    const row = await queryOne<any>(
      `INSERT INTO client_api_keys (client_id, name, value) VALUES ($1,$2,$3)
       RETURNING id, name, value, created_at, updated_at`,
      [req.params.id, name.trim(), value]
    )
    return res.status(201).json(row)
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe una clave con ese nombre para este cliente' })
    return res.status(500).json({ error: err.message })
  }
})

// PUT .../api-keys/:keyId — el nombre y el valor son opcionales de forma
// independiente: renombrar sin reenviar el valor conserva el valor actual.
router.put('/:id/api-keys/:keyId', async (req, res) => {
  try {
    const existing = await queryOne<any>(
      'SELECT * FROM client_api_keys WHERE id = $1 AND client_id = $2', [req.params.keyId, req.params.id]
    )
    if (!existing) return res.status(404).json({ error: 'Clave no encontrada' })
    const { name, value } = req.body
    const nextName = name?.trim() || existing.name
    const nextValue = value?.trim() ? value : existing.value
    const row = await queryOne<any>(
      `UPDATE client_api_keys SET name = $1, value = $2, updated_at = NOW() WHERE id = $3
       RETURNING id, name, value, created_at, updated_at`,
      [nextName, nextValue, req.params.keyId]
    )
    return res.json(row)
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe una clave con ese nombre para este cliente' })
    return res.status(500).json({ error: err.message })
  }
})

router.delete('/:id/api-keys/:keyId', async (req, res) => {
  try {
    await query('DELETE FROM client_api_keys WHERE id = $1 AND client_id = $2', [req.params.keyId, req.params.id])
    return res.status(204).send()
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

// --- Definiciones de campos personalizables ---

router.get('/meta/custom-fields', async (_req, res) => {
  try {
    const data = await query('SELECT * FROM client_custom_field_defs ORDER BY created_at ASC')
    return res.json(data)
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

router.post('/meta/custom-fields', async (req, res) => {
  try {
    const { label, field_type, field_key } = req.body
    if (!label?.trim()) return res.status(400).json({ error: 'El nombre del campo es requerido' })
    const key = (field_key?.trim() || label)
      .toLowerCase().trim()
      .normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]', 'g'), '') // quita acentos
      .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
    if (!key) return res.status(400).json({ error: 'No se pudo derivar una clave válida para el campo' })
    const row = await queryOne(
      `INSERT INTO client_custom_field_defs (field_key, label, field_type) VALUES ($1,$2,$3) RETURNING *`,
      [key, label, field_type ?? 'text']
    )
    return res.status(201).json(row)
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe un campo con esa clave' })
    return res.status(500).json({ error: err.message })
  }
})

router.delete('/meta/custom-fields/:id', async (req, res) => {
  try {
    await query('DELETE FROM client_custom_field_defs WHERE id = $1', [req.params.id])
    return res.status(204).send()
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

export default router
