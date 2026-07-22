import { createFileRoute } from '@tanstack/react-router'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { usePurchases } from '@/hooks/usePurchases'
import { useDirectOrders } from '@/hooks/useDirectOrders'
import { useInventory } from '@/hooks/useInventory'
import { useTrips, useTripRestaurants } from '@/hooks/useTrips'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  PiggyBank,
  CheckCircle2,
  Store,
  Wheat,
  Warehouse,
  AlertTriangle,
} from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { formatNum, formatPrice } from '@/lib/utils'
import type { TripRestaurant } from '@/types'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { PullToRefresh } from '@/components/PullToRefresh'
import { useRefreshAll } from '@/hooks/useRefreshAll'

const PIE_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

export const Route = createFileRoute('/app/analytics')({
  ssr: false,
  head: () => ({ meta: [{ title: 'التحليلات · DChicken' }] }),
  component: () => <AnalyticsPage />,
})

function AnalyticsPage() {
  const refreshAll = useRefreshAll()
  const { data: purchases = [], isLoading: purchasesLoading } = usePurchases()
  const { data: directOrders = [], isLoading: ordersLoading } = useDirectOrders()
  const { data: trips = [], isLoading: tripsLoading } = useTrips()
  const inventory = useInventory()

  const completedTrips = useMemo(() => trips.filter((t) => t.status === 'completed'), [trips])

  const { data: tr0 = [] } = useTripRestaurants(completedTrips[0]?.id ?? '')
  const { data: tr1 = [] } = useTripRestaurants(completedTrips[1]?.id ?? '')
  const { data: tr2 = [] } = useTripRestaurants(completedTrips[2]?.id ?? '')
  const { data: tr3 = [] } = useTripRestaurants(completedTrips[3]?.id ?? '')
  const { data: tr4 = [] } = useTripRestaurants(completedTrips[4]?.id ?? '')

  const isLoading = purchasesLoading || tripsLoading || ordersLoading

  const allDelivered: TripRestaurant[] = useMemo(
    () => [...tr0, ...tr1, ...tr2, ...tr3, ...tr4].filter((d) => d.status === 'delivered'),
    [tr0, tr1, tr2, tr3, tr4],
  )

  // ── KPI: real sales from actual prices ──
  const totalSalesFromTrips = useMemo(
    () => allDelivered.reduce((sum, d) => sum + (d.totalPrice ?? (d.actualWeight ?? 0) * (d.pricePerKg ?? 0)), 0),
    [allDelivered],
  )

  const totalSalesFromDirectOrders = useMemo(
    () => directOrders.reduce((sum, o) => sum + (o.totalPrice ?? 0), 0),
    [directOrders],
  )

  const totalSales = totalSalesFromTrips + totalSalesFromDirectOrders

  const totalPurchases = useMemo(
    () => purchases.reduce((sum, p) => sum + (p.totalCost ?? 0), 0),
    [purchases],
  )

  const netProfit = totalSales - totalPurchases
  const completedCount = completedTrips.length

  // ── Chart: sales vs purchases ──
  const salesVsPurchasesData = useMemo(
    () => [
      { name: 'المبيعات', value: totalSales },
      { name: 'المشتريات', value: totalPurchases },
    ],
    [totalSales, totalPurchases],
  )

  // ── Chart: top restaurants by revenue ──
  const restaurantSalesData = useMemo(() => {
    const map = new Map<string, number>()
    for (const d of allDelivered) {
      const revenue = d.totalPrice ?? (d.actualWeight ?? 0) * (d.pricePerKg ?? 0)
      map.set(d.restaurantName, (map.get(d.restaurantName) || 0) + revenue)
    }
    for (const o of directOrders) {
      map.set(o.restaurantName, (map.get(o.restaurantName) || 0) + (o.totalPrice ?? 0))
    }
    return Array.from(map.entries())
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8)
  }, [allDelivered, directOrders])

  // ── Chart: top farms by purchase cost ──
  const farmPurchasesData = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of purchases) {
      map.set(p.farmName, (map.get(p.farmName) || 0) + (p.totalCost ?? 0))
    }
    return Array.from(map.entries())
      .map(([name, cost]) => ({ name, cost }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 8)
  }, [purchases])

  const hasData = purchases.length > 0 || allDelivered.length > 0 || directOrders.length > 0

  return (
    <PullToRefresh onRefresh={refreshAll}>
    <div dir="rtl" className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          لوحة التحليلات
        </h1>
        <p className="text-sm text-muted-foreground">
          تحليل شامل لأداء المبيعات والمشتريات والأرباح بناءً على الأسعار الفعلية
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 rounded-xl bg-muted" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-72 rounded-xl bg-muted" />
            <div className="h-72 rounded-xl bg-muted" />
          </div>
          <div className="h-72 rounded-xl bg-muted" />
        </div>
      ) : !hasData ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <BarChart3 className="h-10 w-10 text-muted-foreground/40" />
          </div>
          <p className="text-lg font-medium">لا توجد بيانات كافية للتحليل</p>
          <p className="text-sm text-muted-foreground max-w-md">
            بعد إضافة عمليات الشراء وإكمال رحلات التوزيع، ستظهر التحليلات والرسوم البيانية هنا
          </p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon={<TrendingUp className="h-5 w-5" />}
              label="إجمالي المبيعات"
              value={formatPrice(totalSales)}
              color="blue"
            />
            <KpiCard
              icon={<ShoppingCart className="h-5 w-5" />}
              label="إجمالي المشتريات"
              value={formatPrice(totalPurchases)}
              color="amber"
            />
            <KpiCard
              icon={<PiggyBank className="h-5 w-5" />}
              label="صافي الأرباح"
              value={formatPrice(netProfit)}
              color={netProfit >= 0 ? 'green' : 'red'}
            />
            <KpiCard
              icon={<Warehouse className="h-5 w-5" />}
              label="المخزون المتوفر"
              value={`${formatNum(inventory.availableKg)} كجم`}
              color={inventory.availableKg < 100 && inventory.totalPurchasedKg > 0 ? 'red' : 'purple'}
            />
          </div>

          {/* Inventory alert */}
          {inventory.availableKg < 100 && inventory.totalPurchasedKg > 0 && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">تنبيه: المخزون منخفض</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    المتوفر: {formatNum(inventory.availableKg)} كجم — يرجى التخطيط لعملية شراء جديدة
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Inventory breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                  <TrendingDown className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">إجمالي المشتريات</p>
                  <p className="text-base font-bold">{formatNum(inventory.totalPurchasedKg)} كجم</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">إجمالي المبيعات</p>
                  <p className="text-base font-bold">{formatNum(inventory.totalSoldKg)} كجم</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500">
                  <Warehouse className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">المخزون المتبقي</p>
                  <p className="text-base font-bold">{formatNum(inventory.availableKg)} كجم</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar: Sales vs Purchases */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  المبيعات مقابل المشتريات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={salesVsPurchasesData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                    <Tooltip
                      formatter={(value: number) => [formatPrice(value), '']}
                      contentStyle={{ direction: 'rtl', borderRadius: '0.5rem', border: '1px solid var(--border)' }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={80}>
                      {salesVsPurchasesData.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? 'var(--primary)' : 'var(--chart-2)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Pie: Top restaurants by revenue */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Store className="h-4 w-4 text-primary" />
                  أعلى المطاعم إيراداً
                </CardTitle>
              </CardHeader>
              <CardContent>
                {restaurantSalesData.length === 0 ? (
                  <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
                    لا توجد تسليمات مكتملة بعد
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={restaurantSalesData}
                        dataKey="revenue"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={(props: { name?: string; percent?: number }) => `${props.name ?? ''} (${((props.percent ?? 0) * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {restaurantSalesData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [formatPrice(value), '']}
                        contentStyle={{ direction: 'rtl', borderRadius: '0.5rem', border: '1px solid var(--border)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Bar: Top farms by purchase cost */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Wheat className="h-4 w-4 text-primary" />
                أكثر المزارع شراءً منها
              </CardTitle>
            </CardHeader>
            <CardContent>
              {farmPurchasesData.length === 0 ? (
                <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                  لا توجد عمليات شراء مسجلة بعد
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={farmPurchasesData} layout="vertical" margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={120} />
                    <Tooltip
                      formatter={(value: number) => [formatPrice(value), '']}
                      contentStyle={{ direction: 'rtl', borderRadius: '0.5rem', border: '1px solid var(--border)' }}
                    />
                    <Bar dataKey="cost" radius={[0, 6, 6, 0]} fill="var(--chart-3)" maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Stats summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                ملخص الأداء
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/30">
                  <p className="text-2xl font-bold">{formatNum(completedCount)}</p>
                  <p className="text-xs text-muted-foreground">رحلات مكتملة</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/30">
                  <p className="text-2xl font-bold">{formatNum(directOrders.length)}</p>
                  <p className="text-xs text-muted-foreground">طلبيات مباشرة</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/30">
                  <p className="text-2xl font-bold">{formatNum(purchases.length)}</p>
                  <p className="text-xs text-muted-foreground">عمليات شراء</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/30">
                  <p className="text-2xl font-bold">
                    {totalSales > 0 ? `${((netProfit / totalSales) * 100).toFixed(0)}%` : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">هامش الربح</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
    </PullToRefresh>
  )
}

/* ── KPI Card ── */
function KpiCard({
  icon,
  label,
  value,
  color,
}: {
  icon: ReactNode
  label: string
  value: string
  color: 'blue' | 'amber' | 'green' | 'red' | 'purple'
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-primary/10 text-primary',
    amber: 'bg-amber-500/10 text-amber-500',
    green: 'bg-emerald-500/10 text-emerald-500',
    red: 'bg-red-500/10 text-red-500',
    purple: 'bg-purple-500/10 text-purple-500',
  }

  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${colorMap[color]}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold truncate">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

/* ── Skeleton ── */
function AnalyticsSkeleton() {
  return (
    <div dir="rtl" className="p-6 space-y-6 animate-pulse">
      <div className="h-8 w-1/3 rounded-md bg-muted" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 rounded-xl bg-muted" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-72 rounded-xl bg-muted" />
        <div className="h-72 rounded-xl bg-muted" />
      </div>
      <div className="h-72 rounded-xl bg-muted" />
    </div>
  )
}
