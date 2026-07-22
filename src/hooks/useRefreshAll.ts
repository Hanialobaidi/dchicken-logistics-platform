import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export function useRefreshAll() {
  const qc = useQueryClient()
  return useCallback(async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['inventory'] }),
      qc.invalidateQueries({ queryKey: ['directOrders'] }),
      qc.invalidateQueries({ queryKey: ['purchases'] }),
      qc.invalidateQueries({ queryKey: ['drivers'] }),
      qc.invalidateQueries({ queryKey: ['restaurants'] }),
      qc.invalidateQueries({ queryKey: ['driverTrip'] }),
      qc.invalidateQueries({ queryKey: ['tripRestaurants'] }),
      qc.invalidateQueries({ queryKey: ['trips'] }),
      qc.invalidateQueries({ queryKey: ['invoices'] }),
      qc.invalidateQueries({ queryKey: ['chickenTypes'] }),
    ])
  }, [qc])
}
