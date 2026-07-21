import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { chickenTypesTable, cleanData } from '@/lib/db'

export interface ChickenType {
  id: string
  name: string
  ownerId: string | null
  createdAt: string
}

/** Fetch all custom chicken types */
export function useChickenTypes() {
  return useQuery({
    queryKey: ['chickenTypes'],
    queryFn: () => chickenTypesTable.list<ChickenType>({ orderBy: { createdAt: 'asc' } }),
    staleTime: 60_000,
  })
}

/** Create a new chicken type (idempotent — skips if name already exists) */
export function useCreateChickenType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return null
      // Check if already exists
      const existing = await chickenTypesTable.list<ChickenType>({
        where: { name: trimmed },
        limit: 1,
      })
      if (existing.length > 0) return existing[0]
      return chickenTypesTable.create<ChickenType>(cleanData({ name: trimmed }))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chickenTypes'] })
    },
  })
}
