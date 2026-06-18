'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '../../lib/supabase-browser'
const supabase = createClient()
import { StatusBadge } from './Dashboard'

export default function PrijavaDetalj({ prijava, radnici, onNazad, onAzuriraj }) {
  const [odabraniRadnik, setOdabraniRadnik] = useState(prijava.radnik_id || '')
  const [hitnost, setHitnost] = useState(prijava.hitnost || 'srednja')
  const [saljem, setSaljem] = useState(false)
  const [poruka, setPoruka] = useState('')
  const [montazaZahtjev, setMontazaZahtjev] = useState(null)
  const [editLokal, setEditLokal] = useState('')
  const [editAdresa, setEditAdresa] = useState('')
  const mapaRef = useRef(null)
  const mapInstanceRef = useRef(null)

  useEffect(() => {
    if (prijava.kategorija === 'montaza') {
      supabase.from('montaza_zahtjevi')
        .select('*')
        .eq('nalog_id', prijava.id)
        .eq('status', 'pending')
        .maybeSingle()
        .then(({ data }) => {
          setMontazaZahtjev(data)
          if (data) { setEditLokal(data.novi_lokal || ''); setEditAdresa(data.nova_adresa || '') }
        })
    }
  }, [prijava.id, prijava.kategorija])

  const dodijeliRadnika = async () => {
    if (!odabraniRadnik) return
    setSaljem(true)
    const jeReaasignacija = prijava.radnik_id && prijava.radnik_id !== odabraniRadnik
    const noviRadnik = radnici.find(r => r.id === odabraniRadnik)

    const updateData = {
      radnik_id: odabraniRadnik,
      hitnost,
      status: 'dodijeljena',
      updated_at: new Date().toISOString(),
    }
    if (jeReaasignacija) {
      updateData.preneseno_sa_radnik_id = prijava.radnik_id
      updateData.napomena_prenosa = `Zadatak prenesen na ${noviRadnik?.ime || 'drugog radnika'}`
    }

    const { error } = await supabase.from('prijave').update(updateData).eq('id', prijava.id)
    if (!error) {
      fetch('/api/push-radnik', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          radnik_id: odabraniRadnik,
          title: jeReaasignacija ? 'Zadatak prenesen tebi' : 'Novi zadatak',
          body: `${prijava.kategorija?.toUpperCase()} — ${prijava.lokal || prijava.adresa}`,
        }),
      }).catch(() => {})
      setPoruka('✓ Prijava dodijeljena!')
      onAzuriraj()
      setTimeout(() => { setPoruka(''); onNazad() }, 1500)
    }
    setSaljem(false)
  }

  useEffect(() => {
    if (!montazaZahtjev?.novi_lat || !mapaRef.current) return
    if (mapInstanceRef.current) return

    import('leaflet').then(L => {
      const lat = Number(montazaZahtjev.novi_lat)
      const lng = Number(montazaZahtjev.novi_lng)

      delete L.default.Icon.Default.prototype._getIconUrl
      L.default.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      const map = L.default.map(mapaRef.current, { zoomControl: true, attributionControl: false })
        .setView([lat, lng], 16)
      mapInstanceRef.current = map

      L.default.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map)

      const ikona = L.default.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:#2A9D8F;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.5)"></div>`,
        className: '', iconSize: [14, 14], iconAnchor: [7, 7],
      })
      L.default.marker([lat, lng], { icon: ikona }).addTo(map)

      // Krug 200m
      L.default.circle([lat, lng], { radius: 200, color: '#2A9D8F', fillColor: '#2A9D8F', fillOpacity: 0.08, weight: 1.5 }).addTo(map)
    })

    return () => {
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null }
    }
  }, [montazaZahtjev])

  const potvrdiMontazu = async () => {
    if (!montazaZahtjev) return
    setSaljem(true)
    if (montazaZahtjev.oprema_tip === 'mlin') {
      // Ažuriraj mlin
      await supabase.from('mlinovi').update({
        lokal: editLokal || montazaZahtjev.novi_lokal,
        ...(prijava.slika_url ? { slika_url: prijava.slika_url } : {}),
      }).eq('id', montazaZahtjev.mlin_id)
    } else {
      // Ažuriraj aparat
      await supabase.from('aparati').update({
        lokal: editLokal || montazaZahtjev.novi_lokal,
        adresa: editAdresa || montazaZahtjev.nova_adresa,
        lat: montazaZahtjev.novi_lat,
        lng: montazaZahtjev.novi_lng,
        montaza_datum: new Date().toISOString(),
        ...(prijava.slika_url ? { slika_url: prijava.slika_url } : {}),
      }).eq('id', montazaZahtjev.aparat_id)
    }
    // Zatvori zahtjev
    await supabase.from('montaza_zahtjevi').update({ status: 'odobren' }).eq('id', montazaZahtjev.id)
    // Zatvori nalog
    await supabase.from('prijave').update({
      status: 'riješena',
      ishod: 'riješena',
      rijeseno_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', prijava.id)
    setSaljem(false)
    onAzuriraj()
    onNazad()
  }

  const odbijMontazu = async () => {
    if (!montazaZahtjev) return
    await supabase.from('montaza_zahtjevi').update({ status: 'odbijen' }).eq('id', montazaZahtjev.id)
    setMontazaZahtjev(null)
  }

  const odobriProcjenu = async () => {
    await supabase.from('prijave').update({ procjena_status: 'odobrena' }).eq('id', prijava.id)
    if (prijava.radnik_id) {
      fetch('/api/push-radnik', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ radnik_id: prijava.radnik_id, title: '✅ Procjena odobrena', body: `${prijava.id} — možeš započeti posao` }) }).catch(() => {})
    }
    onAzuriraj(); onNazad()
  }

  const odbijProcjenu = async () => {
    const radnikId = prijava.radnik_id
    await supabase.from('prijave').update({ status: 'nova', radnik_id: null, procjena: null, procjena_status: null }).eq('id', prijava.id)
    if (radnikId) {
      fetch('/api/push-radnik', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ radnik_id: radnikId, title: '❌ Procjena odbijena', body: `${prijava.id} — nalog je vraćen` }) }).catch(() => {})
    }
    onAzuriraj(); onNazad()
  }

  const stariPodaci = montazaZahtjev?.stari_podaci
    ? (typeof montazaZahtjev.stari_podaci === 'string'
        ? JSON.parse(montazaZahtjev.stari_podaci)
        : montazaZahtjev.stari_podaci)
    : null

  return (
    <div>
      <button onClick={onNazad} style={s.nazadBtn}>← Nazad na prijave</button>

      {/* Info prijave */}
      <div style={{ ...s.card, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ color: '#1B85B8', fontWeight: 800, fontSize: 14 }}>{prijava.id}</span>
          <StatusBadge status={prijava.status} />
        </div>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{prijava.lokal}</div>
        <div style={{ color: '#7B96B2', fontSize: 12, marginBottom: 12 }}>📍 {prijava.adresa}</div>
        <div style={{ background: '#0D1B2A', borderRadius: 8, padding: 12, marginBottom: 10 }}>
          <div style={{ color: '#7B96B2', fontSize: 11, marginBottom: 4 }}>OPIS</div>
          <div style={{ fontSize: 14 }}>{prijava.opis}</div>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#7B96B2', flexWrap: 'wrap' }}>
          <span>📂 {prijava.vrsta || prijava.kategorija}</span>
          <span>🕐 Prijava: {new Date(prijava.created_at).toLocaleString('bs-BA')}</span>
          {(prijava.status === 'riješena' || prijava.status === 'zatvorena') && (prijava.rijeseno_at || prijava.updated_at) && (
            <span style={{ color: '#2A9D8F' }}>✓ Riješeno: {new Date(prijava.rijeseno_at || prijava.updated_at).toLocaleString('bs-BA')}</span>
          )}
        </div>
        {prijava.kontakt && <div style={{ marginTop: 8, fontSize: 12, color: '#7B96B2' }}>📞 {prijava.kontakt}</div>}
        {prijava.slika_url && (
          <div style={{ marginTop: 12 }}>
            <div style={{ color: '#7B96B2', fontSize: 11, marginBottom: 6 }}>SLIKA</div>
            <img src={prijava.slika_url} alt="slika prijave"
              style={{ width: '100%', borderRadius: 8, maxHeight: 300, objectFit: 'cover', cursor: 'pointer' }}
              onClick={() => window.open(prijava.slika_url, '_blank')} />
          </div>
        )}
      </div>

      {/* Procjena saradnika */}
      {prijava.procjena_status === 'poslata' && (
        <div style={{ ...s.card, marginBottom: 12, border: '1px solid #F4A261' }}>
          <div style={{ color: '#F4A261', fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>PROCJENA SARADNIKA — ČEKA ODOBRENJE</div>
          <div style={{ background: '#0D1B2A', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 14 }}>{prijava.procjena}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={odobriProcjenu} style={{ flex: 1, background: '#2A9D8F', border: 'none', color: '#fff', borderRadius: 8, padding: 10, cursor: 'pointer', fontWeight: 600 }}>✓ Odobri</button>
            <button onClick={odbijProcjenu} style={{ background: 'transparent', border: '1px solid #E63946', color: '#E63946', borderRadius: 8, padding: '10px 16px', cursor: 'pointer' }}>Odbij (vrati u nove)</button>
          </div>
        </div>
      )}
      {prijava.procjena_status === 'odobrena' && prijava.procjena && (
        <div style={{ ...s.card, marginBottom: 12 }}>
          <div style={{ color: '#2A9D8F', fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>PROCJENA SARADNIKA (odobrena)</div>
          <div style={{ fontSize: 13, color: '#E8F4FD' }}>{prijava.procjena}</div>
        </div>
      )}

      {/* Montaža zahtjev */}
      {prijava.kategorija === 'montaza' && montazaZahtjev && (
        <div style={{ ...s.card, marginBottom: 12, border: '1px solid #1B85B8' }}>
          <div style={{ color: '#1B85B8', fontWeight: 700, fontSize: 13, marginBottom: 14 }}>
            🔧 ZAHTJEV ZA MONTAŽU — čeka potvrdu
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <div style={{ background: '#0D1B2A', borderRadius: 8, padding: 12 }}>
              <div style={{ color: '#7B96B2', fontSize: 10, fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>STARI PODACI</div>
              {stariPodaci ? (
                <>
                  <div style={{ fontSize: 12, marginBottom: 4 }}><span style={{ color: '#7B96B2' }}>Lokal: </span>{stariPodaci.lokal || '—'}</div>
                  <div style={{ fontSize: 12 }}><span style={{ color: '#7B96B2' }}>Adresa: </span>{stariPodaci.adresa || '—'}</div>
                </>
              ) : <div style={{ color: '#7B96B2', fontSize: 12 }}>Nema podataka</div>}
            </div>
            <div style={{ background: '#0D2A1A', border: '1px solid #2A9D8F', borderRadius: 8, padding: 12 }}>
              <div style={{ color: '#2A9D8F', fontSize: 10, fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>NOVI PODACI</div>
              <div style={{ fontSize: 11, color: '#7B96B2', marginBottom: 3 }}>LOKAL</div>
              <input value={editLokal} onChange={e => setEditLokal(e.target.value)}
                style={{ width: '100%', background: '#0D1B2A', border: '1px solid #2A9D8F', color: '#E8F4FD', borderRadius: 6, padding: '6px 8px', fontSize: 12, marginBottom: 8, boxSizing: 'border-box' }} />
              <div style={{ fontSize: 11, color: '#7B96B2', marginBottom: 3 }}>ADRESA</div>
              <input value={editAdresa} onChange={e => setEditAdresa(e.target.value)}
                style={{ width: '100%', background: '#0D1B2A', border: '1px solid #2A9D8F', color: '#E8F4FD', borderRadius: 6, padding: '6px 8px', fontSize: 12, marginBottom: 8, boxSizing: 'border-box' }} />
              <div style={{ fontSize: 11, color: '#7B96B2', marginBottom: 4 }}>
                GPS: {Number(montazaZahtjev.novi_lat).toFixed(5)}, {Number(montazaZahtjev.novi_lng).toFixed(5)}
              </div>
              <div ref={mapaRef} style={{ height: 200, borderRadius: 8, overflow: 'hidden', border: '1px solid #2A9D8F' }} />
              {montazaZahtjev.slika_url && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ color: '#2A9D8F', fontSize: 10, fontWeight: 700, marginBottom: 4, letterSpacing: 1 }}>SLIKA APARATA</div>
                  <img src={montazaZahtjev.slika_url} alt="slika aparata"
                    onClick={() => window.open(montazaZahtjev.slika_url, '_blank')}
                    style={{ width: '100%', borderRadius: 8, maxHeight: 200, objectFit: 'cover', cursor: 'pointer' }} />
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={potvrdiMontazu} disabled={saljem} style={{
              flex: 1, background: '#2A9D8F', border: 'none', color: '#fff',
              borderRadius: 8, padding: 12, fontWeight: 700, cursor: 'pointer', fontSize: 14
            }}>
              ✓ Potvrdi i ažuriraj aparat
            </button>
            <button onClick={odbijMontazu} style={{
              background: 'transparent', border: '1px solid #E63946',
              color: '#E63946', borderRadius: 8, padding: '12px 16px', cursor: 'pointer', fontWeight: 600
            }}>
              Odbij
            </button>
          </div>
        </div>
      )}

      {/* Dodjela – samo ako nije riješena/zatvorena i nije montaža sa pending zahtjevom */}
      {prijava.status !== 'riješena' && prijava.status !== 'zatvorena' && !(prijava.kategorija === 'montaza' && montazaZahtjev) && (
        <div style={s.card}>
          <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 15 }}>Dodjeli prijavu</div>
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
          <div style={{ marginBottom: 16 }}>
            <label style={s.label}>ODABERI RADNIKA</label>
            {radnici.length === 0 && <div style={{ color: '#7B96B2', fontSize: 13 }}>Nema radnika.</div>}
            {radnici.filter(r => r.uloga !== 'magacioner').map(r => (
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
          <button onClick={dodijeliRadnika} disabled={!odabraniRadnik || saljem}
            style={{
              width: '100%', background: odabraniRadnik ? '#1B85B8' : '#1E3A5A',
              border: 'none', color: '#fff', borderRadius: 10, padding: 14,
              fontSize: 14, fontWeight: 700, cursor: odabraniRadnik ? 'pointer' : 'not-allowed'
            }}>
            {saljem ? 'Šaljem...' : 'Pošalji radniku'}
          </button>
        </div>
      )}

      {/* Napomena radnika */}
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
