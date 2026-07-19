import { createFileRoute, Link, Outlet, useRouterState } from '@tanstack/react-router'
import { BlinkClientBoundary } from '@/components/BlinkClientBoundary'
import { Shell } from '@/Shell'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  LayoutDashboard,
  Store,
  FileText,
  LogOut,
  PanelLeft,
  ChefHat,
  Users,
  ShoppingCart,
  BarChart3,
} from 'lucide-react'
import { useState, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import type { ReactNode } from 'react'

const SIDEBAR_KEY = 'admin_sidebar_collapsed'

interface NavItemDef {
  to: string
  icon: ReactNode
  label: string
}

const NAV_ITEMS: NavItemDef[] = [
  { to: '/app', icon: <LayoutDashboard className="h-4 w-4" />, label: 'الرئيسية' },
  { to: '/app/restaurants', icon: <Store className="h-4 w-4" />, label: 'المطاعم' },
  { to: '/app/drivers', icon: <Users className="h-4 w-4" />, label: 'السائقين' },
  { to: '/app/purchases', icon: <ShoppingCart className="h-4 w-4" />, label: 'المشتريات' },
  { to: '/app/analytics', icon: <BarChart3 className="h-4 w-4" />, label: 'التحليلات' },
  { to: '/app/reports', icon: <FileText className="h-4 w-4" />, label: 'التقارير' },
]

function NavItem({ item, collapsed }: { item: NavItemDef; collapsed: boolean }) {
  const routerState = useRouterState()
  const isActive = routerState.location.pathname === item.to

  const link = (
    <Link
      to={item.to}
      className={cn(
        'flex items-center gap-2.5 rounded-md text-sm transition-colors',
        collapsed ? 'justify-center w-8 h-8 mx-auto' : 'px-3 py-2 w-full',
        isActive
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      <span className="shrink-0">{item.icon}</span>
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  )

  if (!collapsed) return link
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  )
}

function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(SIDEBAR_KEY) === 'true'
  })

  const toggle = useCallback(() => {
    setCollapsed((v) => {
      const next = !v
      localStorage.setItem(SIDEBAR_KEY, String(next))
      return next
    })
  }, [])

  const { user } = useAuth()
  const userInitial = user?.email?.[0]?.toUpperCase() ?? 'A'
  const userName = user?.email?.split('@')[0] ?? 'المستخدم'
  const userEmail = user?.email ?? ''

  const handleLogout = useCallback(async () => {
    const { signOut } = await import('@/hooks/useAuth')
    await signOut()
    if (typeof window !== 'undefined') window.location.href = '/'
  }, [])

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          'flex flex-col h-full bg-sidebar border-r border-sidebar-border overflow-hidden',
          'transition-[width] duration-200 ease-linear shrink-0',
          collapsed ? 'w-[3rem]' : 'w-[15rem]',
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'flex items-center gap-2 shrink-0 border-b border-sidebar-border h-[52px] px-3',
            collapsed && 'justify-center px-2',
          )}
        >
          {!collapsed && (
            <>
              <div className="flex items-center justify-center h-7 w-7 rounded-md bg-primary text-primary-foreground text-xs font-bold shrink-0">
                <ChefHat className="h-4 w-4" />
              </div>
              <span className="flex-1 font-semibold text-sm truncate">DChicken</span>
            </>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={toggle}
              >
                <PanelLeft
                  className={cn(
                    'h-4 w-4 transition-transform duration-200',
                    collapsed && 'rotate-180',
                  )}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {collapsed ? 'توسيع القائمة' : 'طي القائمة'}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Nav */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 py-2 space-y-0.5">
          {!collapsed && (
            <p className="px-3 pt-1 pb-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              القائمة الرئيسية
            </p>
          )}
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.to} item={item} collapsed={collapsed} />
          ))}
        </div>

        {/* Footer */}
        <div
          className={cn(
            'shrink-0 border-t border-sidebar-border',
            collapsed ? 'flex flex-col items-center gap-1 p-2' : 'p-3 space-y-1',
          )}
        >
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-sidebar-accent transition-colors cursor-pointer">
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarFallback className="text-[10px] bg-muted">{userInitial}</AvatarFallback>
                  </Avatar>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {userName} · {userEmail}
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-2 rounded-md w-full px-2 py-1.5">
              <Avatar className="h-6 w-6 shrink-0">
                <AvatarFallback className="text-[10px] bg-muted">{userInitial}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium leading-tight truncate">{userName}</p>
                <p className="text-[10px] text-muted-foreground leading-tight truncate">{userEmail}</p>
              </div>
            </div>
          )}

          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">تسجيل الخروج</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start px-2 gap-2 text-muted-foreground hover:text-foreground"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              تسجيل الخروج
            </Button>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

function AdminLayout() {
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = '/'
    }
  }, [isLoading, isAuthenticated])

  if (isLoading) return <AdminSkeleton />

  if (!isAuthenticated) {
    return (
      <div dir="rtl" className="flex min-h-dvh items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">جاري تسجيل الدخول...</p>
        </div>
      </div>
    )
  }

  return (
    <Shell sidebar={<AdminSidebar />} appName="لوحة التحكم">
      <div dir="rtl" className="flex-1">
        <Outlet />
      </div>
    </Shell>
  )
}

function AdminSkeleton() {
  return (
    <div dir="rtl" className="flex min-h-dvh bg-background">
      <div className="hidden md:block w-[15rem] shrink-0 border-r border-border animate-pulse">
        <div className="h-[52px] border-b" />
        <div className="p-3 space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-8 rounded-md bg-muted" />
          ))}
        </div>
      </div>
      <div className="flex-1 p-6 space-y-4 animate-pulse">
        <div className="h-8 w-1/3 rounded-md bg-muted" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/app')({
  ssr: false,
  component: () => (
    <BlinkClientBoundary fallback={<AdminSkeleton />}>
      <AdminLayout />
    </BlinkClientBoundary>
  ),
})
