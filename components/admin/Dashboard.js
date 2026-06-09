'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import PrijaveList from './PrijaveList'
import PrijavaDetalj from './PrijavaDetalj'
import Mapa from './Mapa'

export default function Dashboard() {
  const [tab, setTab] = useState('prijave')
  const [prijave, setPrijave] = useState([])
  const [radnici, setRadnici] = useState([])
  const [odabranaP, setOdabranaP] = useState(null)
  const [odabraniRadnikAdmin, setOdabraniRadnikAdmin] = useState(null)
  const [montazaZahtjevi, setMontazaZahtjevi] = useState([])
  const [ucitava, setUcitava] = useState(true)

  const montazaBadge = montazaZahtjevi.filter(m => m.status === 'pending').length

  useEffect(() => {
    ucitajPodatke()
    const kanal = supabase
      .channel('prijave')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prijave' }, () => {
        ucitajPodatke()
      })
      .subscribe()
    return () => supabase.removeChannel(kanal)
  }, [])

  const ucitajPodatke = async () => {
    const [{ data: p }, { data: r }, { data: m }] = await Promise.all([
      supabase.from('prijave').select('*').order('created_at', { ascending: false }),
      supabase.from('radnici').select('*').order('ime'),
      supabase.from('montaza_zahtjevi').select('*').order('created_at', { ascending: false })
    ])
    setPrijave(p || [])
    setRadnici(r || [])
    setMontazaZahtjevi(m || [])
    setUcitava(false)
  }

  const nova = prijave.filter(p => p.status === 'nova').length
  const uToku = prijave.filter(p => p.status === 'u_toku').length
  const dodijeljena = prijave.filter(p => p.status === 'dodijeljena').length
  const rijesena = prijave.filter(p => p.status === 'riješena').length

  const TabBtn = ({ id, label, badge }) => (
    <button onClick={() => setTab(id)} style={{
      background: tab === id ? '#1B85B8' : 'transparent',
      border: 'none', color: tab === id ? '#fff' : '#7B96B2',
      padding: '10px 16px', borderRadius: 8, cursor: 'pointer',
      fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6
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
    <div style={{ ...s.centar, background: '#0D1B2A' }}>
      <div style={{ color: '#7B96B2' }}>Učitavam...</div>
    </div>
  )

  return (
    <div style={s.wrapper}>
      {/* Topbar */}
      <div style={s.topbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={s.logo}>🔧</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: 1 }}>ServisApp</div>
            <div style={{ fontSize: 10, color: '#7B96B2' }}>Admin Panel</div>
          </div>
        </div>
        {nova > 0 && (
          <div style={{ background: '#E63946', color: '#fff', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>
            🔔 {nova} nova prijava
          </div>
        )}
      </div>

      <div style={s.nav}>
        <TabBtn id="prijave" label="Prijave" badge={nova} />
        <TabBtn id="dashboard" label="Pregled" />
        <TabBtn id="mapa" label="Mapa" />
        <TabBtn id="radnici" label="Radnici" />
        <TabBtn id="montaza" label="Montaža" badge={montazaBadge} />
      </div>

      <div style={s.sadrzaj}>
        {/* DASHBOARD */}
        {tab === 'dashboard' && (
          <div>
            <h2 style={s.naslov}>Pregled danas</h2>
            <div style={s.grid4}>
              {[
                { label: 'Nove', val: nova, color: '#1B85B8' },
                { label: 'Dodijeljene', val: dodijeljena, color: '#F4A261' },
                { label: 'U toku', val: uToku, color: '#9B59B6' },
                { label: 'Riješene', val: rijesena, color: '#2A9D8F' },
              ].map(k => (
                <div key={k.label} style={s.statCard}>
                  <div style={{ color: '#7B96B2', fontSize: 11, marginBottom: 6 }}>{k.label.toUpperCase()}</div>
                  <div style={{ fontSize: 36, fontWeight: 800, color: k.color }}>{k.val}</div>
                </div>
              ))}
            </div>
            <h3 style={{ color: '#7B96B2', fontSize: 13, marginBottom: 10 }}>NEDAVNE PRIJAVE</h3>
            {prijave.slice(0, 5).map(p => (
              <div key={p.id} onClick={() => { setOdabranaP(p); setTab('prijave') }}
                style={{ ...s.card, cursor: 'pointer', marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#1B85B8', fontWeight: 700, fontSize: 12 }}>{p.id}</span>
                  <StatusBadge status={p.status} />
                </div>
                <div style={{ fontWeight: 600 }}>{p.lokal}</div>
                <div style={{ color: '#7B96B2', fontSize: 12 }}>{p.opis}</div>
              </div>
            ))}
          </div>
        )}

        {/* PRIJAVE */}
        {tab === 'prijave' && !odabranaP && (
          <PrijaveList prijave={prijave} onOdaberi={p => setOdabranaP(p)} />
        )}
        {tab === 'prijave' && odabranaP && (
          <PrijavaDetalj
            prijava={odabranaP}
            radnici={radnici}
            onNazad={() => setOdabranaP(null)}
            onAzuriraj={ucitajPodatke}
          />
        )}

        {/* MAPA */}
        {tab === 'mapa' && (
          <div>
            <h2 style={s.naslov}>Mapa – danas</h2>
            <Mapa
              prijave={prijave.filter(p => p.status !== 'zatvorena')}
              obilaski={[]}
              radnici={[]}
            />
          </div>
        )}

        {/* RADNICI */}
        {tab === 'radnici' && (
          <div>
            <h2 style={s.naslov}>Radnici</h2>
            {radnici.length === 0 && (
              <div style={{ color: '#7B96B2', textAlign: 'center', padding: 40 }}>
                Nema radnika. Dodaj ih u Supabase tabeli "radnici".
              </div>
            )}
            {radnici.map(r => (
              <div key={r.id} style={{ ...s.card, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{r.ime}</div>
                    <div style={{ color: '#7B96B2', fontSize: 12 }}>{r.telefon}</div>
                  </div>
                  <span style={{
                    background: r.status === 'na_terenu' ? '#F4A261' : r.status === 'slobodan' ? '#2A9D8F' : '#1B85B8',
                    color: r.status === 'na_terenu' ? '#0D1B2A' : '#fff',
                    fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 700
                  }}>
                    {r.status === 'na_terenu' ? 'NA TERENU' : r.status === 'slobodan' ? 'SLOBODAN' : 'AKTIVAN'}
                  </span>
                </div>
                <div style={{ marginTop: 8, fontSize: 12, color: '#7B96B2' }}>
                  Aktivnih prijava: <span style={{ color: '#E8F4FD', fontWeight: 700 }}>
                    {prijave.filter(p => p.radnik_id === r.id && p.status !== 'riješena').length}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MONTAŽA */}
        {tab === 'montaza' && (
          <div>
            <h2 style={s.naslov}>Zahtjevi za montažu</h2>
            {montazaZahtjevi.length === 0 && (
              <div style={{ color: '#7B96B2', textAlign: 'center', padding: 40 }}>
                Nema zahtjeva za montažu.
              </div>
            )}
            {montazaZahtjevi.map(m => (
              <div key={m.id} style={{ ...s.card, marginBottom: 14, border: `1px solid ${m.status === 'pending' ? '#F4A261' : '#1E3A5A'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ color: '#1B85B8', fontWeight: 700 }}>{m.aparat_id}</span>
                  <span style={{
                    background: m.status === 'pending' ? '#F4A261' : m.status === 'odobren' ? '#2A9D8F' : '#E63946',
                    color: m.status === 'pending' ? '#0D1B2A' : '#fff',
                    fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700
                  }}>
                    {m.status === 'pending' ? 'ČEKA' : m.status === 'odobren' ? 'ODOBREN' : 'ODBIJEN'}
                  </span>
                </div>

                {m.stari_podaci && (
                  <div style={{ background: '#0D1B2A', borderRadius: 8, padding: 10, marginBottom: 8 }}>
                    <div style={{ color: '#7B96B2', fontSize: 11, marginBottom: 4 }}>TRENUTNI PODACI</div>
                    <div style={{ fontWeight: 600 }}>{m.stari_podaci.lokal}</div>
                    <div style={{ color: '#7B96B2', fontSize: 12 }}>{m.stari_podaci.adresa}</div>
                  </div>
                )}

                <div style={{ background: '#0F4C75', borderRadius: 8, padding: 10, marginBottom: 10 }}>
                  <div style={{ color: '#7B96B2', fontSize: 11, marginBottom: 4 }}>NOVI PODACI</div>
                  <div style={{ fontWeight: 600 }}>{m.novi_lokal}</div>
                  <div style={{ color: '#7B96B2', fontSize: 12 }}>{m.nova_adresa}</div>
                  {m.novi_lat && <div style={{ color: '#7B96B2', fontSize: 11 }}>GPS: {Number(m.novi_lat).toFixed(5)}, {Number(m.novi_lng).toFixed(5)}</div>}
                  {m.napomena && <div style={{ color: '#7B96B2', fontSize: 12, fontStyle: 'italic', marginTop: 4 }}>"{m.napomena}"</div>}
                </div>

                {m.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={async () => {
                        await supabase.from('aparati').upsert({
                          id: m.aparat_id,
                          lokal: m.novi_lokal,
                          adresa: m.nova_adresa,
                          lat: m.novi_lat,
                          lng: m.novi_lng,
                          status: 'aktivan',
                          verifikacija: 'aktivan'
                        })
                        await supabase.from('montaza_zahtjevi').update({ status: 'odobren' }).eq('id', m.id)
                        ucitajPodatke()
                      }}
                      style={{ flex: 1, background: '#2A9D8F', border: 'none', color: '#fff', borderRadius: 8, padding: 10, cursor: 'pointer', fontWeight: 700 }}>
                      ✓ Odobri
                    </button>
                    <button
                      onClick={async () => {
                        await supabase.from('montaza_zahtjevi').update({ status: 'odbijen' }).eq('id', m.id)
                        ucitajPodatke()
                      }}
                      style={{ flex: 1, background: '#E63946', border: 'none', color: '#fff', borderRadius: 8, padding: 10, cursor: 'pointer', fontWeight: 700 }}>
                      ✕ Odbij
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function StatusBadge({ status }) {
  const mapa = {
    nova: { label: 'NOVA', bg: '#1B85B8' },
    dodijeljena: { label: 'DODIJELJENA', bg: '#F4A261', color: '#0D1B2A' },
    u_toku: { label: 'U TOKU', bg: '#9B59B6' },
    'riješena': { label: 'RIJEŠENA', bg: '#2A9D8F' },
    zatvorena: { label: 'ZATVORENA', bg: '#7B96B2', color: '#0D1B2A' },
  }
  const s = mapa[status] || mapa.nova
  return (
    <span style={{ background: s.bg, color: s.color || '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, letterSpacing: 1 }}>
      {s.label}
    </span>
  )
}

const s = {
  wrapper: { background: '#0D1B2A', minHeight: '100vh', fontFamily: "'Segoe UI', sans-serif", color: '#E8F4FD', display: 'flex', flexDirection: 'column' },
  centar: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI', sans-serif" },
  topbar: { background: '#132338', borderBottom: '1px solid #1E3A5A', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logo: { width: 32, height: 32, background: '#1B85B8', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  nav: { background: '#132338', borderBottom: '1px solid #1E3A5A', padding: '6px 16px', display: 'flex', gap: 4 },
  sadrzaj: { flex: 1, overflow: 'auto', padding: 16, maxWidth: 900, width: '100%', margin: '0 auto' },
  naslov: { marginBottom: 16, fontSize: 18 },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 },
  statCard: { background: '#1A2E45', border: '1px solid #1E3A5A', borderRadius: 12, padding: 16 },
  card: { background: '#1A2E45', border: '1px solid #1E3A5A', borderRadius: 10, padding: 14 },
}