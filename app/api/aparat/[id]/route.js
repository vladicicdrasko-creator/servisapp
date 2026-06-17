import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(request, { params }) {
  const { id } = await params
  if (!id) return Response.json({ error: 'ID required' }, { status: 400 })

  // Mlin (ID počinje sa MLN)
  if (id.startsWith('MLN')) {
    const { data: m } = await supabaseAdmin
      .from('mlinovi')
      .select('id, model, lokal, status')
      .eq('id', id)
      .eq('status', 'aktivan')
      .single()
    if (!m) return Response.json({ error: 'Mlin nije pronađen' }, { status: 404 })
    return Response.json({ id: m.id, naziv: m.model, lokal: m.lokal, adresa: null, status: m.status, tip: 'mlin' })
  }

  const { data, error } = await supabaseAdmin
    .from('aparati')
    .select('id, naziv, lokal, adresa, status')
    .eq('id', id)
    .eq('status', 'aktivan')
    .single()

  if (error || !data) return Response.json({ error: 'Aparat nije pronađen' }, { status: 404 })

  return Response.json({ ...data, tip: 'aparat' })
}
