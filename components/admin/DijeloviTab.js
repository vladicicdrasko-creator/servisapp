'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase-browser'
import QRCode from 'qrcode'

const supabase = createClient()

export default function DijeloviTab() {
  const [dijelovi, setDijelovi] = useState([])
  const [loading, setLoading] = useState(true)
  const [forma, setForma] = useState(false)
  const [poruka, setPoruka] = useState(null)
  const [odabrani, setOdabrani] = useState(null)
  const [qrUrl, setQrUrl] = useState(null)
  const [editDio, setEditDio] = useState(null)
  const [noviDio, setNoviDio] = useState({ naziv: '', kolicina: '', jedinica: 'kom' })

  useEffect(() => { ucitaj() }, [])

  const ucitaj = async () => {
    const { data } = await supabase.from('dijelovi').select('*').eq('status', 'aktivan').order('naziv')
    setDijelovi(data || [])
    setLoading(false)
  }

  const odaberi = async (d) => {
    if (odabrani?.id === d.id) { setOdabrani(null); setQrUrl(null); return }
    setOdabrani(d)
    const qr = await QRCode.toDataURL(d.id, { width: 200, margin: 1 })
    setQrUrl(qr)
  }

  const preuzmiQR = () => {
    const link = document.createElement('a')
    link.href = qrUrl
    link.download = `QR-${odabrani.id}.png`
    link.click()
  }

  const dodaj = async () => {
    setLoading(true)
    const id = 'DIO-' + Date.now().toString().slice(-6)
    const { error } = await supabase.from('dijelovi').insert({
      id, naziv: noviDio.naziv,
      kolicina: parseInt(noviDio.kolicina) || 0,
      jedinica: noviDio.jedinica || 'kom',
      status: 'aktivan',
    })
    setLoading(false)
    if (error) { setPoruka({ tip: 'greska', tekst: error.message }); return }
    setPoruka({ tip: 'ok', tekst: 'Dio dodan!' })
    setForma(false)
    setNoviDio({ naziv: '', kolicina: '', jedinica: 'kom' })
    ucitaj()
    setTimeout(() => setPoruka(null), 2000)
  }

  const snimiEdit = async () => {
    await supabase.from('dijelovi').update({
      naziv: editDio.naziv,
      kolicina: parseInt(editDio.kolicina) || 0,
      jedinica: editDio.jedinica || 'kom',
    }).eq('id', editDio.id)
    setEditDio(null)
    ucitaj()
  }

  const obrisi = async (e, d) => {
    e.stopPropagation()
    if (!window.confirm(`Obriši dio "${d.naziv}"?`)) return
    await supabase.from('dijelovi').update({ status: 'neaktivan' }).eq('id', d.id)
    ucitaj()
  }

  const inp = { width: '100%', background: '#0D1B2A', border: '1px solid #1E3A5A', color: '#E8F4FD', borderRadius: 8, padding: '8px 12px', marginBottom: 8, boxSizing: 'border-box' }

  if (loading) return <div style={{ color: '#7B96B2', padding: 40, textAlign: 'center' }}>Učitavam...</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>Dijelovi ({dijelovi.length})</h2>
        <button onClick={() => setForma(!forma)} style={{ background: '#1B85B8', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
          + Dodaj dio
        </button>
      </div>

      {poruka && <div style={{ color: poruka.tip === 'ok' ? '#2A9D8F' : '#E63946', fontSize: 13, marginBottom: 12 }}>{poruka.tekst}</div>}

      {forma && (
        <div style={{ background: '#1A2E45', border: '1px solid #1B85B8', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#7B96B2' }}>NOVI DIO</h3>
          <input value={noviDio.naziv} onChange={e => setNoviDio({ ...noviDio, naziv: e.target.value })}
            placeholder="Naziv dijela * (npr. Elektroventil Parker 2/2)" style={inp} />
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="number" value={noviDio.kolicina} onChange={e => setNoviDio({ ...noviDio, kolicina: e.target.value })}
              placeholder="Količina na stanju" style={{ ...inp, flex: 1 }} />
            <input value={noviDio.jedinica} onChange={e => setNoviDio({ ...noviDio, jedinica: e.target.value })}
              placeholder="Jedinica" style={{ ...inp, width: 90 }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={dodaj} disabled={!noviDio.naziv}
              style={{ flex: 1, background: '#1B85B8', border: 'none', color: '#fff', borderRadius: 8, padding: 10, cursor: 'pointer', fontWeight: 600, opacity: !noviDio.naziv ? 0.5 : 1 }}>
              Dodaj
            </button>
            <button onClick={() => setForma(false)} style={{ background: 'transparent', border: '1px solid #1E3A5A', color: '#7B96B2', borderRadius: 8, padding: '10px 16px', cursor: 'pointer' }}>
              Odustani
            </button>
          </div>
        </div>
      )}

      {dijelovi.length === 0 && <div style={{ color: '#7B96B2', textAlign: 'center', padding: 40 }}>Nema dijelova.</div>}

      {dijelovi.map(d => (
        <div key={d.id} style={{ background: '#1A2E45', border: `1px solid ${odabrani?.id === d.id ? '#1B85B8' : '#1E3A5A'}`, borderRadius: 10, padding: 14, marginBottom: 10, cursor: 'pointer' }}
          onClick={(e) => { if (e.target.closest('button')) return; odaberi(d) }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{d.naziv}</div>
              <div style={{ color: d.kolicina <= 0 ? '#E63946' : d.kolicina <= 3 ? '#F4A261' : '#2A9D8F', fontSize: 12, fontWeight: 600 }}>
                Stanje: {d.kolicina} {d.jedinica}
              </div>
              <div style={{ color: '#1B85B8', fontSize: 11, marginTop: 2 }}>{d.id}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={(e) => { e.stopPropagation(); setEditDio({ ...d }) }} style={{ background: 'transparent', border: '1px solid #1B85B8', color: '#1B85B8', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>✏️ Edit</button>
              <button onClick={(e) => obrisi(e, d)} style={{ background: 'transparent', border: '1px solid #E63946', color: '#E63946', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>Briši</button>
            </div>
          </div>

          {odabrani?.id === d.id && qrUrl && (
            <div style={{ marginTop: 12, borderTop: '1px solid #1E3A5A', paddingTop: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
              <img src={qrUrl} alt="QR" style={{ width: 100, height: 100, borderRadius: 8 }} />
              <div>
                <div style={{ color: '#7B96B2', fontSize: 11, marginBottom: 4 }}>QR KOD (nalijepi na kesu)</div>
                <div style={{ color: '#E8F4FD', fontSize: 12, marginBottom: 8 }}>{d.id}</div>
                <button onClick={preuzmiQR} style={{ background: '#1B85B8', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  📥 Preuzmi QR
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {editDio && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#1A2E45', border: '1px solid #1B85B8', borderRadius: 12, padding: 20, width: '100%', maxWidth: 440 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 14, color: '#7B96B2' }}>UREDI DIO — {editDio.id}</h3>
            <input value={editDio.naziv} onChange={e => setEditDio({ ...editDio, naziv: e.target.value })} placeholder="Naziv *" style={inp} />
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="number" value={editDio.kolicina} onChange={e => setEditDio({ ...editDio, kolicina: e.target.value })} placeholder="Količina" style={{ ...inp, flex: 1 }} />
              <input value={editDio.jedinica || ''} onChange={e => setEditDio({ ...editDio, jedinica: e.target.value })} placeholder="Jedinica" style={{ ...inp, width: 90 }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={snimiEdit} style={{ flex: 1, background: '#1B85B8', border: 'none', color: '#fff', borderRadius: 8, padding: 10, cursor: 'pointer', fontWeight: 600 }}>Sačuvaj</button>
              <button onClick={() => setEditDio(null)} style={{ background: 'transparent', border: '1px solid #1E3A5A', color: '#7B96B2', borderRadius: 8, padding: '10px 16px', cursor: 'pointer' }}>Odustani</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
