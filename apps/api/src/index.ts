import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { authMiddleware } from './middleware/auth'
import authRouter from './routes/auth'
import clientsRouter from './routes/clients'
import settingsRouter from './routes/settings'
import agendaRouter from './routes/agenda'
import workflowsRouter from './routes/workflows'
import whatsappRouter, { webhookRouter as whatsappWebhookRouter } from './routes/whatsapp'
import { runMigrations } from './lib/migrate'

const app = express()

const ALLOWED_ORIGINS = [
  ...(process.env.APP_URL ?? '').split(',').map(o => o.trim()).filter(Boolean),
]

app.use(cors({
  origin(origin, callback) {
    // Sin cabecera Origin (curl, webhooks) — se permite siempre.
    if (!origin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) return callback(null, true)
    callback(new Error(`Origen no permitido por CORS: ${origin}`))
  },
  credentials: true,
}))

app.use(express.json({ limit: '10mb' }))

app.get('/health', (_req, res) => res.json({ ok: true }))

// Público
app.use('/api/auth', authRouter)
app.use('/api/whatsapp-webhook', whatsappWebhookRouter)

// Protegido
app.use('/api/clients', authMiddleware, clientsRouter)
app.use('/api/settings', authMiddleware, settingsRouter)
app.use('/api/agenda', authMiddleware, agendaRouter)
app.use('/api/workflows', authMiddleware, workflowsRouter)
app.use('/api/whatsapp', authMiddleware, whatsappRouter)

const PORT = process.env.PORT ?? 3101

runMigrations()
  .catch(err => console.error('[migrate] la migración falló, se arranca el servidor de todos modos:', err))
  .finally(() => {
    app.listen(PORT, () => console.log(`Lime AI Studio API corriendo en el puerto ${PORT}`))
  })

export default app
