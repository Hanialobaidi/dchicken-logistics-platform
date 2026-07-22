import { createFileRoute } from '@tanstack/react-router'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { useDrivers, useCreateDriver, useUpdateDriver, useDeleteDriver } from '@/hooks/useDrivers'
import { Users, Plus, Trash2, Pencil, Phone, Car, Key, User } from 'lucide-react'
import { useState, useMemo } from 'react'
import { formatNum } from '@/lib/utils'
import type { Driver } from '@/types'
import { SearchInput } from '@/components/SearchInput'
import { PullToRefresh } from '@/components/PullToRefresh'
import { useRefreshAll } from '@/hooks/useRefreshAll'

export const Route = createFileRoute('/app/drivers')({
  ssr: false,
  head: () => ({ meta: [{ title: 'السائقين · DChicken' }] }),
  component: () => <DriversPage />,
})

function DriversPage() {
  const refreshAll = useRefreshAll()
  const { data: drivers = [], isLoading } = useDrivers()
  const createDriver = useCreateDriver()
  const updateDriver = useUpdateDriver()
  const deleteDriver = useDeleteDriver()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [plateNumber, setPlateNumber] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [salary, setSalary] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')

  const filteredDrivers = useMemo(() => {
    if (!search.trim()) return drivers
    const q = search.trim().toLowerCase()
    return drivers.filter((d: Driver) =>
      d.name?.toLowerCase().includes(q) ||
      d.username?.toLowerCase().includes(q) ||
      d.phone?.toLowerCase().includes(q)
    )
  }, [drivers, search])

  const openCreate = () => {
    setEditingDriver(null)
    setName('')
    setPhone('')
    setPlateNumber('')
    setUsername('')
    setPassword('')
    setSalary('')
    setDialogOpen(true)
  }

  const openEdit = (driver: Driver) => {
    setEditingDriver(driver)
    setName(driver.name)
    setPhone(driver.phone)
    setPlateNumber(driver.plateNumber)
    setUsername(driver.username ?? '')
    setPassword(driver.password ?? '')
    setSalary(driver.salary != null ? String(driver.salary) : '')
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!name.trim()) return
    if (!editingDriver && (!username.trim() || !password.trim())) {
      toast.error('اسم المستخدم وكلمة المرور مطلوبان')
      return
    }
    setSubmitting(true)
    try {
      const salaryNum = salary.trim() ? Number(salary.trim()) : null
      if (editingDriver) {
        const updateData: { id: string; name?: string; phone?: string; plateNumber?: string; username?: string; password?: string; salary?: number | null } = {
          id: editingDriver.id,
          name: name.trim(),
          phone: phone.trim(),
          plateNumber: plateNumber.trim(),
          salary: salaryNum,
        }
        if (username.trim()) updateData.username = username.trim()
        if (password.trim()) updateData.password = password.trim()
        await updateDriver.mutateAsync(updateData)
        toast.success('تم تحديث بيانات السائق بنجاح')
      } else {
        await createDriver.mutateAsync({
          name: name.trim(),
          phone: phone.trim(),
          plateNumber: plateNumber.trim(),
          username: username.trim(),
          password: password,
          salary: salaryNum,
        })
        toast.success('تم إضافة السائق بنجاح')
      }
      setName('')
      setPhone('')
      setPlateNumber('')
      setUsername('')
      setPassword('')
      setSalary('')
      setDialogOpen(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[drivers] create/update failed:', msg, err)
      toast.error(editingDriver ? 'فشل تحديث بيانات السائق: ' + msg : 'فشل إضافة السائق: ' + msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string, driverName: string) => {
    if (!confirm(`هل أنت متأكد من حذف السائق "${driverName}"؟`)) return
    try {
      await deleteDriver.mutateAsync(id)
      toast.success('تم حذف السائق بنجاح')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[drivers] delete failed:', msg, err)
      toast.error('فشل حذف السائق: ' + msg)
    }
  }

  return (
    <PullToRefresh onRefresh={refreshAll}>
    <div dir="rtl" className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            إدارة السائقين
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            إدارة السائقين المسجلين في النظام
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 min-h-[44px]">
          <Plus className="h-4 w-4" />
          إضافة سائق
        </Button>
      </div>

      {/* Search */}
      {drivers.length > 0 && (
        <div className="max-w-sm">
          <SearchInput value={search} onChange={setSearch} placeholder="بحث بالاسم، المستخدم، أو الجوال..." />
        </div>
      )}

      {/* Drivers table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-2 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 rounded-md bg-muted" />
              ))}
            </div>
          ) : drivers.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Users className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium">لا يوجد سائقون مسجلون</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                أضف أول سائق للبدء في إنشاء رحلات التوزيع
              </p>
              <Button variant="outline" size="sm" onClick={openCreate} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                إضافة سائق
              </Button>
            </div>
          ) : filteredDrivers.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <p className="text-sm text-muted-foreground">لا توجد نتائج لـ "{search}"</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">اسم المستخدم</TableHead>
                  <TableHead className="text-right">رقم الجوال</TableHead>
                  <TableHead className="text-right">رقم اللوحة</TableHead>
                  <TableHead className="text-right">الراتب</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDrivers.map((d: Driver) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {d.username || '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm" dir="ltr">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {d.phone || '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm" dir="ltr">
                      <span className="flex items-center gap-1">
                        <Car className="h-3 w-3" />
                        {d.plateNumber || '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {d.salary != null ? `${formatNum(Number(d.salary))} ر.س` : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => openEdit(d)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(d.id, d.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit driver dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md gap-5 sm:max-w-md">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center justify-end gap-2">
              {editingDriver ? 'تعديل بيانات السائق' : 'إضافة سائق جديد'}
              <Users className="h-5 w-5 text-primary" />
            </DialogTitle>
            <DialogDescription className="text-right">
              {editingDriver
                ? 'عدّل بيانات السائق ثم احفظ التغييرات'
                : 'أدخل بيانات السائق لإضافته إلى النظام — اسم المستخدم وكلمة المرور مطلوبان لتسجيل الدخول'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">الاسم الكامل</Label>
              <Input
                id="name"
                placeholder="مثال: أحمد محمد"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-right"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="username" className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  اسم المستخدم {!editingDriver && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id="username"
                  placeholder="مثال: ahmed"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="text-right"
                  disabled={!!editingDriver}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5" />
                  كلمة المرور {!editingDriver && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="text-right"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">رقم الجوال</Label>
              <Input
                id="phone"
                placeholder="مثال: 0501234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="text-right"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plateNumber">رقم اللوحة</Label>
              <Input
                id="plateNumber"
                placeholder="مثال: أ ب ج 1234"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                className="text-right"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary">الراتب (ر.س)</Label>
              <Input
                id="salary"
                type="number"
                placeholder="مثال: 5000"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
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
              onClick={handleSubmit}
              disabled={submitting || !name.trim() || (!editingDriver && (!username.trim() || !password.trim()))}
              className="min-h-[44px] flex-1 gap-2"
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  جاري الحفظ...
                </>
              ) : editingDriver ? (
                'تحديث'
              ) : (
                'حفظ'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </PullToRefresh>
  )
}

function DriversSkeleton() {
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
