import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tripsTable, tripRestaurantsTable, cleanData } from '@/lib/db'
import type { Trip, TripRestaurant } from '@/types'

/** Get the driver's most recent trip for today with restaurants in one query. */
export function useDriverTrip(driverId: string) {
  return useQuery({
    queryKey: ['driverTrip', driverId],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10)
      const trips = await tripsTable.list<Trip & { tripRestaurants?: TripRestaurant[] }>({
        where: { AND: [{ driverId }, { tripDate: today }] },
        orderBy: { createdAt: 'desc' },
        limit: 1,
      })
      const trip = trips[0] ?? null
      if (!trip) return null
      const restaurants = await tripRestaurantsTable.list<TripRestaurant>({
        where: { tripId: trip.id },
        orderBy: { createdAt: 'asc' },
      })
      return { ...trip, restaurants }
    },
    enabled: !!driverId,
    staleTime: 30_000,
  })
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
    },
  })
}
