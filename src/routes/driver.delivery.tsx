import { createFileRoute, useNavigate } from '@tanstack/react-router'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useConfirmDelivery } from '@/hooks/useDriverTrip'
import { supabase } from '@/lib/supabase'
import { ScrollToTop } from '@/components/ScrollToTop'
import { Store, Weight, FileText, Upload, X } from 'lucide-react'
import { useState, useRef, type ChangeEvent } from 'react'

interface DeliverySearch {
  stopId: string
  name: string
  targetWeight: string
}

function DeliveryDialog() {
  const navigate = useNavigate()
  const { stopId, name, targetWeight } = Route.useSearch()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const confirmDelivery = useConfirmDelivery()

  const [actualWeight, setActualWeight] = useState('')
  const [notes, setNotes] = useState('')
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setInvoiceFile(file)
  }

  const removeFile = () => {
    setInvoiceFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async () => {
    if (!actualWeight.trim() || !stopId) return
    setIsSubmitting(true)

    try {
      let invoiceImageUrl: string | undefined

      if (invoiceFile) {
        const ext = invoiceFile.name.split('.').pop()
        const filePath = `invoices/${stopId}-${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('invoices')
          .upload(filePath, invoiceFile)
        if (uploadError) throw new Error(uploadError.message)
        const { data: urlData } = supabase.storage.from('invoices').getPublicUrl(filePath)
        invoiceImageUrl = urlData.publicUrl
      }

      await confirmDelivery.mutateAsync({
        tripRestaurantId: stopId,
        actualWeight: Number(actualWeight),
        invoiceImageUrl,
        notes: notes.trim() || undefined,
      })

      toast.success('تم تأكيد التسليم بنجاح')
      navigate({ to: '/driver' })
    } catch {
      toast.error('فشل تأكيد التسليم')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (isSubmitting) return
    navigate({ to: '/driver' })
  }

  return (
    <div dir="rtl">
      <Dialog open onOpenChange={(open) => { if (!open) handleClose() }}>
        <DialogContent
          className="max-w-md gap-5 sm:max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center justify-end gap-2">
              تأكيد التسليم
              <Store className="h-5 w-5 text-primary" />
            </DialogTitle>
            <DialogDescription className="text-right">
              يرجى إدخال الكمية الفعلية ورفع صورة الفاتورة
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Read-only: restaurant name */}
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">المطعم</Label>
              <p className="text-sm font-semibold">{name}</p>
            </div>

            {/* Read-only: target weight */}
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">الوزن المستهدف</Label>
              <p className="text-sm font-semibold flex items-center gap-1.5">
                <Weight className="h-4 w-4 text-primary" />
                {targetWeight} كجم
              </p>
            </div>

            {/* Actual weight input */}
            <div className="space-y-1.5">
              <Label htmlFor="actualWeight" className="text-sm">
                الكمية الفعلية بالكيلو
              </Label>
              <Input
                id="actualWeight"
                type="number"
                step="0.1"
                min="0"
                placeholder="أدخل الوزن الفعلي..."
                value={actualWeight}
                onChange={(e) => setActualWeight(e.target.value)}
                className="text-right h-11"
              />
            </div>

            {/* File upload */}
            <div className="space-y-1.5">
              <Label className="text-sm flex items-center gap-1.5">
                <Upload className="h-3.5 w-3.5" />
                رفع صورة الفاتورة
              </Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="hidden"
                id="invoice-upload"
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
                  htmlFor="invoice-upload"
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

          <DialogFooter className="gap-2 sm:gap-2">
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
              disabled={isSubmitting || !actualWeight.trim()}
              className="min-h-[44px] flex-1 gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  جاري الحفظ...
                </>
              ) : (
                'حفظ وإرسال'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


export const Route = createFileRoute('/driver/delivery')({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): DeliverySearch => ({
    stopId: String(search.stopId ?? ''),
    name: String(search.name ?? ''),
    targetWeight: String(search.targetWeight ?? ''),
  }),
  head: () => ({
    meta: [
      { title: 'تأكيد التسليم · DChicken' },
      { name: 'description', content: 'تأكيد تسليم طلبية لمطعم' },
    ],
  }),
  component: () => <DeliveryDialog />,
})


