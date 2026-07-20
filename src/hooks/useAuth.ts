import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { UserRole, DriverSession } from '@/types'
import { getDriverSession } from '@/hooks/useDrivers'

interface AuthState {
  user: { id: string; email: string } | null
  isLoading: boolean
  isAuthenticated: boolean
  role: UserRole
  driverSession: DriverSession | null
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<{ id: string; email: string } | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('sb-') && key.endsWith('-auth-token')) {
          const parsed = JSON.parse(localStorage.getItem(key) ?? '{}')
          const u = parsed?.user ?? parsed?.current_session?.user
          if (u?.id) return { id: u.id, email: u.email ?? '' }
        }
      }
    } catch { /* ignore */ }
    return null
  })
  const [isLoading, setIsLoading] = useState(() => !user)
  const [driverSession, setDriverSession] = useState<DriverSession | null>(null)

  useEffect(() => {
    const ds = getDriverSession()
    if (ds) {
      setDriverSession(ds)
      setIsLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? '',
        })
      }
      setIsLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? '',
        })
      } else {
        setUser(null)
      }
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // If driver is logged in via username/password
  if (driverSession) {
    return {
      user: null,
      isLoading: false,
      isAuthenticated: true,
      role: 'driver',
      driverSession,
    }
  }

  const role: UserRole = user ? 'admin' : null

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    role,
    driverSession: null,
  }
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  return data
}

export async function signOut() {
  await supabase.auth.signOut()
}
