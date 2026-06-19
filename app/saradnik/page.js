'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase-browser'

const supabase = createClient()

export default function SaradnikPage() {
  const [ucitava, setUcitava] = useState(true)
  const [saradnik, setSaradnik] = useState(null)
  const [nemaPristup, setNemaPristup] = useState(false)
  const [nalozi, setNalozi] = useState([])

  // login
  const [email, setEmail] = useState('')
  const [lozinka, setLozinka] = useState('')
  const [showL, setShowL] = useState(false)
  const [greska, setGreska] = useState(null)
  const [loginLoading, setLoginLoading] = useState(false)

  // po-nalog state
  const [otvoren, setOtvoren] = useState(null)        // id naloga koji je proširen
  const [procjenaUnos, setProcjenaUnos] = useState({})
  const [radovi, setRadovi] = useState({})            // id -> [{opis,cijena}]
  const [slike, setSlike] = useState({})              // id -> File
  const [slanje, setSlanje] = useState(false)

  useEffect(() => { provjeri() }, [])

  // Auto-osvježavanje kad je saradnik prijavljen (realtime + rezerva 20s)
  useEffect(() => {
    if (!saradnik) return
    const kanal = supabase
      .channel('saradnik-nalozi')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prijave', filter: `radnik_id=eq.${saradnik.id}` },
        () => ucitajNaloge(saradnik.id))
      .subscribe()
    const interval = setInterval(() => ucitajNaloge(saradnik.id), 20000)
    return () => { supabase.removeChannel(kanal); clearInterval(interval) }
  }, [saradnik])

  const provjeri = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUcitava(false); return }
    const { data: r } = await supabase.from('radnici').select('*').eq('email', user.email).maybeSingle()
    if (!r || r.uloga !== 'saradnik') { setNemaPristup(true); setUcitava(false); return }
    setSaradnik(r)
    registrujPush()
    await ucitajNaloge(r.id)
    setUcitava(false)
  }

  const registrujPush = async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
      const reg = await navigator.serviceWorker.register('/sw.js')
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') return
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        })
      }
      await fetch('/api/push-subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub),
      })
    } catch (e) { console.error('Push registracija:', e) }
  }

  const ucitajNaloge = async (id) => {
    const { data } = await supabase.from('prijave').select('*').eq('radnik_id', id).order('created_at', { ascending: false })
    setNalozi(data || [])
  }

  const prijava = async () => {
    setLoginLoading(true); setGreska(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: lozinka })
    setLoginLoading(false)
    if (error) { setGreska('Pogrešan email ili lozinka'); return }
    setUcitava(true); provjeri()
  }

  const odjava = async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = reg ? await reg.pushManager.getSubscription() : null
      await fetch('/api/push-subscribe', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub?.endpoint }),
      })
      if (sub) await sub.unsubscribe()
    } catch (_) {}
    await supabase.auth.signOut()
    window.location.reload()
  }

  // Faza 1 — pošalji procjenu
  const posaljiProcjenu = async (n) => {
    const tekst = (procjenaUnos[n.id] || '').trim()
    if (!tekst) return
    setSlanje(true)
    await supabase.from('prijave').update({ procjena: tekst, procjena_status: 'poslata' }).eq('id', n.id)
    fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '🕐 Procjena saradnika', body: `${saradnik.ime} — ${n.lokal || n.id}`, url: '/admin' }) }).catch(() => {})
    setSlanje(false); setOtvoren(null)
    ucitajNaloge(saradnik.id)
  }

  // Faza 2 — završi nalog (obračun + slika)
  const zavrsiNalog = async (n) => {
    const lista = (radovi[n.id] || [])
      .map(r => ({ opis: r.opis.trim(), cijena: parseFloat(String(r.cijena).replace(',', '.')) || 0 }))
      .filter(s => s.opis)
    if (lista.length === 0) return
    setSlanje(true)
    const uk = lista.reduce((s, e) => s + e.cijena, 0)

    // slika
    let slikaUrl = null
    const fajl = slike[n.id]
    if (fajl) {
      const ext = fajl.name.split('.').pop()
      const path = `saradnik/${n.id}.${ext}`
      await supabase.storage.from('aparati-slike').upload(path, fajl, { upsert: true })
      slikaUrl = supabase.storage.from('aparati-slike').getPublicUrl(path).data.publicUrl
    }

    // obračun
    const obrId = 'OBR-' + Date.now().toString().slice(-6)
    await supabase.from('saradnik_obracuni').insert({ id: obrId, saradnik_id: saradnik.id, nalog_id: n.id, status: 'zavrseno', ukupno: uk })
    await supabase.from('saradnik_stavke').insert(lista.map(s => ({ obracun_id: obrId, opis: s.opis, cijena: s.cijena })))

    // nalog riješen
    await supabase.from('prijave').update({
      status: 'riješena', ishod: 'riješena',
      rijeseno_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      ...(slikaUrl ? { slika_url: slikaUrl } : {}),
    }).eq('id', n.id)

    fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '💰 Obračun saradnika', body: `${saradnik.ime} — ${uk.toFixed(2)}€`, url: '/admin' }) }).catch(() => {})

    setSlanje(false); setOtvoren(null)
    ucitajNaloge(saradnik.id)
  }

  const setRed = (id, i, polje, val) => setRadovi(prev => {
    const arr = [...(prev[id] || [{ opis: '', cijena: '' }])]
    arr[i] = { ...arr[i], [polje]: val }
    return { ...prev, [id]: arr }
  })
  const dodajRed = (id) => setRadovi(prev => ({ ...prev, [id]: [...(prev[id] || [{ opis: '', cijena: '' }]), { opis: '', cijena: '' }] }))

  if (ucitava) return <div style={s.centar}><div style={{ color: '#7B96B2' }}>Učitavam...</div></div>

  // Login
  if (!saradnik && !nemaPristup) return (
    <div style={s.centar}>
      <div style={s.loginCard}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={s.logo}>🔧</div>
          <h1 style={{ color: '#E8F4FD', fontSize: 20, fontWeight: 800, margin: 0 }}>ServisApp</h1>
          <p style={{ color: '#7B96B2', fontSize: 13, margin: '4px 0 0' }}>Saradnik</p>
        </div>
        <label style={s.label}>EMAIL</label>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="vas@email.com" style={s.input} />
        <label style={s.label}>LOZINKA</label>
        <div style={{ position: 'relative' }}>
          <input type={showL ? 'text' : 'password'} value={lozinka} onChange={e => setLozinka(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && prijava()} placeholder="••••••••" style={{ ...s.input, paddingRight: 40 }} />
          <button onClick={() => setShowL(v => !v)} style={s.oko}>{showL ? '🙈' : '👁'}</button>
        </div>
        {greska && <div style={{ color: '#E63946', fontSize: 13, margin: '8px 0' }}>{greska}</div>}
        <button onClick={prijava} disabled={loginLoading} style={{ ...s.btn, marginTop: 12 }}>{loginLoading ? 'Prijava...' : 'Prijavi se'}</button>
      </div>
    </div>
  )

  if (nemaPristup) return (
    <div style={s.centar}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: '#E63946', fontWeight: 700, marginBottom: 8 }}>Nemate pristup</div>
        <p style={{ color: '#7B96B2', fontSize: 13 }}>Ovaj nalog nije saradnik.</p>
        <button onClick={odjava} style={{ ...s.btn, marginTop: 12, width: 'auto', padding: '10px 24px' }}>Odjava</button>
      </div>
    </div>
  )

  const aktivni = nalozi.filter(n => n.status !== 'riješena' && n.status !== 'zatvorena')
  const gotovi = nalozi.filter(n => n.status === 'riješena' || n.status === 'zatvorena')

  return (
    <div style={s.wrapper}>
      <div style={s.header}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>ServisApp</div>
          <div style={{ fontSize: 11, opacity: 0.7 }}>{saradnik.ime}</div>
        </div>
        <button onClick={odjava} style={s.odjavaBtn}>Odjava</button>
      </div>

      <div style={{ padding: 16, maxWidth: 600, margin: '0 auto' }}>
        <div style={{ color: '#7B96B2', fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>MOJI NALOZI</div>
        {aktivni.length === 0 && <div style={{ color: '#7B96B2', fontSize: 13, marginBottom: 16 }}>Nema aktivnih naloga.</div>}

        {aktivni.map(n => {
          const jeOtvoren = otvoren === n.id
          return (
            <div key={n.id} style={s.card}>
              <div onClick={() => setOtvoren(jeOtvoren ? null : n.id)} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ color: '#1B85B8', fontSize: 12, fontWeight: 700 }}>{n.id}</span>
                  {n.procjena_status === 'poslata' && <span style={{ background: '#F4A261', color: '#0D1B2A', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>ČEKA ODOBRENJE</span>}
                  {n.procjena_status === 'odobrena' && <span style={{ background: '#2A9D8F', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>ODOBRENO — ZAVRŠI</span>}
                  {!n.procjena_status && <span style={{ background: '#1B85B8', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>NOVO</span>}
                </div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{n.lokal || n.vrsta || n.kategorija}</div>
                {n.adresa && <div style={{ color: '#7B96B2', fontSize: 12 }}>📍 {n.adresa}</div>}
              </div>

              {jeOtvoren && (
                <div style={{ marginTop: 12, borderTop: '1px solid #1E3A5A', paddingTop: 12 }}>
                  <div style={{ color: '#7B96B2', fontSize: 11, marginBottom: 4 }}>OPIS POSLA</div>
                  <div style={{ fontSize: 14, marginBottom: 12 }}>{n.opis || '—'}</div>

                  <div style={{ color: '#7B96B2', fontSize: 11, marginBottom: 4 }}>LOKACIJA</div>
                  <div style={{ fontSize: 14, marginBottom: 6 }}>{n.lokal || '—'}{n.adresa ? ` · ${n.adresa}` : ''}</div>
                  {(n.lat && n.lng) || n.adresa || n.lokal ? (
                    <a href={(n.lat && n.lng)
                        ? `https://www.google.com/maps?q=${n.lat},${n.lng}`
                        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([n.lokal, n.adresa].filter(Boolean).join(' '))}`}
                      target="_blank" rel="noreferrer"
                      style={{ display: 'inline-block', background: '#0F4C75', color: '#fff', borderRadius: 8, padding: '8px 14px', fontSize: 13, textDecoration: 'none', marginBottom: 12 }}>
                      📍 Otvori u Google Maps
                    </a>
                  ) : null}
                  <div style={{ height: 4 }} />

                  {/* FAZA 1 — procjena */}
                  {!n.procjena_status && (
                    <>
                      <label style={s.label}>PROCJENA — kad otprilike možeš završiti?</label>
                      <textarea value={procjenaUnos[n.id] || ''} onChange={e => setProcjenaUnos(prev => ({ ...prev, [n.id]: e.target.value }))}
                        placeholder="npr. mogu sutra popodne / za 2-3 dana..." style={{ ...s.input, minHeight: 70, resize: 'none' }} />
                      <button onClick={() => posaljiProcjenu(n)} disabled={slanje} style={{ ...s.btn, marginTop: 10 }}>{slanje ? 'Slanje...' : 'Pošalji procjenu adminu'}</button>
                    </>
                  )}

                  {/* FAZA 1 — čeka */}
                  {n.procjena_status === 'poslata' && (
                    <div style={{ background: '#0D1B2A', borderRadius: 8, padding: 12 }}>
                      <div style={{ color: '#F4A261', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Procjena poslata — čeka odobrenje</div>
                      <div style={{ fontSize: 13, color: '#E8F4FD' }}>{n.procjena}</div>
                    </div>
                  )}

                  {/* FAZA 2 — rad + obračun */}
                  {n.procjena_status === 'odobrena' && (
                    <>
                      <div style={{ color: '#2A9D8F', fontSize: 12, marginBottom: 10 }}>✓ Procjena odobrena — unesi obračun i sliku.</div>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 11, color: '#7B96B2' }}>
                        <div style={{ flex: 3 }}>Opis</div><div style={{ flex: 1 }}>Cijena €</div>
                      </div>
                      {(radovi[n.id] || [{ opis: '', cijena: '' }]).map((r, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                          <input value={r.opis} onChange={e => setRed(n.id, i, 'opis', e.target.value)} placeholder="Opis..." style={{ ...s.input, flex: 3, margin: 0 }} />
                          <input value={r.cijena} onChange={e => setRed(n.id, i, 'cijena', e.target.value)} placeholder="0" inputMode="decimal" style={{ ...s.input, flex: 1, margin: 0 }} />
                        </div>
                      ))}
                      <button onClick={() => dodajRed(n.id)} style={{ background: 'none', border: 'none', color: '#1B85B8', cursor: 'pointer', fontSize: 13, padding: '4px 0' }}>+ Dodaj red</button>
                      <div style={{ marginTop: 8 }}>
                        <label style={s.label}>SLIKA (opciono)</label>
                        <input type="file" accept="image/*" onChange={e => setSlike(prev => ({ ...prev, [n.id]: e.target.files[0] }))} style={{ color: '#7B96B2', fontSize: 12 }} />
                      </div>
                      <button onClick={() => zavrsiNalog(n)} disabled={slanje} style={{ ...s.btn, marginTop: 12 }}>{slanje ? 'Slanje...' : 'Završi i pošalji obračun'}</button>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {gotovi.length > 0 && (
          <>
            <div style={{ color: '#7B96B2', fontSize: 11, fontWeight: 700, letterSpacing: 1, margin: '16px 0 8px' }}>ZAVRŠENI</div>
            {gotovi.map(n => (
              <div key={n.id} style={{ ...s.card, opacity: 0.7 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#1B85B8', fontSize: 12, fontWeight: 700 }}>{n.id}</span>
                  <span style={{ background: '#2A9D8F', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>ZAVRŠENO</span>
                </div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{n.lokal || n.vrsta || n.kategorija}</div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

const s = {
  wrapper: { background: '#0D1B2A', minHeight: '100vh', fontFamily: "'Segoe UI', sans-serif", color: '#E8F4FD' },
  centar: { background: '#0D1B2A', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI', sans-serif", padding: 16 },
  header: { background: '#0F4C75', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  loginCard: { background: '#132338', border: '1px solid #1E3A5A', borderRadius: 16, padding: 32, width: '100%', maxWidth: 380 },
  logo: { width: 56, height: 56, background: '#1B85B8', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 26 },
  label: { color: '#7B96B2', fontSize: 12, display: 'block', marginBottom: 6, marginTop: 4 },
  input: { width: '100%', background: '#0D1B2A', border: '1px solid #1E3A5A', color: '#E8F4FD', borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box' },
  oko: { position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#7B96B2', cursor: 'pointer', fontSize: 16 },
  btn: { width: '100%', background: '#1B85B8', border: 'none', color: '#fff', borderRadius: 10, padding: 13, fontSize: 15, fontWeight: 700, cursor: 'pointer' },
  odjavaBtn: { background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13 },
  card: { background: '#132338', border: '1px solid #1E3A5A', borderRadius: 12, padding: 16, marginBottom: 12 },
}
