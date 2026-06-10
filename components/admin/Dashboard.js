'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import PrijavaDetalj from './PrijavaDetalj'
import Mapa from './Mapa'
import { createClient } from '../../lib/supabase-browser'
import AparatiTab from './AparatiTab'

export default function Dashboard() {
  const [tab, setTab] = useState('nalozi')
  const [prijave, setPrijave] = useState([])
  const [aparati, setAparati] = useState([])
  const [radnici, setRadnici] = useState([])
  const [odabranaP, setOdabranaP] = useState(null)
  const [ucitava, setUcitava] = useState(true)
  const [adminIme, setAdminIme] = useState('')

  const supabaseBrowser = createClient()

  const handleLogout = async () => {
    await supabaseBrowser.auth.signOut()
    window.location.href = '/admin/login'
  }

  useEffect(() => {
    supabaseBrowser.auth.getUser().then(({ data: { user } }) => {
      if (user) setAdminIme(user.email.split('@')[0])
    })
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
    const [{ data: p }, { data: r }, { data: a }] = await Promise.all([
      supabase.from('prijave').select('*').order('created_at', { ascending: false }),
      supabase.from('radnici').select('*').order('ime'),
      supabase.from('aparati').select('*').order('lokal'),
    ])
    setPrijave(p || [])
    setRadnici(r || [])
    setAparati(a || [])
    setUcitava(false)
  }

  const nova = prijave.filter(p => p.status === 'nova').length

  const TabBtn = ({ id, label, badge }) => (
    <button onClick={() => setTab(id)} style={{
      background: tab === id ? '#1B85B8' : 'transparent',
      border: 'none', color: tab === id ? '#fff' : '#7B96B2',
      padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
      fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
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
      <div style={s.topbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={s.logo}>🔧</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: 1 }}>ServisApp</div>
            <div style={{ fontSize: 10, color: '#7B96B2' }}>Admin Panel</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {nova > 0 && (
            <div style={{ background: '#E63946', color: '#fff', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>
              🔔 {nova} nova
            </div>
          )}
          <div style={{ color: '#7B96B2', fontSize: 13 }}>👤 {adminIme}</div>
          <button onClick={handleLogout} style={{
            background: 'transparent', border: '1px solid #1E3A5A', color: '#7B96B2',
            padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12
          }}>Odjava</button>
        </div>
      </div>

      <div style={s.nav}>
        <TabBtn id="nalozi" label="Nalozi" badge={nova} />
        <TabBtn id="dashboard" label="Pregled" />
        <TabBtn id="mapa" label="Mapa" />
        <TabBtn id="radnici" label="Radnici" />
        <TabBtn id="aparati" label="Aparati" />
      </div>

      <div style={s.sadrzaj}>
        {tab === 'dashboard' && (
          <DashboardTab prijave={prijave} onOdaberi={(p) => { setOdabranaP(p); setTab('nalozi') }} />
        )}

        {tab === 'nalozi' && !odabranaP && (
          <NaloziTab prijave={prijave} aparati={aparati} radnici={radnici} onOdaberi={p => setOdabranaP(p)} onRefresh={ucitajPodatke} />
        )}
        {tab === 'nalozi' && odabranaP && (
          <PrijavaDetalj
            prijava={odabranaP}
            radnici={radnici}
            onNazad={() => setOdabranaP(null)}
            onAzuriraj={ucitajPodatke}
          />
        )}

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

        {tab === 'radnici' && (
          <RadniciTab radnici={radnici} prijave={prijave} onRefresh={ucitajPodatke} />
        )}

        {tab === 'aparati' && (
          <AparatiTab onOdaberiPrijavu={(p) => { setOdabranaP(p); setTab('nalozi') }} />
        )}
      </div>
    </div>
  )
}

const tipBoja = {
  montaza: { bg: '#1B85B8', label: 'MONTAŽA' },
  demontaza: { bg: '#F4A261', label: 'DEMONTAŽA', color: '#0D1B2A' },
  kvar: { bg: '#E63946', label: 'KVAR' },
  ostalo: { bg: '#7B96B2', label: 'OSTALO', color: '#0D1B2A' },
  prijava: { bg: '#E63946', label: 'PRIJAVA' },
}

function NaloziTab({ prijave, aparati, radnici, onOdaberi, onRefresh }) {
  const [pokaziFormu, setPokaziFormu] = useState(false)
  const [tip, setTip] = useState(null)
  const [aparatId, setAparatId] = useState('')
  const [radnikId, setRadnikId] = useState('')
  const [napomena, setNapomena] = useState('')
  const [filterGrad, setFilterGrad] = useState('svi')
  const [filterDatum, setFilterDatum] = useState('danas')
  const [datum, setDatum] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [poruka, setPoruka] = useState(null)

  const danas = new Date().toISOString().split('T')[0]

  // Izvuci gradove iz adresa aparata
  const gradovi = ['svi', ...new Set(aparati.map(a => {
    const dijelovi = a.adresa?.split(',')
    return dijelovi?.[dijelovi.length - 1]?.trim() || ''
  }).filter(Boolean))]

  const aparatiFiltrirani = filterGrad === 'svi' ? aparati : aparati.filter(a => a.adresa?.endsWith(filterGrad))

 const [filterTip, setFilterTip] = useState('svi')

  const prijaveF = prijave.filter(p => {
    const d = new Date(p.created_at).toISOString().split('T')[0]
    if (filterDatum === 'danas' && d !== danas) return false
    if (filterDatum === 'datum' && d !== datum) return false
    if (filterDatum === 'danas' && p.status === 'riješena') return false
    if (filterTip !== 'svi' && (tipBoja[p.kategorija] ? p.kategorija : 'prijava') !== filterTip) return false
    return true
  })
  const dodajNalog = async () => {
    if (!tip || !aparatId) return
    setLoading(true)
    const aparat = aparati.find(a => a.id === aparatId)
    const id = 'PR-' + Date.now().toString().slice(-6)
    const { error } = await supabase.from('prijave').insert({
      id,
      aparat_id: aparatId,
      lokal: aparat?.lokal,
      adresa: aparat?.adresa,
      lat: aparat?.lat,
      lng: aparat?.lng,
      opis: napomena || tip,
      kategorija: tip,
      status: radnikId ? 'dodijeljena' : 'nova',
      radnik_id: radnikId || null,
      hitnost: 'srednja',
    })
    setLoading(false)
    if (error) { setPoruka({ tip: 'greska', tekst: error.message }); return }
    setPoruka({ tip: 'ok', tekst: 'Nalog kreiran!' })
    setPokaziFormu(false)
    setTip(null); setAparatId(''); setRadnikId(''); setNapomena('')
    onRefresh()
    setTimeout(() => setPoruka(null), 2000)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>Nalozi</h2>
        <button onClick={() => setPokaziFormu(!pokaziFormu)} style={{
          background: '#1B85B8', border: 'none', color: '#fff',
          padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600
        }}>+ Dodaj nalog</button>
      </div>

      {poruka && <div style={{ color: poruka.tip === 'ok' ? '#2A9D8F' : '#E63946', fontSize: 13, marginBottom: 12 }}>{poruka.tekst}</div>}

      {pokaziFormu && (
        <div style={{ background: '#1A2E45', border: '1px solid #1B85B8', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#7B96B2' }}>NOVI NALOG</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
             {Object.entries(tipBoja).filter(([key]) => key !== 'prijava').map(([key, val]) => (
              <button key={key} onClick={() => setTip(key)} style={{
                background: tip === key ? val.bg : '#0D1B2A',
                border: `2px solid ${val.bg}`,
                color: tip === key ? (val.color || '#fff') : val.bg,
                borderRadius: 8, padding: '10px', cursor: 'pointer', fontWeight: 700, fontSize: 13
              }}>{val.label}</button>
            ))}
          </div>

          <div style={{ marginBottom: 8 }}>
            <div style={{ color: '#7B96B2', fontSize: 11, marginBottom: 4 }}>FILTER PO GRADU</div>
            <select value={filterGrad} onChange={e => setFilterGrad(e.target.value)}
              style={{ width: '100%', background: '#0D1B2A', border: '1px solid #1E3A5A', color: '#E8F4FD', borderRadius: 8, padding: '8px 12px', marginBottom: 8 }}>
              {gradovi.map(g => <option key={g} value={g}>{g === 'svi' ? 'Svi gradovi' : g}</option>)}
            </select>
            <select value={aparatId} onChange={e => setAparatId(e.target.value)}
              style={{ width: '100%', background: '#0D1B2A', border: '1px solid #1E3A5A', color: '#E8F4FD', borderRadius: 8, padding: '8px 12px' }}>
              <option value=''>Odaberi aparat *</option>
              {aparatiFiltrirani.map(a => <option key={a.id} value={a.id}>{a.lokal} – {a.adresa}</option>)}
            </select>
          </div>

          <textarea value={napomena} onChange={e => setNapomena(e.target.value)} placeholder="Napomena (opcionalno)"
            style={{ width: '100%', background: '#0D1B2A', border: '1px solid #1E3A5A', color: '#E8F4FD', borderRadius: 8, padding: '8px 12px', marginBottom: 8, resize: 'none', minHeight: 70, boxSizing: 'border-box' }} />

          <select value={radnikId} onChange={e => setRadnikId(e.target.value)}
            style={{ width: '100%', background: '#0D1B2A', border: '1px solid #1E3A5A', color: '#E8F4FD', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
            <option value=''>Dodijeli radniku (opcionalno)</option>
            {radnici.filter(r => r.status !== 'deaktiviran').map(r => <option key={r.id} value={r.id}>{r.ime}</option>)}
          </select>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={dodajNalog} disabled={!tip || !aparatId || loading}
              style={{ flex: 1, background: '#1B85B8', border: 'none', color: '#fff', borderRadius: 8, padding: 10, cursor: 'pointer', fontWeight: 600, opacity: (!tip || !aparatId) ? 0.5 : 1 }}>
              {loading ? 'Čekaj...' : 'Kreiraj nalog'}
            </button>
            <button onClick={() => setPokaziFormu(false)} style={{ background: 'transparent', border: '1px solid #1E3A5A', color: '#7B96B2', borderRadius: 8, padding: '10px 16px', cursor: 'pointer' }}>
              Odustani
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <button onClick={() => setFilterDatum('danas')} style={{
          background: filterDatum === 'danas' ? '#1B85B8' : 'transparent',
          border: '1px solid #1B85B8', color: filterDatum === 'danas' ? '#fff' : '#1B85B8',
          padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600
        }}>Danas</button>
        <button onClick={() => setFilterDatum('sve')} style={{
          background: filterDatum === 'sve' ? '#1B85B8' : 'transparent',
          border: '1px solid #1E3A5A', color: filterDatum === 'sve' ? '#fff' : '#7B96B2',
          padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600
        }}>Sve</button>
        <input type="date" value={datum} onChange={e => { setDatum(e.target.value); setFilterDatum('datum') }}
          style={{ background: filterDatum === 'datum' ? '#1B85B8' : '#1A2E45', border: '1px solid #1E3A5A', color: '#E8F4FD', padding: '6px 10px', borderRadius: 8, fontSize: 12 }} />
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
 {['svi', 'prijava', 'montaza', 'demontaza', 'kvar', 'ostalo', 'rijesena'].map(t => (
    <button key={t} onClick={() => setFilterTip(t)} style={{
      background: filterTip === t ? (t === 'rijesena' ? '#2A9D8F' : '#1B85B8') : 'transparent',
      border: '1px solid #1E3A5A', color: filterTip === t ? '#fff' : '#7B96B2',
      padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600
    }}>{t === 'svi' ? 'Svi' : t === 'rijesena' ? 'RIJEŠENO' : tipBoja[t]?.label || t.toUpperCase()}</button>
  ))}
</div>

      {prijaveF.length === 0 && (
        <div style={{ color: '#7B96B2', textAlign: 'center', padding: 40 }}>Nema naloga.</div>
      )}

      {prijaveF.map(p => {
      const t = tipBoja[p.kategorija] || tipBoja.prijava
        return (
          <div key={p.id} onClick={() => onOdaberi(p)} style={{
            background: '#1A2E45',
            border: '1px solid #1E3A5A',
            borderRadius: 10, padding: 14, marginBottom: 10, cursor: 'pointer'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: '#1B85B8', fontWeight: 700, fontSize: 12 }}>{p.id}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <span style={{ background: t.bg, color: t.color || '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>{t.label}</span>
                <StatusBadge status={p.status} />
              </div>
            </div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{p.lokal}</div>
            <div style={{ color: '#7B96B2', fontSize: 12, marginBottom: 6 }}>{p.opis}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#7B96B2', fontSize: 11 }}>{p.adresa}</span>
              <span style={{ color: '#7B96B2', fontSize: 11 }}>{new Date(p.created_at).toLocaleString('bs-BA')}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DashboardTab({ prijave, onOdaberi }) {
  const [odabraniStatus, setOdabraniStatus] = useState(null)

  const danas = new Date().toDateString()
  const prijaveToday = prijave.filter(p => new Date(p.created_at).toDateString() === danas)

  const nova = prijaveToday.filter(p => p.status === 'nova').length
  const dodijeljena = prijaveToday.filter(p => p.status === 'dodijeljena').length
  const uToku = prijaveToday.filter(p => p.status === 'u_toku').length
  const rijesena = prijaveToday.filter(p => p.status === 'riješena').length

  const filtrirane = odabraniStatus ? prijave.filter(p => p.status === odabraniStatus) : []

  const exportExcel = () => {
    const XLSX = require('xlsx')
    const podaci = filtrirane.map(p => ({
      'ID': p.id, 'Lokal': p.lokal, 'Opis': p.opis,
      'Status': p.status, 'Datum': new Date(p.created_at).toLocaleDateString('bs-BA')
    }))
    const ws = XLSX.utils.json_to_sheet(podaci)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Nalozi')
    XLSX.writeFile(wb, `nalozi-${odabraniStatus}-${new Date().toLocaleDateString('bs-BA')}.xlsx`)
  }

  const statusi = [
    { key: 'nova', label: 'Nove', val: nova, color: '#1B85B8' },
    { key: 'dodijeljena', label: 'Dodijeljene', val: dodijeljena, color: '#F4A261' },
    { key: 'u_toku', label: 'U toku', val: uToku, color: '#9B59B6' },
    { key: 'riješena', label: 'Riješene', val: rijesena, color: '#2A9D8F' },
  ]

  return (
    <div>
      <h2 style={s.naslov}>Pregled danas</h2>
      <div style={s.grid4}>
        {statusi.map(k => (
          <div key={k.key} onClick={() => setOdabraniStatus(odabraniStatus === k.key ? null : k.key)}
            style={{ ...s.statCard, cursor: 'pointer', border: odabraniStatus === k.key ? `1px solid ${k.color}` : '1px solid #1E3A5A' }}>
            <div style={{ color: '#7B96B2', fontSize: 11, marginBottom: 6 }}>{k.label.toUpperCase()}</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: k.color }}>{k.val}</div>
          </div>
        ))}
      </div>
      {odabraniStatus && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ color: '#7B96B2', fontSize: 13, margin: 0 }}>
              {statusi.find(s => s.key === odabraniStatus)?.label.toUpperCase()} – SVE ({filtrirane.length})
            </h3>
            {filtrirane.length > 5 && (
              <button onClick={exportExcel} style={{ background: '#2A9D8F', border: 'none', color: '#fff', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                📥 Export Excel
              </button>
            )}
          </div>
          {filtrirane.map(p => (
            <div key={p.id} onClick={() => onOdaberi(p)} style={{ ...s.card, cursor: 'pointer', marginBottom: 8 }}>
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
    </div>
  )
}

function RadniciTab({ radnici, prijave, onRefresh }) {
  const [forma, setForma] = useState(null)
  const [ime, setIme] = useState('')
  const [telefon, setTelefon] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [poruka, setPoruka] = useState(null)
  const [odabraniRadnik, setOdabraniRadnik] = useState(null)

  const otvoriDodaj = () => { setForma('dodaj'); setIme(''); setTelefon(''); setEmail(''); setPoruka(null) }
  const otvoriEdit = (r) => { setForma(r.id); setIme(r.ime); setTelefon(r.telefon || ''); setEmail(r.email || ''); setPoruka(null) }
  const zatvori = () => { setForma(null); setPoruka(null) }

  const dodajRadnika = async () => {
    setLoading(true)
    const res = await fetch('/api/radnici', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ime, telefon, email }) })
    const data = await res.json()
    setLoading(false)
    if (data.error) { setPoruka({ tip: 'greska', tekst: data.error }); return }
    setPoruka({ tip: 'ok', tekst: 'Radnik dodan! Poslan email za postavljanje lozinke.' })
    onRefresh()
    setTimeout(zatvori, 2000)
  }

  const editujRadnika = async () => {
    setLoading(true)
    const res = await fetch('/api/radnici', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: forma, ime, telefon }) })
    const data = await res.json()
    setLoading(false)
    if (data.error) { setPoruka({ tip: 'greska', tekst: data.error }); return }
    setPoruka({ tip: 'ok', tekst: 'Sačuvano.' })
    onRefresh()
    setTimeout(zatvori, 1500)
  }

  const toggleAktivan = async (r) => {
    const aktivan = r.status === 'deaktiviran' ? true : false
    await fetch('/api/radnici', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: r.id, ime: r.ime, telefon: r.telefon, aktivan }) })
    const { createClient } = await import('../../lib/supabase-browser')
    const sb = createClient()
    await sb.from('radnici').update({ status: aktivan ? 'slobodan' : 'deaktiviran' }).eq('id', r.id)
    onRefresh()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>Radnici</h2>
        <button onClick={otvoriDodaj} style={{ background: '#1B85B8', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>+ Dodaj radnika</button>
      </div>
      {forma && (
        <div style={{ background: '#1A2E45', border: '1px solid #1B85B8', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#7B96B2' }}>{forma === 'dodaj' ? 'NOVI RADNIK' : 'UREDI RADNIKA'}</h3>
          <input value={ime} onChange={e => setIme(e.target.value)} placeholder="Ime i prezime" style={{ width: '100%', background: '#0D1B2A', border: '1px solid #1E3A5A', color: '#E8F4FD', borderRadius: 8, padding: '8px 12px', marginBottom: 8, boxSizing: 'border-box' }} />
          <input value={telefon} onChange={e => setTelefon(e.target.value)} placeholder="Telefon" style={{ width: '100%', background: '#0D1B2A', border: '1px solid #1E3A5A', color: '#E8F4FD', borderRadius: 8, padding: '8px 12px', marginBottom: 8, boxSizing: 'border-box' }} />
          {forma === 'dodaj' && <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" style={{ width: '100%', background: '#0D1B2A', border: '1px solid #1E3A5A', color: '#E8F4FD', borderRadius: 8, padding: '8px 12px', marginBottom: 8, boxSizing: 'border-box' }} />}
          {poruka && <div style={{ color: poruka.tip === 'ok' ? '#2A9D8F' : '#E63946', fontSize: 13, marginBottom: 8 }}>{poruka.tekst}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={forma === 'dodaj' ? dodajRadnika : editujRadnika} disabled={loading} style={{ flex: 1, background: '#1B85B8', border: 'none', color: '#fff', borderRadius: 8, padding: 10, cursor: 'pointer', fontWeight: 600 }}>
              {loading ? 'Čekaj...' : forma === 'dodaj' ? 'Dodaj i pošalji pozivnicu' : 'Sačuvaj'}
            </button>
            <button onClick={zatvori} style={{ background: 'transparent', border: '1px solid #1E3A5A', color: '#7B96B2', borderRadius: 8, padding: '10px 16px', cursor: 'pointer' }}>Odustani</button>
          </div>
        </div>
      )}
      {radnici.length === 0 && <div style={{ color: '#7B96B2', textAlign: 'center', padding: 40 }}>Nema radnika.</div>}
      {radnici.map(r => (
        <div key={r.id} style={{ ...s.card, marginBottom: 10, opacity: r.status === 'deaktiviran' ? 0.5 : 1, cursor: 'pointer' }}
          onClick={(e) => { if (e.target.closest('button')) return; setOdabraniRadnik(odabraniRadnik === r.id ? null : r.id) }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700 }}>{r.ime}</div>
              <div style={{ color: '#7B96B2', fontSize: 12 }}>{r.telefon} {r.email && `· ${r.email}`}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: r.status === 'na_terenu' ? '#F4A261' : r.status === 'slobodan' ? '#2A9D8F' : '#555', color: r.status === 'na_terenu' ? '#0D1B2A' : '#fff', fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 700 }}>
                {r.status === 'na_terenu' ? 'NA TERENU' : r.status === 'slobodan' ? 'SLOBODAN' : 'DEAKTIVIRAN'}
              </span>
              <button onClick={() => otvoriEdit(r)} style={{ background: 'transparent', border: '1px solid #1E3A5A', color: '#7B96B2', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>Uredi</button>
              <button onClick={() => toggleAktivan(r)} style={{ background: 'transparent', border: `1px solid ${r.status === 'deaktiviran' ? '#2A9D8F' : '#E63946'}`, color: r.status === 'deaktiviran' ? '#2A9D8F' : '#E63946', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>
                {r.status === 'deaktiviran' ? 'Aktiviraj' : 'Deaktiviraj'}
              </button>
            </div>
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: '#7B96B2' }}>
            Aktivnih naloga: <span style={{ color: '#E8F4FD', fontWeight: 700 }}>{prijave.filter(p => p.radnik_id === r.id && p.status !== 'riješena').length}</span>
          </div>
          {odabraniRadnik === r.id && (
            <div style={{ marginTop: 12, borderTop: '1px solid #1E3A5A', paddingTop: 12 }}>
              <div style={{ color: '#7B96B2', fontSize: 11, marginBottom: 8 }}>ISTORIJA NALOGA</div>
              {prijave.filter(p => p.radnik_id === r.id).length === 0 && <div style={{ color: '#7B96B2', fontSize: 12 }}>Nema naloga.</div>}
              {prijave.filter(p => p.radnik_id === r.id).map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #0D1B2A' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{p.lokal}</div>
                    <div style={{ color: '#7B96B2', fontSize: 11 }}>{new Date(p.created_at).toLocaleDateString('bs-BA')}</div>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
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
  nav: { background: '#132338', borderBottom: '1px solid #1E3A5A', padding: '6px 8px', display: 'flex', gap: 2, overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
  sadrzaj: { flex: 1, overflow: 'auto', padding: 16, maxWidth: 900, width: '100%', margin: '0 auto' },
  naslov: { marginBottom: 16, fontSize: 18 },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 },
  statCard: { background: '#1A2E45', border: '1px solid #1E3A5A', borderRadius: 12, padding: 16 },
  card: { background: '#1A2E45', border: '1px solid #1E3A5A', borderRadius: 10, padding: 14 },
}