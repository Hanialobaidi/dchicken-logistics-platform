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

/* â”€â”€â”€â”€ Types â”€â”€â”€â”€ */
type OperationType = 'ط·ظ„ط¨ظٹط© ظ…ط¨ط§ط´ط±ط©' | 'ظ…ط´طھط±ظٹط§طھ'

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
  pending: { variant: 'secondary', label: 'ظ‚ظٹط¯ ط§ظ„ط§ظ†طھط¸ط§ط±' },
  delivered: { variant: 'default', label: 'طھظ… ط§ظ„طھط³ظ„ظٹظ…' },
  cancelled: { variant: 'destructive', label: 'ظ…ظ„ط؛ظٹ' },
}

const TYPE_CONFIG: Record<OperationType, { icon: typeof ClipboardList; variant: 'default' | 'outline'; color: string }> = {
  'ط·ظ„ط¨ظٹط© ظ…ط¨ط§ط´ط±ط©': { icon: ClipboardList, variant: 'default', color: 'text-emerald-600 bg-emerald-50' },
  'ظ…ط´طھط±ظٹط§طھ': { icon: ShoppingCart, variant: 'outline', color: 'text-amber-600 bg-amber-50' },
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'ظ†ظ‚ط¯ظٹ',
  network: 'ط´ط¨ظƒط©',
  credit: 'ط¢ط¬ظ„',
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

/* â”€â”€â”€â”€ CSV helpers â”€â”€â”€â”€ */
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

/* â”€â”€â”€â”€ Reports Page â”€â”€â”€â”€ */
function ReportsPage() {
  const refreshAll = useRefreshAll()
  const { data: directOrders = [] } = useDirectOrders()
  const { data: purchases = [] } = usePurchases()
  const { data: invoices = [] } = useInvoices()
  const { data: companyPurchases = [] } = useCompanyPurchases()

  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [typeFilter, setTypeFilter] = useState<OperationType | 'ط§ظ„ظƒظ„'>('ط§ظ„ظƒظ„')
  const [companySearch, setCompanySearch] = useState('')
  const [companyDateFrom, setCompanyDateFrom] = useState('')
  const [companyDateTo, setCompanyDateTo] = useState('')
  const [companyPreview, setCompanyPreview] = useState<string | null>(null)
  const [purchaseImagePreview, setPurchaseImagePreview] = useState<string | null>(null)
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null)

  // Map direct orders â†’ their generated tax invoice (the one drivers see)
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
      type: 'ط·ظ„ط¨ظٹط© ظ…ط¨ط§ط´ط±ط©' as OperationType,
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
      type: 'ظ…ط´طھط±ظٹط§طھ' as OperationType,
      name: p.farmName,
      driverName: 'â€”',
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
  const totalRevenue = useMemo(() => mergedData.filter((r) => r.type !== 'ظ…ط´طھط±ظٹط§طھ').reduce((s, r) => s + r.totalPrice, 0), [mergedData])
  const totalPurchasesCost = useMemo(() => mergedData.filter((r) => r.type === 'ظ…ط´طھط±ظٹط§طھ').reduce((s, r) => s + r.totalPrice, 0), [mergedData])
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
      const key = p.storeName ?? 'â€”'
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
      if (typeFilter !== 'ط§ظ„ظƒظ„' && row.type !== typeFilter) return false
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

  const hasFilters = searchQuery || dateFrom || dateTo || typeFilter !== 'ط§ظ„ظƒظ„'

  const clearFilters = () => {
    setSearchQuery('')
    setDateFrom('')
    setDateTo('')
    setTypeFilter('ط§ظ„ظƒظ„')
  }

  // CSV export â€” separate files for each type when "ط§ظ„ظƒظ„" is selected
  const handleExport = useCallback(async () => {
    const [allOrders, allPurchases, allCompany] = await Promise.all([
      directOrdersTable.list<DirectOrder>({ orderBy: { createdAt: 'desc' }, limit: 500 }),
      purchasesTable.list<Purchase>({ orderBy: { purchaseDate: 'desc' }, limit: 500 }),
      companyPurchasesTable.list<CompanyPurchase>({ orderBy: { purchaseDate: 'desc' }, limit: 500 }),
    ])

    const orderHeaders = ['ط§ظ„ظ…ط·ط¹ظ…', 'ط§ظ„ط³ط§ط¦ظ‚', 'ط§ظ„طھط§ط±ظٹط®', 'ط§ظ„ظƒظ…ظٹط© (ظƒط¬ظ…)', 'ط³ط¹ط±/ظƒط¬ظ…', 'ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹ', 'ط§ظ„ط¯ظپط¹', 'ط§ظ„ط­ط§ظ„ط©']
    const purchaseHeaders = ['ط§ظ„ظ…ط²ط±ط¹ط©', 'ط§ظ„طھط§ط±ظٹط®', 'ط§ظ„ظƒظ…ظٹط© (ظƒط¬ظ…)', 'ط³ط¹ط±/ظƒط¬ظ…', 'ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹ', 'ط·ط±ظٹظ‚ط© ط§ظ„ط¯ظپط¹', 'ظ…ظ„ط§ط­ط¸ط§طھ']
    const companyHeaders = ['ط§ظ„طھط§ط±ظٹط®', 'ط§ظ„ط³ظ„ط¹ط©', 'ط§ظ„ظ…ط­ظ„', 'ط§ظ„ظ…ط¨ظ„ط؛', 'ظ…ظ„ط§ط­ط¸ط§طھ']

    if (typeFilter === 'ط·ظ„ط¨ظٹط© ظ…ط¨ط§ط´ط±ط©') {
      const rows = allOrders.map((o) => [
        o.restaurantName,
        o.driverName,
        o.orderDate,
        o.actualWeight,
        o.pricePerKg ?? 0,
        o.totalPrice ?? 0,
        PAYMENT_LABELS[o.paymentMethod ?? 'cash'] ?? 'ظ†ظ‚ط¯ظٹ',
        o.status === 'delivered' ? 'طھظ… ط§ظ„طھط³ظ„ظٹظ…' : 'ظ‚ظٹط¯ ط§ظ„ط§ظ†طھط¸ط§ط±',
      ].map(escapeCSV))
      downloadCSV(buildCSV(orderHeaders, rows), `ط·ظ„ط¨ظٹط§طھ_ظ…ط¨ط§ط´ط±ط©_${new Date().toISOString().slice(0, 10)}.csv`)
      return
    }

    if (typeFilter === 'ظ…ط´طھط±ظٹط§طھ') {
      const rows = allPurchases.map((p) => [
        p.farmName,
        p.purchaseDate,
        p.quantityKg,
        p.pricePerKg,
        p.totalCost,
        PAYMENT_LABELS[p.paymentMethod ?? 'cash'] ?? 'ظ†ظ‚ط¯ظٹ',
        p.notes ?? '',
      ].map(escapeCSV))
      downloadCSV(buildCSV(purchaseHeaders, rows), `ظ…ط´طھط±ظٹط§طھ_${new Date().toISOString().slice(0, 10)}.csv`)
      return
    }

    // "ط§ظ„ظƒظ„" â€” download two separate files
    const orderRows = allOrders.map((o) => [
      o.restaurantName,
      o.driverName,
      o.orderDate,
      o.actualWeight,
      o.pricePerKg ?? 0,
      o.totalPrice ?? 0,
      PAYMENT_LABELS[o.paymentMethod ?? 'cash'] ?? 'ظ†ظ‚ط¯ظٹ',
      o.status === 'delivered' ? 'طھظ… ط§ظ„طھط³ظ„ظٹظ…' : 'ظ‚ظٹط¯ ط§ظ„ط§ظ†طھط¸ط§ط±',
    ].map(escapeCSV))

    const purchaseRows = allPurchases.map((p) => [
      p.farmName,
      p.purchaseDate,
      p.quantityKg,
      p.pricePerKg,
      p.totalCost,
      PAYMENT_LABELS[p.paymentMethod ?? 'cash'] ?? 'ظ†ظ‚ط¯ظٹ',
      p.notes ?? '',
    ].map(escapeCSV))

    const companyRows = allCompany.map((p) => [
      p.purchaseDate,
      p.itemName,
      p.storeName,
      p.amount,
      p.notes ?? '',
    ].map(escapeCSV))

    downloadCSV(buildCSV(orderHeaders, orderRows), `ط·ظ„ط¨ظٹط§طھ_ظ…ط¨ط§ط´ط±ط©_${new Date().toISOString().slice(0, 10)}.csv`)
    downloadCSV(buildCSV(purchaseHeaders, purchaseRows), `ظ…ط´طھط±ظٹط§طھ_${new Date().toISOString().slice(0, 10)}.csv`)
    downloadCSV(buildCSV(companyHeaders, companyRows), `ظ…ط´طھط±ظٹط§طھ_ط§ظ„ط´ط±ظƒط©_${new Date().toISOString().slice(0, 10)}.csv`)
  }, [typeFilter])

  // CSV export â€” company purchases only (respects section filters)
  const handleCompanyExport = useCallback(() => {
    const headers = ['ط§ظ„طھط§ط±ظٹط®', 'ط§ظ„ط³ظ„ط¹ط©', 'ط§ظ„ظ…ط­ظ„', 'ط§ظ„ظ…ط¨ظ„ط؛', 'ظ…ظ„ط§ط­ط¸ط§طھ']
    const rows = filteredCompany.map((p) => [
      p.purchaseDate,
      p.itemName,
      p.storeName,
      p.amount,
      p.notes ?? '',
    ].map(escapeCSV))
    downloadCSV(buildCSV(headers, rows), `ظ…ط´طھط±ظٹط§طھ_ط§ظ„ط´ط±ظƒط©_${new Date().toISOString().slice(0, 10)}.csv`)
  }, [filteredCompany])

  return (
    <PullToRefresh onRefresh={refreshAll}>
    <div dir="rtl" className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Archive className="h-5 w-5 text-primary" />
            ط§ظ„طھظ‚ط§ط±ظٹط± ط§ظ„ط´ط§ظ…ظ„ط©
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            ط³ط¬ظ„ ط§ظ„ظ…ط´طھط±ظٹط§طھ ظˆط§ظ„ط·ظ„ط¨ظٹط§طھ ط§ظ„ظ…ط¨ط§ط´ط±ط©
          </p>
        </div>
        <Button onClick={handleExport} className="gap-2 min-h-[44px]">
          <Download className="h-4 w-4" />
          طھطµط¯ظٹط± CSV
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
              <p className="text-[10px] text-muted-foreground">ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ…ط¨ظٹط¹ط§طھ</p>
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
              <p className="text-[10px] text-muted-foreground">ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ…ط´طھط±ظٹط§طھ</p>
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
              <p className="text-[10px] text-muted-foreground">ظ…ط´طھط±ظٹط§طھ ط§ظ„ط´ط±ظƒط©</p>
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
              <p className="text-[10px] text-muted-foreground">ط§ظ„ط¹ظ…ظ„ظٹط§طھ</p>
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
              <p className="text-[10px] text-muted-foreground">ط§ظ„ظپظˆط§طھظٹط±</p>
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
              طھطµظپظٹط© ط§ظ„ظ†طھط§ط¦ط¬
            </p>
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex gap-1">
                {(['ط§ظ„ظƒظ„', 'ط·ظ„ط¨ظٹط© ظ…ط¨ط§ط´ط±ط©', 'ظ…ط´طھط±ظٹط§طھ'] as const).map((t) => (
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
                  placeholder="ط¨ط­ط« ط¨ط§ظ„ط§ط³ظ…..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-44 h-9 pr-8 text-xs text-right"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">ظ…ظ†</span>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-36 h-9 text-xs"
                />
                <span className="text-xs text-muted-foreground">ط¥ظ„ظ‰</span>
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
                  ظ…ط³ط­
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
                {hasFilters ? 'ظ„ط§ طھظˆط¬ط¯ ظ†طھط§ط¦ط¬ ظ…ط·ط§ط¨ظ‚ط©' : 'ظ„ط§ طھظˆط¬ط¯ ط¹ظ…ظ„ظٹط§طھ ظ…ط³ط¬ظ„ط©'}
              </p>
              <p className="text-xs text-muted-foreground max-w-xs">
                {hasFilters
                  ? 'ط¬ط±ط¨ طھط؛ظٹظٹط± ظ…ط¹ط§ظٹظٹط± ط§ظ„طھطµظپظٹط©'
                  : 'ط³طھط¸ظ‡ط± ط§ظ„ظ…ط´طھط±ظٹط§طھ ظˆط§ظ„ط·ظ„ط¨ظٹط§طھ ظ‡ظ†ط§ ظپظˆط± طھط³ط¬ظٹظ„ظ‡ط§'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">ط§ظ„ظ†ظˆط¹</TableHead>
                    <TableHead className="text-right">ط§ظ„ط§ط³ظ…</TableHead>
                    <TableHead className="text-right">ط§ظ„طھط§ط±ظٹط®</TableHead>
                    <TableHead className="text-right">ط§ظ„ظƒظ…ظٹط©</TableHead>
                    <TableHead className="text-right">ط³ط¹ط±/ظƒط¬ظ…</TableHead>
                    <TableHead className="text-right">ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹ</TableHead>
                    <TableHead className="text-right">ط§ظ„ط¯ظپط¹</TableHead>
                    <TableHead className="text-right">ط§ظ„ظپط§طھظˆط±ط©</TableHead>
                    <TableHead className="text-right">ط§ظ„ط­ط§ظ„ط©</TableHead>
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
                            {row.driverName !== 'â€”' && (
                              <p className="text-xs text-muted-foreground">{row.driverName}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {row.date ? formatDate(row.date) : 'â€”'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{row.weight} ظƒط¬ظ…</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {row.pricePerKg > 0 ? `${row.pricePerKg} ط±.ط³` : 'â€”'}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {row.totalPrice > 0 ? formatPriceFull(row.totalPrice) : 'â€”'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {PAYMENT_LABELS[row.paymentMethod] ?? row.paymentMethod ?? 'â€”'}
                        </TableCell>
                        <TableCell>
                          {row.type === 'ط·ظ„ط¨ظٹط© ظ…ط¨ط§ط´ط±ط©' ? (
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
                                  ط§ظ„ظپط§طھظˆط±ط©
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">â€”</span>
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
                              ط¹ط±ط¶
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">â€”</span>
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

      {/* Order/purchase invoice image preview */}
      <Dialog open={!!purchaseImagePreview} onOpenChange={() => setPurchaseImagePreview(null)}>
        <DialogContent className="max-w-2xl gap-4">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center justify-end gap-2">
              طµظˆط±ط© ط§ظ„ظپط§طھظˆط±ط©
              <FileText className="h-5 w-5 text-primary" />
            </DialogTitle>
          </DialogHeader>
          {purchaseImagePreview && (
            <img
              src={purchaseImagePreview}
              alt="ظپط§طھظˆط±ط©"
              className="w-full rounded-lg border object-contain max-h-[70vh]"
            />
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPurchaseImagePreview(null)} className="min-h-[44px] flex-1">
              ط¥ط؛ظ„ط§ظ‚
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
            طھظ‚ط±ظٹط± ط§ظ„ظ…ط´طھط±ظٹط§طھ ط§ظ„ط¹ط§ظ…ط© ظ„ظ„ط´ط±ظƒط©
          </CardTitle>
          {companyPurchases.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleCompanyExport} className="gap-1.5 h-9 text-xs">
              <Download className="h-3.5 w-3.5" />
              طھطµط¯ظٹط± CSV
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
                  <p className="text-[10px] text-muted-foreground">ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ…ط¨ظ„ط؛</p>
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
                  <p className="text-[10px] text-muted-foreground">ط¹ط¯ط¯ ط§ظ„ط¹ظ…ظ„ظٹط§طھ</p>
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
                  <p className="text-[10px] text-muted-foreground">ط¹ط¯ط¯ ط§ظ„ظ…ط­ظ„ط§طھ</p>
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
                  <p className="text-[10px] text-muted-foreground">ظ…طھظˆط³ط· ط§ظ„ط¹ظ…ظ„ظٹط©</p>
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
                  placeholder="ط¨ط­ط« ط¨ط§ظ„ط³ظ„ط¹ط© ط£ظˆ ط§ظ„ظ…ط­ظ„..."
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                  className="w-44 h-9 pr-8 text-xs text-right"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">ظ…ظ†</span>
                <Input
                  type="date"
                  value={companyDateFrom}
                  onChange={(e) => setCompanyDateFrom(e.target.value)}
                  className="w-36 h-9 text-xs"
                />
                <span className="text-xs text-muted-foreground">ط¥ظ„ظ‰</span>
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
                  ظ…ط³ط­
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
              <p className="text-sm font-medium">ظ„ط§ طھظˆط¬ط¯ ظ…ط´طھط±ظٹط§طھ ط¹ط§ظ…ط© ظ…ط³ط¬ظ„ط©</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                ط³ط¬ظ‘ظ„ ظ…ط´طھط±ظٹط§طھ ط§ظ„ط´ط±ظƒط© ظ…ظ† ظ‚ط³ظ… "ظ…ط´طھط±ظٹط§طھ ط§ظ„ط´ط±ظƒط©" â€” ط§ظ„ط³ظ„ط¹ط©طŒ ط§ظ„ط³ط¹ط±طŒ ط§ظ„ظ…ط­ظ„طŒ ظˆطµظˆط±ط© ط§ظ„ظپط§طھظˆط±ط©
              </p>
            </div>
          ) : filteredCompany.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <p className="text-sm text-muted-foreground">ظ„ط§ طھظˆط¬ط¯ ظ†طھط§ط¦ط¬ ظ…ط·ط§ط¨ظ‚ط© ظ„ظ„طھطµظپظٹط©</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">ط§ظ„طھط§ط±ظٹط®</TableHead>
                    <TableHead className="text-right">ط§ظ„ط³ظ„ط¹ط©</TableHead>
                    <TableHead className="text-right">ط§ظ„ظ…ط­ظ„</TableHead>
                    <TableHead className="text-right">ط§ظ„ظ…ط¨ظ„ط؛</TableHead>
                    <TableHead className="text-right">ظ…ظ„ط§ط­ط¸ط§طھ</TableHead>
                    <TableHead className="text-right">ط§ظ„ظپط§طھظˆط±ط©</TableHead>
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
                        {p.notes ?? 'â€”'}
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
                            ط¹ط±ط¶
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">â€”</span>
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
              ط§ظ„ط¥ظ†ظپط§ظ‚ ط­ط³ط¨ ط§ظ„ظ…ط­ظ„
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
                      {formatNum(count)} ط¹ظ…ظ„ظٹط© آ· {formatPriceFull(total)}
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
              طµظˆط±ط© ط§ظ„ظپط§طھظˆط±ط©
              <FileText className="h-5 w-5 text-primary" />
            </DialogTitle>
          </DialogHeader>
          {companyPreview && (
            <img
              src={companyPreview}
              alt="ظپط§طھظˆط±ط©"
              className="w-full rounded-lg border object-contain max-h-[70vh]"
            />
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCompanyPreview(null)} className="min-h-[44px] flex-1">
              ط¥ط؛ظ„ط§ظ‚
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ScrollToTop />
    </div>
    </PullToRefresh>
  )
}

/* â”€â”€â”€â”€ Route â”€â”€â”€â”€ */
export const Route = createFileRoute('/app/reports')({
  ssr: false,
  head: () => ({ meta: [{ title: 'ط§ظ„طھظ‚ط§ط±ظٹط± ط§ظ„ط´ط§ظ…ظ„ط© آ· DChicken' }] }),
  component: () => <ReportsPage />,
})

/* â”€â”€â”€â”€ Skeleton â”€â”€â”€â”€ */
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
