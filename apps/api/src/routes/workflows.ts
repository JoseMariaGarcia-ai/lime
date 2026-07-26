import { Router } from 'express'
import { query, queryOne } from '../lib/db'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const data = await query(
      `SELECT w.*, c.nombre AS client_nombre FROM workflows w
       LEFT JOIN clients c ON c.id = w.client_id ORDER BY w.created_at DESC`
    )
    return res.json(data)
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

router.post('/', async (req, res) => {
  try {
    const b = req.body
    if (!b.name?.trim()) return res.status(400).json({ error: 'El nombre del workflow es requerido' })
    const row = await queryOne(
      `INSERT INTO workflows (name, description, trigger_type, config, active, client_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [b.name, b.description ?? null, b.trigger_type ?? 'manual', JSON.stringify(b.config ?? {}), b.active ?? true, b.client_id ?? null]
    )
    return res.status(201).json(row)
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

router.put('/:id', async (req, res) => {
  try {
    const existing = await queryOne<any>('SELECT * FROM workflows WHERE id = $1', [req.params.id])
    if (!existing) return res.status(404).json({ error: 'Workflow no encontrado' })
    const b = req.body
    const row = await queryOne(
      `UPDATE workflows SET
        name = $1, description = $2, trigger_type = $3, config = $4, active = $5, client_id = $6, updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [
        b.name ?? existing.name, b.description ?? existing.description, b.trigger_type ?? existing.trigger_type,
        JSON.stringify(b.config ?? existing.config), b.active ?? existing.active, b.client_id ?? existing.client_id,
        req.params.id,
      ]
    )
    return res.json(row)
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

// PATCH /api/workflows/:id/toggle — activar/desactivar de un click, sin
// tener que mandar el resto de campos del workflow.
router.patch('/:id/toggle', async (req, res) => {
  try {
    const row = await queryOne(
      `UPDATE workflows SET active = NOT active, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id]
    )
    if (!row) return res.status(404).json({ error: 'Workflow no encontrado' })
    return res.json(row)
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM workflows WHERE id = $1', [req.params.id])
    return res.status(204).send()
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

export default router
