import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  const subscription = await request.json()
  
  await supabase.from('push_subscriptions').upsert({
    endpoint: subscription.endpoint,
    subscription: JSON.stringify(subscription),
    created_at: new Date().toISOString()
  })

  return NextResponse.json({ success: true })
}