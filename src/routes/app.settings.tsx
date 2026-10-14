import { createFileRoute } from '@tanstack/react-router'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollToTop } from '@/components/ScrollToTop'
import { toast } from 'sonner'
import { useCompanySettings, useUpdateCompanySettings } from '@/hooks/useCompanySettings'
import { Settings, Building2, Save, FileText } from 'lucide-react'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/app/settings')({
  ssr: false,
  head: () => ({ meta: [{ title: 'إعدادات الشركة · DChicken' }] }),
  component: () => <CompanySettingsPage />,
})

function CompanySettingsPage() {
  const { data: settings, isLoading } = useCompanySettings()
  const updateSettings = useUpdateCompanySettings()

  const [name, setName] = useState('')
  const [taxNumber, setTaxNumber] = useState('')
  const [cr, setCr] = useState('')
  const [address, setAddress] = useState('')
  const [phones, setPhones] = useState('')

  useEffect(() => {
    if (settings) {
      setName(settings.name ?? '')
      setTaxNumber(settings.taxNumber ?? '')
      setCr(settings.cr ?? '')
      setAddress(settings.address ?? '')
      setPhones(settings.phones ?? '')
    }
  }, [settings])

  const handleSave = async () => {
    if (!name.trim()) return
    try {
      await updateSettings.mutateAsync({
        id: settings?.id || undefined,
        name: name.trim(),
        taxNumber: taxNumber.trim(),
        cr: cr.trim(),
        address: address.trim(),
        phones: phones.trim(),
      })
      toast.success('تم حفظ إعدادات الشركة')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[settings] save failed:', msg, err)
      toast.error('فشل حفظ الإعدادات: ' + msg)
    }
  }

  return (
    <div dir="rtl" className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            إعدادات الشركة
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            بيانات الشركة التي تظهر في رأس الفاتورة الضريبية
          </p>
        </div>
        <Button onClick={handleSave} disabled={updateSettings.isPending || isLoading || !name.trim()} className="gap-2 min-h-[44px]">
          <Save className="h-4 w-4" />
          {updateSettings.isPending ? 'جاري الحفظ...' : 'حفظ'}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-primary" />
            بيانات الشركة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company-name">اسم الشركة</Label>
            <Input
              id="company-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="شركة آفاق الرغد للدواجن"
              className="text-right"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company-tax">الرقم الضريبي</Label>
              <Input
                id="company-tax"
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
                placeholder="311648304500003"
                className="text-right"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-cr">السجل التجاري</Label>
              <Input
                id="company-cr"
                value={cr}
                onChange={(e) => setCr(e.target.value)}
                placeholder="7054494799"
                className="text-right"
                dir="ltr"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-address">العنوان</Label>
            <Input
              id="company-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="حي النزهة، جدة"
              className="text-right"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-phones">أرقام الهاتف</Label>
            <Input
              id="company-phones"
              value={phones}
              onChange={(e) => setPhones(e.target.value)}
              placeholder="0533632350 / 0575759184"
              className="text-right"
              dir="ltr"
            />
          </div>
        </CardContent>
      </Card>

      {/* Live preview of the invoice header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" />
            معاينة رأس الفاتورة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-muted/20 p-5 text-center space-y-1.5">
            <p className="text-lg font-bold">{name || '—'}</p>
            <p className="text-xs text-muted-foreground">
              الرقم الضريبي: {taxNumber || '—'} | السجل التجاري: {cr || '—'}
            </p>
            <p className="text-xs text-muted-foreground">
              العنوان: {address || '—'} | هاتف: {phones || '—'}
            </p>
          </div>
        </CardContent>
      </Card>

      <ScrollToTop />
    </div>
  )
}
