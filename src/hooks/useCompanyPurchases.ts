import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { companyPurchasesTable, cleanData } from '@/lib/db'
import type { CompanyPurchase } from '@/types'

export function useCompanyPurchases() {
  return useQuery({
    queryKey: ['company-purchases'],
    queryFn: () => companyPurchasesTable.list<CompanyPurchase>({ orderBy: { purchaseDate: 'desc' } }),
  })
}

export function useCreateCompanyPurchase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      companyPurchasesTable.create(cleanData(data)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-purchases'] })
    },
  })
}

export function useDeleteCompanyPurchase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => companyPurchasesTable.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-purchases'] })
    },
  })
}
