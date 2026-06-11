import { createClient } from '@supabase/supabase-js'
import { createSign } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function getFcmAccessToken() {
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
  const now = Math.floor(Date.now() / 1000)

  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    sub: sa.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  })).toString('base64url')

  const unsigned = `${header}.${payload}`
  const sign = createSign('RSA-SHA256')
  sign.update(unsigned)
  const signature = sign.sign(sa.private_key, 'base64url')
  const jwt = `${unsigned}.${signature}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  const data = await res.json()
  return data.access_token
}

export async function POST(req) {
  try {
    const { radnik_id, title, body } = await req.json()
    if (!radnik_id) return Response.json({ error: 'radnik_id required' }, { status: 400 })

    const { data: radnik } = await supabase
      .from('radnici')
      .select('fcm_token')
      .eq('id', radnik_id)
      .single()

    if (!radnik?.fcm_token) {
      return Response.json({ ok: false, reason: 'no_token' })
    }

    const accessToken = await getFcmAccessToken()
    const projectId = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON).project_id

    const fcmRes = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token: radnik.fcm_token,
            notification: { title, body },
            android: { priority: 'high' },
          },
        }),
      }
    )

    const result = await fcmRes.json()
    if (!fcmRes.ok) return Response.json({ error: result }, { status: 500 })
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
