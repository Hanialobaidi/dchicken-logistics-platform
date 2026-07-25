import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { invoicesTable } from '@/lib/db'
import { COMPANY } from '@/components/InvoicePreview'
import { formatDate } from '@/lib/utils'
import { ShieldCheck, XCircle, Loader2 } from 'lucide-react'
import type { Invoice } from '@/types'

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'نقدي',
  network: 'شبكة',
  credit: 'آجل',
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: 'مدفوع',
  unpaid: 'غير مدفوع',
}

function formatSAR(value: number): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export const Route = createFileRoute('/invoice/verify/$invoiceNumber')({
  ssr: false,
  head: () => ({
    meta: [{ title: 'التحقق من الفاتورة | DChicken' }],
  }),
  component: InvoiceVerifyPage,
})

function InvoiceVerifyPage() {
  const { invoiceNumber } = Route.useParams()

  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['verify-invoice', invoiceNumber],
    queryFn: () =>
      invoicesTable.list<Invoice>({
        where: { invoiceNumber },
        limit: 1,
      }),
    enabled: !!invoiceNumber,
  })

  const inv = invoice?.[0]
  const totalAmount = inv ? (inv.totalAmount ?? inv.quantityKg * inv.pricePerKg) : 0
  const subtotalBeforeTax = inv ? (inv.subtotalBeforeTax ?? totalAmount / 1.15) : 0
  const vatAmount = inv ? (inv.vatAmount ?? totalAmount - subtotalBeforeTax) : 0

  return (
    <div dir="rtl" className="min-h-dvh bg-gradient-to-b from-emerald-50 to-white">
      <div className="mx-auto max-w-lg px-4 py-8">
        {/* Header */}
        <div className="text-center mb-6">
          <img src="/icon-192.png" alt="DChicken" className="h-14 w-14 mx-auto mb-3" />
          <h1 className="text-lg font-bold text-foreground">التحقق من الفاتورة</h1>
          <p className="text-xs text-muted-foreground mt-1">DChicken Logistics — آفاق الرغد للدواجن</p>
        </div>

        {isLoading && (
          <div className="flex flex-col items-center gap-3 py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">جاري التحقق...</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
            <XCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-red-700">خطأ في الاتصال</p>
            <p className="text-xs text-red-600 mt-1">يرجى المحاولة مرة أخرى</p>
          </div>
        )}

        {!isLoading && !error && !inv && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
            <XCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-red-700">فاتورة غير موجودة</p>
            <p className="text-xs text-red-600 mt-1">رقم الفاتورة "{invoiceNumber}" غير صحيح أو غير موجود</p>
          </div>
        )}

        {inv && (
          <div className="rounded-xl border border-emerald-200 bg-white shadow-sm overflow-hidden">
            {/* Verified badge */}
            <div className="bg-emerald-600 text-white text-center py-3 px-4">
              <div className="flex items-center justify-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-sm font-bold">فاتورة صحيحة وموثقة</span>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Invoice info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[11px] text-muted-foreground">رقم الفاتورة</p>
                  <p className="font-semibold">{inv.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">التاريخ</p>
                  <p className="font-semibold">{inv.invoiceDate ? formatDate(inv.invoiceDate) : '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">المطعم</p>
                  <p className="font-semibold">{inv.restaurantName}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">السائق</p>
                  <p className="font-semibold">{inv.driverName}</p>
                </div>
              </div>

              <div className="border-t border-dashed" />

              {/* Items table */}
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-[11px] text-muted-foreground">
                    <th className="text-right py-2 font-medium">الصنف</th>
                    <th className="text-center py-2 font-medium">الكمية</th>
                    <th className="text-center py-2 font-medium">سعر/كجم</th>
                    <th className="text-left py-2 font-medium">المجموع</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-dashed">
                    <td className="py-2 text-right">{inv.chickenType || 'شاورما مبرد (فريش)'}</td>
                    <td className="py-2 text-center">{inv.quantityKg} كجم</td>
                    <td className="py-2 text-center">{formatSAR(inv.pricePerKg)} ر.س</td>
                    <td className="py-2 text-left font-semibold">{formatSAR(totalAmount)} ر.س</td>
                  </tr>
                </tbody>
              </table>

              {/* Totals */}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المجموع قبل الضريبة</span>
                  <span>{formatSAR(subtotalBeforeTax)} ر.س</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ضريبة القيمة المضافة (15%)</span>
                  <span>{formatSAR(vatAmount)} ر.س</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t-2 border-black pt-2 mt-2">
                  <span>الإجمالي الكلي</span>
                  <span>{formatSAR(totalAmount)} ر.س</span>
                </div>
              </div>

              {/* Payment */}
              <div className="rounded-lg bg-muted/50 p-3 text-sm flex items-center justify-between">
                <div>
                  <span className="text-muted-foreground">طريقة الدفع: </span>
                  <span className="font-semibold">{PAYMENT_LABELS[inv.paymentMethod] ?? inv.paymentMethod}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">الحالة: </span>
                  <span className={`font-semibold ${inv.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {PAYMENT_STATUS_LABELS[inv.paymentStatus] ?? inv.paymentStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t bg-muted/30 text-center py-3 px-4">
              <p className="text-[10px] text-muted-foreground">
                هذه الفاتورة صادرة إلكترونياً من منصة DChicken Logistics
              </p>
            </div>
          </div>
        )}

        {/* Company info */}
        <div className="text-center mt-6 text-[10px] text-muted-foreground space-y-0.5">
          <p>{COMPANY.name}</p>
          <p>الرقم الضريبي: {COMPANY.taxNumber} | السجل التجاري: {COMPANY.cr}</p>
          <p>{COMPANY.address} | هاتف: {COMPANY.phones}</p>
        </div>
      </div>
    </div>
  )
}
