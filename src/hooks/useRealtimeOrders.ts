import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

function sendBrowserNotification(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' })
  }
}

export function useRealtimeOrders(enabled = true) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!enabled) return
    requestNotificationPermission()

    const channel = supabase
      .channel('realtime-direct-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_orders' },
        (payload) => {
          const order = payload.new as { restaurantName?: string; driverName?: string; actualWeight?: number } | undefined
          qc.invalidateQueries({ queryKey: ['directOrders'] })

          const desc = `${order?.driverName ?? 'سائق'} — ${order?.restaurantName ?? ''} · ${order?.actualWeight ?? ''} كجم`

          toast.info('طلبية جديدة!', { description: desc, duration: 10000 })
          sendBrowserNotification('DChicken — طلبية جديدة', desc)
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'direct_orders' },
        () => {
          qc.invalidateQueries({ queryKey: ['directOrders'] })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [enabled, qc])
}
