import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { chickenSizesTable, cleanData } from '@/lib/db'
import type { ChickenSize } from '@/types'

/** Fetch all custom chicken sizes */
export function useChickenSizes() {
  return useQuery({
    queryKey: ['chickenSizes'],
    queryFn: () => chickenSizesTable.list<ChickenSize>({ orderBy: { createdAt: 'asc' } }),
    staleTime: 60_000,
  })
}

/** Create a new chicken size (idempotent — skips if name already exists) */
export function useCreateChickenSize() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return null
      const existing = await chickenSizesTable.list<ChickenSize>({
        where: { name: trimmed },
        limit: 1,
      })
      if (existing.length > 0) return existing[0]
      return chickenSizesTable.create<ChickenSize>(cleanData({ name: trimmed }))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chickenSizes'] })
    },
  })
}
