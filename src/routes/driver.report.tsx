import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollToTop } from '@/components/ScrollToTop'
import { useAuth } from '@/hooks/useAuth'
import { useDriverTrip } from '@/hooks/useDriverTrip'
import { useDrivers, getDriverSession } from '@/hooks/useDrivers'
import { useInventory } from '@/hooks/useInventory'
import { directOrdersTable } from '@/lib/db'
import {
  ArrowRight,
  Printer,
  Truck,
  Warehouse,
  FileText,
  Weight,
} from 'lucide-react'
import type { DirectOrder } from '@/types'
import { formatNum, formatPrice, formatDate, formatDateLong } from '@/lib/utils'

export const Route = createFileRoute('/driver/report')({
  ssr: false,
  head: () => ({ meta: [{ title: 'تقرير اليوم · DChicken' }] }),
  component: () => <DriverReportPage />,
})

function DriverReportPage() {
  const navigate = useNavigate()
  const { role } = useAuth()
  const { data: drivers = [] } = useDrivers(role === 'admin')
  const inventory = useInventory()

  const syncSession = typeof window !== 'undefined' ? getDriverSession() : null

  const effectiveDriverId = role === 'admin'
    ? (drivers[0]?.id ?? '')
    : (syncSession?.driverId ?? '')

  const effectiveDriverName = role === 'admin'
    ? (drivers[0]?.name ?? '—')
    : (syncSession?.driverName ?? 'السائق')

  const { trip } = useDriverTrip(effectiveDriverId)
  const stops = trip?.restaurants ?? []

  const { data: directOrders = [] } = useQuery({
    queryKey: ['directOrders', { driverId: effectiveDriverId }],
    queryFn: () => directOrdersTable.list<DirectOrder>({
      select: 'id, restaurant_name, actual_weight, status, price_per_kg, payment_method, total_price, chicken_type, order_date, created_at',
      where: { driverId: effectiveDriverId },
      orderBy: { createdAt: 'desc' },
      limit: 100,
    }),
    enabled: !!effectiveDriverId,
  })

  const today = new Date().toISOString().slice(0, 10)

  const todayOrders = directOrders.filter((o) => o.orderDate === today || o.createdAt?.slice(0, 10) === today)

  const tripTotalWeight = stops.reduce((sum, s) => sum + (Number(s.actualWeight) || 0), 0)
  const tripTotalPrice = stops.reduce((sum, s) => sum + (Number(s.totalPrice) || 0), 0)
  const orderTotalWeight = todayOrders.reduce((sum, o) => sum + (Number(o.actualWeight) || 0), 0)
  const orderTotalPrice = todayOrders.reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0)
  const grandTotalWeight = tripTotalWeight + orderTotalWeight
  const grandTotalPrice = tripTotalPrice + orderTotalPrice

  const tripDelivered = stops.filter((s) => s.status === 'delivered')
  const tripCancelled = stops.filter((s) => s.status === 'cancelled')
  const tripPending = stops.filter((s) => s.status === 'pending')

  const handlePrint = () => window.print()

  return (
    <div dir="rtl" className="min-h-dvh bg-background">
      {/* Header - no print */}
      <div className="no-print sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground"
              onClick={() => navigate({ to: '/driver' })}
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <FileText className="h-5 w-5 text-primary" />
            <span className="text-sm font-bold">تقرير اليوم</span>
          </div>
          <Button onClick={handlePrint} className="gap-2 min-h-[44px]">
            <Printer className="h-4 w-4" />
            طباعة التقرير
          </Button>
        </div>
      </div>

      {/* Report content */}
      <div className="mx-auto max-w-2xl px-4 py-6 space-y-6 print:max-w-full print:px-2 print:py-0">
        {/* Print header */}
        <div className="hidden print:block text-center border-b-2 border-black pb-4 mb-4">
          <h1 className="text-xl font-bold">آفاق الرغد للدواجن</h1>
          <p className="text-sm mt-1">تقرير التوصيلات اليومية</p>
          <div className="flex justify-between mt-2 text-sm">
            <span>التاريخ: {formatDateLong(new Date())}</span>
            <span>السائق: {effectiveDriverName}</span>
          </div>
        </div>

        {/* Screen header */}
        <div className="print:hidden text-center space-y-1">
          <h1 className="text-lg font-bold flex items-center justify-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            تقرير التوصيلات اليومية
          </h1>
          <p className="text-sm text-muted-foreground">
            {formatDateLong(new Date())}
            {' — '}
            {effectiveDriverName}
          </p>
        </div>

        {/* Inventory card */}
        <Card className="print:border print:border-gray-300">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Warehouse className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold">{formatNum(inventory.availableKg)} كجم</p>
                <p className="text-sm font-semibold">المخزون المتوفر</p>
                {inventory.byType.length > 1 && (
                  <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    {inventory.byType.map((t) => (
                      <span key={t.type}>
                        {t.type}: {formatNum(t.availableKg)} كجم
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {inventory.availableKg < 100 && inventory.totalPurchasedKg > 0 && (
                <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">منخفض</span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-center">
              <div className="rounded-lg bg-muted p-2">
                <p className="text-xs text-muted-foreground">المشتريات</p>
                <p className="text-sm font-bold">{formatNum(inventory.totalPurchasedKg)} كجم</p>
              </div>
              <div className="rounded-lg bg-muted p-2">
                <p className="text-xs text-muted-foreground">المبيعات</p>
                <p className="text-sm font-bold">{formatNum(inventory.totalSoldKg)} كجم</p>
              </div>
              <div className={`rounded-lg p-2 ${inventory.availableKg < 100 ? 'bg-red-50' : 'bg-emerald-50'}`}>
                <p className="text-xs text-muted-foreground">المتوفر</p>
                <p className={`text-sm font-bold ${inventory.availableKg < 100 ? 'text-red-600' : 'text-emerald-600'}`}>{formatNum(inventory.availableKg)} كجم</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trip deliveries */}
        {stops.length > 0 && (
          <Card className="print:border print:border-gray-300">
            <CardContent className="p-4 space-y-3">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                توصيلات اليوم (الرحلة)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-right py-2 font-medium">#</th>
                      <th className="text-right py-2 font-medium">المطعم</th>
                      <th className="text-right py-2 font-medium">الوزن</th>
                      <th className="text-right py-2 font-medium">المبلغ</th>
                      <th className="text-right py-2 font-medium">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stops.map((stop, i) => (
                      <tr key={stop.id} className="border-b last:border-0">
                        <td className="py-2 text-muted-foreground">{i + 1}</td>
                        <td className="py-2 font-medium">{stop.restaurantName}</td>
                        <td className="py-2 text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Weight className="h-3 w-3" />
                            {stop.actualWeight != null ? `${stop.actualWeight} كجم` : `${stop.targetWeight} كجم (مستهدف)`}
                          </span>
                        </td>
                        <td className="py-2">{formatPrice(stop.totalPrice || 0)}</td>
                        <td className="py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            stop.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                            stop.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {stop.status === 'delivered' ? 'تم التسليم' : stop.status === 'cancelled' ? 'ملغي' : 'قيد الانتظار'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-bold">
                      <td colSpan={2} className="py-2">الإجمالي</td>
                      <td className="py-2">{formatNum(tripTotalWeight)} كجم</td>
                      <td className="py-2">{formatPrice(tripTotalPrice)}</td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {tripDelivered.length} تم / {tripCancelled.length} ملغي / {tripPending.length} انتظار
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Direct orders */}
        {todayOrders.length > 0 && (
          <Card className="print:border print:border-gray-300">
            <CardContent className="p-4 space-y-3">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                الطلبات المباشرة
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-right py-2 font-medium">#</th>
                      <th className="text-right py-2 font-medium">المطعم</th>
                      <th className="text-right py-2 font-medium">الوزن</th>
                      <th className="text-right py-2 font-medium">المبلغ</th>
                      <th className="text-right py-2 font-medium">الدفع</th>
                      <th className="text-right py-2 font-medium">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayOrders.map((order, i) => (
                      <tr key={order.id} className="border-b last:border-0">
                        <td className="py-2 text-muted-foreground">{i + 1}</td>
                        <td className="py-2 font-medium">{order.restaurantName}</td>
                        <td className="py-2 text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Weight className="h-3 w-3" />
                            {order.actualWeight} كجم
                          </span>
                        </td>
                        <td className="py-2">{formatPrice(order.totalPrice || 0)}</td>
                        <td className="py-2 text-xs text-muted-foreground">
                          {order.paymentMethod === 'cash' ? 'نقدي' : order.paymentMethod === 'network' ? 'شبكة' : 'آجل'}
                        </td>
                        <td className="py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {order.status === 'delivered' ? 'تم التسليم' : 'قيد الانتظار'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-bold">
                      <td colSpan={2} className="py-2">الإجمالي</td>
                      <td className="py-2">{formatNum(orderTotalWeight)} كجم</td>
                      <td className="py-2">{formatPrice(orderTotalPrice)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {stops.length === 0 && todayOrders.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Truck className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">لا توجد توصيلات اليوم</p>
          </div>
        )}

        {/* Grand total */}
        {(stops.length > 0 || todayOrders.length > 0) && (
          <Card className="print:border print:border-gray-300 bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">المجموع الكلي</span>
                <div className="text-left">
                  <p className="text-xl font-bold">{formatPrice(grandTotalPrice)}</p>
                  <p className="text-xs text-muted-foreground">{formatNum(grandTotalWeight)} كجم</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Print footer */}
        <div className="hidden print:block text-center text-xs text-muted-foreground border-t pt-4 mt-8">
          آفاق الرغد للدواجن — {formatDate(new Date())}
        </div>
      </div>

      <div className="print:hidden">
        <ScrollToTop />
      </div>
    </div>
  )
}
