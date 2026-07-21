function getOneSignal(): Promise<{
  User?: { pushSubscription?: { optIn: () => Promise<void>; optOut: () => Promise<void> }; addTag: (k: string, v: string) => void; removeTag: (k: string) => void }
} | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') { resolve(null); return }

    const w = window as unknown as Record<string, unknown>
    const os = w.OneSignal as {
      User?: { pushSubscription?: { optIn: () => Promise<void>; optOut: () => Promise<void> }; addTag: (k: string, v: string) => void; removeTag: (k: string) => void }
    } | undefined

    if (os?.User) { resolve(os); return }

    let tries = 0
    const timer = setInterval(() => {
      tries++
      const current = (window as unknown as Record<string, unknown>).OneSignal as typeof os | undefined
      if (current?.User || tries > 50) {
        clearInterval(timer)
        resolve(current ?? null)
      }
    }, 200)
  })
}

export async function oneSignalOptIn() {
  try {
    const os = await getOneSignal()
    if (os?.User?.pushSubscription) {
      await os.User.pushSubscription.optIn()
    }
  } catch { /* ignore */ }
}

export async function oneSignalOptOut() {
  try {
    const os = await getOneSignal()
    if (os?.User?.pushSubscription) {
      await os.User.pushSubscription.optOut()
    }
  } catch { /* ignore */ }
}
