import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { query, queryOne } from '../lib/db'
import { signToken } from '../lib/jwt'
import { authMiddleware } from '../middleware/auth'

const router = Router()

// GET /api/auth/setup-required — true si todavía no existe ningún usuario.
// El frontend usa esto para mostrar la pantalla de alta del primer
// administrador en vez del login, la primera vez que se abre el panel.
router.get('/setup-required', async (_req, res) => {
  try {
    const rows = await query<{ count: string }>('SELECT count(*)::text AS count FROM lime_users')
    return res.json({ setupRequired: (rows[0]?.count ?? '0') === '0' })
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

// POST /api/auth/setup — crea el primer administrador. Solo funciona
// mientras no exista ningún usuario todavía; después queda bloqueado para
// siempre (los usuarios adicionales se crean ya autenticado, ver /users si
// se añade más adelante).
router.post('/setup', async (req, res) => {
  try {
    const { email, password, name } = req.body
    if (!email || !password || !name) return res.status(400).json({ error: 'email, password y name son requeridos' })
    if (password.length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' })

    const existing = await query('SELECT id FROM lime_users LIMIT 1')
    if (existing.length > 0) return res.status(403).json({ error: 'Ya existe un administrador — usa el login' })

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await queryOne<{ id: string; email: string; name: string; role: string }>(
      `INSERT INTO lime_users (email, password_hash, name, role) VALUES ($1,$2,$3,'admin')
       RETURNING id, email, name, role`,
      [email.toLowerCase().trim(), passwordHash, name]
    )
    const token = signToken({ userId: user!.id, email: user!.email, role: user!.role })
    return res.status(201).json({ token, user })
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'email y password son requeridos' })

    const user = await queryOne<{ id: string; email: string; name: string; role: string; password_hash: string }>(
      'SELECT id, email, name, role, password_hash FROM lime_users WHERE email = $1',
      [email.toLowerCase().trim()]
    )
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' })
    }
    const token = signToken({ userId: user.id, email: user.email, role: user.role })
    return res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } })
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { userId } = (req as any).user
    const user = await queryOne<{ id: string; email: string; name: string; role: string }>(
      'SELECT id, email, name, role FROM lime_users WHERE id = $1', [userId]
    )
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })
    return res.json(user)
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

export default router
