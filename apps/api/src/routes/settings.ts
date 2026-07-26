import { Router } from 'express'
import { query, queryOne } from '../lib/db'
import { encryptSecretOrNull, decryptSecret } from '../lib/crypto'

const router = Router()

function decryptSettings(row: any) {
  return {
    ...row,
    ycloud_api_key: decryptSecret(row.ycloud_api_key_enc),
    openrouter_api_key: decryptSecret(row.openrouter_api_key_enc),
    claude_api_key: decryptSecret(row.claude_api_key_enc),
    n8n_api_key: decryptSecret(row.n8n_api_key_enc),
    ycloud_api_key_enc: undefined,
    openrouter_api_key_enc: undefined,
    claude_api_key_enc: undefined,
    n8n_api_key_enc: undefined,
  }
}

router.get('/', async (_req, res) => {
  try {
    const row = await queryOne('SELECT * FROM account_settings WHERE id = 1')
    return res.json(decryptSettings(row))
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

router.put('/', async (req, res) => {
  try {
    const existing = await queryOne<any>('SELECT * FROM account_settings WHERE id = 1')
    const b = req.body
    const resolveKey = (incoming: any, currentEnc: string | null) =>
      incoming === undefined ? currentEnc : encryptSecretOrNull(incoming)

    const row = await queryOne(
      `UPDATE account_settings SET
        whatsapp_provider = $1,
        ycloud_api_key_enc = $2, ycloud_wa_number = $3, openrouter_api_key_enc = $4,
        claude_api_key_enc = $5, n8n_url = $6, n8n_api_key_enc = $7, custom_fields = $8,
        updated_at = NOW()
       WHERE id = 1 RETURNING *`,
      [
        b.whatsapp_provider ?? existing.whatsapp_provider,
        resolveKey(b.ycloud_api_key, existing.ycloud_api_key_enc),
        b.ycloud_wa_number ?? existing.ycloud_wa_number,
        resolveKey(b.openrouter_api_key, existing.openrouter_api_key_enc),
        resolveKey(b.claude_api_key, existing.claude_api_key_enc),
        b.n8n_url ?? existing.n8n_url,
        resolveKey(b.n8n_api_key, existing.n8n_api_key_enc),
        JSON.stringify(b.custom_fields ?? existing.custom_fields ?? {}),
      ]
    )
    return res.json(decryptSettings(row))
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

router.get('/custom-fields', async (_req, res) => {
  try {
    const data = await query('SELECT * FROM account_custom_field_defs ORDER BY created_at ASC')
    return res.json(data)
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

router.post('/custom-fields', async (req, res) => {
  try {
    const { label, field_type, field_key } = req.body
    if (!label?.trim()) return res.status(400).json({ error: 'El nombre del campo es requerido' })
    const key = (field_key?.trim() || label)
      .toLowerCase().trim()
      .normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
    if (!key) return res.status(400).json({ error: 'No se pudo derivar una clave válida para el campo' })
    const row = await queryOne(
      `INSERT INTO account_custom_field_defs (field_key, label, field_type) VALUES ($1,$2,$3) RETURNING *`,
      [key, label, field_type ?? 'text']
    )
    return res.status(201).json(row)
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe un campo con esa clave' })
    return res.status(500).json({ error: err.message })
  }
})

router.delete('/custom-fields/:id', async (req, res) => {
  try {
    await query('DELETE FROM account_custom_field_defs WHERE id = $1', [req.params.id])
    return res.status(204).send()
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

export default router
