import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../lib/jwt'

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'No autenticado' })
  try {
    const payload = verifyToken(token)
    ;(req as any).user = payload
    next()
  } catch {
    return res.status(401).json({ error: 'Sesión no válida o caducada' })
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const role = (req as any).user?.role
  if (role !== 'admin') return res.status(403).json({ error: 'Solo un administrador puede acceder' })
  next()
}
