import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useRestaurants } from '@/hooks/useRestaurants'
import { useInventory } from '@/hooks/useInventory'
import { useUpdateDirectOrder } from '@/hooks/useDirectOrders'
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders'
import { toast } from 'sonner'
import {
  Store,
  Package,
  ChefHat,
  Warehouse,
  ArrowDownCircle,
  ArrowUpCircle,
  AlertTriangle,
  ClipboardList,
  CheckCircle,
  Truck,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { formatNum, formatPrice } from '@/lib/utils'
import { PullToRefresh } from '@/components/PullToRefresh'
import { useRefreshAll } from '@/hooks/useRefreshAll'

const ONE_DAY_MS = 24 * 60 * 60 * 1000

export const Route = createFileRoute('/app/')({
  ssr: false,
  head: () => ({ meta: [{ title: 'الرئيسية · DChicken' }] }),
  component: () => <DashboardHome />,
})

function DashboardHome() {
  const { data: restaurants = [] } = useRestaurants()
  const inventory = useInventory()
  const updateDirectOrder = useUpdateDirectOrder()
  useRealtimeOrders(true)
  const refreshAll = useRefreshAll()

  const allDirectOrders = inventory.allDirectOrders ?? []
  const restaurantCount = restaurants.length
  const pendingOrders = allDirectOrders.filter((o) => o.status === 'pending')
  const inventoryIsLow = inventory.availableKg < 100 && inventory.totalPurchasedKg > 0

  const handleAcceptOrder = async (orderId: string) => {
    try {
      await updateDirectOrder.mutateAsync({ id: orderId, status: 'delivered' })
      toast.success('تم قبول الطلبية')
    } catch {
      toast.error('فشل قبول الطلبية')
    }
  }

  const handleRejectOrder = async (orderId: string) => {
    try {
      await updateDirectOrder.mutateAsync({ id: orderId, status: 'cancelled' })
      toast.success('تم رفض الطلبية')
    } catch {
      toast.error('فشل رفض الطلبية')
    }
  }

  return (
    <PullToRefresh onRefresh={refreshAll}>
    <div dir="rtl" className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <ChefHat className="h-5 w-5 text-primary" />
          لوحة التحكم
        </h1>
        <p className="text-sm text-muted-foreground">
          نظرة عامة على عمليات التوزيع اليومية
        </p>
      </div>

      {/* Inventory Alert */}
      {inventoryIsLow && (
        <Card className="border-red-300 bg-red-50/80">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-700">تنبيه: المخزون منخفض</p>
              <p className="text-xs text-red-600">
                المخزون المتوفر ({formatNum(inventory.availableKg)} كجم) — يرجى إضافة مشتريات جديدة
              </p>
            </div>
            <Link to="/app/purchases">
              <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
                إضافة شراء
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <KpiCard
          icon={<Store className="h-5 w-5" />}
          label="عدد المطاعم"
          value={String(restaurantCount)}
          color="blue"
        />
        <KpiCard
          icon={<Package className="h-5 w-5" />}
          label="الطلبات المباشرة"
          value={String(allDirectOrders.length)}
          color="green"
        />
      </div>

      {/* Inventory Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
              <ArrowDownCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold">{formatNum(inventory.totalPurchasedKg)} كجم</p>
              <p className="text-xs text-muted-foreground">إجمالي المشتريات</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <ArrowUpCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold">{formatNum(inventory.totalSoldKg)} كجم</p>
              <p className="text-xs text-muted-foreground">إجمالي المبيعات</p>
            </div>
          </CardContent>
        </Card>
        <Card className={inventoryIsLow ? 'border-red-300 bg-red-50/30' : ''}>
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${inventoryIsLow ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                <Warehouse className="h-5 w-5" />
              </div>
              <div>
                <p className={`text-xl font-bold ${inventoryIsLow ? 'text-red-600' : ''}`}>
                  {formatNum(inventory.availableKg)} كجم
                </p>
                <p className="text-xs text-muted-foreground">المخزون المتوفر</p>
              </div>
            </div>
            {inventory.byType.length > 1 && (
              <div className="mt-3 pt-3 border-t space-y-1">
                {inventory.byType.map((t) => (
                  <div key={t.type} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{t.type}</span>
                    <span className="font-semibold tabular-nums">{formatNum(t.availableKg)} كجم</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Direct Orders */}
      {pendingOrders.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-amber-600" />
              طلبيات مباشرة تنتظر القبول
              <Badge variant="secondary" className="mr-1">{pendingOrders.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingOrders.map((order) => (
              <div
                key={order.id}
                className="flex flex-col gap-2 rounded-lg border bg-background p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm shrink-0">
                      <Truck className="h-4 w-4 text-amber-600" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{order.restaurantName}</p>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-x-1">
                        <span>{order.driverName}</span>
                        <span>·</span>
                        <span>{order.actualWeight} كجم</span>
                        {order.totalPrice > 0 && (
                          <>
                            <span>·</span>
                            <span>{formatPrice(order.totalPrice)}</span>
                          </>
                        )}
                        {order.chickenType && (
                          <>
                            <span>·</span>
                            <span>{order.chickenType}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0">قيد الانتظار</Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleAcceptOrder(order.id)}
                    disabled={updateDirectOrder.isPending}
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    قبول
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1.5"
                    onClick={() => handleRejectOrder(order.id)}
                    disabled={updateDirectOrder.isPending}
                  >
                    رفض
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Deliveries — last 24h only */}
      <RecentDeliveries directOrders={allDirectOrders} />

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link to="/app/restaurants">
          <Button size="lg" className="gap-2 min-h-[44px]">
            <Store className="h-4 w-4" />
            إضافة مطعم
          </Button>
        </Link>
        <Link to="/app/purchases">
          <Button variant="outline" size="lg" className="gap-2 min-h-[44px]">
            <Package className="h-4 w-4" />
            إضافة مشتريات
          </Button>
        </Link>
      </div>
    </div>
    </PullToRefresh>
  )
}

function KpiCard({
  icon,
  label,
  value,
  color,
}: {
  icon: ReactNode
  label: string
  value: string
  color: 'blue' | 'amber' | 'green'
}) {
  const colorMap = {
    blue: 'bg-primary/10 text-primary',
    amber: 'bg-amber-500/10 text-amber-600',
    green: 'bg-emerald-500/10 text-emerald-600',
  }

  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${colorMap[color]}`}
        >
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function RecentDeliveries({ directOrders }: { directOrders: { id: string; driverName: string; restaurantName: string; actualWeight: number; totalPrice: number; chickenType: string; orderDate: string; status: string; createdAt: string }[] }) {
  const now = Date.now()
  const delivered = directOrders
    .filter((o) => o.status === 'delivered' && (now - new Date(o.createdAt).getTime()) < ONE_DAY_MS)
    .slice(0, 5)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          آخر التسليمات (24 ساعة)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {delivered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            لا توجد تسليمات في آخر 24 ساعة
          </p>
        ) : (
          <div className="space-y-2">
            {delivered.map((d) => (
              <div
                key={d.id}
                className="rounded-lg border bg-muted/20 px-3 py-2.5 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{d.restaurantName}</p>
                  <Badge variant="default">تم التسليم</Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{d.driverName}</span>
                  <span>·</span>
                  <span>{d.actualWeight} كجم</span>
                  {d.totalPrice > 0 && (
                    <>
                      <span>·</span>
                      <span>{formatPrice(d.totalPrice)}</span>
                    </>
                  )}
                  {d.chickenType && (
                    <>
                      <span>·</span>
                      <span>{d.chickenType}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <div dir="rtl" className="p-6 space-y-6 animate-pulse">
      <div className="h-8 w-1/3 rounded-md bg-muted" />
      <div className="grid grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-muted" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-muted" />
        ))}
      </div>
      <div className="h-40 rounded-xl bg-muted" />
    </div>
  )
}
