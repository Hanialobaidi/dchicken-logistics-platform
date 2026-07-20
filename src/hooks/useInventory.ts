import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { purchasesTable, directOrdersTable, tripsTable, invoicesTable, cleanData } from '@/lib/db'
import type { Purchase, DirectOrder, Trip, Invoice } from '@/types'

/**
 * Computes live inventory = total purchased kg - total sold kg.
 */
export function useInventory() {
  const purchases = useQuery({
    queryKey: ['purchases'],
    queryFn: () => purchasesTable.list<Purchase>({ orderBy: { purchaseDate: 'desc' } }),
  })

  const directOrders = useQuery({
    queryKey: ['directOrders'],
    queryFn: () => directOrdersTable.list<DirectOrder>({ orderBy: { createdAt: 'desc' } }),
  })

  const trips = useQuery({
    queryKey: ['trips'],
    queryFn: () => tripsTable.list<Trip>({ orderBy: { createdAt: 'desc' } }),
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
      (trips.data ?? [])
        .filter((t) => t.status === 'completed')
        .reduce((sum, t) => sum + (Number(t.totalWeight) || 0), 0),
    [trips.data],
  )

  const totalSoldKg = totalSoldFromDirectOrders + completedTripWeight
  const availableKg = totalPurchasedKg - totalSoldKg

  return {
    ...purchases,
    allDirectOrders: directOrders.data ?? [],
    totalPurchasedKg,
    totalSoldKg,
    totalSoldFromDirectOrders,
    completedTripWeight,
    availableKg,
    isLoading: purchases.isLoading || directOrders.isLoading || trips.isLoading,
  }
}

/* ─── Invoices ─── */

export function useInvoices() {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: () => invoicesTable.list<Invoice>({ orderBy: { createdAt: 'desc' } }),
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
