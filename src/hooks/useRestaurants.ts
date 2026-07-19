import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { restaurantsTable, cleanData } from '@/lib/db'
import type { Restaurant } from '@/types'

export function useRestaurants() {
  return useQuery({
    queryKey: ['restaurants'],
    queryFn: () => restaurantsTable.list<Restaurant>({ orderBy: { name: 'asc' } }),
  })
}

export function useCreateRestaurant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => restaurantsTable.create(cleanData(data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['restaurants'] }),
  })
}

export function useDeleteRestaurant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => restaurantsTable.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['restaurants'] }),
  })
}
