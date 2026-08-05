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
import {
  useCompanyPurchases,
  useCreateCompanyPurchase,
  useDeleteCompanyPurchase,
} from '@/hooks/useCompanyPurchases'
import {
  Store,
  Plus,
  Trash2,
  TrendingUp,
  Calendar,
  FileText,
  Upload,
  X,
  ShoppingBag,
  Wallet,
  Receipt,
  Eye,
} from 'lucide-react'
import { useState, useMemo, useRef } from 'react'
import { formatNum, formatPrice, formatDate } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { PullToRefresh } from '@/components/PullToRefresh'
import { useRefreshAll } from '@/hooks/useRefreshAll'
import type { CompanyPurchase } from '@/types'

export const Route = createFileRoute('/app/company-purchases')({
  ssr: false,
  head: () => ({ meta: [{ title: 'المشتريات العامة · DChicken' }] }),
  component: () => <CompanyPurchasesPage />,
})

function CompanyPurchasesPage() {
  const refreshAll = useRefreshAll()
  const { data: purchases = [], isLoading } = useCompanyPurchases()
  const createPurchase = useCreateCompanyPurchase()
  const deletePurchase = useDeleteCompanyPurchase()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [itemName, setItemName] = useState('')
  const [storeName, setStoreName] = useState('')
  const [amount, setAmount] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const totalAmount = useMemo(
    () => purchases.reduce((s, p) => s + (p.amount ?? 0), 0),
    [purchases],
  )

  const filteredPurchases = useMemo(() => {
    if (!search.trim()) return purchases
    const q = search.trim().toLowerCase()
    return purchases.filter(
      (p: CompanyPurchase) =>
        p.itemName?.toLowerCase().includes(q) || p.storeName?.toLowerCase().includes(q),
    )
  }, [purchases, search])

  const openCreate = () => {
    setItemName('')
    setStoreName('')
    setAmount('')
    setPurchaseDate(new Date().toISOString().slice(0, 10))
    setNotes('')
    setInvoiceFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setDialogOpen(true)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setInvoiceFile(file)
  }

  const removeFile = () => {
    setInvoiceFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async () => {
    if (!itemName.trim() || !storeName.trim() || !amount) return
    setSubmitting(true)
    try {
      let invoiceImageUrl: string | undefined

      if (invoiceFile) {
        const ext = invoiceFile.name.split('.').pop()
        const filePath = `company-purchases/${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('invoices')
          .upload(filePath, invoiceFile)
        if (uploadError) throw new Error(uploadError.message)
        const { data: urlData } = supabase.storage.from('invoices').getPublicUrl(filePath)
        invoiceImageUrl = urlData.publicUrl
      }

      await createPurchase.mutateAsync({
        itemName: itemName.trim(),
        storeName: storeName.trim(),
        amount: Number(amount) || 0,
        purchaseDate,
        invoiceImageUrl: invoiceImageUrl ?? null,
        notes: notes.trim() || null,
      })
      toast.success('تم إضافة المشتريات بنجاح')
      setDialogOpen(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[company-purchases] create failed:', msg, err)
      toast.error('فشل إضافة المشتريات: ' + msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string, item: string) => {
    if (!confirm(`هل أنت متأكد من حذف "${item}"؟`)) return
    try {
      await deletePurchase.mutateAsync(id)
      toast.success('تم حذف المشتريات بنجاح')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[company-purchases] delete failed:', msg, err)
      toast.error('فشل حذف المشتريات: ' + msg)
    }
  }

  return (
    <PullToRefresh onRefresh={refreshAll}>
    <div dir="rtl" className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            المشتريات العامة للشركة
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            تسجيل مشتريات الشركة — السلعة، السعر، المحل، وصورة الفاتورة
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 min-h-[44px]">
          <Plus className="h-4 w-4" />
          إضافة مشتريات
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold">{formatPrice(totalAmount)}</p>
              <p className="text-xs text-muted-foreground">إجمالي المشتريات</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold">{formatNum(purchases.length)}</p>
              <p className="text-xs text-muted-foreground">عدد العمليات</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold">
                {formatNum(new Set(purchases.map((p) => p.storeName)).size)}
              </p>
              <p className="text-xs text-muted-foreground">عدد المحلات</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      {purchases.length > 0 && (
        <div className="flex flex-wrap gap-3 items-end">
          <div className="max-w-xs flex-1">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالسلعة أو اسم المحل..."
              className="h-10"
            />
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
                <ShoppingBag className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium">لا توجد مشتريات مسجلة</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                سجّل أول مشتريات عامة للشركة — السلعة والسعر والمحل وصورة الفاتورة
              </p>
              <Button variant="outline" size="sm" onClick={openCreate} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                إضافة مشتريات
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
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">السلعة</TableHead>
                    <TableHead className="text-right">المحل</TableHead>
                    <TableHead className="text-right">المبلغ</TableHead>
                    <TableHead className="text-right">الفاتورة</TableHead>
                    <TableHead className="w-[90px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchases.map((p: CompanyPurchase) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-sm">
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
                        {formatPrice(p.amount)}
                      </TableCell>
                      <TableCell>
                        {p.invoiceImageUrl ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary"
                            onClick={() => setPreviewImage(p.invoiceImageUrl)}
                            title="عرض صورة الفاتورة"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(p.id, p.itemName)}
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
              إضافة مشتريات عامة
              <ShoppingBag className="h-5 w-5 text-primary" />
            </DialogTitle>
            <DialogDescription className="text-right">
              سجّل مشتريات الشركة — السلعة، السعر، المحل، وصورة الفاتورة
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
              <Label htmlFor="itemName">السلعة / الوصف</Label>
              <Input
                id="itemName"
                placeholder="مثال: وقود، إطارات، ثلاجة..."
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="text-right"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="storeName">اسم المحل</Label>
              <Input
                id="storeName"
                placeholder="مثال: محل النور"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="text-right"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">المبلغ (ريال)</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="مثال: 250"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-right"
              />
            </div>

            {/* File upload */}
            <div className="space-y-1.5">
              <Label className="text-sm flex items-center gap-1.5">
                <Upload className="h-3.5 w-3.5" />
                صورة الفاتورة
              </Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="company-purchase-invoice"
              />
              {invoiceFile ? (
                <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2.5">
                  <span className="text-sm truncate flex-1 ml-2 flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    {invoiceFile.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={removeFile}
                    type="button"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <label
                  htmlFor="company-purchase-invoice"
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                >
                  <Upload className="h-6 w-6" />
                  <span className="text-xs">اضغط لاختيار صورة الفاتورة</span>
                </label>
              )}
            </div>

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
              disabled={submitting || !itemName.trim() || !storeName.trim() || !amount}
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

      {/* Image preview dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-2xl gap-4">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center justify-end gap-2">
              صورة الفاتورة
              <FileText className="h-5 w-5 text-primary" />
            </DialogTitle>
          </DialogHeader>
          {previewImage && (
            <img
              src={previewImage}
              alt="فاتورة"
              className="w-full rounded-lg border object-contain max-h-[70vh]"
            />
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPreviewImage(null)} className="min-h-[44px] flex-1">
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
