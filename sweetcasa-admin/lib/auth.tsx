'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import api, { apiErrorMessage } from './api'
import Cookies from './cookies'
import type { AdminProfile } from './types'

interface AuthContextValue {
  admin: AdminProfile | null
  loading: boolean
  isAdmin: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const PROFILE_KEY = 'sc_admin_profile'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const token = Cookies.get('sc_admin_token')
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(PROFILE_KEY) : null
    if (token && raw) {
      try {
        setAdmin(JSON.parse(raw))
      } catch {
        setAdmin(null)
      }
    }
    setLoading(false)
  }, [])

  async function login(email: string, password: string) {
    try {
      const res = await api.post('/auth/login', { email, password })
      const { token, role, profile } = res.data

      if (role !== 'ADMIN' && role !== 'STAFF') {
        throw new Error('This portal is for SweetCasa administrators and staff only.')
      }

      Cookies.set('sc_admin_token', token)
      const adminProfile: AdminProfile = {
        id: profile.id,
        name: profile.name || profile.companyName || 'Admin',
        email: profile.email,
        role,
      }
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(adminProfile))
      setAdmin(adminProfile)
      router.push('/')
    } catch (err) {
      // Surface a clean message whether it's our own throw or an API error
      if (err instanceof Error && !('response' in (err as any))) throw err
      throw new Error(apiErrorMessage(err, 'Login failed. Check your credentials.'))
    }
  }

  function logout() {
    Cookies.remove('sc_admin_token')
    window.localStorage.removeItem(PROFILE_KEY)
    setAdmin(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ admin, loading, isAdmin: admin?.role === 'ADMIN', login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
