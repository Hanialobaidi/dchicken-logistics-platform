import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: ReactNode
  threshold?: number
}

export function PullToRefresh({ onRefresh, children, threshold = 80 }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(0)
  const pulling = useRef(false)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (refreshing) return
    if (window.scrollY > 10) return
    startY.current = e.touches[0].clientY
    pulling.current = true
  }, [refreshing])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!pulling.current || refreshing) return
    const diff = e.touches[0].clientY - startY.current
    if (diff < 0) {
      setPullDistance(0)
      return
    }
    setPullDistance(Math.min(diff * 0.5, threshold * 1.5))
  }, [refreshing, threshold])

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return
    pulling.current = false
    if (pullDistance >= threshold && !refreshing) {
      setRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setRefreshing(false)
      }
    }
    setPullDistance(0)
  }, [pullDistance, threshold, refreshing, onRefresh])

  useEffect(() => {
    const el = document.documentElement
    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: true })
    el.addEventListener('touchend', handleTouchEnd)
    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  const showIndicator = pullDistance > 0 || refreshing
  const progress = refreshing ? 1 : Math.min(pullDistance / threshold, 1)

  return (
    <>
      {showIndicator && (
        <div
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm overflow-hidden transition-all duration-200"
          style={{ height: refreshing ? 48 : pullDistance }}
        >
          <Loader2
            className={`h-5 w-5 text-muted-foreground ${refreshing ? 'animate-spin' : ''}`}
            style={{ transform: `rotate(${progress * 360}deg)` }}
          />
          {!refreshing && pullDistance >= threshold && (
            <span className="mr-2 text-xs text-muted-foreground">أفلت للتحديث</span>
          )}
        </div>
      )}
      {children}
    </>
  )
}
