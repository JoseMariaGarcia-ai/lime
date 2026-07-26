import { Router } from 'express'
import { query, queryOne } from '../lib/db'
import { encryptSecretOrNull, decryptSecret } from '../lib/crypto'

const router = Router()

const LIST_COLUMNS = `
  id, nombre, apellidos, empresa, telefono, email, created_at, updated_at,
  (n8n_api_key_enc IS NOT NULL) AS has_n8n_key,
  (openrouter_api_key_enc IS NOT NULL) AS has_openrouter_key,
  (claude_api_key_enc IS NOT NULL) AS has_claude_key
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
    n8n_api_key_enc: undefined,
    openrouter_api_key_enc: undefined,
    claude_api_key_enc: undefined,
  }
}

// GET /api/clients/:id — ficha completa, con las claves de API descifradas
// (aquí sí, porque es la vista de un único cliente para poder gestionarlas).
router.get('/:id', async (req, res) => {
  try {
    const row = await queryOne('SELECT * FROM clients WHERE id = $1', [req.params.id])
    if (!row) return res.status(404).json({ error: 'Cliente no encontrado' })
    return res.json(decryptClient(row))
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

router.post('/', async (req, res) => {
  try {
    const b = req.body
    if (!b.nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido' })
    const row = await queryOne(
      `INSERT INTO clients (
        nombre, apellidos, empresa, telefono, email, notas,
        n8n_url, n8n_api_key_enc, openrouter_api_key_enc, claude_api_key_enc, custom_fields
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *`,
      [
        b.nombre, b.apellidos ?? null, b.empresa ?? null, b.telefono ?? null, b.email ?? null, b.notas ?? null,
        b.n8n_url ?? null, encryptSecretOrNull(b.n8n_api_key), encryptSecretOrNull(b.openrouter_api_key),
        encryptSecretOrNull(b.claude_api_key), JSON.stringify(b.custom_fields ?? {}),
      ]
    )
    return res.status(201).json(decryptClient(row))
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
        custom_fields = $11, updated_at = NOW()
       WHERE id = $12 RETURNING *`,
      [
        b.nombre ?? existing.nombre, b.apellidos ?? existing.apellidos, b.empresa ?? existing.empresa,
        b.telefono ?? existing.telefono, b.email ?? existing.email, b.notas ?? existing.notas,
        b.n8n_url ?? existing.n8n_url,
        resolveKey(b.n8n_api_key, existing.n8n_api_key_enc),
        resolveKey(b.openrouter_api_key, existing.openrouter_api_key_enc),
        resolveKey(b.claude_api_key, existing.claude_api_key_enc),
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
