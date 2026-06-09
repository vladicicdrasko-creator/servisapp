import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Dodaj radnika
export async function POST(request) {
  const { ime, telefon, email } = await request.json()

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://servisapp-pi.vercel.app'}/radnik/postavi-lozinku`
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  const { error: dbError } = await supabaseAdmin.from('radnici').insert({
    id: authData.user.id,
    ime,
    telefon,
    email,
    status: 'slobodan'
  })

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 400 })

  return NextResponse.json({ success: true })
}

// Ažuriraj radnika
export async function PUT(request) {
  const { id, ime, telefon, aktivan } = await request.json()

  const { error } = await supabaseAdmin.from('radnici').update({ ime, telefon }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (aktivan === false) {
    await supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: '87600h' })
  } else if (aktivan === true) {
    await supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: 'none' })
  }

  return NextResponse.json({ success: true })
}