'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { StatusBadge } from './Dashboard'

export default function PrijavaDetalj({ prijava, radnici, onNazad, onAzuriraj }) {
  const [odabraniRadnik, setOdabraniRadnik] = useState(prijava.radnik_id || '')
  const [hitnost, setHitnost] = useState(prijava.hitnost || 'srednja')
  const [saljem, setSaljem] = useState(false)
  const [poruka, setPoruka] = useState('')
  const [montazaZahtjev, setMontazaZahtjev] = useState(null)

  useEffect(() => {
    if (prijava.kategorija === 'montaza') {
      supabase.from('montaza_zahtjevi')
        .select('*')
        .eq('nalog_id', prijava.id)
        .eq('status', 'pending')
        .maybeSingle()
        .then(({ data }) => setMontazaZahtjev(data))
    }
  }, [prijava.id, prijava.kategorija])

  const dodijeliRadnika = async () => {
    if (!odabraniRadnik) return
    setSaljem(true)
    const { error } = await supabase.from('prijave').update({
      radnik_id: odabraniRadnik,
      hitnost,
      status: 'dodijeljena',
      updated_at: new Date().toISOString()
    }).eq('id', prijava.id)
    if (!error) {
      setPoruka('✓ Prijava dodijeljena!')
      onAzuriraj()
      setTimeout(() => { setPoruka(''); onNazad() }, 1500)
    }
    setSaljem(false)
  }

  const potvrdiMontazu = async () => {
    if (!montazaZahtjev) return
    setSaljem(true)
    // Ažuriraj aparat
    await supabase.from('aparati').update({
      lokal: montazaZahtjev.novi_lokal,
      adresa: montazaZahtjev.nova_adresa,
      lat: montazaZahtjev.novi_lat,
      lng: montazaZahtjev.novi_lng,
      montaza_datum: new Date().toISOString(),
    }).eq('id', montazaZahtjev.aparat_id)
    // Zatvori zahtjev
    await supabase.from('montaza_zahtjevi').update({ status: 'odobren' }).eq('id', montazaZahtjev.id)
    // Zatvori nalog
    await supabase.from('prijave').update({
      status: 'riješena',
      ishod: 'riješena',
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
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#7B96B2' }}>
          <span>📂 {prijava.kategorija}</span>
          <span>🕐 {new Date(prijava.created_at).toLocaleString('bs-BA')}</span>
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
              <div style={{ fontSize: 12, marginBottom: 4 }}><span style={{ color: '#7B96B2' }}>Lokal: </span>{montazaZahtjev.novi_lokal}</div>
              <div style={{ fontSize: 12, marginBottom: 4 }}><span style={{ color: '#7B96B2' }}>Adresa: </span>{montazaZahtjev.nova_adresa}</div>
              <div style={{ fontSize: 11, color: '#7B96B2' }}>
                GPS: {Number(montazaZahtjev.novi_lat).toFixed(5)}, {Number(montazaZahtjev.novi_lng).toFixed(5)}
              </div>
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
