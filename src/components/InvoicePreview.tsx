import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Printer, X, Download } from 'lucide-react'

const COMPANY = {
  name: 'شركة آفاق الرغد للدواجن',
  taxNumber: '311648304500003',
  cr: '7054494799',
  address: 'حي النزهة، جدة',
  phones: '0533632350 / 0575759184',
}

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

export function computeTaxFields(quantityKg: number, pricePerKg: number) {
  const totalAmount = quantityKg * pricePerKg
  const subtotalBeforeTax = totalAmount / 1.15
  const vatAmount = totalAmount - subtotalBeforeTax
  return { totalAmount, subtotalBeforeTax, vatAmount }
}

export function InvoicePreview({
  data,
  onClose,
}: {
  data: InvoiceData
  onClose: () => void
}) {
  const printRef = useRef<HTMLDivElement>(null)
  const [generating, setGenerating] = useState(false)
  const { totalAmount, subtotalBeforeTax, vatAmount } = computeTaxFields(
    data.quantityKg,
    data.pricePerKg,
  )

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = async () => {
    if (!printRef.current || generating) return
    setGenerating(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')

      const el = printRef.current
      const clone = el.cloneNode(true) as HTMLElement
      clone.style.position = 'fixed'
      clone.style.top = '0'
      clone.style.left = '0'
      clone.style.zIndex = '-1'
      clone.style.opacity = '1'
      clone.style.transform = 'none'
      document.body.appendChild(clone)

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      })

      document.body.removeChild(clone)

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`invoice-${data.invoiceNumber}.pdf`)
    } catch (err) {
      console.error('PDF generation failed:', err)
    } finally {
      setGenerating(false)
    }
  }

  const chickenTypeLabel = data.chickenType || 'شاورما مبرد (فريش)'

  return (
    <>
      <div className="fixed inset-0 z-[9998] bg-black/50 print:hidden" onClick={onClose} />

      <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-black/50 print:bg-transparent print:static">
        <div className="relative my-4 w-full max-w-[210mm] print:max-w-none print:my-0">
          <div className="sticky top-0 z-10 flex items-center justify-end gap-2 p-2 print:hidden">
            <Button
              size="sm"
              onClick={handleDownloadPDF}
              disabled={generating}
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white h-9"
            >
              {generating ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              تحميل PDF
            </Button>
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
                {COMPANY.name}
              </div>
              <div style={{ fontSize: '9pt', color: '#444', marginBottom: '1mm' }}>
                الرقم الضريبي: {COMPANY.taxNumber} | السجل التجاري: {COMPANY.cr}
              </div>
              <div style={{ fontSize: '9pt', color: '#444' }}>
                العنوان: {COMPANY.address} | هاتف: {COMPANY.phones}
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
                  <th style={{ textAlign: 'right', padding: '3mm 2mm', fontWeight: 700 }}>الوصف</th>
                  <th style={{ textAlign: 'center', padding: '3mm 2mm', fontWeight: 700 }}>الكمية (كجم)</th>
                  <th style={{ textAlign: 'center', padding: '3mm 2mm', fontWeight: 700 }}>سعر الكيلو (ر.س)</th>
                  <th style={{ textAlign: 'left', padding: '3mm 2mm', fontWeight: 700 }}>المجموع (ر.س)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px dashed #ccc' }}>
                  <td style={{ textAlign: 'right', padding: '3mm 2mm' }}>{chickenTypeLabel}</td>
                  <td style={{ textAlign: 'center', padding: '3mm 2mm' }}>{data.quantityKg}</td>
                  <td style={{ textAlign: 'center', padding: '3mm 2mm' }}>{formatSAR(data.pricePerKg)}</td>
                  <td style={{ textAlign: 'left', padding: '3mm 2mm' }}>{formatSAR(totalAmount)}</td>
                </tr>
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
