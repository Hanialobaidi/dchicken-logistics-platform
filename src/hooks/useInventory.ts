import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { purchasesTable, directOrdersTable, tripRestaurantsTable, invoicesTable, cleanData } from '@/lib/db'
import type { Purchase, DirectOrder, TripRestaurant, Invoice } from '@/types'

/**
 * Computes live inventory = total purchased kg - total sold kg, with per chicken-type breakdown.
 */
export function useInventory() {
  const purchases = useQuery({
    queryKey: ['inventory', 'purchases'],
    queryFn: () => purchasesTable.list<Purchase>({ select: 'id, quantity_kg, purchase_date, chicken_type', orderBy: { purchaseDate: 'desc' } }),
  })

  const directOrders = useQuery({
    queryKey: ['inventory', 'directOrders'],
    queryFn: () => directOrdersTable.list<DirectOrder>({ select: 'id, actual_weight, status, created_at, restaurant_name, driver_name, total_price, chicken_type, order_date, payment_method, payment_status', orderBy: { createdAt: 'desc' }, limit: 500 }),
  })

  const tripRestaurants = useQuery({
    queryKey: ['inventory', 'tripRestaurants'],
    queryFn: () => tripRestaurantsTable.list<TripRestaurant>({ select: 'id, status, actual_weight, chicken_type', orderBy: { createdAt: 'desc' }, limit: 500 }),
  })

  const totalPurchasedKg = useMemo(
    () => (purchases.data ?? []).reduce((sum, p) => sum + (Number(p.quantityKg) || 0), 0),
    [purchases.data],
  )

  const totalSoldFromDirectOrders = useMemo(
    () => (directOrders.data ?? []).reduce((sum, o) => sum + (Number(o.actualWeight) || 0), 0),
    [directOrders.data],
  )

  const completedTripWeight = useMemo(
    () =>
      (tripRestaurants.data ?? [])
        .filter((tr) => tr.status === 'delivered')
        .reduce((sum, tr) => sum + (Number(tr.actualWeight) || 0), 0),
    [tripRestaurants.data],
  )

  const totalSoldKg = totalSoldFromDirectOrders + completedTripWeight
  const availableKg = totalPurchasedKg - totalSoldKg

  const byType = useMemo(() => {
    const purchased: Record<string, number> = {}
    for (const p of purchases.data ?? []) {
      const t = p.chickenType || 'غير محدد'
      purchased[t] = (purchased[t] || 0) + (Number(p.quantityKg) || 0)
    }

    const soldFromOrders: Record<string, number> = {}
    for (const o of directOrders.data ?? []) {
      if (o.status !== 'delivered') continue
      const t = o.chickenType || 'غير محدد'
      soldFromOrders[t] = (soldFromOrders[t] || 0) + (Number(o.actualWeight) || 0)
    }

    const soldFromTrips: Record<string, number> = {}
    for (const tr of tripRestaurants.data ?? []) {
      if (tr.status !== 'delivered') continue
      const t = tr.chickenType || 'غير محدد'
      soldFromTrips[t] = (soldFromTrips[t] || 0) + (Number(tr.actualWeight) || 0)
    }

    const types = new Set([...Object.keys(purchased), ...Object.keys(soldFromOrders), ...Object.keys(soldFromTrips)])
    return Array.from(types).map((type) => {
      const purchasedKg = purchased[type] || 0
      const soldKg = (soldFromOrders[type] || 0) + (soldFromTrips[type] || 0)
      return { type, purchasedKg, soldKg, availableKg: purchasedKg - soldKg }
    }).filter((r) => r.purchasedKg > 0)
  }, [purchases.data, directOrders.data, tripRestaurants.data])

  return {
    ...purchases,
    allDirectOrders: directOrders.data ?? [],
    totalPurchasedKg,
    totalSoldKg,
    totalSoldFromDirectOrders,
    completedTripWeight,
    availableKg,
    byType,
    isLoading: purchases.isLoading || directOrders.isLoading || tripRestaurants.isLoading,
  }
}

/* ─── Invoices ─── */

export function useInvoices(driverId?: string) {
  return useQuery({
    queryKey: ['invoices', { driverId }],
    queryFn: () => {
      const opts: Record<string, unknown> = { orderBy: { createdAt: 'desc' } }
      if (driverId) opts.where = { driverId }
      return invoicesTable.list<Invoice>(opts)
    },
  })
}

export function useCreateInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => invoicesTable.create<Invoice>(cleanData(data)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
    },
  })
}
