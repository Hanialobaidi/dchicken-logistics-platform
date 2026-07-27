import { redirect } from '@tanstack/react-router'

function getSupabaseUser(): { id: string; email: string } | null {
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

function getDriverSessionRaw(): { driverId: string; driverName: string; username: string } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('dchicken_driver_session')
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

export function requireAuth() {
  const driver = getDriverSessionRaw()
  if (driver) return
  const user = getSupabaseUser()
  if (user) return
  throw redirect({ to: '/' })
}

export function redirectIfLoggedIn() {
  const ds = getDriverSessionRaw()
  if (ds) throw redirect({ to: '/driver', replace: true })
  const user = getSupabaseUser()
  if (user) throw redirect({ to: '/app', replace: true })
}
