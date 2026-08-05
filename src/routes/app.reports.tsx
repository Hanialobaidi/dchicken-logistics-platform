import { createFileRoute } from '@tanstack/react-router'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollToTop } from '@/components/ScrollToTop'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useDirectOrders } from '@/hooks/useDirectOrders'
import { usePurchases } from '@/hooks/usePurchases'
import { useInvoices } from '@/hooks/useInventory'
import { useCompanyPurchases } from '@/hooks/useCompanyPurchases'
import { directOrdersTable, purchasesTable, companyPurchasesTable } from '@/lib/db'
import type { DirectOrder, Purchase, CompanyPurchase, Invoice } from '@/types'
import { InvoicePreview, type InvoiceData } from '@/components/InvoicePreview'
import {
  Archive,
  Download,
  Filter,
  X,
  Search,
  ClipboardList,
  FileText,
  ShoppingCart,
  ArrowDownCircle,
  ArrowUpCircle,
  ShoppingBag,
  Eye,
  Store,
  Calendar,
  Receipt,
  Wallet,
} from 'lucide-react'
import { useState, useMemo, useCallback } from 'react'
import { formatNum, formatPriceFull, formatDate } from '@/lib/utils'
import { PullToRefresh } from '@/components/PullToRefresh'
import { useRefreshAll } from '@/hooks/useRefreshAll'

/* ──── Types ──── */
type OperationType = 'طلبية مباشرة' | 'مشتريات'

interface MergedRow {
  id: string
  type: OperationType
  name: string
  driverName: string
  date: string
  weight: number
  pricePerKg: number
  totalPrice: number
  paymentMethod: string
  status: string
  invoiceImageUrl: string | null
}

const STATUS_CONFIG: Record<string, { variant: 'default' | 'secondary' | 'destructive'; label: string }> = {
  pending: { variant: 'secondary', label: 'قيد الانتظار' },
  delivered: { variant: 'default', label: 'تم التسليم' },
  cancelled: { variant: 'destructive', label: 'ملغي' },
}

const TYPE_CONFIG: Record<OperationType, { icon: typeof ClipboardList; variant: 'default' | 'outline'; color: string }> = {
  'طلبية مباشرة': { icon: ClipboardList, variant: 'default', color: 'text-emerald-600 bg-emerald-50' },
  'مشتريات': { icon: ShoppingCart, variant: 'outline', color: 'text-amber-600 bg-amber-50' },
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'نقدي',
  network: 'شبكة',
  credit: 'آجل',
}

function invoiceDataFromRecord(inv: Invoice): InvoiceData {
  return {
    invoiceNumber: inv.invoiceNumber,
    date: formatDate(inv.invoiceDate),
    restaurantName: inv.restaurantName,
    restaurantTaxNumber: inv.restaurantTaxNumber,
    driverName: inv.driverName,
    quantityKg: inv.quantityKg,
    pricePerKg: inv.pricePerKg,
    paymentMethod: inv.paymentMethod,
    paymentStatus: inv.paymentStatus === 'paid' ? 'paid' : 'unpaid',
    chickenType: inv.chickenType || undefined,
  }
}

/* ──── CSV helpers ──── */
function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function buildCSV(headers: string[], rows: string[][]): string {
  const bom = '\uFEFF'
  return bom + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/* ──── Reports Page ──── */
function ReportsPage() {
  const refreshAll = useRefreshAll()
  const { data: directOrders = [] } = useDirectOrders()
  const { data: purchases = [] } = usePurchases()
  const { data: invoices = [] } = useInvoices()
  const { data: companyPurchases = [] } = useCompanyPurchases()

  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [typeFilter, setTypeFilter] = useState<OperationType | 'الكل'>('الكل')
  const [companySearch, setCompanySearch] = useState('')
  const [companyDateFrom, setCompanyDateFrom] = useState('')
  const [companyDateTo, setCompanyDateTo] = useState('')
  const [companyPreview, setCompanyPreview] = useState<string | null>(null)
  const [purchaseImagePreview, setPurchaseImagePreview] = useState<string | null>(null)
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null)

  // Map direct orders → their generated tax invoice (the one drivers see)
  const invoiceByOrderId = useMemo(() => {
    const map = new Map<string, Invoice>()
    for (const inv of invoices) {
      if (inv.orderType === 'direct_order' && inv.orderId && !map.has(inv.orderId)) {
        map.set(inv.orderId, inv)
      }
    }
    return map
  }, [invoices])

  // Merge all data types
  const mergedData = useMemo((): MergedRow[] => {
    const orderRows: MergedRow[] = directOrders.map((o) => ({
      id: o.id,
      type: 'طلبية مباشرة' as OperationType,
      name: o.restaurantName,
      driverName: o.driverName,
      date: o.orderDate,
      weight: o.actualWeight,
      pricePerKg: o.pricePerKg ?? 0,
      totalPrice: o.totalPrice ?? 0,
      paymentMethod: o.paymentMethod ?? 'cash',
      status: o.status,
      invoiceImageUrl: o.invoiceImageUrl ?? null,
    }))

    const purchaseRows: MergedRow[] = purchases.map((p) => ({
      id: p.id,
      type: 'مشتريات' as OperationType,
      name: p.farmName,
      driverName: '—',
      date: p.purchaseDate,
      weight: p.quantityKg,
      pricePerKg: p.pricePerKg,
      totalPrice: p.totalCost,
      paymentMethod: p.paymentMethod ?? 'cash',
      status: 'delivered',
      invoiceImageUrl: p.invoiceImageUrl ?? null,
    }))

    return [...orderRows, ...purchaseRows].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }, [directOrders, purchases])

  // Summary stats
  const totalRevenue = useMemo(() => mergedData.filter((r) => r.type !== 'مشتريات').reduce((s, r) => s + r.totalPrice, 0), [mergedData])
  const totalPurchasesCost = useMemo(() => mergedData.filter((r) => r.type === 'مشتريات').reduce((s, r) => s + r.totalPrice, 0), [mergedData])
  const totalCompanyPurchases = useMemo(
    () => companyPurchases.reduce((s, p) => s + (p.amount ?? 0), 0),
    [companyPurchases],
  )
  const totalInvoices = invoices.length

  // Company purchases filter (search + date range)
  const filteredCompany = useMemo(() => {
    const q = companySearch.trim().toLowerCase()
    return companyPurchases.filter((p) => {
      if (q && !p.itemName?.toLowerCase().includes(q) && !p.storeName?.toLowerCase().includes(q)) return false
      if (companyDateFrom && p.purchaseDate < companyDateFrom) return false
      if (companyDateTo && p.purchaseDate > companyDateTo) return false
      return true
    })
  }, [companyPurchases, companySearch, companyDateFrom, companyDateTo])

  const companyHasFilters = !!companySearch || !!companyDateFrom || !!companyDateTo

  const clearCompanyFilters = () => {
    setCompanySearch('')
    setCompanyDateFrom('')
    setCompanyDateTo('')
  }

  const companyTotal = useMemo(
    () => filteredCompany.reduce((s, p) => s + (p.amount ?? 0), 0),
    [filteredCompany],
  )
  const companyCount = filteredCompany.length
  const companyStores = useMemo(
    () => new Set(filteredCompany.map((p) => p.storeName)).size,
    [filteredCompany],
  )
  const companyAvg = companyCount ? companyTotal / companyCount : 0

  const companyStoreBreakdown = useMemo(() => {
    const map = new Map<string, { store: string; count: number; total: number }>()
    for (const p of filteredCompany) {
      const key = p.storeName ?? '—'
      const cur = map.get(key) ?? { store: key, count: 0, total: 0 }
      cur.count += 1
      cur.total += p.amount ?? 0
      map.set(key, cur)
    }
    return [...map.values()].sort((a, b) => b.total - a.total)
  }, [filteredCompany])

  // Filters
  const filtered = useMemo(() => {
    return mergedData.filter((row) => {
      if (typeFilter !== 'الكل' && row.type !== typeFilter) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchName = row.name.toLowerCase().includes(q)
        const matchDriver = row.driverName.toLowerCase().includes(q)
        if (!matchName && !matchDriver) return false
      }
      if (dateFrom && row.date < dateFrom) return false
      if (dateTo && row.date > dateTo) return false
      return true
    })
  }, [mergedData, typeFilter, searchQuery, dateFrom, dateTo])

  const hasFilters = searchQuery || dateFrom || dateTo || typeFilter !== 'الكل'

  const clearFilters = () => {
    setSearchQuery('')
    setDateFrom('')
    setDateTo('')
    setTypeFilter('الكل')
  }

  // CSV export — separate files for each type when "الكل" is selected
  const handleExport = useCallback(async () => {
    const [allOrders, allPurchases, allCompany] = await Promise.all([
      directOrdersTable.list<DirectOrder>({ orderBy: { createdAt: 'desc' }, limit: 500 }),
      purchasesTable.list<Purchase>({ orderBy: { purchaseDate: 'desc' }, limit: 500 }),
      companyPurchasesTable.list<CompanyPurchase>({ orderBy: { purchaseDate: 'desc' }, limit: 500 }),
    ])

    const orderHeaders = ['المطعم', 'السائق', 'التاريخ', 'الكمية (كجم)', 'سعر/كجم', 'الإجمالي', 'الدفع', 'الحالة']
    const purchaseHeaders = ['المزرعة', 'التاريخ', 'الكمية (كجم)', 'سعر/كجم', 'الإجمالي', 'طريقة الدفع', 'ملاحظات']
    const companyHeaders = ['التاريخ', 'السلعة', 'المحل', 'المبلغ', 'ملاحظات']

    if (typeFilter === 'طلبية مباشرة') {
      const rows = allOrders.map((o) => [
        o.restaurantName,
        o.driverName,
        o.orderDate,
        o.actualWeight,
        o.pricePerKg ?? 0,
        o.totalPrice ?? 0,
        PAYMENT_LABELS[o.paymentMethod ?? 'cash'] ?? 'نقدي',
        o.status === 'delivered' ? 'تم التسليم' : 'قيد الانتظار',
      ].map(escapeCSV))
      downloadCSV(buildCSV(orderHeaders, rows), `طلبيات_مباشرة_${new Date().toISOString().slice(0, 10)}.csv`)
      return
    }

    if (typeFilter === 'مشتريات') {
      const rows = allPurchases.map((p) => [
        p.farmName,
        p.purchaseDate,
        p.quantityKg,
        p.pricePerKg,
        p.totalCost,
        PAYMENT_LABELS[p.paymentMethod ?? 'cash'] ?? 'نقدي',
        p.notes ?? '',
      ].map(escapeCSV))
      downloadCSV(buildCSV(purchaseHeaders, rows), `مشتريات_${new Date().toISOString().slice(0, 10)}.csv`)
      return
    }

    // "الكل" — download two separate files
    const orderRows = allOrders.map((o) => [
      o.restaurantName,
      o.driverName,
      o.orderDate,
      o.actualWeight,
      o.pricePerKg ?? 0,
      o.totalPrice ?? 0,
      PAYMENT_LABELS[o.paymentMethod ?? 'cash'] ?? 'نقدي',
      o.status === 'delivered' ? 'تم التسليم' : 'قيد الانتظار',
    ].map(escapeCSV))

    const purchaseRows = allPurchases.map((p) => [
      p.farmName,
      p.purchaseDate,
      p.quantityKg,
      p.pricePerKg,
      p.totalCost,
      PAYMENT_LABELS[p.paymentMethod ?? 'cash'] ?? 'نقدي',
      p.notes ?? '',
    ].map(escapeCSV))

    const companyRows = allCompany.map((p) => [
      p.purchaseDate,
      p.itemName,
      p.storeName,
      p.amount,
      p.notes ?? '',
    ].map(escapeCSV))

    downloadCSV(buildCSV(orderHeaders, orderRows), `طلبيات_مباشرة_${new Date().toISOString().slice(0, 10)}.csv`)
    downloadCSV(buildCSV(purchaseHeaders, purchaseRows), `مشتريات_${new Date().toISOString().slice(0, 10)}.csv`)
    downloadCSV(buildCSV(companyHeaders, companyRows), `مشتريات_الشركة_${new Date().toISOString().slice(0, 10)}.csv`)
  }, [typeFilter])

  // CSV export — company purchases only (respects section filters)
  const handleCompanyExport = useCallback(() => {
    const headers = ['التاريخ', 'السلعة', 'المحل', 'المبلغ', 'ملاحظات']
    const rows = filteredCompany.map((p) => [
      p.purchaseDate,
      p.itemName,
      p.storeName,
      p.amount,
      p.notes ?? '',
    ].map(escapeCSV))
    downloadCSV(buildCSV(headers, rows), `مشتريات_الشركة_${new Date().toISOString().slice(0, 10)}.csv`)
  }, [filteredCompany])

  return (
    <PullToRefresh onRefresh={refreshAll}>
    <div dir="rtl" className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Archive className="h-5 w-5 text-primary" />
            التقارير الشاملة
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            سجل المشتريات والطلبيات المباشرة
          </p>
        </div>
        <Button onClick={handleExport} className="gap-2 min-h-[44px]">
          <Download className="h-4 w-4" />
          تصدير CSV
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <ArrowUpCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">إجمالي المبيعات</p>
              <p className="text-sm font-bold text-emerald-700">{formatPriceFull(totalRevenue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <ArrowDownCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">إجمالي المشتريات</p>
              <p className="text-sm font-bold text-amber-700">{formatPriceFull(totalPurchasesCost)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-violet-200 bg-violet-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">مشتريات الشركة</p>
              <p className="text-sm font-bold text-violet-700">{formatPriceFull(totalCompanyPurchases)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/10">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">العمليات</p>
              <p className="text-sm font-bold">{formatNum(mergedData.length)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/10">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">الفواتير</p>
              <p className="text-sm font-bold">{formatNum(totalInvoices)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5" />
              تصفية النتائج
            </p>
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex gap-1">
                {(['الكل', 'طلبية مباشرة', 'مشتريات'] as const).map((t) => (
                  <Button
                    key={t}
                    size="sm"
                    variant={typeFilter === t ? 'default' : 'outline'}
                    className="h-8 text-xs px-3"
                    onClick={() => setTypeFilter(t)}
                  >
                    {t}
                  </Button>
                ))}
              </div>
              <div className="relative">
                <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="بحث بالاسم..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-44 h-9 pr-8 text-xs text-right"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">من</span>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-36 h-9 text-xs"
                />
                <span className="text-xs text-muted-foreground">إلى</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-36 h-9 text-xs"
                />
              </div>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1 text-xs">
                  <X className="h-3 w-3" />
                  مسح
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Archive className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium">
                {hasFilters ? 'لا توجد نتائج مطابقة' : 'لا توجد عمليات مسجلة'}
              </p>
              <p className="text-xs text-muted-foreground max-w-xs">
                {hasFilters
                  ? 'جرب تغيير معايير التصفية'
                  : 'ستظهر المشتريات والطلبيات هنا فور تسجيلها'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">النوع</TableHead>
                    <TableHead className="text-right">الاسم</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">الكمية</TableHead>
                    <TableHead className="text-right">سعر/كجم</TableHead>
                    <TableHead className="text-right">الإجمالي</TableHead>
                    <TableHead className="text-right">الدفع</TableHead>
                    <TableHead className="text-right">الفاتورة</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => {
                    const cfg = STATUS_CONFIG[row.status] ?? STATUS_CONFIG.pending
                    const typeCfg = TYPE_CONFIG[row.type]
                    const TypeIcon = typeCfg.icon
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Badge variant={typeCfg.variant} className="gap-1">
                            <TypeIcon className="h-3 w-3" />
                            {row.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div>
                            <p className="text-sm">{row.name}</p>
                            {row.driverName !== '—' && (
                              <p className="text-xs text-muted-foreground">{row.driverName}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {row.date ? formatDate(row.date) : '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{row.weight} كجم</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {row.pricePerKg > 0 ? `${row.pricePerKg} ر.س` : '—'}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {row.totalPrice > 0 ? formatPriceFull(row.totalPrice) : '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {PAYMENT_LABELS[row.paymentMethod] ?? row.paymentMethod ?? '—'}
                        </TableCell>
                        <TableCell>
                          {row.type === 'طلبية مباشرة' ? (
                            (() => {
                              const inv = invoiceByOrderId.get(row.id)
                              return inv ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 gap-1 text-xs text-primary"
                                  onClick={() => setPreviewInvoice(inv)}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  الفاتورة
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )
                            })()
                          ) : row.invoiceImageUrl ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1 text-xs text-primary"
                              onClick={() => setPurchaseImagePreview(row.invoiceImageUrl)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              عرض
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={cfg.variant}>{cfg.label}</Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Purchase invoice image preview */}
      <Dialog open={!!purchaseImagePreview} onOpenChange={() => setPurchaseImagePreview(null)}>
        <DialogContent className="max-w-2xl gap-4">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center justify-end gap-2">
              صورة الفاتورة
              <FileText className="h-5 w-5 text-primary" />
            </DialogTitle>
          </DialogHeader>
          {purchaseImagePreview && (
            <img
              src={purchaseImagePreview}
              alt="فاتورة"
              className="w-full rounded-lg border object-contain max-h-[70vh]"
            />
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPurchaseImagePreview(null)} className="min-h-[44px] flex-1">
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generated tax invoice preview (same as the driver sees) */}
      {previewInvoice && (
        <InvoicePreview
          data={invoiceDataFromRecord(previewInvoice)}
          onClose={() => setPreviewInvoice(null)}
        />
      )}

      {/* Company purchases report */}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-violet-600" />
            تقرير المشتريات العامة للشركة
          </CardTitle>
          {companyPurchases.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleCompanyExport} className="gap-1.5 h-9 text-xs">
              <Download className="h-3.5 w-3.5" />
              تصدير CSV
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {/* Section summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="border-violet-200 bg-violet-50/50">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">إجمالي المبلغ</p>
                  <p className="text-sm font-bold text-violet-700 truncate">{formatPriceFull(companyTotal)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-violet-200 bg-violet-50/50">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
                  <Receipt className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">عدد العمليات</p>
                  <p className="text-sm font-bold text-violet-700">{formatNum(companyCount)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-violet-200 bg-violet-50/50">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
                  <Store className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">عدد المحلات</p>
                  <p className="text-sm font-bold text-violet-700">{formatNum(companyStores)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-violet-200 bg-violet-50/50">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
                  <Wallet className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">متوسط العملية</p>
                  <p className="text-sm font-bold text-violet-700 truncate">{formatPriceFull(companyAvg)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Section filters */}
          {companyPurchases.length > 0 && (
            <div className="flex flex-wrap gap-2 items-end">
              <div className="relative">
                <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="بحث بالسلعة أو المحل..."
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                  className="w-44 h-9 pr-8 text-xs text-right"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">من</span>
                <Input
                  type="date"
                  value={companyDateFrom}
                  onChange={(e) => setCompanyDateFrom(e.target.value)}
                  className="w-36 h-9 text-xs"
                />
                <span className="text-xs text-muted-foreground">إلى</span>
                <Input
                  type="date"
                  value={companyDateTo}
                  onChange={(e) => setCompanyDateTo(e.target.value)}
                  className="w-36 h-9 text-xs"
                />
              </div>
              {companyHasFilters && (
                <Button variant="ghost" size="sm" onClick={clearCompanyFilters} className="h-9 gap-1 text-xs">
                  <X className="h-3 w-3" />
                  مسح
                </Button>
              )}
            </div>
          )}

          {/* Table */}
          {companyPurchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <ShoppingBag className="h-7 w-7 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium">لا توجد مشتريات عامة مسجلة</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                سجّل مشتريات الشركة من قسم "مشتريات الشركة" — السلعة، السعر، المحل، وصورة الفاتورة
              </p>
            </div>
          ) : filteredCompany.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <p className="text-sm text-muted-foreground">لا توجد نتائج مطابقة للتصفية</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">السلعة</TableHead>
                    <TableHead className="text-right">المحل</TableHead>
                    <TableHead className="text-right">المبلغ</TableHead>
                    <TableHead className="text-right">ملاحظات</TableHead>
                    <TableHead className="text-right">الفاتورة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompany.map((p: CompanyPurchase) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-muted-foreground text-sm">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {formatDate(p.purchaseDate)}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{p.itemName}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        <span className="flex items-center gap-1.5">
                          <Store className="h-3 w-3 text-muted-foreground" />
                          {p.storeName}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {formatPriceFull(p.amount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs max-w-[180px] truncate">
                        {p.notes ?? '—'}
                      </TableCell>
                      <TableCell>
                        {p.invoiceImageUrl ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 text-xs text-primary"
                            onClick={() => setCompanyPreview(p.invoiceImageUrl)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            عرض
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Store breakdown */}
      {companyStoreBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Store className="h-4 w-4 text-violet-600" />
              الإنفاق حسب المحل
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {companyStoreBreakdown.map(({ store, count, total }) => {
              const pct = companyTotal ? (total / companyTotal) * 100 : 0
              return (
                <div key={store} className="space-y-1">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium truncate">{store}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatNum(count)} عملية · {formatPriceFull(total)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-violet-500/70"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Company purchase image preview */}
      <Dialog open={!!companyPreview} onOpenChange={() => setCompanyPreview(null)}>
        <DialogContent className="max-w-2xl gap-4">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center justify-end gap-2">
              صورة الفاتورة
              <FileText className="h-5 w-5 text-primary" />
            </DialogTitle>
          </DialogHeader>
          {companyPreview && (
            <img
              src={companyPreview}
              alt="فاتورة"
              className="w-full rounded-lg border object-contain max-h-[70vh]"
            />
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCompanyPreview(null)} className="min-h-[44px] flex-1">
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ScrollToTop />
    </div>
    </PullToRefresh>
  )
}

/* ──── Route ──── */
export const Route = createFileRoute('/app/reports')({
  ssr: false,
  head: () => ({ meta: [{ title: 'التقارير الشاملة · DChicken' }] }),
  component: () => <ReportsPage />,
})

/* ──── Skeleton ──── */
function ReportsSkeleton() {
  return (
    <div dir="rtl" className="p-6 space-y-6 animate-pulse">
      <div className="flex justify-between">
        <div className="h-8 w-1/4 rounded-md bg-muted" />
        <div className="h-9 w-32 rounded-md bg-muted" />
      </div>
      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 rounded-xl bg-muted" />)}
      </div>
      <div className="h-24 rounded-xl bg-muted" />
      <div className="h-64 rounded-xl bg-muted" />
    </div>
  )
}
