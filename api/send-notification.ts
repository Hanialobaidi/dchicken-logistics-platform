import type { VercelRequest, VercelResponse } from '@vercel/node'

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID ?? ''
const ONESIGNAL_REST_KEY = process.env.ONESIGNAL_REST_API_KEY ?? ''

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_KEY) {
    return res.status(500).json({ error: 'OneSignal credentials not configured' })
  }

  const { title, body, url } = req.body as {
    title?: string
    body?: string
    url?: string
  }

  if (!title || !body) {
    return res.status(400).json({ error: 'title and body are required' })
  }

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Basic ${ONESIGNAL_REST_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        target_channel: 'push',
        headings: { en: title, ar: title },
        contents: { en: body, ar: body },
        url: url ?? undefined,
        included_segments: ['Subscribed Users'],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json(data)
    }

    return res.status(200).json({ success: true, id: data.id })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to send notification' })
  }
}
