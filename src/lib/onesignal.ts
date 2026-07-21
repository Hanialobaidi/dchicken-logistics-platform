export async function oneSignalOptIn() {
  try {
    if (typeof window === 'undefined') return
    const w = window as unknown as Record<string, { User?: { pushSubscription?: { optIn: () => Promise<void> } } }>
    await w.OneSignal?.User?.pushSubscription?.optIn()
  } catch { /* ignore */ }
}

export async function oneSignalOptOut() {
  try {
    if (typeof window === 'undefined') return
    const w = window as unknown as Record<string, { User?: { pushSubscription?: { optOut: () => Promise<void> } } }>
    await w.OneSignal?.User?.pushSubscription?.optOut()
  } catch { /* ignore */ }
}
