const API_BASE = typeof window !== 'undefined' ? '' : ''

export async function notifyAdminNewOrder(payload: {
  driverName: string
  restaurantName: string
  weight: number
}) {
  try {
    await fetch(`${API_BASE}/api/send-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'DChicken — طلبية جديدة',
        body: `${payload.driverName} — ${payload.restaurantName} · ${payload.weight} كجم`,
      }),
    })
  } catch {
    // Best-effort — don't block order creation if push fails
  }
}
