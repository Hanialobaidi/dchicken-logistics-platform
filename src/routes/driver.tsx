import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { BlinkClientBoundary } from '@/components/BlinkClientBoundary'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useDriverTrip } from '@/hooks/useDriverTrip'
import { useTripRestaurants } from '@/hooks/useTrips'
import { useDrivers, getDriverSession } from '@/hooks/useDrivers'
import { useDirectOrders, useCreateDirectOrder, useUpdateDirectOrder, useDeleteDirectOrder } from '@/hooks/useDirectOrders'
import { useRestaurants } from '@/hooks/useRestaurants'
import { useCreateInvoice, useInvoices } from '@/hooks/useInventory'
import { supabase } from '@/lib/supabase'
import { clearDriverSession } from '@/hooks/useDrivers'
import { InvoicePreview, computeTaxFields } from '@/components/InvoicePreview'
import { ScrollToTop } from '@/components/ScrollToTop'
import type { InvoiceData } from '@/components/InvoicePreview'
import { CHICKEN_TYPES } from '@/types'
import type { DirectOrder } from '@/types'
import { notifyAdminNewOrder } from '@/lib/notifyAdmin'
import {
  Truck,
  Store,
  Package,
  LogOut,
  User,
  MapPin,
  Calendar,
  Weight,
  Plus,
  FileText,
  Upload,
  X,
  ClipboardList,
  Printer,
  Banknote,
  CreditCard,
  Clock,
  CheckCircle,
  ArrowRight,
  ArrowUp,
  Pencil,
  Trash2,
} from 'lucide-react'
import { useCallback, useState, useRef, useEffect, useMemo, type ChangeEvent } from 'react'

type StopStatus = 'قيد الانتظار' | 'تم التسليم' | 'ملغي'

const STATUS_CONFIG: Record<
  StopStatus,
  { variant: 'default' | 'secondary' | 'destructive'; label: string }
> = {
  'تم التسليم': { variant: 'default', label: 'تم التسليم' },
  'قيد الانتظار': { variant: 'secondary', label: 'قيد الانتظار' },
  ملغي: { variant: 'destructive', label: 'ملغي' },
}

const DIRECT_ORDER_STATUS_CONFIG: Record<
  string,
  { variant: 'default' | 'secondary'; label: string }
> = {
  delivered: { variant: 'default', label: 'تم التسليم' },
  pending: { variant: 'secondary', label: 'قيد الانتظار' },
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'نقدي', icon: Banknote },
  { value: 'network', label: 'شبكة', icon: CreditCard },
  { value: 'credit', label: 'آجل', icon: Clock },
]

function statusLabel(status: string): StopStatus {
  switch (status) {
    case 'delivered': return 'تم التسليم'
    case 'cancelled': return 'ملغي'
    default: return 'قيد الانتظار'
  }
}

/* ──── StopCard ──── */
function StopCard({ stop, index }: { stop: { id: string; restaurantName: string; targetWeight: number; status: string }; index: number }) {
  const navigate = useNavigate()
  const cfg = STATUS_CONFIG[statusLabel(stop.status)]
  const canDeliver = stop.status === 'pending'

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm',
        'animate-fade-in'
      )}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
            {index + 1}
          </span>
          <div>
            <p className="text-sm font-semibold">{stop.restaurantName}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Weight className="h-3 w-3" />
              الوزن المستهدف: {stop.targetWeight} كجم
            </p>
          </div>
        </div>
        <Badge variant={cfg.variant}>{cfg.label}</Badge>
      </div>

      {canDeliver && (
        <Button
          size="lg"
          className="w-full min-h-[44px] gap-2 text-sm"
          onClick={() =>
            navigate({
              to: '/driver/delivery',
              search: { stopId: stop.id, name: stop.restaurantName, targetWeight: String(stop.targetWeight) },
            })
          }
        >
          <Store className="h-4 w-4" />
          تأكيد التسليم
        </Button>
      )}
    </div>
  )
}

/* ──── Direct Order Dialog ──── */
function DirectOrderDialog({
  open,
  onOpenChange,
  driverId,
  driverName,
  userId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  driverId: string
  driverName: string
  userId: string
}) {
  const { data: restaurants = [] } = useRestaurants()
  const createDirectOrder = useCreateDirectOrder()
  const createInvoice = useCreateInvoice()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10))
  const [restaurantMode, setRestaurantMode] = useState<'existing' | 'new'>('existing')
  const [selectedRestaurant, setSelectedRestaurant] = useState('')
  const [newRestaurantName, setNewRestaurantName] = useState('')
  const [actualWeight, setActualWeight] = useState('')
  const [pricePerKg, setPricePerKg] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid'>('paid')
  const [notes, setNotes] = useState('')
  const [chickenType, setChickenType] = useState<string>(CHICKEN_TYPES[0])
  const [customChickenType, setCustomChickenType] = useState('')
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Invoice preview state
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showScrollBtns, setShowScrollBtns] = useState(false)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const check = () => setShowScrollBtns(el.scrollHeight > el.clientHeight + 40)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [open])

  const scrollTo = (dir: 'top' | 'bottom') => {
    scrollRef.current?.scrollTo({
      top: dir === 'top' ? 0 : scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }

  const weightNum = Number(actualWeight) || 0
  const priceNum = Number(pricePerKg) || 0
  const totalPrice = weightNum * priceNum
  const taxFields = weightNum > 0 && priceNum > 0 ? computeTaxFields(weightNum, priceNum) : null

  // Find selected restaurant's tax number
  const selectedRestaurantObj = restaurants.find((r) => r.id === selectedRestaurant)
  const restaurantTaxNumber = restaurantMode === 'existing' ? (selectedRestaurantObj?.taxNumber ?? '') : ''

  const resetForm = () => {
    setOrderDate(new Date().toISOString().slice(0, 10))
    setRestaurantMode('existing')
    setSelectedRestaurant('')
    setNewRestaurantName('')
    setActualWeight('')
    setPricePerKg('')
    setPaymentMethod('cash')
    setPaymentStatus('paid')
    setNotes('')
    setChickenType(CHICKEN_TYPES[0])
    setCustomChickenType('')
    setInvoiceFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleClose = () => {
    if (isSubmitting) return
    resetForm()
    onOpenChange(false)
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setInvoiceFile(file)
  }

  const removeFile = () => {
    setInvoiceFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async () => {
    const name =
      restaurantMode === 'existing'
        ? restaurants.find((r) => r.id === selectedRestaurant)?.name
        : newRestaurantName.trim()

    if (!name || !actualWeight.trim() || !pricePerKg) return

    setIsSubmitting(true)
    try {
      let invoiceImageUrl: string | undefined

      if (invoiceFile) {
        const ext = invoiceFile.name.split('.').pop()
        const filePath = `direct-orders/${driverId}-${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('invoices')
          .upload(filePath, invoiceFile)
        if (uploadError) throw new Error(uploadError.message)
        const { data: urlData } = supabase.storage.from('invoices').getPublicUrl(filePath)
        invoiceImageUrl = urlData.publicUrl
      }

      const effectiveChickenType = chickenType === 'أخرى' ? customChickenType.trim() : chickenType

      await createDirectOrder.mutateAsync({
        driverId,
        driverName,
        orderDate,
        restaurantName: name,
        actualWeight: weightNum,
        invoiceImageUrl: invoiceImageUrl ?? undefined,
        notes: notes.trim() || undefined,
        status: 'pending',
        pricePerKg: priceNum,
        paymentMethod,
        totalPrice,
        restaurantTaxNumber,
        chickenType: effectiveChickenType,
        paymentStatus,
      })

      // Save invoice record
      const invoiceNum = `INV-${Date.now().toString(36).toUpperCase()}`
      await createInvoice.mutateAsync({
        invoiceNumber: invoiceNum,
        orderId: '',
        orderType: 'direct_order',
        restaurantName: name,
        restaurantTaxNumber,
        driverName,
        driverId,
        itemDescription: effectiveChickenType,
        quantityKg: weightNum,
        pricePerKg: priceNum,
        subtotalBeforeTax: taxFields?.subtotalBeforeTax ?? 0,
        vatAmount: taxFields?.vatAmount ?? 0,
        totalAmount: totalPrice,
        paymentMethod,
        invoiceDate: orderDate,
        pdfUrl: undefined,
        paymentStatus,
      })

      // Show invoice preview immediately after DB commit
      setInvoiceData({
        invoiceNumber: invoiceNum,
        date: new Date(orderDate).toLocaleDateString('ar-SA'),
        restaurantName: name,
        restaurantTaxNumber,
        driverName,
        quantityKg: weightNum,
        pricePerKg: priceNum,
        paymentMethod,
        paymentStatus,
        chickenType: effectiveChickenType,
      })

      // Fire push notification to admin (best-effort, non-blocking)
      notifyAdminNewOrder({ driverName, restaurantName: name, weight: weightNum })

      toast.success('تم تسجيل الطلبية وحفظ الفاتورة بنجاح')
      resetForm()
      onOpenChange(false)
    } catch {
      toast.error('فشل تسجيل الطلبية المباشرة')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
        <DialogContent
          className="max-w-md gap-0 sm:max-w-md p-0 overflow-hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          {/* Sticky header with close */}
          <div className="sticky top-0 z-10 bg-background border-b px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-right">
              <ClipboardList className="h-5 w-5 text-primary" />
              <div>
                <DialogTitle className="text-sm font-semibold">تسجيل طلبية مباشرة ميدانية</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  اختر المطعم، أدخل الكمية والسعر
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Scrollable body */}
          <div ref={scrollRef} className="overflow-y-auto max-h-[70vh] px-6 py-4 space-y-4">
            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="orderDate" className="text-sm">التاريخ</Label>
              <Input
                id="orderDate"
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="text-right h-11"
              />
            </div>

            {/* Restaurant selection */}
            <div className="space-y-1.5">
              <Label className="text-sm">اسم المطعم</Label>
              <Select
                value={restaurantMode === 'existing' ? selectedRestaurant : '__new__'}
                onValueChange={(val) => {
                  if (val === '__new__') {
                    setRestaurantMode('new')
                    setSelectedRestaurant('')
                  } else {
                    setRestaurantMode('existing')
                    setSelectedRestaurant(val)
                  }
                }}
              >
                <SelectTrigger className="h-11 text-right w-full">
                  <SelectValue placeholder="اختر المطعم..." />
                </SelectTrigger>
                <SelectContent align="end">
                  {restaurants.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                      {r.taxNumber && <span className="text-xs text-muted-foreground mr-1">({r.taxNumber})</span>}
                    </SelectItem>
                  ))}
                  <SelectItem value="__new__" className="text-primary font-medium">
                    كتابة اسم جديد
                  </SelectItem>
                </SelectContent>
              </Select>

              {restaurantMode === 'new' && (
                <Input
                  placeholder="اكتب اسم المطعم الجديد..."
                  value={newRestaurantName}
                  onChange={(e) => setNewRestaurantName(e.target.value)}
                  className="text-right h-11 mt-2"
                />
              )}

              {/* Show tax number if available */}
              {restaurantMode === 'existing' && selectedRestaurantObj?.taxNumber && (
                <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                  <FileText className="h-3 w-3" />
                  الرقم الضريبي: {selectedRestaurantObj.taxNumber}
                </p>
              )}
            </div>

            {/* Weight + Price */}
            <div className="space-y-1.5">
              <Label className="text-sm">نوع الدجاج <span className="text-destructive">*</span></Label>
              <Select value={chickenType} onValueChange={setChickenType}>
                <SelectTrigger className="h-11 text-right w-full">
                  <SelectValue placeholder="اختر نوع الدجاج..." />
                </SelectTrigger>
                <SelectContent align="end">
                  {CHICKEN_TYPES.map((ct) => (
                    <SelectItem key={ct} value={ct}>
                      {ct}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {chickenType === 'أخرى' && (
                <Input
                  placeholder="اكتب نوع الدجاج..."
                  value={customChickenType}
                  onChange={(e) => setCustomChickenType(e.target.value)}
                  className="text-right h-11"
                />
              )}
            </div>

            {/* Weight + Price */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="actualWeight" className="text-sm">الكمية (كجم)</Label>
                <Input
                  id="actualWeight"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="الكمية..."
                  value={actualWeight}
                  onChange={(e) => setActualWeight(e.target.value)}
                  className="text-right h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pricePerKg" className="text-sm">سعر الكيلو (ريال)</Label>
                <Input
                  id="pricePerKg"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="السعر..."
                  value={pricePerKg}
                  onChange={(e) => setPricePerKg(e.target.value)}
                  className="text-right h-11"
                />
              </div>
            </div>

            {/* Payment method */}
            <div className="space-y-1.5">
              <Label className="text-sm">طريقة الدفع</Label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((pm) => {
                  const Icon = pm.icon
                  const selected = paymentMethod === pm.value
                  return (
                    <button
                      key={pm.value}
                      type="button"
                      onClick={() => setPaymentMethod(pm.value)}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-all cursor-pointer',
                        selected
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-muted bg-muted/30 text-muted-foreground hover:border-primary/30'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs font-medium">{pm.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Payment status */}
            <div className="space-y-1.5">
              <Label className="text-sm">حالة الدفع</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentStatus('paid')}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-lg border-2 p-3 transition-all cursor-pointer',
                    paymentStatus === 'paid'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-muted bg-muted/30 text-muted-foreground hover:border-emerald-300'
                  )}
                >
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">مدفوع</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentStatus('unpaid')}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-lg border-2 p-3 transition-all cursor-pointer',
                    paymentStatus === 'unpaid'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-muted bg-muted/30 text-muted-foreground hover:border-red-300'
                  )}
                >
                  <Clock className="h-5 w-5" />
                  <span className="text-sm font-medium">غير مدفوع</span>
                </button>
              </div>
            </div>

            {/* Live price calculation */}
            {weightNum > 0 && priceNum > 0 && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">المجموع الخاضع للضريبة</span>
                  <span className="font-medium">{taxFields?.subtotalBeforeTax.toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ض.ق.م (15%)</span>
                  <span className="font-medium">{taxFields?.vatAmount.toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between text-base font-bold border-t pt-1 mt-1">
                  <span>الإجمالي</span>
                  <span>{totalPrice.toFixed(2)} ر.س</span>
                </div>
              </div>
            )}

            {/* File upload */}
            <div className="space-y-1.5">
              <Label className="text-sm flex items-center gap-1.5">
                <Upload className="h-3.5 w-3.5" />
                رفع صورة الفاتورة الورقية
              </Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="hidden"
                id="direct-order-invoice"
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
                  htmlFor="direct-order-invoice"
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                >
                  <Upload className="h-6 w-6" />
                  <span className="text-xs">اضغط لاختيار ملف</span>
                </label>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-sm">
                ملاحظات <span className="text-muted-foreground text-xs">(اختياري)</span>
              </Label>
              <Textarea
                id="notes"
                placeholder="أي ملاحظات إضافية..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-right min-h-[80px]"
                rows={3}
              />
            </div>
          </div>

          {/* Sticky footer */}
          <div className="sticky bottom-0 bg-background border-t px-6 py-3 flex gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="min-h-[44px] flex-1"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                !actualWeight.trim() ||
                !pricePerKg ||
                (restaurantMode === 'existing' && !selectedRestaurant) ||
                (restaurantMode === 'new' && !newRestaurantName.trim())
              }
              className="min-h-[44px] flex-1 gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Printer className="h-4 w-4" />
                  حفظ وإصدار الفاتورة
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Scroll navigation buttons */}
      {showScrollBtns && (
        <div className="fixed bottom-24 left-4 z-[60] flex flex-col gap-2">
          <Button
            size="icon"
            className="h-9 w-9 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => scrollTo('top')}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            className="h-9 w-9 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => scrollTo('bottom')}
          >
            <ArrowUp className="h-4 w-4 rotate-180" />
          </Button>
        </div>
      )}

      {/* Invoice Preview */}
      {invoiceData && (
        <InvoicePreview
          data={invoiceData}
          onClose={() => setInvoiceData(null)}
        />
      )}
    </>
  )
}

/* ──── Edit Order Dialog ──── */
function EditOrderDialog({
  open,
  onOpenChange,
  order,
  driverId,
  driverName,
  onSaved,
  onInvoiceIssued,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: {
    id: string
    restaurantName: string
    restaurantTaxNumber: string
    orderDate: string
    actualWeight: number
    pricePerKg: number
    totalPrice: number
    paymentMethod: string
    paymentStatus: string
    chickenType: string
    notes: string | null
  } | null
  driverId: string
  driverName: string
  onSaved: () => void
  onInvoiceIssued: (data: InvoiceData) => void
}) {
  const updateOrder = useUpdateDirectOrder()
  const createInvoice = useCreateInvoice()

  const [actualWeight, setActualWeight] = useState('')
  const [pricePerKg, setPricePerKg] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [chickenType, setChickenType] = useState<string>(CHICKEN_TYPES[0])
  const [customChickenType, setCustomChickenType] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (order && open) {
      setActualWeight(String(order.actualWeight || ''))
      setPricePerKg(String(order.pricePerKg || ''))
      setPaymentMethod(order.paymentMethod || 'cash')
      setChickenType(order.chickenType === 'أخرى' ? 'أخرى' : (order.chickenType || CHICKEN_TYPES[0]))
      setCustomChickenType(order.chickenType !== 'أخرى' ? '' : order.chickenType)
      setNotes(order.notes || '')
    }
  }, [order, open])

  const weightNum = Number(actualWeight) || 0
  const priceNum = Number(pricePerKg) || 0
  const totalPrice = weightNum * priceNum
  const taxFields = weightNum > 0 && priceNum > 0 ? computeTaxFields(weightNum, priceNum) : null

  const isSubmitting = updateOrder.isPending || createInvoice.isPending

  const handleSubmit = async () => {
    if (!order || !actualWeight.trim() || !pricePerKg) return
    const effectiveChickenType = chickenType === 'أخرى' ? customChickenType.trim() : chickenType

    await updateOrder.mutateAsync({
      id: order.id,
      actualWeight: weightNum,
      pricePerKg: priceNum,
      totalPrice,
      paymentMethod,
      chickenType: effectiveChickenType,
      notes: notes.trim() || null,
    })
    toast.success('تم تعديل الطلبية')
    onSaved()
    onOpenChange(false)
  }

  const handleIssueInvoice = async () => {
    if (!order || !actualWeight.trim() || !pricePerKg) return
    const effectiveChickenType = chickenType === 'أخرى' ? customChickenType.trim() : chickenType

    await updateOrder.mutateAsync({
      id: order.id,
      actualWeight: weightNum,
      pricePerKg: priceNum,
      totalPrice,
      paymentMethod,
      chickenType: effectiveChickenType,
      notes: notes.trim() || null,
    })

    const invoiceNum = `INV-${Date.now().toString(36).toUpperCase()}`
    await createInvoice.mutateAsync({
      invoiceNumber: invoiceNum,
      orderId: order.id,
      orderType: 'direct_order',
      restaurantName: order.restaurantName,
      restaurantTaxNumber: order.restaurantTaxNumber,
      driverName,
      driverId,
      itemDescription: effectiveChickenType,
      quantityKg: weightNum,
      pricePerKg: priceNum,
      subtotalBeforeTax: taxFields?.subtotalBeforeTax ?? 0,
      vatAmount: taxFields?.vatAmount ?? 0,
      totalAmount: totalPrice,
      paymentMethod,
      invoiceDate: order.orderDate,
      pdfUrl: undefined,
      paymentStatus: order.paymentStatus,
    })

    onSaved()
    onOpenChange(false)

    onInvoiceIssued({
      invoiceNumber: invoiceNum,
      date: new Date(order.orderDate).toLocaleDateString('ar-SA'),
      restaurantName: order.restaurantName,
      restaurantTaxNumber: order.restaurantTaxNumber,
      driverName,
      quantityKg: weightNum,
      pricePerKg: priceNum,
      paymentMethod,
      paymentStatus: order.paymentStatus as 'paid' | 'unpaid',
      chickenType: effectiveChickenType,
    })

    toast.success('تم تعديل الطلبية وإصدار الفاتورة')
  }

  if (!order) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0 overflow-hidden" dir="rtl">
        <div className="border-b px-6 py-4">
          <DialogTitle className="text-sm font-semibold">تعديل الطلبية</DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{order.restaurantName}</p>
        </div>
        <div className="overflow-y-auto max-h-[70vh] px-6 py-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm">نوع الدجاج</Label>
            <Select value={chickenType} onValueChange={setChickenType}>
              <SelectTrigger className="h-11 text-right w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {CHICKEN_TYPES.map((ct) => (
                  <SelectItem key={ct} value={ct}>{ct}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {chickenType === 'أخرى' && (
              <Input
                placeholder="اكتب نوع الدجاج..."
                value={customChickenType}
                onChange={(e) => setCustomChickenType(e.target.value)}
                className="text-right h-11"
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">الكمية (كجم)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                value={actualWeight}
                onChange={(e) => setActualWeight(e.target.value)}
                className="text-right h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">سعر الكيلو (ريال)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={pricePerKg}
                onChange={(e) => setPricePerKg(e.target.value)}
                className="text-right h-11"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">طريقة الدفع</Label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((pm) => {
                const Icon = pm.icon
                return (
                  <button
                    key={pm.value}
                    type="button"
                    onClick={() => setPaymentMethod(pm.value)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-all cursor-pointer',
                      paymentMethod === pm.value
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-muted bg-muted/30 text-muted-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-medium">{pm.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
          {weightNum > 0 && priceNum > 0 && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <div className="flex justify-between text-base font-bold">
                <span>الإجمالي</span>
                <span>{totalPrice.toFixed(2)} ر.س</span>
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-sm">ملاحظات <span className="text-muted-foreground text-xs">(اختياري)</span></Label>
            <Textarea
              placeholder="أي ملاحظات إضافية..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-right min-h-[60px]"
              rows={2}
            />
          </div>
        </div>
        <div className="border-t px-6 py-3 flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="flex-1"
          >
            إلغاء
          </Button>
          <Button
            variant="outline"
            onClick={handleSubmit}
            disabled={isSubmitting || !actualWeight.trim() || !pricePerKg}
            className="flex-1 gap-2"
          >
            حفظ فقط
          </Button>
          <Button
            onClick={handleIssueInvoice}
            disabled={isSubmitting || !actualWeight.trim() || !pricePerKg}
            className="flex-1 gap-2"
          >
            تعديل وإصدار فاتورة
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ──── DriverDashboard ──── */
function DriverDashboard() {
  const { role } = useAuth()
  const { data: drivers = [] } = useDrivers(role === 'admin')

  const [selectedDriverId, setSelectedDriverId] = useState('')
  const [directOrderOpen, setDirectOrderOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<DirectOrder | null>(null)
  const [editInvoiceData, setEditInvoiceData] = useState<InvoiceData | null>(null)
  const [viewInvoiceData, setViewInvoiceData] = useState<InvoiceData | null>(null)
  const updateOrder = useUpdateDirectOrder()
  const deleteOrder = useDeleteDirectOrder()

  const syncSession = typeof window !== 'undefined' ? getDriverSession() : null

  const effectiveDriverId = role === 'admin'
    ? (selectedDriverId || (drivers[0]?.id ?? ''))
    : (syncSession?.driverId ?? '')

  const effectiveDriverName = role === 'admin'
    ? (drivers.find((d) => d.id === effectiveDriverId)?.name ?? '—')
    : (syncSession?.driverName ?? 'السائق')

  const { data: trip, isLoading: tripLoading } = useDriverTrip(effectiveDriverId)
  const { data: stops = [] } = useTripRestaurants(trip?.id ?? '')
  const { data: allDirectOrders = [] } = useDirectOrders(effectiveDriverId)
  const { data: allInvoices = [] } = useInvoices()

  const invoiceByOrderId = useMemo(() => {
    const map = new Map<string, typeof allInvoices[0]>()
    for (const inv of allInvoices) {
      if (inv.orderId && !map.has(inv.orderId)) map.set(inv.orderId, inv)
    }
    return map
  }, [allInvoices])

  const ONE_DAY_MS = 24 * 60 * 60 * 1000
  const now = Date.now()
  const directOrders = allDirectOrders.filter(
    (o) => (now - new Date(o.createdAt).getTime()) < ONE_DAY_MS
  )

  const userName = effectiveDriverName
  const handleLogout = useCallback(async () => {
    if (role === 'driver') {
      clearDriverSession()
      if (typeof window !== 'undefined') window.location.href = '/'
      return
    }
    await supabase.auth.signOut()
  }, [role])

  const hasContent = !!trip || directOrders.length > 0

  return (
    <div dir="rtl" className="min-h-dvh bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground"
              onClick={() => { window.location.href = '/' }}
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Truck className="h-5 w-5 text-primary" />
            <span className="text-sm font-bold tracking-tight">
              DChicken
              <span className="mx-1.5 text-muted-foreground">|</span>
              <span className="font-normal text-muted-foreground">واجهة السائق</span>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground h-9">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">{userName}</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-md px-4 py-6 space-y-5">
        {/* Admin: driver selector */}
        {role === 'admin' && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">عرض بيانات السائق</Label>
            <Select value={effectiveDriverId} onValueChange={setSelectedDriverId}>
              <SelectTrigger className="h-11 text-right w-full">
                <SelectValue placeholder="اختر السائق..." />
              </SelectTrigger>
              <SelectContent align="end">
                {drivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {tripLoading && !trip ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-40 rounded-xl bg-muted" />
            <div className="h-8 w-1/2 rounded-md bg-muted" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-lg bg-muted" />
            ))}
          </div>
        ) : trip ? (
          <>
            {/* Active trip card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4 text-primary" />
                  رحلة اليوم
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {new Date(trip.tripDate).toLocaleDateString('ar-SA')}
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5">
                    <Weight className="h-4 w-4 text-primary" />
                    الوزن الإجمالي: <strong>{trip.totalWeight} كجم</strong>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-primary" />
                    عدد المحطات: <strong>{stops.length}</strong>
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Stops section */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Store className="h-4 w-4 text-primary" />
                محطات التوصيل
              </h2>
              {stops.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  لا توجد محطات توصيل لهذه الرحلة
                </p>
              ) : (
                stops.map((stop, i) => (
                  <StopCard key={stop.id} stop={stop} index={i} />
                ))
              )}
            </div>
          </>
        ) : !hasContent ? (
          /* Empty state when no trip and no direct orders */
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted">
                <Package className="h-10 w-10 text-muted-foreground/60" />
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-background border shadow-sm">
                <Truck className="h-4 w-4 text-muted-foreground/60" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold">لا توجد رحلة نشطة اليوم</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                سيتم عرض تفاصيل الرحلة هنا عند توفر رحلة جديدة
              </p>
            </div>
          </div>
        ) : null}

        {/* Direct Orders section */}
        <div className="space-y-3">
          {directOrders.length > 0 && (
            <>
              <h2 className="text-sm font-semibold flex items-center gap-2 pt-3 border-t">
                <ClipboardList className="h-4 w-4 text-primary" />
                الطلبيات المباشرة المسجلة
              </h2>
              {directOrders.map((order, i) => {
                  const cfg = DIRECT_ORDER_STATUS_CONFIG[order.status] ?? DIRECT_ORDER_STATUS_CONFIG.pending
                  const paymentLabel = PAYMENT_METHODS.find((p) => p.value === order.paymentMethod)?.label ?? order.paymentMethod
                  const canModify = order.status === 'pending'
                  return (
                    <div
                      key={order.id}
                      className={cn(
                        'flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-sm',
                        'animate-fade-in'
                      )}
                      style={{ animationDelay: `${i * 80}ms` }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                            <ClipboardList className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="text-sm font-semibold">{order.restaurantName}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
                              <Weight className="h-3 w-3" />
                              {order.actualWeight} كجم
                              <span className="mx-0.5">·</span>
                              {order.totalPrice > 0 && (
                                <>
                                  {order.totalPrice.toFixed(2)} ر.س
                                  <span className="mx-0.5">·</span>
                                </>
                              )}
                              <Calendar className="h-3 w-3" />
                              {new Date(order.orderDate).toLocaleDateString('ar-SA')}
                            </p>
                          </div>
                        </div>
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      </div>
                      {order.paymentMethod && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 pr-10">
                          الدفع: {paymentLabel}
                        </div>
                      )}
                      {order.notes && (
                        <p className="text-xs text-muted-foreground pr-10">{order.notes}</p>
                      )}
                      {canModify && (
                        <div className="flex gap-2 pr-10">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => setEditingOrder(order)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            تعديل
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="gap-1.5"
                            disabled={deleteOrder.isPending}
                            onClick={async () => {
                              if (!confirm('هل أنت متأكد من إلغاء هذه الطلبية؟')) return
                              await deleteOrder.mutateAsync(order.id)
                              toast.success('تم إلغاء الطلبية')
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            إلغاء
                          </Button>
                        </div>
                      )}
                      {(() => {
                        const inv = invoiceByOrderId.get(order.id)
                        if (!inv) return null
                        return (
                          <div className="pr-10">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                              onClick={() => setViewInvoiceData({
                                invoiceNumber: inv.invoiceNumber,
                                date: new Date(inv.invoiceDate).toLocaleDateString('ar-SA'),
                                restaurantName: inv.restaurantName,
                                restaurantTaxNumber: inv.restaurantTaxNumber,
                                driverName: inv.driverName,
                                quantityKg: inv.quantityKg,
                                pricePerKg: inv.pricePerKg,
                                paymentMethod: inv.paymentMethod,
                                paymentStatus: (inv.paymentStatus as 'paid' | 'unpaid') ?? 'unpaid',
                                chickenType: inv.chickenType,
                              })}
                            >
                              <FileText className="h-3.5 w-3.5" />
                              الفاتورة
                            </Button>
                          </div>
                        )
                      })()}
                    </div>
                  )
                })}
            </>
          )}
        </div>

        {/* FAB: Direct Order */}
        <div className="fixed bottom-6 left-6 z-50">
          <Button
            size="lg"
            onClick={() => setDirectOrderOpen(true)}
            className="h-14 w-14 rounded-full shadow-lg gap-0 p-0 sm:w-auto sm:h-auto sm:rounded-lg sm:px-5 sm:py-3 sm:gap-2"
          >
            <Plus className="h-6 w-6 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline text-sm">تسجيل طلبية مباشرة</span>
          </Button>
        </div>
      </main>

      {/* Direct Order Dialog */}
      <DirectOrderDialog
        open={directOrderOpen}
        onOpenChange={setDirectOrderOpen}
        driverId={effectiveDriverId}
        driverName={effectiveDriverName}
        userId={effectiveDriverId}
      />

      {/* Edit Order Dialog */}
      <EditOrderDialog
        open={!!editingOrder}
        onOpenChange={(o) => { if (!o) setEditingOrder(null) }}
        order={editingOrder}
        driverId={effectiveDriverId}
        driverName={effectiveDriverName}
        onSaved={() => setEditingOrder(null)}
        onInvoiceIssued={(data) => setEditInvoiceData(data)}
      />

      {/* Edit Order Invoice Preview */}
      {editInvoiceData && (
        <InvoicePreview
          data={editInvoiceData}
          onClose={() => setEditInvoiceData(null)}
        />
      )}

      {/* View Invoice Preview */}
      {viewInvoiceData && (
        <InvoicePreview
          data={viewInvoiceData}
          onClose={() => setViewInvoiceData(null)}
        />
      )}

      <ScrollToTop />
    </div>
  )
}

/* ──── Route ──── */
export const Route = createFileRoute('/driver')({
  ssr: false,
  head: () => ({
    meta: [
      { title: 'DChicken · واجهة السائق' },
      { name: 'description', content: 'لوحة تحكم السائق لتطبيق DChicken لإدارة عمليات التوصيل' },
    ],
  }),
  component: () => (
    <BlinkClientBoundary fallback={<DriverSkeleton />}>
      <DriverDashboard />
    </BlinkClientBoundary>
  ),
})

/* ──── Skeleton ──── */
function DriverSkeleton() {
  return (
    <div dir="rtl" className="min-h-dvh bg-background">
      <div className="mx-auto max-w-md px-4 py-10 space-y-4 animate-pulse">
        <div className="h-8 w-3/4 rounded-md bg-muted" />
        <div className="h-40 rounded-xl bg-muted" />
        <div className="h-8 w-1/2 rounded-md bg-muted" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  )
}
