import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(request, { params }) {
  const { id } = await params
  if (!id) return Response.json({ error: 'ID required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('aparati')
    .select('id, naziv, lokal, adresa, status')
    .eq('id', id)
    .eq('status', 'aktivan')
    .single()

  if (error || !data) return Response.json({ error: 'Aparat nije pronađen' }, { status: 404 })

  return Response.json(data)
}
