import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

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

// Javni endpoint — šalje web push konkretnom korisniku (po user_id)
export async function POST(request) {
  const origin = request.headers.get('origin') || ''
  if (origin && !origin.includes('servisapp')) {
    return NextResponse.json({ error: 'Neautorizovano' }, { status: 403 })
  }
  const { user_id, title, body, url } = await request.json()
  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', user_id)

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ success: false, message: 'Nema pretplatnika' })
  }

  const rezultati = await Promise.allSettled(
    subscriptions.map((s) => {
      const sub = JSON.parse(s.subscription)
      return webpush.sendNotification(sub, JSON.stringify({ title, body, url }))
    })
  )

  return NextResponse.json({ success: true, sent: rezultati.length })
}
