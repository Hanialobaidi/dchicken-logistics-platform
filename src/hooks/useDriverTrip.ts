import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tripsTable, tripRestaurantsTable, cleanData } from '@/lib/db'
import type { Trip, TripRestaurant } from '@/types'

/**
 * Get today's trip and its restaurants as TWO separate queries.
 * Query 2 fires as soon as Query 1 returns a trip ID.
 */
export function useDriverTrip(driverId: string) {
  const today = new Date().toISOString().slice(0, 10)

  const tripQuery = useQuery({
    queryKey: ['driverTrip', driverId],
    queryFn: () =>
      tripsTable.list<Trip>({
        select: 'id, trip_date, total_weight, driver_id, created_at',
        where: { AND: [{ driverId }, { tripDate: today }] },
        orderBy: { createdAt: 'desc' },
        limit: 1,
      }),
    enabled: !!driverId,
    staleTime: 30_000,
  })

  const trip = tripQuery.data?.[0] ?? null

  const restaurantsQuery = useQuery({
    queryKey: ['tripRestaurants', trip?.id ?? ''],
    queryFn: () =>
      tripRestaurantsTable.list<TripRestaurant>({
        select: 'id, restaurant_name, weight, status, actual_weight, invoice_image_url, notes, delivered_at, trip_id',
        where: { tripId: trip!.id },
        orderBy: { createdAt: 'asc' },
      }),
    enabled: !!trip?.id,
    staleTime: 30_000,
  })

  return {
    trip: trip ? { ...trip, restaurants: restaurantsQuery.data ?? [] } : null,
    isLoading: tripQuery.isLoading,
  }
}

export interface ConfirmDeliveryInput {
  tripRestaurantId: string
  actualWeight: number
  invoiceImageUrl?: string
  notes?: string
}

/**
 * Confirm a delivery: updates the trip_restaurant record with delivered status,
 * actual weight, optional invoice image, notes, and timestamp.
 */
export function useConfirmDelivery() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ConfirmDeliveryInput) =>
      tripRestaurantsTable.update(input.tripRestaurantId, cleanData({
        actualWeight: input.actualWeight,
        status: 'delivered',
        invoiceImageUrl: input.invoiceImageUrl ?? null,
        notes: input.notes ?? null,
        deliveredAt: new Date().toISOString(),
      })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tripRestaurants'] })
      qc.invalidateQueries({ queryKey: ['trips'] })
      qc.invalidateQueries({ queryKey: ['driverTrip'] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}
