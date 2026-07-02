// Origin provjera za javne push endpointe.
// Native aplikacije (Flutter) ne šalju Origin header — to je dozvoljeno.
// Web pozivi moraju doći sa našeg domena (NEXT_PUBLIC_SITE_URL ili *.coffeeteam.me).
export function dozvoljenOrigin(origin) {
  if (!origin) return true
  try {
    const host = new URL(origin).hostname
    if (host === 'localhost' || host === '127.0.0.1') return true
    if (host === 'coffeeteam.me' || host.endsWith('.coffeeteam.me')) return true
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      const siteHost = new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname
      if (host === siteHost) return true
    }
    return false
  } catch {
    return false
  }
}
