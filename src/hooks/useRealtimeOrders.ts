import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export function useRealtimeOrders(enabled = true) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!enabled) return

    const channel = supabase
      .channel('realtime-direct-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_orders' },
        (payload) => {
          const order = payload.new as { restaurantName?: string; driverName?: string; actualWeight?: number } | undefined
          qc.invalidateQueries({ queryKey: ['directOrders'] })

          toast.info('طلبية جديدة!', {
            description: `${order?.driverName ?? 'سائق'} — ${order?.restaurantName ?? ''} · ${order?.actualWeight ?? ''} كجم`,
            duration: 10000,
          })
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
