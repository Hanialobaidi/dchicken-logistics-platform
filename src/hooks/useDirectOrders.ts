import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { directOrdersTable, cleanData } from '@/lib/db'
import type { DirectOrder } from '@/types'

export function useDirectOrders(driverId?: string) {
  return useQuery({
    queryKey: ['directOrders', { driverId }],
    queryFn: () => {
      const opts: Record<string, unknown> = { orderBy: { createdAt: 'desc' } }
      if (driverId) opts.where = { driverId }
      return directOrdersTable.list<DirectOrder>(opts)
    },
  })
}

export function useAllDirectOrders() {
  return useQuery({
    queryKey: ['directOrders'],
    queryFn: () => directOrdersTable.list<DirectOrder>({ orderBy: { createdAt: 'desc' } }),
  })
}

export function useUpdateDirectOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      directOrdersTable.update(id, cleanData(data)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['directOrders'] })
    },
  })
}

export function useCreateDirectOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => directOrdersTable.create(cleanData(data)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['directOrders'] })
    },
  })
}
