'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../../lib/supabase-browser'

export default function PostaviLozinku() {
  const [lozinka, setLozinka] = useState('')
  const [potvrda, setPotvrda] = useState('')
  const [showL, setShowL] = useState(false)
  const [showP, setShowP] = useState(false)
  const [greska, setGreska] = useState(null)
  const [uspjeh, setUspjeh] = useState(false)
  const [ucitava, setUcitava] = useState(false)
  const supabase = createClient()

  const postavi = async () => {
    if (lozinka.length < 6) { setGreska('Lozinka mora imati najmanje 6 karaktera'); return }
    if (lozinka !== potvrda) { setGreska('Lozinke se ne poklapaju'); return }
    setUcitava(true)
    setGreska(null)
    const { error } = await supabase.auth.updateUser({ password: lozinka })
    setUcitava(false)
    if (error) { setGreska('Greška: ' + error.message); return }
    setUspjeh(true)
  }

  const s = {
    pozadina: { minHeight: '100vh', background: '#0D1B2A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI', sans-serif" },
    kartica: { background: '#132338', border: '1px solid #1E3A5A', borderRadius: 16, padding: 32, width: '100%', maxWidth: 380 },
    inp: { width: '100%', background: '#0D1B2A', border: '1px solid #1E3A5A', color: '#E8F4FD', borderRadius: 8, padding: '10px 40px 10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box' },
    btn: { width: '100%', background: '#1B85B8', border: 'none', color: '#fff', borderRadius: 10, padding: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 8 },
    label: { color: '#7B96B2', fontSize: 12, display: 'block', marginBottom: 6 },
  }

  if (uspjeh) return (
    <div style={s.pozadina}>
      <div style={{ ...s.kartica, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
        <h2 style={{ color: '#2A9D8F', marginBottom: 8 }}>Lozinka postavljena!</h2>
        <p style={{ color: '#7B96B2', fontSize: 14 }}>Možete se prijaviti u ServisApp aplikaciju sa vašim emailom i novom lozinkom.</p>
      </div>
    </div>
  )

  return (
    <div style={s.pozadina}>
      <div style={s.kartica}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, background: '#1B85B8', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 26 }}>🔧</div>
          <h1 style={{ color: '#E8F4FD', fontSize: 20, fontWeight: 800, margin: 0 }}>ServisApp</h1>
          <p style={{ color: '#7B96B2', fontSize: 13, margin: '4px 0 0' }}>Postavi lozinku za vaš nalog</p>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>NOVA LOZINKA</label>
          <div style={{ position: 'relative' }}>
            <input type={showL ? 'text' : 'password'} value={lozinka} onChange={e => setLozinka(e.target.value)}
              placeholder="Min. 6 karaktera" maxLength={128} style={s.inp} />
            <button type="button" onClick={() => setShowL(v => !v)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#7B96B2', cursor: 'pointer', fontSize: 16 }}>
              {showL ? '🙈' : '👁'}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={s.label}>POTVRDI LOZINKU</label>
          <div style={{ position: 'relative' }}>
            <input type={showP ? 'text' : 'password'} value={potvrda} onChange={e => setPotvrda(e.target.value)}
              placeholder="Ponovi lozinku" maxLength={128} style={s.inp} />
            <button type="button" onClick={() => setShowP(v => !v)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#7B96B2', cursor: 'pointer', fontSize: 16 }}>
              {showP ? '🙈' : '👁'}
            </button>
          </div>
        </div>

        {greska && <div style={{ color: '#E63946', fontSize: 13, marginBottom: 12, background: '#1A0A0A', borderRadius: 8, padding: '8px 12px' }}>{greska}</div>}

        <button onClick={postavi} disabled={ucitava || !lozinka || !potvrda} style={{ ...s.btn, opacity: (!lozinka || !potvrda) ? 0.5 : 1 }}>
          {ucitava ? 'Čekaj...' : 'Postavi lozinku'}
        </button>
      </div>
    </div>
  )
}
