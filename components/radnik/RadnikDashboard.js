'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import NalogDetalj from './NalogDetalj'

export default function RadnikDashboard({ radnikId }) {
  const [tab, setTab] = useState('nalozi')
  const [nalozi, setNalozi] = useState([])
  const [radnik, setRadnik] = useState(null)
  const [odabraniN, setOdabraniN] = useState(null)
  const [ucitava, setUcitava] = useState(true)

  useEffect(() => {
    ucitajPodatke()
  }, [radnikId])

  useEffect(() => {
    if (!radnikId || !navigator.geolocation) return
    const id = navigator.geolocation.watchPosition(
      pos => {
        supabase.from('radnici').update({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }).eq('id', radnikId)
      },
      null,
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 20000 }
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [radnikId])

  const ucitajPodatke = async () => {
    const [{ data: r }, { data: n }] = await Promise.all([
      supabase.from('radnici').select('*').eq('id', radnikId).single(),
      supabase.from('prijave').select('*').eq('radnik_id', radnikId)
        .in('status', ['dodijeljena', 'u_toku'])
        .order('created_at', { ascending: false })
    ])
    setRadnik(r)
    setNalozi(n || [])
    setUcitava(false)
  }

  const hitnostBoja = {
    'kritična': '#E63946',
    'visoka': '#F4A261',
    'srednja': '#1B85B8',
    'niska': '#2A9D8F'
  }

  const TabBtn = ({ id, label, badge }) => (
    <button onClick={() => setTab(id)} style={{
      flex: 1, background: tab === id ? '#1B85B8' : 'transparent',
      border: 'none', color: tab === id ? '#fff' : '#7B96B2',
      padding: '10px 8px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
    }}>
      {label}
      {badge > 0 && (
        <span style={{ background: '#E63946', color: '#fff', borderRadius: 10, fontSize: 10, padding: '1px 6px' }}>
          {badge}
        </span>
      )}
    </button>
  )

  if (ucitava) return (
    <div style={{ background: '#0D1B2A', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ color: '#7B96B2' }}>Učitavam...</div>
    </div>
  )

  if (!radnik) return (
    <div style={{ background: '#0D1B2A', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ color: '#E63946', fontWeight: 700 }}>Radnik nije pronađen.</div>
    </div>
  )

  if (odabraniN) return (
    <NalogDetalj
      nalog={odabraniN}
      onNazad={() => { setOdabraniN(null); ucitajPodatke() }}
    />
  )

  return (
    <div style={s.wrapper}>
      {/* Header */}
      <div style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={s.logo}>🔧</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>ServisApp</div>
            <div style={{ fontSize: 10, opacity: 0.7 }}>{radnik.ime}</div>
          </div>
        </div>
        <div style={{ background: '#2A9D8F', color: '#fff', fontSize: 10, padding: '4px 10px', borderRadius: 20, fontWeight: 700 }}>
          ● NA TERENU
        </div>
      </div>

      {/* Nav */}
      <div style={s.nav}>
        <TabBtn id="nalozi" label="Nalozi" badge={nalozi.length} />
        <TabBtn id="ruta" label="Ruta" />
      </div>

      <div style={s.sadrzaj}>
        {/* NALOZI */}
        {tab === 'nalozi' && (
          <div>
            <h3 style={{ marginBottom: 14, fontSize: 15 }}>
              Moji nalozi ({nalozi.length})
            </h3>

            {nalozi.length === 0 && (
              <div style={{ color: '#7B96B2', textAlign: 'center', padding: 40 }}>
                Nema aktivnih naloga.
              </div>
            )}

            {nalozi.map(n => (
              <div key={n.id} onClick={() => setOdabraniN(n)}
                style={{
                  background: '#1A2E45',
                  border: `1px solid ${n.hitnost === 'kritična' ? '#E63946' : '#1E3A5A'}`,
                  borderRadius: 10, padding: 14, marginBottom: 10, cursor: 'pointer'
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: '#1B85B8', fontWeight: 700, fontSize: 12 }}>{n.id}</span>
                  <span style={{ color: hitnostBoja[n.hitnost] || '#7B96B2', fontSize: 11, fontWeight: 700 }}>
                    ● {n.hitnost?.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{n.lokal}</div>
                <div style={{ color: '#7B96B2', fontSize: 12, marginBottom: 6 }}>📍 {n.adresa}</div>
                <div style={{ color: '#7B96B2', fontSize: 12, fontStyle: 'italic' }}>"{n.opis}"</div>
                <div style={{ marginTop: 8, fontSize: 11, color: '#1B85B8', textAlign: 'right' }}>
                  Tapni za detalje →
                </div>
              </div>
            ))}
          </div>
        )}

        {/* RUTA */}
        {tab === 'ruta' && (
          <div>
            <h3 style={{ marginBottom: 14, fontSize: 15 }}>Ruta danas</h3>
            {nalozi.map((n, i) => (
              <div key={n.id} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: '#1B85B8', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0
                  }}>{i + 1}</div>
                  {i < nalozi.length - 1 && (
                    <div style={{ width: 2, flex: 1, minHeight: 20, background: '#1E3A5A', margin: '4px 0' }} />
                  )}
                </div>
                <div style={{ background: '#1A2E45', border: '1px solid #1E3A5A', borderRadius: 10, padding: 12, flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{n.lokal}</div>
                  <div style={{ color: '#7B96B2', fontSize: 11 }}>{n.adresa}</div>
                  <div style={{ color: hitnostBoja[n.hitnost], fontSize: 11, fontWeight: 700, marginTop: 4 }}>
                    ● {n.hitnost?.toUpperCase()}
                  </div>
                </div>
              </div>
            ))}
           {nalozi.length > 0 && (
              <button
                onClick={() => window.open("https://www.google.com/maps")}
                style={{
                  display: 'block', width: '100%', background: '#1B85B8',
                  border: 'none', color: '#fff', borderRadius: 10, padding: 14,
                  fontSize: 14, fontWeight: 700, cursor: 'pointer', textAlign: 'center',
                  marginTop: 8
                }}>
                Otvori rutu u Google Maps
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const s = {
  wrapper: { background: '#0D1B2A', minHeight: '100vh', fontFamily: "'Segoe UI', sans-serif", color: '#E8F4FD', display: 'flex', flexDirection: 'column' },
  header: { background: '#0F4C75', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logo: { width: 34, height: 34, background: '#1B85B8', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  nav: { background: '#132338', borderBottom: '1px solid #1E3A5A', display: 'flex' },
  sadrzaj: { flex: 1, overflow: 'auto', padding: 14, maxWidth: 600, width: '100%', margin: '0 auto' },
}