import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Truck, LayoutDashboard, ChefHat, User, Key, LogIn, Mail } from 'lucide-react'
import { useState } from 'react'
import { useDriverLogin } from '@/hooks/useDrivers'
import { signInWithEmail, signOut } from '@/hooks/useAuth'
import { toast } from 'sonner'

const REMEMBER_KEY = 'dchicken_remember_me'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'DChicken | منصة توزيع الدجاج' },
      { name: 'description', content: 'منصة لوجستية لإدارة توزيع الدجاج من المزارع إلى المطاعم' },
    ],
  }),
  component: LandingPage,
})

function LandingPage() {
  const navigate = useNavigate()
  const driverLogin = useDriverLogin()
  const [showDriverLogin, setShowDriverLogin] = useState(false)
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminRemember, setAdminRemember] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem(REMEMBER_KEY) !== 'false'
  })
  const [driverUsername, setDriverUsername] = useState('')
  const [driverPassword, setDriverPassword] = useState('')
  const [driverRemember, setDriverRemember] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem(REMEMBER_KEY) !== 'false'
  })

  useState(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem(REMEMBER_KEY) === 'false') {
      localStorage.removeItem(REMEMBER_KEY)
      signOut()
    }
  })

  const handleAdminLogin = async () => {
    if (!adminEmail.trim() || !adminPassword.trim()) return
    setAdminLoading(true)
    try {
      await signInWithEmail(adminEmail.trim(), adminPassword)
      localStorage.setItem(REMEMBER_KEY, adminRemember ? 'true' : 'false')
      toast.success('تم تسجيل الدخول بنجاح')
      navigate({ to: '/app' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تسجيل الدخول'
      toast.error(msg)
    } finally {
      setAdminLoading(false)
    }
  }

  const handleDriverLogin = async () => {
    if (!driverUsername.trim() || !driverPassword.trim()) return
    try {
      await driverLogin.mutateAsync({
        username: driverUsername.trim(),
        password: driverPassword,
      })
      localStorage.setItem(REMEMBER_KEY, driverRemember ? 'true' : 'false')
      toast.success('تم تسجيل الدخول بنجاح')
      navigate({ to: '/driver' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تسجيل الدخول'
      toast.error(msg)
    }
  }

  return (
    <div dir="rtl" className="flex min-h-dvh flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Brand */}
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <ChefHat className="h-10 w-10 text-primary" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">DChicken</h1>
            <p className="text-sm text-muted-foreground">منصة توزيع الدجاج</p>
          </div>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
            إدارة ذكية لسلسلة توريد الدجاج — من المستودع إلى المطعم
          </p>
        </div>

        {/* Action buttons */}
        <Card>
          <CardContent className="p-6 space-y-3">
            {/* Admin login */}
            <div className="relative">
              <Button
                size="lg"
                className={`w-full min-h-[52px] gap-3 text-base font-medium transition-opacity ${showAdminLogin ? 'absolute inset-0 opacity-0 pointer-events-none' : ''}`}
                onClick={() => setShowAdminLogin(true)}
              >
                <LayoutDashboard className="h-5 w-5" />
                لوحة التحكم (مدير)
              </Button>
              <div
                className={`grid transition-all duration-300 ease-in-out ${showAdminLogin ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
              >
                <div className="overflow-hidden">
                  <div className="space-y-3 border rounded-lg p-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold flex items-center gap-2">
                        <LayoutDashboard className="h-4 w-4 text-primary" />
                        تسجيل دخول المدير
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowAdminLogin(false)
                          setAdminEmail('')
                          setAdminPassword('')
                        }}
                        className="text-xs h-7"
                      >
                        إلغاء
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="admin-email" className="text-xs flex items-center gap-1.5">
                        <Mail className="h-3 w-3" />
                        البريد الإلكتروني
                      </Label>
                      <Input
                        id="admin-email"
                        type="email"
                        placeholder="admin@example.com"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        className="text-left h-11"
                        dir="ltr"
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAdminLogin() }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="admin-password" className="text-xs flex items-center gap-1.5">
                        <Key className="h-3 w-3" />
                        كلمة المرور
                      </Label>
                      <Input
                        id="admin-password"
                        type="password"
                        placeholder="أدخل كلمة المرور"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        className="text-right h-11"
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAdminLogin() }}
                      />
                    </div>
                    <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={adminRemember}
                        onChange={(e) => setAdminRemember(e.target.checked)}
                        className="accent-primary"
                      />
                      تذكرني في هذا الجهاز
                    </label>
                    <Button
                      size="lg"
                      className="w-full min-h-[48px] gap-2 text-sm font-medium"
                      onClick={handleAdminLogin}
                      disabled={adminLoading || !adminEmail.trim() || !adminPassword.trim()}
                    >
                      {adminLoading ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                          جاري التحقق...
                        </>
                      ) : (
                        <>
                          <LogIn className="h-4 w-4" />
                          تسجيل الدخول
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Driver login toggle */}
            <div className="relative">
              <Button
                variant="outline"
                size="lg"
                className={`w-full min-h-[52px] gap-3 text-base transition-opacity ${showDriverLogin ? 'absolute inset-0 opacity-0 pointer-events-none' : ''}`}
                onClick={() => setShowDriverLogin(true)}
              >
                <Truck className="h-5 w-5" />
                واجهة السائق
              </Button>
              <div
                className={`grid transition-all duration-300 ease-in-out ${showDriverLogin ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
              >
                <div className="overflow-hidden">
                  <div className="space-y-3 border rounded-lg p-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold flex items-center gap-2">
                        <Truck className="h-4 w-4 text-primary" />
                        تسجيل دخول السائق
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowDriverLogin(false)
                          setDriverUsername('')
                          setDriverPassword('')
                        }}
                        className="text-xs h-7"
                      >
                        إلغاء
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-username" className="text-xs flex items-center gap-1.5">
                        <User className="h-3 w-3" />
                        اسم المستخدم
                      </Label>
                      <Input
                        id="login-username"
                        placeholder="أدخل اسم المستخدم"
                        value={driverUsername}
                        onChange={(e) => setDriverUsername(e.target.value)}
                        className="text-right h-11"
                        onKeyDown={(e) => { if (e.key === 'Enter') handleDriverLogin() }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-xs flex items-center gap-1.5">
                        <Key className="h-3 w-3" />
                        كلمة المرور
                      </Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="أدخل كلمة المرور"
                        value={driverPassword}
                        onChange={(e) => setDriverPassword(e.target.value)}
                        className="text-right h-11"
                        onKeyDown={(e) => { if (e.key === 'Enter') handleDriverLogin() }}
                      />
                    </div>
                    <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={driverRemember}
                        onChange={(e) => setDriverRemember(e.target.checked)}
                        className="accent-primary"
                      />
                      تذكرني في هذا الجهاز
                    </label>
                    <Button
                      size="lg"
                      className="w-full min-h-[48px] gap-2 text-sm font-medium"
                      onClick={handleDriverLogin}
                      disabled={driverLogin.isPending || !driverUsername.trim() || !driverPassword.trim()}
                    >
                      {driverLogin.isPending ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                          جاري التحقق...
                        </>
                      ) : (
                        <>
                          <LogIn className="h-4 w-4" />
                          تسجيل الدخول
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-[11px] text-muted-foreground">
          DChicken Logistics &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
