'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { StatusBadge } from './Dashboard'

export default function PrijavaDetalj({ prijava, radnici, onNazad, onAzuriraj }) {
  const [odabraniRadnik, setOdabraniRadnik] = useState(prijava.radnik_id || '')
  const [hitnost, setHitnost] = useState(prijava.hitnost || 'srednja')
  const [saljem, setSaljem] = useState(false)
  const [poruka, setPoruka] = useState('')

  const dodijeliRadnika = async () => {
    if (!odabraniRadnik) return
    setSaljem(true)

    const { error } = await supabase
      .from('prijave')
      .update({
        radnik_id: odabraniRadnik,
        hitnost,
        status: 'dodijeljena',
        updated_at: new Date().toISOString()
      })
      .eq('id', prijava.id)

    if (!error) {
      setPoruka('✓ Prijava dodijeljena!')
      onAzuriraj()
      setTimeout(() => { setPoruka(''); onNazad() }, 1500)
    }
    setSaljem(false)
  }

  return (
    <div>
      <button onClick={onNazad} style={s.nazadBtn}>
        ← Nazad na prijave
      </button>

      {/* Info prijave */}
      <div style={{ ...s.card, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ color: '#1B85B8', fontWeight: 800, fontSize: 14 }}>{prijava.id}</span>
          <StatusBadge status={prijava.status} />
        </div>

        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{prijava.lokal}</div>
        <div style={{ color: '#7B96B2', fontSize: 12, marginBottom: 12 }}>📍 {prijava.adresa}</div>

        <div style={{ background: '#0D1B2A', borderRadius: 8, padding: 12, marginBottom: 10 }}>
          <div style={{ color: '#7B96B2', fontSize: 11, marginBottom: 4 }}>OPIS KVARA</div>
          <div style={{ fontSize: 14 }}>{prijava.opis}</div>
        </div>

        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#7B96B2' }}>
          <span>📂 {prijava.kategorija}</span>
          <span>🕐 {new Date(prijava.created_at).toLocaleString('bs-BA')}</span>
        </div>

        {prijava.kontakt && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#7B96B2' }}>
            📞 {prijava.kontakt}
          </div>
        )}
      </div>

      {/* Dodjela – samo ako nije riješena */}
      {prijava.status !== 'riješena' && prijava.status !== 'zatvorena' && (
        <div style={s.card}>
          <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 15 }}>Dodjeli prijavu</div>

          {/* Hitnost */}
          <div style={{ marginBottom: 14 }}>
            <label style={s.label}>HITNOST</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['kritična', 'visoka', 'srednja', 'niska'].map(h => (
                <button key={h} onClick={() => setHitnost(h)}
                  style={{
                    flex: 1,
                    background: hitnost === h ? '#0F4C75' : '#0D1B2A',
                    border: `1px solid ${hitnost === h ? '#1B85B8' : '#1E3A5A'}`,
                    color: '#E8F4FD', borderRadius: 6, padding: '8px 4px',
                    fontSize: 10, cursor: 'pointer', fontWeight: 600
                  }}>
                  {h.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Radnik */}
          <div style={{ marginBottom: 16 }}>
            <label style={s.label}>ODABERI RADNIKA</label>
            {radnici.length === 0 && (
              <div style={{ color: '#7B96B2', fontSize: 13 }}>
                Nema radnika. Dodaj ih u Supabase.
              </div>
            )}
            {radnici.map(r => (
              <div key={r.id} onClick={() => setOdabraniRadnik(r.id)}
                style={{
                  background: odabraniRadnik === r.id ? '#0F4C75' : '#0D1B2A',
                  border: `1px solid ${odabraniRadnik === r.id ? '#1B85B8' : '#1E3A5A'}`,
                  borderRadius: 8, padding: '10px 12px', marginBottom: 8,
                  cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{r.ime}</div>
                  <div style={{ fontSize: 11, color: '#7B96B2' }}>{r.telefon}</div>
                </div>
                {odabraniRadnik === r.id && <span style={{ color: '#2A9D8F', fontWeight: 700 }}>✓</span>}
              </div>
            ))}
          </div>

          {poruka && (
            <div style={{ background: '#2A9D8F', color: '#fff', borderRadius: 8, padding: 10, marginBottom: 10, textAlign: 'center', fontWeight: 700 }}>
              {poruka}
            </div>
          )}

          <button onClick={dodijeliRadnika}
            disabled={!odabraniRadnik || saljem}
            style={{
              width: '100%', background: odabraniRadnik ? '#1B85B8' : '#1E3A5A',
              border: 'none', color: '#fff', borderRadius: 10, padding: 14,
              fontSize: 14, fontWeight: 700, cursor: odabraniRadnik ? 'pointer' : 'not-allowed'
            }}>
            {saljem ? 'Šaljem...' : 'Pošalji radniku'}
          </button>
        </div>
      )}

      {/* Napomena radnika ako postoji */}
      {prijava.napomena_radnika && (
        <div style={{ ...s.card, marginTop: 12 }}>
          <div style={{ color: '#7B96B2', fontSize: 11, marginBottom: 4 }}>NAPOMENA RADNIKA</div>
          <div style={{ fontSize: 14 }}>{prijava.napomena_radnika}</div>
          {prijava.ishod && (
            <div style={{ marginTop: 8, fontSize: 12 }}>
              Ishod: <span style={{ fontWeight: 700, color: prijava.ishod === 'riješena' ? '#2A9D8F' : '#F4A261' }}>
                {prijava.ishod}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const s = {
  card: { background: '#1A2E45', border: '1px solid #1E3A5A', borderRadius: 12, padding: 16 },
  label: { color: '#7B96B2', fontSize: 11, display: 'block', marginBottom: 8 },
  nazadBtn: { background: 'transparent', border: 'none', color: '#1B85B8', cursor: 'pointer', fontSize: 13, marginBottom: 16, padding: 0 }
}