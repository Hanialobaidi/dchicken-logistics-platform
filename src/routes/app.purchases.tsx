import { createFileRoute } from '@tanstack/react-router'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollToTop } from '@/components/ScrollToTop'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { toast } from 'sonner'
import { usePurchases, useCreatePurchase, useDeletePurchase } from '@/hooks/usePurchases'
import { useInventory } from '@/hooks/useInventory'
import {
  ShoppingCart,
  Plus,
  Trash2,
  TrendingUp,
  Calendar,
  Wheat,
  Package,
  ArrowDownCircle,
  ArrowUpCircle,
  Warehouse,
} from 'lucide-react'
import { useState, useMemo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CHICKEN_TYPES } from '@/types'
import type { Purchase } from '@/types'
import { useChickenTypes, useCreateChickenType } from '@/hooks/useChickenTypes'
import { SearchInput } from '@/components/SearchInput'

const CURRENCY_FORMATTER = new Intl.NumberFormat('ar-SA', {
  style: 'currency',
  currency: 'SAR',
  maximumFractionDigits: 0,
})

export const Route = createFileRoute('/app/purchases')({
  ssr: false,
  head: () => ({ meta: [{ title: 'المشتريات · DChicken' }] }),
  component: () => <PurchasesPage />,
})

function PurchasesPage() {
  const { data: purchases = [], isLoading } = usePurchases()
  const inventory = useInventory()
  const createPurchase = useCreatePurchase()
  const deletePurchase = useDeletePurchase()
  const { data: customTypes = [] } = useChickenTypes()
  const createChickenType = useCreateChickenType()

  const allChickenTypes = useMemo(
    () => [...CHICKEN_TYPES, ...customTypes.map((t) => t.name)],
    [customTypes],
  )

  const [dialogOpen, setDialogOpen] = useState(false)
  const [farmName, setFarmName] = useState('')
  const [quantityKg, setQuantityKg] = useState('')
  const [pricePerKg, setPricePerKg] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [chickenType, setChickenType] = useState<string>(CHICKEN_TYPES[0])
  const [customChickenType, setCustomChickenType] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const filteredPurchases = useMemo(() => {
    let result = purchases
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter((p: Purchase) =>
        p.farmName?.toLowerCase().includes(q) ||
        p.chickenType?.toLowerCase().includes(q)
      )
    }
    if (dateFrom) {
      result = result.filter((p: Purchase) => p.purchaseDate >= dateFrom)
    }
    if (dateTo) {
      result = result.filter((p: Purchase) => p.purchaseDate <= dateTo)
    }
    return result
  }, [purchases, search, dateFrom, dateTo])

  const quantity = Number(quantityKg) || 0
  const price = Number(pricePerKg) || 0
  const totalCostLive = quantity * price

  const openCreate = () => {
    setFarmName('')
    setQuantityKg('')
    setPricePerKg('')
    setPurchaseDate(new Date().toISOString().slice(0, 10))
    setNotes('')
    setChickenType(CHICKEN_TYPES[0])
    setCustomChickenType('')
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!farmName.trim() || !quantityKg || !pricePerKg) return
    setSubmitting(true)
    try {
      const finalChickenType = chickenType === '__add__' ? customChickenType.trim() : chickenType
      if (!finalChickenType) {
        toast.error('اكتب نوع الدجاج')
        setSubmitting(false)
        return
      }
      // Save new chicken type if it's a custom one
      if (chickenType === '__add__' && customChickenType.trim()) {
        await createChickenType.mutateAsync(customChickenType.trim())
      }
      await createPurchase.mutateAsync({
        purchaseDate,
        farmName: farmName.trim(),
        quantityKg: quantity,
        pricePerKg: price,
        chickenType: finalChickenType,
        notes: notes.trim() || undefined,
      })
      toast.success('تم إضافة عملية الشراء بنجاح — تم تحديث المخزون تلقائياً')
      setDialogOpen(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[purchases] create failed:', msg, err)
      toast.error('فشل إضافة عملية الشراء: ' + msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string, farm: string) => {
    if (!confirm(`هل أنت متأكد من حذف عملية الشراء من "${farm}"؟`)) return
    try {
      await deletePurchase.mutateAsync(id)
      toast.success('تم حذف عملية الشراء بنجاح')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[purchases] delete failed:', msg, err)
      toast.error('فشل حذف عملية الشراء: ' + msg)
    }
  }

  const inventoryIsLow = inventory.availableKg < 100 && inventory.totalPurchasedKg > 0

  return (
    <div dir="rtl" className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            المشتريات والمخزون
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            إدارة عمليات شراء الدجاج من المزارع وتتبع المخزون
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 min-h-[44px]">
          <Plus className="h-4 w-4" />
          إضافة عملية شراء
        </Button>
      </div>

      {/* Inventory + Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total purchased */}
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
              <ArrowDownCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold">{inventory.totalPurchasedKg.toLocaleString('ar-SA')} كجم</p>
              <p className="text-xs text-muted-foreground">إجمالي المشتريات</p>
            </div>
          </CardContent>
        </Card>

        {/* Total sold */}
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <ArrowUpCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold">{inventory.totalSoldKg.toLocaleString('ar-SA')} كجم</p>
              <p className="text-xs text-muted-foreground">إجمالي المبيعات</p>
            </div>
          </CardContent>
        </Card>

        {/* Available stock */}
        <Card className={inventoryIsLow ? 'border-red-300 bg-red-50/50' : ''}>
          <CardContent className="p-5 flex items-center gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${inventoryIsLow ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
              <Warehouse className="h-5 w-5" />
            </div>
            <div>
              <p className={`text-xl font-bold ${inventoryIsLow ? 'text-red-600' : ''}`}>
                {inventory.availableKg.toLocaleString('ar-SA')} كجم
              </p>
              <p className="text-xs text-muted-foreground">المخزون المتوفر</p>
            </div>
          </CardContent>
        </Card>

        {/* Total cost */}
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold">{CURRENCY_FORMATTER.format(purchases.reduce((s, p) => s + (p.totalCost ?? 0), 0))}</p>
              <p className="text-xs text-muted-foreground">إجمالي تكلفة الشراء</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low stock alert */}
      {inventoryIsLow && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="p-4 flex items-center gap-3">
            <Package className="h-5 w-5 text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700">تنبيه: المخزون منخفض</p>
              <p className="text-xs text-red-600">
                المخزون المتوفر أقل من 100 كجم. يرجى إضافة عملية شراء جديدة قريباً.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search & Filters */}
      {purchases.length > 0 && (
        <div className="flex flex-wrap gap-3 items-end">
          <div className="max-w-xs flex-1">
            <SearchInput value={search} onChange={setSearch} placeholder="بحث باسم المزرعة أو النوع..." />
          </div>
          <div className="flex gap-2">
            <div>
              <Label className="text-xs mb-1 block">من تاريخ</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-10 w-[150px]" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">إلى تاريخ</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-10 w-[150px]" />
            </div>
            {(search || dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" className="h-10" onClick={() => { setSearch(''); setDateFrom(''); setDateTo('') }}>
                مسح الفلتر
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Purchases table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-2 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 rounded-md bg-muted" />
              ))}
            </div>
          ) : purchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <ShoppingCart className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium">لا توجد عمليات شراء مسجلة</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                أضف أول عملية شراء لتتبع تكاليف الدجاج من المزارع
              </p>
              <Button variant="outline" size="sm" onClick={openCreate} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                إضافة عملية شراء
              </Button>
            </div>
          ) : filteredPurchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <p className="text-sm text-muted-foreground">لا توجد نتائج</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">تاريخ الشراء</TableHead>
                    <TableHead className="text-right">نوع الدجاج</TableHead>
                    <TableHead className="text-right">اسم المزرعة</TableHead>
                    <TableHead className="text-right">الكمية (كجم)</TableHead>
                    <TableHead className="text-right">سعر الكيلو (ريال)</TableHead>
                    <TableHead className="text-right">التكلفة الإجمالية</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchases.map((p: Purchase) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-sm">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {new Date(p.purchaseDate).toLocaleDateString('ar-SA')}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {p.chickenType || CHICKEN_TYPES[0]}
                      </TableCell>
                      <TableCell className="font-medium">
                        <span className="flex items-center gap-1.5">
                          <Wheat className="h-3 w-3 text-muted-foreground" />
                          {p.farmName}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {p.quantityKg.toLocaleString('ar-SA')} كجم
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {p.pricePerKg.toLocaleString('ar-SA')} ريال
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {CURRENCY_FORMATTER.format(p.totalCost)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(p.id, p.farmName)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add purchase dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md gap-5 sm:max-w-md">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center justify-end gap-2">
              إضافة عملية شراء
              <ShoppingCart className="h-5 w-5 text-primary" />
            </DialogTitle>
            <DialogDescription className="text-right">
              أدخل بيانات عملية الشراء من المزرعة — ستُضاف الكمية تلقائياً للمخزون
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="purchaseDate">تاريخ الشراء</Label>
              <Input
                id="purchaseDate"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>نوع الدجاج <span className="text-destructive">*</span></Label>
              <Select value={chickenType} onValueChange={setChickenType}>
                <SelectTrigger className="h-11 text-right w-full">
                  <SelectValue placeholder="اختر نوع الدجاج..." />
                </SelectTrigger>
                <SelectContent align="end">
                  {allChickenTypes.map((ct) => (
                    <SelectItem key={ct} value={ct}>
                      {ct}
                    </SelectItem>
                  ))}
                  <SelectItem value="__add__" className="text-primary font-medium">+ إضافة نوع جديد</SelectItem>
                </SelectContent>
              </Select>
              {chickenType === '__add__' && (
                <Input
                  placeholder="اكتب نوع الدجاج الجديد..."
                  value={customChickenType}
                  onChange={(e) => setCustomChickenType(e.target.value)}
                  className="text-right h-11"
                  autoFocus
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="farmName">اسم المزرعة</Label>
              <Input
                id="farmName"
                placeholder="مثال: مزرعة الوفاء"
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
                className="text-right"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="quantityKg">الكمية (كجم)</Label>
                <Input
                  id="quantityKg"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="مثال: 500"
                  value={quantityKg}
                  onChange={(e) => setQuantityKg(e.target.value)}
                  className="text-right"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pricePerKg">سعر الكيلو (ريال)</Label>
                <Input
                  id="pricePerKg"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="مثال: 14"
                  value={pricePerKg}
                  onChange={(e) => setPricePerKg(e.target.value)}
                  className="text-right"
                />
              </div>
            </div>

            {/* Live total cost display */}
            {quantity > 0 && price > 0 && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <p className="text-xs text-muted-foreground">التكلفة الإجمالية</p>
                <p className="text-lg font-bold">
                  {quantity.toLocaleString('ar-SA')} × {price.toLocaleString('ar-SA')} ={' '}
                  {CURRENCY_FORMATTER.format(totalCostLive)}
                </p>
                <p className="text-xs text-emerald-600 mt-1">
                  ستُضاف {quantity.toLocaleString('ar-SA')} كجم إلى المخزون المتوفر
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">ملاحظات (اختياري)</Label>
              <Textarea
                id="notes"
                placeholder="أي ملاحظات إضافية..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-right min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting} className="min-h-[44px] flex-1">
              إلغاء
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !farmName.trim() || !quantityKg || !pricePerKg}
              className="min-h-[44px] flex-1 gap-2"
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  جاري الحفظ...
                </>
              ) : (
                'حفظ'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ScrollToTop />
    </div>
  )
}

function PurchasesSkeleton() {
  return (
    <div dir="rtl" className="p-6 space-y-6 animate-pulse">
      <div className="flex justify-between">
        <div className="h-8 w-1/4 rounded-md bg-muted" />
        <div className="h-9 w-32 rounded-md bg-muted" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-muted" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-muted" />
    </div>
  )
}
