import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { Button } from '../components/ui/Button'
import { Input, Label } from '../components/ui/Input'
import logo from '../assets/logo.png'

export function Login() {
  const navigate = useNavigate()
  const { setSession } = useAuthStore()
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get('/api/auth/setup-required')
      .then(r => setSetupRequired(r.setupRequired))
      .catch(() => setSetupRequired(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const path = setupRequired ? '/api/auth/setup' : '/api/auth/login'
      const body = setupRequired ? { name, email, password } : { email, password }
      const { token, user } = await api.post(path, body)
      setSession(token, user)
      navigate('/', { replace: true })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <img src={logo} alt="Lime AI Studio" className="h-14 w-auto" />
        </div>

        <div className="rounded-xl border border-navy-700 bg-navy-800/60 p-6 shadow-sm">
          <h1 className="mb-1 text-lg font-semibold text-navy-50">
            {setupRequired ? 'Crear el primer administrador' : 'Iniciar sesión'}
          </h1>
          <p className="mb-5 text-sm text-navy-400">
            {setupRequired
              ? 'Todavía no hay ningún usuario — crea la cuenta de administrador para empezar.'
              : 'Accede al centro de gestión de Lime AI Studio.'}
          </p>

          {setupRequired === null ? (
            <p className="text-sm text-navy-400">Cargando...</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {setupRequired && (
                <div>
                  <Label>Nombre</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} required />
                </div>
              )}
              <div>
                <Label>Email</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label>Contraseña</Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={setupRequired ? 8 : undefined} />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Un momento...' : setupRequired ? 'Crear administrador' : 'Entrar'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
