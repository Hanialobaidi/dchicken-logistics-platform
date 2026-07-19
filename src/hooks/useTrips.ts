import { useQuery } from '@tanstack/react-query'
import { tripsTable, tripRestaurantsTable } from '@/lib/db'
import type { Trip, TripRestaurant } from '@/types'

export function useTrips(status?: string) {
  return useQuery({
    queryKey: ['trips', { status }],
    queryFn: () => {
      const opts: Record<string, unknown> = { orderBy: { createdAt: 'desc' } }
      if (status) opts.where = { status }
      return tripsTable.list<Trip>(opts)
    },
  })
}

export function useTripRestaurants(tripId: string) {
  return useQuery({
    queryKey: ['tripRestaurants', tripId],
    queryFn: () =>
      tripRestaurantsTable.list<TripRestaurant>({
        where: { tripId },
        orderBy: { createdAt: 'asc' },
      }),
    enabled: !!tripId,
  })
}
