import { createFileRoute } from '@tanstack/react-router'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollToTop } from '@/components/ScrollToTop'
import { Label } from '@/components/ui/label'
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
import { useRestaurants, useCreateRestaurant, useDeleteRestaurant } from '@/hooks/useRestaurants'
import { Store, Plus, Trash2, MapPin, Phone, Hash, AlertTriangle } from 'lucide-react'
import { useState, useMemo } from 'react'
import type { Restaurant } from '@/types'
import { SearchInput } from '@/components/SearchInput'

export const Route = createFileRoute('/app/restaurants')({
  ssr: false,
  head: () => ({ meta: [{ title: 'المطاعم · DChicken' }] }),
  component: () => <RestaurantsPage />,
})

function RestaurantsPage() {
  const { data: restaurants = [], isLoading } = useRestaurants()
  const createRestaurant = useCreateRestaurant()
  const deleteRestaurant = useDeleteRestaurant()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [phone, setPhone] = useState('')
  const [taxNumber, setTaxNumber] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')

  const filteredRestaurants = useMemo(() => {
    if (!search.trim()) return restaurants
    const q = search.trim().toLowerCase()
    return restaurants.filter((r: Restaurant) =>
      r.name?.toLowerCase().includes(q) ||
      r.taxNumber?.toLowerCase().includes(q) ||
      r.phone?.toLowerCase().includes(q)
    )
  }, [restaurants, search])

  const handleCreate = async () => {
    if (!name.trim()) return
    if (taxNumber.trim() && taxNumber.trim().length !== 15) {
      toast.error('الرقم الضريبي يجب أن يكون 15 خانة')
      return
    }
    setSubmitting(true)
    try {
      await createRestaurant.mutateAsync({
        name: name.trim(),
        location: location.trim(),
        phone: phone.trim(),
        taxNumber: taxNumber.trim(),
      })
      toast.success('تم إضافة المطعم بنجاح')
      setName('')
      setLocation('')
      setPhone('')
      setTaxNumber('')
      setDialogOpen(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[restaurants] create failed:', msg, err)
      toast.error('فشل إضافة المطعم: ' + msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string, restaurantName: string) => {
    if (!confirm(`هل أنت متأكد من حذف "${restaurantName}"؟`)) return
    try {
      await deleteRestaurant.mutateAsync(id)
      toast.success('تم حذف المطعم بنجاح')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[restaurants] delete failed:', msg, err)
      toast.error('فشل حذف المطعم: ' + msg)
    }
  }

  const openCreate = () => {
    setName('')
    setLocation('')
    setPhone('')
    setTaxNumber('')
    setDialogOpen(true)
  }

  return (
    <div dir="rtl" className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            المطاعم
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            إدارة المطاعم المسجلة في النظام
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 min-h-[44px]">
          <Plus className="h-4 w-4" />
          إضافة مطعم
        </Button>
      </div>

      {/* Search */}
      {restaurants.length > 0 && (
        <div className="max-w-sm">
          <SearchInput value={search} onChange={setSearch} placeholder="بحث بالاسم، الضريبي، أو الهاتف..." />
        </div>
      )}

      {/* Restaurant table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-2 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 rounded-md bg-muted" />
              ))}
            </div>
          ) : restaurants.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Store className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium">لا توجد مطاعم مسجلة</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                أضف أول مطعم للبدء في إنشاء الرحلات وتوزيع الدجاج
              </p>
              <Button variant="outline" size="sm" onClick={openCreate} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                إضافة مطعم
              </Button>
            </div>
          ) : filteredRestaurants.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <p className="text-sm text-muted-foreground">لا توجد نتائج لـ "{search}"</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">اسم المطعم</TableHead>
                    <TableHead className="text-right">الرقم الضريبي</TableHead>
                    <TableHead className="text-right">الموقع</TableHead>
                    <TableHead className="text-right">رقم الهاتف</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRestaurants.map((r: Restaurant) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        <span className="flex items-center gap-1">
                          <Hash className="h-3 w-3" />
                          {r.taxNumber || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {r.location || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {r.phone || '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(r.id, r.name)}
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

      {/* Add restaurant dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md gap-5 sm:max-w-md">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center justify-end gap-2">
              إضافة مطعم جديد
              <Store className="h-5 w-5 text-primary" />
            </DialogTitle>
            <DialogDescription className="text-right">
              أدخل بيانات المطعم التجاري والرقم الضريبي لإضافته إلى النظام
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">اسم المطعم التجاري</Label>
              <Input
                id="name"
                placeholder="مثال: مطعم الأصالة"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxNumber">
                الرقم الضريبي
                <span className="text-xs text-muted-foreground mr-1">(15 خانة)</span>
              </Label>
              <Input
                id="taxNumber"
                placeholder="مثال: 311648304500003"
                maxLength={15}
                value={taxNumber}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '')
                  setTaxNumber(val)
                }}
                className="text-right"
                dir="ltr"
              />
              {taxNumber.length > 0 && taxNumber.length !== 15 && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  يجب أن يكون 15 خانة ({taxNumber.length}/15)
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">الموقع</Label>
              <Input
                id="location"
                placeholder="مثال: حي الروضة، الرياض"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">رقم الهاتف</Label>
              <Input
                id="phone"
                placeholder="مثال: 0501234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="text-right"
                dir="ltr"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting} className="min-h-[44px] flex-1">
              إلغاء
            </Button>
            <Button
              onClick={handleCreate}
              disabled={submitting || !name.trim() || (taxNumber.length > 0 && taxNumber.length !== 15)}
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

function RestaurantsSkeleton() {
  return (
    <div dir="rtl" className="p-6 space-y-6 animate-pulse">
      <div className="flex justify-between">
        <div className="h-8 w-1/4 rounded-md bg-muted" />
        <div className="h-9 w-32 rounded-md bg-muted" />
      </div>
      <div className="h-64 rounded-xl bg-muted" />
    </div>
  )
}
