import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '../../../lib/supabase-server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function provjeriAdmina() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Dodaj radnika
export async function POST(request) {
  const user = await provjeriAdmina()
  if (!user) return NextResponse.json({ error: 'Neautorizovano' }, { status: 401 })
  const { ime, telefon, email } = await request.json()

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://servisapp-pi.vercel.app'}/radnik/postavi-lozinku`,
    data: { role: 'radnik' }
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
  const user = await provjeriAdmina()
  if (!user) return NextResponse.json({ error: 'Neautorizovano' }, { status: 401 })
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