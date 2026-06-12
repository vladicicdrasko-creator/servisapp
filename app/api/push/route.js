import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'
// Ovaj endpoint je javno dostupan (poziva ga forma za prijavu kvara).
// Rizik je minimalan: napadač može poslati lažnu notifikaciju, ali ne može pristupiti podacima.
// Zaštita: rate limiting u middleware.js (5 req/min po IP na /prijava rutama)

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  const { title, body, url } = await request.json()

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('subscription')

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ success: false, message: 'Nema pretplatnika' })
  }

  const rezultati = await Promise.allSettled(
    subscriptions.map(async (s) => {
      const sub = JSON.parse(s.subscription)
      return webpush.sendNotification(sub, JSON.stringify({ title, body, url }))
    })
  )

  return NextResponse.json({ success: true, sent: rezultati.length })
}