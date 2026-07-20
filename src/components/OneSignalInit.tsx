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
    if (!ONESIGNAL_APP_ID || typeof window === 'undefined') return

    window.OneSignalDeferred = window.OneSignalDeferred || []
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
      })
    })
  }, [])

  return null
}
