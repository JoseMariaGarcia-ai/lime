import { Router } from 'express'
import { query, queryOne } from '../lib/db'

const router = Router()

// GET /api/agenda?from=ISO&to=ISO — si no se pasan fechas, devuelve las
// próximas citas (no canceladas) sin límite de rango, para la vista de lista.
router.get('/', async (req, res) => {
  try {
    const { from, to } = req.query
    if (from && to) {
      const data = await query(
        `SELECT a.*, c.nombre AS client_nombre, c.empresa AS client_empresa
         FROM appointments a LEFT JOIN clients c ON c.id = a.client_id
         WHERE a.start_at >= $1 AND a.start_at <= $2
         ORDER BY a.start_at ASC`,
        [from, to]
      )
      return res.json(data)
    }
    const data = await query(
      `SELECT a.*, c.nombre AS client_nombre, c.empresa AS client_empresa
       FROM appointments a LEFT JOIN clients c ON c.id = a.client_id
       ORDER BY a.start_at ASC`
    )
    return res.json(data)
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

router.post('/', async (req, res) => {
  try {
    const b = req.body
    if (!b.title?.trim() || !b.start_at || !b.end_at) {
      return res.status(400).json({ error: 'title, start_at y end_at son requeridos' })
    }
    const row = await queryOne(
      `INSERT INTO appointments (client_id, title, description, start_at, end_at, location, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [b.client_id ?? null, b.title, b.description ?? null, b.start_at, b.end_at, b.location ?? null, b.status ?? 'programada']
    )
    return res.status(201).json(row)
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

router.put('/:id', async (req, res) => {
  try {
    const existing = await queryOne<any>('SELECT * FROM appointments WHERE id = $1', [req.params.id])
    if (!existing) return res.status(404).json({ error: 'Cita no encontrada' })
    const b = req.body
    const row = await queryOne(
      `UPDATE appointments SET
        client_id = $1, title = $2, description = $3, start_at = $4, end_at = $5, location = $6, status = $7
       WHERE id = $8 RETURNING *`,
      [
        b.client_id ?? existing.client_id, b.title ?? existing.title, b.description ?? existing.description,
        b.start_at ?? existing.start_at, b.end_at ?? existing.end_at, b.location ?? existing.location,
        b.status ?? existing.status, req.params.id,
      ]
    )
    return res.json(row)
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM appointments WHERE id = $1', [req.params.id])
    return res.status(204).send()
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

export default router
