import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '../../../lib/supabase-server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function provjeriAdmina() {
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  return user
}

export async function POST(request) {
  const user = await provjeriAdmina()
  if (!user) return NextResponse.json({ error: 'Neautorizovano' }, { status: 401 })

  const subscription = await request.json()

  await supabase.from('push_subscriptions').upsert({
    endpoint: subscription.endpoint,
    subscription: JSON.stringify(subscription),
    user_id: user.id,
    created_at: new Date().toISOString()
  })

  return NextResponse.json({ success: true })
}

export async function DELETE(request) {
  const user = await provjeriAdmina()
  if (!user) return NextResponse.json({ error: 'Neautorizovano' }, { status: 401 })

  const { endpoint } = await request.json()
  if (endpoint) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
  } else {
    await supabase.from('push_subscriptions').delete().eq('user_id', user.id)
  }

  return NextResponse.json({ success: true })
}
