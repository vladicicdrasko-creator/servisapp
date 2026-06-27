import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'
// Ovaj endpoint je javno dostupan (poziva ga forma za prijavu kvara).
// Rizik je minimalan: napadač može poslati lažnu notifikaciju, ali ne može pristupiti podacima.
// Zaštita: rate limiting u middleware.js (5 req/min po IP na /prijava rutama)

if (process.env.VAPID_EMAIL && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  // Origin provjera: dozvoli native app (bez origin-a) i naš domen, blokiraj strane web origine
  const origin = request.headers.get('origin') || ''
  if (origin && !origin.includes('servisapp')) {
    return NextResponse.json({ error: 'Neautorizovano' }, { status: 403 })
  }
  const { title, body, url } = await request.json()

  // Svi pretplatnici + lista radnika (saradnici/radnici NE dobijaju admin notifikacije)
  const [{ data: subscriptions }, { data: radnici }] = await Promise.all([
    supabase.from('push_subscriptions').select('subscription, user_id'),
    supabase.from('radnici').select('id'),
  ])

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ success: false, message: 'Nema pretplatnika' })
  }

  const radniciIds = new Set((radnici || []).map(r => r.id))
  // Samo pravi admini: imaju user_id i NISU u radnici tabeli (isključuje stare null pretplate i radnike/saradnike)
  const adminSubs = subscriptions.filter(s => s.user_id && !radniciIds.has(s.user_id))

  const rezultati = await Promise.allSettled(
    adminSubs.map(async (s) => {
      const sub = JSON.parse(s.subscription)
      return webpush.sendNotification(sub, JSON.stringify({ title, body, url }))
    })
  )

  return NextResponse.json({ success: true, sent: rezultati.length })
}