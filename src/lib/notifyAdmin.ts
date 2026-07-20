const API_BASE = typeof window !== 'undefined' ? '' : ''

export async function notifyAdminNewOrder(payload: {
  driverName: string
  restaurantName: string
  weight: number
}) {
  try {
    const res = await fetch(`${API_BASE}/api/send-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'DChicken — طلبية جديدة',
        body: `${payload.driverName} — ${payload.restaurantName} · ${payload.weight} كجم`,
      }),
    })
    const data = await res.json()
    console.log('[OneSignal Push]', res.status, data)
  } catch (e) {
    console.error('[OneSignal Push] failed:', e)
  }
}
