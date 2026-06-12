import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

import { createClient as createServerClient } from '../../../lib/supabase-server'

async function provjeriPosiljoca(request) {
  // Push može slati i Flutter app (nema cookie session) i admin panel
  // Dozvoljavamo samo sa poznatih origin-a
  const origin = request.headers.get('origin') || ''
  const referer = request.headers.get('referer') || ''
  const dozvoljenOrigin = origin.includes('servisapp') || referer.includes('servisapp') || origin === ''
  return dozvoljenOrigin
}

export async function POST(request) {
  const dozvoljeno = await provjeriPosiljoca(request)
  if (!dozvoljeno) return NextResponse.json({ error: 'Neautorizovano' }, { status: 401 })
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