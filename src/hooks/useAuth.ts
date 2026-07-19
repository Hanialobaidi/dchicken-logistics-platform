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
  const [user, setUser] = useState<{ id: string; email: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [driverSession, setDriverSession] = useState<DriverSession | null>(null)

  useEffect(() => {
    // Check for driver session first
    const ds = getDriverSession()
    if (ds) {
      setDriverSession(ds)
      setIsLoading(false)
      return
    }

    // Check Supabase auth session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? '',
        })
      }
      setIsLoading(false)
    })

    // Listen for auth changes
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
