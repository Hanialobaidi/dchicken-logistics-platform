import { useRef, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Printer, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useCompanySettings, DEFAULT_COMPANY_SETTINGS } from '@/hooks/useCompanySettings'
import type { InvoiceItem } from '@/types'

// Kept for backwards-compatibility; the live values come from company settings.
const COMPANY = DEFAULT_COMPANY_SETTINGS

export interface InvoiceData {
  invoiceNumber: string
  date: string
  restaurantName: string
  restaurantTaxNumber: string
  driverName: string
  quantityKg: number
  pricePerKg: number
  paymentMethod: string
  paymentStatus: 'paid' | 'unpaid'
  chickenType?: string
  saleUnit?: 'kg' | 'piece'
  unitSize?: string
  pieces?: number
  pricePerPiece?: number
  items?: InvoiceItem[]
}

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
  return value.toFixed(2)
}

export function computeTaxFromTotal(totalAmount: number) {
  const subtotalBeforeTax = totalAmount / 1.15
  const vatAmount = totalAmount - subtotalBeforeTax
  return { totalAmount, subtotalBeforeTax, vatAmount }
}

export function computeTaxFields(quantityKg: number, pricePerKg: number) {
  return computeTaxFromTotal(quantityKg * pricePerKg)
}

export function InvoicePreview({
  data,
  onClose,
}: {
  data: InvoiceData
  onClose: () => void
}) {
  const printRef = useRef<HTMLDivElement>(null)
  const { data: settings } = useCompanySettings()
  const company = settings ?? COMPANY

  const isPiece = data.saleUnit === 'piece'
  const pieceRows: InvoiceItem[] = isPiece
    ? (data.items && data.items.length > 0
        ? data.items
        : [{
            chickenType: data.chickenType || '',
            unitSize: data.unitSize ?? null,
            pieces: data.pieces ?? 0,
            pricePerPiece: data.pricePerPiece ?? 0,
          }])
    : []
  const totalForTax = isPiece
    ? pieceRows.reduce((sum, it) => sum + (Number(it.pieces) || 0) * (Number(it.pricePerPiece) || 0), 0)
    : data.quantityKg * data.pricePerKg
  const { totalAmount, subtotalBeforeTax, vatAmount } = computeTaxFromTotal(totalForTax)

  const handlePrint = () => {
    window.print()
  }

  const chickenTypeLabel = data.chickenType || 'شاورما مبرد (فريش)'
  const rowLabel = (it: InvoiceItem) => {
    const t = it.chickenType || 'شاورما مبرد (فريش)'
    return it.unitSize ? `${t} - ${it.unitSize}` : t
  }
  const verifyUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/invoice/verify/${data.invoiceNumber}`
  }, [data.invoiceNumber])

  return (
    <>
      <div className="fixed inset-0 z-[9998] bg-black/50 print:hidden" onClick={onClose} />

      <div data-invoice-preview className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-black/50 print:bg-transparent print:static">
        <div className="relative my-4 w-full max-w-[210mm] print:max-w-none print:my-0">
          <div className="sticky top-0 z-10 flex items-center justify-end gap-2 p-2 print:hidden">
            <Button
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white h-9"
            >
              <Printer className="h-4 w-4" />
              طباعة
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onClose}
              className="gap-1.5 h-9 bg-white"
            >
              <X className="h-4 w-4" />
              إغلاق
            </Button>
          </div>

          <div
            ref={printRef}
            dir="rtl"
            data-invoice-preview
            className="bg-white text-black mx-auto print:mx-0 shadow-lg"
            style={{
              width: '210mm',
              height: '297mm',
              padding: '10mm 15mm',
              fontSize: '10pt',
              lineHeight: '1.3',
              fontFamily: "'Tajawal', 'Arial', sans-serif",
              boxSizing: 'border-box',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '4mm' }}>
              <div style={{ fontSize: '18pt', fontWeight: 800, marginBottom: '2mm', color: '#1a1a1a' }}>
                {company.name}
              </div>
              <div style={{ fontSize: '9pt', color: '#444', marginBottom: '1mm' }}>
                الرقم الضريبي: {company.taxNumber} | السجل التجاري: {company.cr}
              </div>
              <div style={{ fontSize: '9pt', color: '#444' }}>
                العنوان: {company.address} | هاتف: {company.phones}
              </div>
            </div>

            <div style={{ borderTop: '2px solid #000', margin: '3mm 0' }} />

            {/* Invoice Title */}
            <div style={{ textAlign: 'center', marginBottom: '4mm' }}>
              <div style={{ fontSize: '14pt', fontWeight: 700, color: '#1a1a1a' }}>
                فاتورة ضريبية
              </div>
            </div>

            {/* Invoice info + Customer info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4mm', fontSize: '9pt' }}>
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: '1.5mm' }}>
                  <span style={{ fontWeight: 700 }}>رقم الفاتورة:</span>{' '}
                  {data.invoiceNumber}
                </div>
                <div style={{ marginBottom: '1.5mm' }}>
                  <span style={{ fontWeight: 700 }}>التاريخ:</span>{' '}
                  {data.date}
                </div>
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ marginBottom: '1.5mm' }}>
                  <span style={{ fontWeight: 700 }}>العميل:</span>{' '}
                  {data.restaurantName}
                </div>
                {data.restaurantTaxNumber && (
                  <div style={{ marginBottom: '1.5mm' }}>
                    <span style={{ fontWeight: 700 }}>الرقم الضريبي:</span>{' '}
                    {data.restaurantTaxNumber}
                  </div>
                )}
                <div>
                  <span style={{ fontWeight: 700 }}>السائق:</span>{' '}
                  {data.driverName}
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '3mm 0' }} />

            {/* Items table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '4mm' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #000', backgroundColor: '#f5f5f5' }}>
                  <th style={{ textAlign: 'right', padding: '3mm 2mm', fontWeight: 700 }}>{isPiece ? 'النوع' : 'الوصف'}</th>
                  <th style={{ textAlign: 'center', padding: '3mm 2mm', fontWeight: 700 }}>{isPiece ? 'الكمية (حبة)' : 'الكمية (كجم)'}</th>
                  <th style={{ textAlign: 'center', padding: '3mm 2mm', fontWeight: 700 }}>{isPiece ? 'السعر' : 'سعر الكيلو (ر.س)'}</th>
                  <th style={{ textAlign: 'left', padding: '3mm 2mm', fontWeight: 700 }}>المجموع (ر.س)</th>
                </tr>
              </thead>
              <tbody>
                {isPiece ? (
                  pieceRows.map((it, i) => (
                    <tr key={i} style={{ borderBottom: '1px dashed #ccc' }}>
                      <td style={{ textAlign: 'right', padding: '3mm 2mm' }}>{rowLabel(it)}</td>
                      <td style={{ textAlign: 'center', padding: '3mm 2mm' }}>{it.pieces}</td>
                      <td style={{ textAlign: 'center', padding: '3mm 2mm' }}>{formatSAR(Number(it.pricePerPiece) || 0)}</td>
                      <td style={{ textAlign: 'left', padding: '3mm 2mm' }}>
                        {formatSAR((Number(it.pieces) || 0) * (Number(it.pricePerPiece) || 0))}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr style={{ borderBottom: '1px dashed #ccc' }}>
                    <td style={{ textAlign: 'right', padding: '3mm 2mm' }}>{chickenTypeLabel}</td>
                    <td style={{ textAlign: 'center', padding: '3mm 2mm' }}>{data.quantityKg}</td>
                    <td style={{ textAlign: 'center', padding: '3mm 2mm' }}>{formatSAR(data.pricePerKg)}</td>
                    <td style={{ textAlign: 'left', padding: '3mm 2mm' }}>{formatSAR(totalAmount)}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4mm' }}>
              <table style={{ width: '55%', fontSize: '9pt' }}>
                <tbody>
                  <tr>
                    <td style={{ textAlign: 'right', padding: '1.5mm 0' }}>المجموع الخاضع للضريبة</td>
                    <td style={{ textAlign: 'left', padding: '1.5mm 0' }}>{formatSAR(subtotalBeforeTax)} ر.س</td>
                  </tr>
                  <tr>
                    <td style={{ textAlign: 'right', padding: '1.5mm 0' }}>ضريبة القيمة المضافة (15%)</td>
                    <td style={{ textAlign: 'left', padding: '1.5mm 0' }}>{formatSAR(vatAmount)} ر.س</td>
                  </tr>
                  <tr style={{ fontWeight: 800, fontSize: '11pt', borderTop: '2px solid #000' }}>
                    <td style={{ textAlign: 'right', padding: '3mm 0' }}>الإجمالي الكلي</td>
                    <td style={{ textAlign: 'left', padding: '3mm 0' }}>{formatSAR(totalAmount)} ر.س</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Payment info */}
            <div style={{ fontSize: '9pt', marginBottom: '4mm', padding: '3mm', backgroundColor: '#f9f9f9', borderRadius: '2mm' }}>
              <span style={{ fontWeight: 700 }}>طريقة الدفع:</span>{' '}
              {PAYMENT_LABELS[data.paymentMethod] ?? data.paymentMethod}
              <span style={{ margin: '0 3mm' }}>|</span>
              <span style={{ fontWeight: 700 }}>حالة الدفع:</span>{' '}
              <span style={{
                color: data.paymentStatus === 'paid' ? '#16a34a' : '#dc2626',
                fontWeight: 700,
              }}>
                {PAYMENT_STATUS_LABELS[data.paymentStatus] ?? data.paymentStatus}
              </span>
            </div>

            <div style={{ borderTop: '2px solid #000', margin: '4mm 0' }} />

            {/* QR Code */}
            {verifyUrl && (
              <div style={{ textAlign: 'center', marginBottom: '4mm' }}>
                <QRCodeSVG
                  value={verifyUrl}
                  size={80}
                  level="M"
                  style={{ margin: '0 auto' }}
                />
                <div style={{ fontSize: '7pt', color: '#666', marginTop: '2mm' }}>
                  امسح الرمز للتحقق من صحة الفاتورة إلكترونياً
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '8pt', color: '#444', marginBottom: '2mm' }}>
                الفاتورة صادرة إلكترونياً ومعتمدة لدى الشركة ولا تحتاج إلى توقيع أو ختم
              </div>
              <div style={{ fontSize: '7pt', color: '#888', fontStyle: 'italic' }}>
                THIS INVOICE IS ELECTRONICALLY GENERATED AND FULLY APPROVED BY THE COMPANY, REQUIRING NO SIGNATURE OR OFFICIAL SEAL.
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0 !important;
          }
          html, body, #root {
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            overflow: hidden !important;
          }
          body * {
            visibility: hidden !important;
          }
          [data-invoice-preview],
          [data-invoice-preview] * {
            visibility: visible !important;
          }
          [data-invoice-preview] {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: auto !important;
            bottom: auto !important;
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 10mm 15mm !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            overflow: hidden !important;
            background: white !important;
            color: black !important;
            z-index: 99999 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </>
  )
}

export { COMPANY }
