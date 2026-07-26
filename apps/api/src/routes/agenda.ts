import { Router } from 'express'
import { query, queryOne, withTransaction } from '../lib/db'

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

// --- Horario de apertura (días y tramos) ---
// Registradas ANTES de /:id — de lo contrario "/business-hours" y "/config"
// serían capturados por el "/:id" genérico (Express matchea por orden de
// registro, y ":id" acepta cualquier segmento único, incluida la palabra
// "business-hours").

// GET /api/agenda/business-hours — todos los tramos, agrupables en el
// frontend por day_of_week. Un día sin ningún tramo está cerrado.
router.get('/business-hours', async (_req, res) => {
  try {
    const data = await query(
      'SELECT * FROM agenda_business_hours ORDER BY day_of_week ASC, start_time ASC'
    )
    return res.json(data)
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

// PUT /api/agenda/business-hours — { hours: [{ day_of_week, start_time, end_time }] }
// Reemplaza TODA la configuración de una vez (borra y vuelve a insertar) —
// más simple y sin ambigüedad que ir añadiendo/quitando tramos sueltos, ya
// que el panel de configuración siempre manda el estado completo deseado.
router.put('/business-hours', async (req, res) => {
  try {
    const hours: Array<{ day_of_week: number; start_time: string; end_time: string }> = req.body.hours ?? []
    for (const h of hours) {
      if (h.day_of_week < 0 || h.day_of_week > 6) {
        return res.status(400).json({ error: 'day_of_week debe estar entre 0 (domingo) y 6 (sábado)' })
      }
      if (!h.start_time || !h.end_time || h.end_time <= h.start_time) {
        return res.status(400).json({ error: 'Cada tramo necesita start_time < end_time' })
      }
    }
    await withTransaction(async (client) => {
      await client.query('DELETE FROM agenda_business_hours')
      for (const h of hours) {
        await client.query(
          'INSERT INTO agenda_business_hours (day_of_week, start_time, end_time) VALUES ($1,$2,$3)',
          [h.day_of_week, h.start_time, h.end_time]
        )
      }
    })
    const data = await query('SELECT * FROM agenda_business_hours ORDER BY day_of_week ASC, start_time ASC')
    return res.json(data)
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

router.get('/config', async (_req, res) => {
  try {
    const row = await queryOne('SELECT * FROM agenda_config WHERE id = 1')
    return res.json(row)
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

router.put('/config', async (req, res) => {
  try {
    const { slot_duration_minutes } = req.body
    if (!slot_duration_minutes || slot_duration_minutes < 5 || slot_duration_minutes > 240) {
      return res.status(400).json({ error: 'slot_duration_minutes debe estar entre 5 y 240' })
    }
    const row = await queryOne(
      'UPDATE agenda_config SET slot_duration_minutes = $1 WHERE id = 1 RETURNING *',
      [slot_duration_minutes]
    )
    return res.json(row)
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
