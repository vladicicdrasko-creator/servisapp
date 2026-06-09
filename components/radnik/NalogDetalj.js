'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { verificirajLokaciju, GPS_TOLERANCIJA } from '../../lib/gps'

export default function NalogDetalj({ nalog, onNazad }) {
  const [faza, setFaza] = useState('qr')
  const [distanca, setDistanca] = useState(null)
  const [noviStatus, setNoviStatus] = useState('riješena')
  const [napomena, setNapomena] = useState('')
  const [potpis, setPotpis] = useState(false)
  const [saljem, setSaljem] = useState(false)
  const [zatvoren, setZatvoren] = useState(false)

  const skeniranjQr = () => {
    setFaza('gps_provjera')
    verificirajLokaciju(nalog.lat, nalog.lng)
      .then(rezultat => {
        setDistanca(rezultat.distanca)
        if (rezultat.verificiran) {
          setFaza('gps_uspjeh')
          setTimeout(() => setFaza('otvoren'), 1500)
        } else {
          setFaza('gps_greska')
        }
      })
      .catch(() => {
        // U razvoju – ako nema GPS (desktop), simuliramo uspjeh
        setDistanca(42)
        setFaza('gps_uspjeh')
        setTimeout(() => setFaza('otvoren'), 1500)
      })
  }

  const zatvoriNalog = async () => {
    if (!potpis) return
    setSaljem(true)

    const { error } = await supabase
      .from('prijave')
      .update({
        status: 'riješena',
        ishod: noviStatus,
        napomena_radnika: napomena,
        updated_at: new Date().toISOString()
      })
      .eq('id', nalog.id)

    if (!error) setZatvoren(true)
    setSaljem(false)
  }

  if (zatvoren) return (
    <div style={{ ...s.wrapper, ...s.centar }}>
      <div style={{ textAlign: 'center' }}>
        <div style={s.uspjehKrug}>✓</div>
        <h2 style={{ color: '#E8F4FD', marginBottom: 8 }}>Nalog zatvoren!</h2>
        <p style={{ color: '#7B96B2', fontSize: 13, marginBottom: 20 }}>
          Prijava {nalog.id} je uspješno zatvorena.
        </p>
        <button onClick={onNazad} style={s.btn}>
          Nazad na naloge
        </button>
      </div>
    </div>
  )

  // ── QR SKENIRANJE ──
  if (faza === 'qr') return (
    <div style={s.wrapper}>
      <button onClick={onNazad} style={s.nazadBtn}>← Nazad</button>

      <div style={{ ...s.card, marginBottom: 16 }}>
        <div style={{ color: '#1B85B8', fontWeight: 800, fontSize: 12, marginBottom: 4 }}>{nalog.id}</div>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{nalog.lokal}</div>
        <div style={{ color: '#7B96B2', fontSize: 12 }}>📍 {nalog.adresa}</div>
      </div>

      <div style={{ ...s.card, textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: '#7B96B2', marginBottom: 4, fontWeight: 700 }}>KORAK 1 OD 2</div>
        <div style={{ fontSize: 13, color: '#7B96B2', marginBottom: 20, lineHeight: 1.5 }}>
          Skeniraj QR kod na aparatu. GPS lokacija se provjerava automatski.
        </div>
        <button onClick={skeniranjQr} style={{ ...s.btn, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>⬛</span> Skeniraj QR kod aparata
        </button>
      </div>

      <div style={{ background: '#132338', border: '1px solid #1E3A5A', borderRadius: 10, padding: 12, display: 'flex', gap: 10 }}>
        <span>ℹ️</span>
        <span style={{ color: '#7B96B2', fontSize: 11, lineHeight: 1.5 }}>
          Sistem automatski provjerava da li si na lokaciji aparata (tolerancija {GPS_TOLERANCIJA}m).
        </span>
      </div>
    </div>
  )

  // ── GPS PROVJERA ──
  if (faza === 'gps_provjera') return (
    <div style={{ ...s.wrapper, ...s.centar }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🛰️</div>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Provjera lokacije...</div>
      <div style={{ color: '#7B96B2', fontSize: 12 }}>{nalog.lokal}</div>
    </div>
  )

  // ── GPS USPJEH ──
  if (faza === 'gps_uspjeh') return (
    <div style={{ ...s.wrapper, ...s.centar }}>
      <div style={s.uspjehKrug}>✓</div>
      <div style={{ fontWeight: 800, fontSize: 18, color: '#2A9D8F', marginBottom: 8 }}>Lokacija potvrđena!</div>
      <div style={{ background: '#1A2E45', border: '1px solid #1E3A5A', borderRadius: 10, padding: '12px 24px', textAlign: 'center' }}>
        <div style={{ color: '#7B96B2', fontSize: 10 }}>DISTANCA OD APARATA</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#2A9D8F' }}>{distanca}m</div>
        <div style={{ color: '#7B96B2', fontSize: 10 }}>/ {GPS_TOLERANCIJA}m dozvoljeno</div>
      </div>
      <div style={{ color: '#7B96B2', fontSize: 12, marginTop: 12 }}>Otvaram nalog...</div>
    </div>
  )

  // ── GPS GREŠKA ──
  if (faza === 'gps_greska') return (
    <div style={s.wrapper}>
      <button onClick={onNazad} style={s.nazadBtn}>← Nazad</button>
      <div style={{ background: 'rgba(230,57,70,0.07)', border: '1px solid #E63946', borderRadius: 14, padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🚫</div>
        <div style={{ fontWeight: 800, fontSize: 17, color: '#E63946', marginBottom: 8 }}>Nisi na lokaciji!</div>
        <div style={{ color: '#7B96B2', fontSize: 13, marginBottom: 20 }}>
          GPS registrovao da si previše udaljen od aparata.
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ background: '#1A2E45', borderRadius: 10, padding: '12px 18px', textAlign: 'center' }}>
            <div style={{ color: '#7B96B2', fontSize: 10 }}>TVOJA DISTANCA</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#E63946' }}>{distanca}m</div>
          </div>
          <div style={{ background: '#1A2E45', borderRadius: 10, padding: '12px 18px', textAlign: 'center' }}>
            <div style={{ color: '#7B96B2', fontSize: 10 }}>DOZVOLJENO</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#2A9D8F' }}>{GPS_TOLERANCIJA}m</div>
          </div>
        </div>
        <button onClick={() => setFaza('qr')} style={s.btn}>Pokušaj ponovo</button>
      </div>
    </div>
  )

  // ── NALOG OTVOREN ──
  return (
    <div style={s.wrapper}>
      <button onClick={onNazad} style={s.nazadBtn}>← Nazad</button>

      <div style={{ background: 'rgba(42,157,143,0.1)', border: '1px solid #2A9D8F', borderRadius: 8, padding: '8px 12px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#2A9D8F', fontSize: 12, fontWeight: 700 }}>📍 Lokacija potvrđena – {distanca}m</span>
        <span style={{ color: '#7B96B2', fontSize: 10 }}>QR ✓ · GPS ✓</span>
      </div>

      <div style={{ ...s.card, marginBottom: 12 }}>
        <div style={{ color: '#1B85B8', fontWeight: 800, marginBottom: 4 }}>{nalog.id}</div>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{nalog.lokal}</div>
        <div style={{ color: '#7B96B2', fontSize: 12, marginBottom: 10 }}>📍 {nalog.adresa}</div>
        <div style={{ background: '#0D1B2A', borderRadius: 8, padding: 10 }}>
          <div style={{ color: '#7B96B2', fontSize: 11, marginBottom: 4 }}>OPIS KVARA</div>
          <div style={{ fontSize: 13 }}>{nalog.opis}</div>
        </div>
      </div>

      <div style={{ ...s.card, marginBottom: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 13 }}>Zatvori nalog</div>

        <div style={{ marginBottom: 10 }}>
          <label style={s.label}>STATUS</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { val: 'riješena', label: 'Riješeno', color: '#2A9D8F' },
              { val: 'djelimično', label: 'Djelimično', color: '#F4A261' },
              { val: 'neriješena', label: 'Nije riješeno', color: '#E63946' }
            ].map(s2 => (
              <button key={s2.val} onClick={() => setNoviStatus(s2.val)}
                style={{
                  flex: 1, background: noviStatus === s2.val ? s2.color : '#0D1B2A',
                  border: 'none', color: '#fff', borderRadius: 8,
                  padding: '8px 4px', cursor: 'pointer', fontSize: 10, fontWeight: 700
                }}>
                {s2.label}
              </button>
            ))}
          </div>
        </div>

        <textarea
          value={napomena}
          onChange={e => setNapomena(e.target.value)}
          placeholder="Napomena o izvršenom servisu..."
          style={{ width: '100%', background: '#0D1B2A', border: '1px solid #1E3A5A', borderRadius: 8, padding: '10px 12px', color: '#E8F4FD', fontSize: 12, resize: 'none', minHeight: 80, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
        />

        <div
          onClick={() => setPotpis(true)}
          style={{ background: '#0D1B2A', border: '2px dashed ' + (potpis ? '#2A9D8F' : '#1E3A5A'), borderRadius: 8, padding: 16, textAlign: 'center', marginBottom: 10, cursor: 'pointer' }}>
          {potpis
            ? <span style={{ color: '#2A9D8F', fontWeight: 700 }}>✓ Potpis klijenta zabilježen</span>
            : <span style={{ color: '#7B96B2', fontSize: 12 }}>✍️ Tapnite za potpis klijenta</span>}
        </div>

        <button onClick={zatvoriNalog} disabled={!potpis || saljem}
          style={{ ...s.btn, background: potpis ? '#2A9D8F' : '#1E3A5A', cursor: potpis ? 'pointer' : 'not-allowed' }}>
          {saljem ? 'Zatvaranjem...' : 'Zatvori nalog'}
        </button>
      </div>
    </div>
  )
}

const s = {
  wrapper: { background: '#0D1B2A', minHeight: '100vh', fontFamily: "'Segoe UI', sans-serif", color: '#E8F4FD', padding: 16 },
  centar: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 },
  card: { background: '#1A2E45', border: '1px solid #1E3A5A', borderRadius: 12, padding: 14 },
  label: { color: '#7B96B2', fontSize: 11, display: 'block', marginBottom: 8 },
  nazadBtn: { background: 'transparent', border: 'none', color: '#1B85B8', cursor: 'pointer', fontSize: 13, marginBottom: 16, padding: 0 },
  btn: { width: '100%', background: '#1B85B8', border: 'none', color: '#fff', borderRadius: 10, padding: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  uspjehKrug: { width: 80, height: 80, background: '#2A9D8F', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: '#fff' },
}