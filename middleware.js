import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// In-memory rate limiter (po IP, reset svakih 60s)
const rateLimitMap = new Map()
const LIMIT = 5 // max prijava po IP u 60 sekundi
const WINDOW = 60 * 1000

function provjeriRateLimit(ip) {
  const sad = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || sad - entry.start > WINDOW) {
    rateLimitMap.set(ip, { count: 1, start: sad })
    return true
  }
  if (entry.count >= LIMIT) return false
  entry.count++
  return true
}

export async function middleware(request) {
  // Rate limit samo na javnu prijavu formu
  if (request.method === 'POST' && request.nextUrl.pathname.startsWith('/prijava')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    if (!provjeriRateLimit(ip)) {
      return new NextResponse('Previše zahtjeva. Pokušajte za 60 sekundi.', { status: 429 })
    }
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (request.nextUrl.pathname.startsWith('/admin') &&
      !request.nextUrl.pathname.startsWith('/admin/login')) {
    let jeAdmin = false
    if (user) {
      // Admin = prijavljen korisnik koji NIJE u radnici tabeli (radnik/magacioner/saradnik)
      const { data: r } = await supabase.from('radnici').select('id').eq('email', user.email).maybeSingle()
      jeAdmin = !r
    }
    if (!jeAdmin) return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*', '/prijava/:path*'],
}