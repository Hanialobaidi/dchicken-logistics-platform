import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { driversTable, cleanData } from '@/lib/db'
import type { Driver, DriverSession } from '@/types'

const DRIVER_SESSION_KEY = 'dchicken_driver_session'

export function useDrivers(enabled = true) {
  return useQuery({
    queryKey: ['drivers'],
    queryFn: () => driversTable.list<Driver>({ orderBy: { name: 'asc' } }),
    enabled,
  })
}

export function useCreateDriver() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => driversTable.create(cleanData(data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drivers'] }),
  })
}

export function useUpdateDriver() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      driversTable.update(id, cleanData(data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drivers'] }),
  })
}

export function useDeleteDriver() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => driversTable.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drivers'] }),
  })
}

export function useDriverLogin() {
  return useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const drivers = await driversTable.list<Driver>({
        where: { username },
        limit: 1,
      })
      const driver = drivers[0]
      if (!driver) throw new Error('اسم المستخدم غير موجود')
      if (driver.password !== password) throw new Error('كلمة المرور غير صحيحة')
      const session: DriverSession = {
        driverId: driver.id,
        driverName: driver.name,
        username: driver.username,
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem(DRIVER_SESSION_KEY, JSON.stringify(session))
      }
      return session
    },
  })
}

export function getDriverSession(): DriverSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(DRIVER_SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as DriverSession
  } catch {
    return null
  }
}

export function clearDriverSession() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(DRIVER_SESSION_KEY)
  }
}
