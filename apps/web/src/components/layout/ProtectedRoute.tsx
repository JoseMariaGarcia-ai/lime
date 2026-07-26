import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { api } from '../../lib/api'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, user, setSession, logout } = useAuthStore()
  const [checking, setChecking] = useState(!!token && !user)

  useEffect(() => {
    if (!token || user) return
    api.get('/api/auth/me')
      .then(me => setSession(token, me))
      .catch(() => logout())
      .finally(() => setChecking(false))
  }, [token, user])

  if (!token) return <Navigate to="/login" replace />
  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-navy-950 text-navy-300">
        Cargando...
      </div>
    )
  }
  return <>{children}</>
}
