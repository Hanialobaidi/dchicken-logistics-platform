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

export async function requireAuth() {
  const driver = getDriverSessionRaw()
  if (driver) return

  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) return
  } catch { /* ignore */ }

  throw redirect({ to: '/' })
}

export async function redirectIfLoggedIn() {
  const ds = getDriverSessionRaw()
  if (ds) throw redirect({ to: '/driver', replace: true })

  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) throw redirect({ to: '/app', replace: true })
  } catch (e) {
    if (e && typeof e === 'object' && 'to' in e) throw e
  }
}
