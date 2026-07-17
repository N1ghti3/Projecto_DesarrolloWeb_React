// useAuth - Hook de autenticación con contexto
'use client'
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { api, getToken, getStoredUser, setSession, clearSession } from '@/lib/api'
import type { User } from '@/lib/types'

interface AuthState {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  register: (data: { name: string; email: string; password: string; role?: string }) => Promise<User>
  logout: () => void
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Sincroniza si el usuario se logueó en otra pestaña
    const onStorage = () => setUser(getStoredUser())
    // Sesión expirada (refresh token inválido): cerrar sesión
    const onExpired = () => {
      clearSession()
      setUser(null)
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('verveos:auth-expired', onExpired)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('verveos:auth-expired', onExpired)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password)
    setSession(res)
    setUser(res.user)
    return res.user
  }, [])

  const register = useCallback(
    async (data: { name: string; email: string; password: string; role?: string }) => {
      const res = await api.register(data)
      setSession(res)
      setUser(res.user)
      return res.user
    },
    []
  )

  const logout = useCallback(() => {
    clearSession()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
