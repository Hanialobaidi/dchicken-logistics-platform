import { redirect } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'

function getDriverSessionRaw(): { driverId: string; driverName: string; username: string } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('dchicken_driver_session')
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

function getSupabaseUserSync(): { id: string; email: string } | null {
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
}

async function getSupabaseUserAsync(): Promise<{ id: string; email: string } | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) return { id: session.user.id, email: session.user.email ?? '' }
  } catch { /* ignore */ }
  return null
}

export async function requireAuth() {
  const driver = getDriverSessionRaw()
  if (driver) return
  if (getSupabaseUserSync()) return
  if (await getSupabaseUserAsync()) return
  throw redirect({ to: '/' })
}

export async function redirectIfLoggedIn() {
  const ds = getDriverSessionRaw()
  if (ds) throw redirect({ to: '/driver', replace: true })
  if (getSupabaseUserSync()) throw redirect({ to: '/app', replace: true })
  const asyncUser = await getSupabaseUserAsync()
  if (asyncUser) throw redirect({ to: '/app', replace: true })
}
