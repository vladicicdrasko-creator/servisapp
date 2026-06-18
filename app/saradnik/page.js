'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase-browser'

const supabase = createClient()

export default function SaradnikPage() {
  const [ucitava, setUcitava] = useState(true)
  const [saradnik, setSaradnik] = useState(null)
  const [nemaPristup, setNemaPristup] = useState(false)
  const [obracuni, setObracuni] = useState([])

  // login
  const [email, setEmail] = useState('')
  const [lozinka, setLozinka] = useState('')
  const [showL, setShowL] = useState(false)
  const [greska, setGreska] = useState(null)
  const [loginLoading, setLoginLoading] = useState(false)

  // novi obračun
  const [forma, setForma] = useState(false)
  const [redovi, setRedovi] = useState([{ opis: '', cijena: '' }])
  const [slanje, setSlanje] = useState(false)

  useEffect(() => { provjeri() }, [])

  const provjeri = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUcitava(false); return }
    const { data: r } = await supabase.from('radnici').select('*').eq('email', user.email).maybeSingle()
    if (!r || r.uloga !== 'saradnik') { setNemaPristup(true); setUcitava(false); return }
    setSaradnik(r)
    await ucitajObracune(r.id)
    setUcitava(false)
  }

  const ucitajObracune = async (id) => {
    const { data } = await supabase.from('saradnik_obracuni').select('*, saradnik_stavke(*)').eq('saradnik_id', id).order('created_at', { ascending: false })
    setObracuni(data || [])
  }

  const prijava = async () => {
    setLoginLoading(true); setGreska(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: lozinka })
    setLoginLoading(false)
    if (error) { setGreska('Pogrešan email ili lozinka'); return }
    setUcitava(true); provjeri()
  }

  const odjava = async () => { await supabase.auth.signOut(); window.location.reload() }

  const ukupno = redovi.reduce((s, r) => s + (parseFloat(String(r.cijena).replace(',', '.')) || 0), 0)

  const posalji = async () => {
    const stavke = redovi
      .map(r => ({ opis: r.opis.trim(), cijena: parseFloat(String(r.cijena).replace(',', '.')) || 0 }))
      .filter(s => s.opis)
    if (stavke.length === 0) return
    setSlanje(true)
    const id = 'OBR-' + Date.now().toString().slice(-6)
    const uk = stavke.reduce((s, e) => s + e.cijena, 0)
    await supabase.from('saradnik_obracuni').insert({ id, saradnik_id: saradnik.id, status: 'poslato', ukupno: uk })
    await supabase.from('saradnik_stavke').insert(stavke.map(s => ({ obracun_id: id, opis: s.opis, cijena: s.cijena })))
    fetch('/api/push', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '💰 Novi obračun saradnika', body: `${saradnik.ime} — ${uk.toFixed(2)}€`, url: '/admin' })
    }).catch(() => {})
    setSlanje(false); setForma(false); setRedovi([{ opis: '', cijena: '' }])
    ucitajObracune(saradnik.id)
  }

  const statusBoja = { poslato: '#F4A261', prihvaceno: '#2A9D8F', odbijeno: '#E63946' }
  const statusLabel = { poslato: 'Čeka odgovor', prihvaceno: 'Prihvaćeno', odbijeno: 'Odbijeno' }

  if (ucitava) return <div style={s.centar}><div style={{ color: '#7B96B2' }}>Učitavam...</div></div>

  // Login ekran
  if (!saradnik && !nemaPristup) return (
    <div style={s.centar}>
      <div style={s.loginCard}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={s.logo}>🔧</div>
          <h1 style={{ color: '#E8F4FD', fontSize: 20, fontWeight: 800, margin: 0 }}>ServisApp</h1>
          <p style={{ color: '#7B96B2', fontSize: 13, margin: '4px 0 0' }}>Saradnik — obračuni</p>
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
        <button onClick={prijava} disabled={loginLoading} style={{ ...s.btn, marginTop: 12 }}>
          {loginLoading ? 'Prijava...' : 'Prijavi se'}
        </button>
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

  // Glavni ekran
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
        {!forma && (
          <button onClick={() => setForma(true)} style={{ ...s.btn, marginBottom: 16 }}>+ Novi obračun</button>
        )}

        {forma && (
          <div style={s.card}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#7B96B2' }}>NOVI OBRAČUN</h3>
            <div style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 11, color: '#7B96B2' }}>
              <div style={{ flex: 3 }}>Opis posla</div>
              <div style={{ flex: 1 }}>Cijena €</div>
              <div style={{ width: 28 }} />
            </div>
            {redovi.map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <input value={r.opis} onChange={e => setRedovi(redovi.map((x, j) => j === i ? { ...x, opis: e.target.value } : x))}
                  placeholder="Opis..." style={{ ...s.input, flex: 3, margin: 0 }} />
                <input value={r.cijena} onChange={e => setRedovi(redovi.map((x, j) => j === i ? { ...x, cijena: e.target.value } : x))}
                  placeholder="0" inputMode="decimal" style={{ ...s.input, flex: 1, margin: 0 }} />
                <button onClick={() => redovi.length > 1 && setRedovi(redovi.filter((_, j) => j !== i))}
                  style={{ width: 28, background: 'none', border: 'none', color: '#E63946', cursor: 'pointer', fontSize: 18 }}>×</button>
              </div>
            ))}
            <button onClick={() => setRedovi([...redovi, { opis: '', cijena: '' }])}
              style={{ background: 'none', border: 'none', color: '#1B85B8', cursor: 'pointer', fontSize: 13, padding: '4px 0' }}>+ Dodaj red</button>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #1E3A5A', paddingTop: 10, marginTop: 6 }}>
              <span style={{ color: '#7B96B2', fontSize: 12, fontWeight: 700 }}>UKUPNO</span>
              <span style={{ color: '#E8F4FD', fontSize: 18, fontWeight: 800 }}>{ukupno.toFixed(2)}€</span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={posalji} disabled={slanje} style={{ ...s.btn, flex: 1 }}>{slanje ? 'Slanje...' : 'Pošalji adminu'}</button>
              <button onClick={() => { setForma(false); setRedovi([{ opis: '', cijena: '' }]) }} style={s.odustani}>Odustani</button>
            </div>
          </div>
        )}

        <div style={{ color: '#7B96B2', fontSize: 11, fontWeight: 700, letterSpacing: 1, margin: '8px 0' }}>MOJI OBRAČUNI</div>
        {obracuni.length === 0 && <div style={{ color: '#7B96B2', fontSize: 13 }}>Nema obračuna.</div>}
        {obracuni.map(o => (
          <div key={o.id} style={{ ...s.card, borderColor: statusBoja[o.status] || '#1E3A5A' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ color: '#1B85B8', fontSize: 12, fontWeight: 700 }}>{o.id}</span>
              <span style={{ background: statusBoja[o.status], color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>{statusLabel[o.status] || o.status}</span>
            </div>
            {(o.saradnik_stavke || []).map((st, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 13 }}>
                <span style={{ color: '#E8F4FD' }}>{st.opis}</span>
                <span style={{ color: '#7B96B2' }}>{Number(st.cijena).toFixed(2)}€</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #1E3A5A', marginTop: 6, paddingTop: 6 }}>
              <span style={{ color: '#7B96B2', fontSize: 11, fontWeight: 700 }}>UKUPNO</span>
              <span style={{ color: '#E8F4FD', fontSize: 15, fontWeight: 800 }}>{Number(o.ukupno).toFixed(2)}€</span>
            </div>
          </div>
        ))}
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
  label: { color: '#7B96B2', fontSize: 12, display: 'block', marginBottom: 6, marginTop: 10 },
  input: { width: '100%', background: '#0D1B2A', border: '1px solid #1E3A5A', color: '#E8F4FD', borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box' },
  oko: { position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#7B96B2', cursor: 'pointer', fontSize: 16 },
  btn: { width: '100%', background: '#1B85B8', border: 'none', color: '#fff', borderRadius: 10, padding: 13, fontSize: 15, fontWeight: 700, cursor: 'pointer' },
  odustani: { background: 'transparent', border: '1px solid #1E3A5A', color: '#7B96B2', borderRadius: 10, padding: '10px 16px', cursor: 'pointer' },
  odjavaBtn: { background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13 },
  card: { background: '#132338', border: '1px solid #1E3A5A', borderRadius: 12, padding: 16, marginBottom: 12 },
}
