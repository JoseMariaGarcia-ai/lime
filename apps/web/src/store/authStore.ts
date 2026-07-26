import { create } from 'zustand'
import { getToken, setToken, clearToken } from '../lib/auth'

export interface LimeUser {
  id: string
  email: string
  name: string
  role: string
}

interface AuthStore {
  token: string | null
  user: LimeUser | null
  setSession: (token: string, user: LimeUser) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  token: getToken(),
  user: null,
  setSession: (token, user) => {
    setToken(token)
    set({ token, user })
  },
  logout: () => {
    clearToken()
    set({ token: null, user: null })
  },
}))
