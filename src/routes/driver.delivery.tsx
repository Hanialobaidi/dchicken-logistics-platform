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
import { ScrollToTop } from '@/components/ScrollToTop'
import { Store, Weight } from 'lucide-react'
import { useState } from 'react'

interface DeliverySearch {
  stopId: string
  name: string
  targetWeight: string
}

function DeliveryDialog() {
  const navigate = useNavigate()
  const { stopId, name, targetWeight } = Route.useSearch()
  const confirmDelivery = useConfirmDelivery()

  const [actualWeight, setActualWeight] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!actualWeight.trim() || !stopId) return
    setIsSubmitting(true)

    try {
      await confirmDelivery.mutateAsync({
        tripRestaurantId: stopId,
        actualWeight: Number(actualWeight),
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
              يرجى إدخال الكمية الفعلية لتأكيد التسليم
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


