import { useEffect } from 'react'

declare global {
  interface Window {
    OneSignalDeferred?: Array<(onesignal: unknown) => void | Promise<void>>
  }
}

const ONESIGNAL_APP_ID =
  (import.meta.env.VITE_ONESIGNAL_APP_ID as string | undefined) ??
  (import.meta.env.VITE_ONESIGNAL_ID as string | undefined)

export function OneSignalInit() {
  useEffect(() => {
    if (!ONESIGNAL_APP_ID) {
      console.warn('[OneSignal] VITE_ONESIGNAL_APP_ID not set — push disabled')
      return
    }
    if (typeof window === 'undefined') return

    window.OneSignalDeferred = window.OneSignalDeferred || []
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        serviceWorkerParam: { scope: '/' },
        serviceWorkerPath: '/OneSignalSDKWorker.js',
        serviceWorkerUpdaterParam: { scope: '/' },
        notifyButton: { enable: false },
        allowLocalhostAsSecureOrigin: true,
      })

      // Explicitly request notification permission if not yet granted
      if ('Notification' in window && Notification.permission === 'default') {
        await OneSignal.Notifications.requestPermission()
      }
    })
  }, [])

  return null
}
