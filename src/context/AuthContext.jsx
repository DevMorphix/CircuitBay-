import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api.js'

// Signed-in user, loaded once from GET /api/auth/me after hydration.
// status: 'loading' | 'signed-in' | 'signed-out'
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let cancelled = false
    api
      .get('/auth/me')
      .then((r) => !cancelled && (setUser(r.user), setStatus(r.user ? 'signed-in' : 'signed-out')))
      .catch(() => !cancelled && setStatus('signed-out'))
    return () => {
      cancelled = true
    }
  }, [])

  // Call with the `user` returned by login/register/OTP/reset responses
  const signedIn = useCallback((u) => {
    setUser(u)
    setStatus('signed-in')
  }, [])

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => {})
    setUser(null)
    setStatus('signed-out')
  }, [])

  const value = useMemo(() => ({ user, status, signedIn, logout, setUser }), [user, status, signedIn, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
