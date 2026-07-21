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
    queryFn: () => directOrdersTable.list<DirectOrder>({ select: 'id, driver_id, restaurant_name, chicken_type, quantity_kg, price_per_kg, actual_weight, status, payment_method, created_at', orderBy: { createdAt: 'desc' }, limit: 500 }),
  })
}

export function useUpdateDirectOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      directOrdersTable.update(id, cleanData(data)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['directOrders'] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}

export function useCreateDirectOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => directOrdersTable.create(cleanData(data)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['directOrders'] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}

export function useDeleteDirectOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => directOrdersTable.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['directOrders'] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}
