import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { purchasesTable, cleanData } from '@/lib/db'
import type { Purchase } from '@/types'

export function usePurchases() {
  return useQuery({
    queryKey: ['purchases'],
    queryFn: () => purchasesTable.list<Purchase>({ orderBy: { purchaseDate: 'desc' } }),
  })
}

export function useCreatePurchase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      const totalCost = (Number(data.quantityKg) || 0) * (Number(data.pricePerKg) || 0)
      return purchasesTable.create(cleanData({ ...data, totalCost }))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}

export function useDeletePurchase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => purchasesTable.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}
