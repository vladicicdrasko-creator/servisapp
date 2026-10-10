'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../../lib/supabase-browser'
import { BrandZaglavljeForme } from '../../../components/BrandLogo'
import { forma } from '../../../components/brendStil'

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
    pozadina: forma.centar,
    kartica: forma.kartica,
    inp: { ...forma.polje, marginBottom: 0, paddingRight: 40 },
    btn: forma.dugme,
    label: forma.label,
  }

  if (uspjeh) return (
    <div style={s.pozadina}>
      <div style={{ ...s.kartica, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
        <h2 style={{ color: 'var(--ct-uspjeh)', marginBottom: 8 }}>Lozinka postavljena!</h2>
        <p style={{ color: 'var(--ct-siva-kafa-negativ)', fontSize: 14 }}>Možete se prijaviti u Coffee Team aplikaciju sa vašim emailom i novom lozinkom.</p>
      </div>
    </div>
  )

  return (
    <div style={s.pozadina}>
      <div style={s.kartica}>
        <BrandZaglavljeForme oznaka="Postavi lozinku" />

        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>NOVA LOZINKA</label>
          <div style={{ position: 'relative' }}>
            <input type={showL ? 'text' : 'password'} value={lozinka} onChange={e => setLozinka(e.target.value)}
              placeholder="Min. 6 karaktera" maxLength={128} style={s.inp} />
            <button type="button" onClick={() => setShowL(v => !v)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--ct-siva-kafa-negativ)', cursor: 'pointer', fontSize: 16 }}>
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
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--ct-siva-kafa-negativ)', cursor: 'pointer', fontSize: 16 }}>
              {showP ? '🙈' : '👁'}
            </button>
          </div>
        </div>

        {greska && <div style={forma.greska}>{greska}</div>}

        <button onClick={postavi} disabled={ucitava || !lozinka || !potvrda} style={{ ...s.btn, opacity: (!lozinka || !potvrda) ? 0.5 : 1 }}>
          {ucitava ? 'Čekaj...' : 'Postavi lozinku'}
        </button>
      </div>
    </div>
  )
}
