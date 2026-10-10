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

  useEffect(() => {
    ucitaj()
    const kanal = supabase
      .channel('dijelovi-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dijelovi' }, () => ucitaj())
      .subscribe()
    const interval = setInterval(ucitaj, 15000)
    return () => { supabase.removeChannel(kanal); clearInterval(interval) }
  }, [])

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
    const ime = [odabrani.naziv, odabrani.id].filter(Boolean).join(' - ').replace(/[\\/:*?"<>|]/g, ' ')
    const link = document.createElement('a')
    link.href = qrUrl
    link.download = `${ime}.png`
    link.click()
  }

  const dodaj = async () => {
    setLoading(true)
    const id = 'DIO-' + Date.now().toString().slice(-6)
    const { error } = await supabase.from('dijelovi').insert({
      id, naziv: noviDio.naziv,
      kolicina: Math.max(0, parseInt(noviDio.kolicina) || 0),
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
      kolicina: Math.max(0, parseInt(editDio.kolicina) || 0),
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

  const exportExcel = async () => {
    const { utils, writeFile } = await import('xlsx')
    const podaci = dijelovi.map(d => ({
      'ID': d.id, 'Naziv': d.naziv || '', 'Količina': d.kolicina ?? 0, 'Jedinica': d.jedinica || '',
    }))
    const ws = utils.json_to_sheet(podaci)
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'Dijelovi')
    writeFile(wb, `dijelovi_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const inp = { width: '100%', background: 'var(--ct-espresso)', border: '1px solid var(--ct-rub)', color: 'var(--ct-krem-negativ)', borderRadius: 8, padding: '8px 12px', marginBottom: 8, boxSizing: 'border-box' }

  if (loading) return <div style={{ color: 'var(--ct-siva-kafa-negativ)', padding: 40, textAlign: 'center' }}>Učitavam...</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>Dijelovi ({dijelovi.length})</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportExcel} style={{ background: 'transparent', border: '1px solid var(--ct-uspjeh)', color: 'var(--ct-uspjeh)', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>↓ Export</button>
          <button onClick={() => setForma(!forma)} style={{ background: 'var(--ct-bakar)', border: 'none', color: 'var(--ct-krem)', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            + Dodaj dio
          </button>
        </div>
      </div>

      {poruka && <div style={{ color: poruka.tip === 'ok' ? 'var(--ct-uspjeh)' : 'var(--ct-greska)', fontSize: 13, marginBottom: 12 }}>{poruka.tekst}</div>}

      {forma && (
        <div style={{ background: 'var(--ct-tamno-braon)', border: '1px solid var(--ct-svijetli-bakar)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--ct-siva-kafa-negativ)' }}>NOVI DIO</h3>
          <input value={noviDio.naziv} onChange={e => setNoviDio({ ...noviDio, naziv: e.target.value })}
            placeholder="Naziv dijela * (npr. Elektroventil Parker 2/2)" maxLength={150} style={inp} />
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="number" value={noviDio.kolicina} onChange={e => setNoviDio({ ...noviDio, kolicina: e.target.value })}
              placeholder="Količina na stanju" style={{ ...inp, flex: 1 }} />
            <input value={noviDio.jedinica} onChange={e => setNoviDio({ ...noviDio, jedinica: e.target.value })}
              placeholder="Jedinica" maxLength={20} style={{ ...inp, width: 90 }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={dodaj} disabled={!noviDio.naziv}
              style={{ flex: 1, background: 'var(--ct-bakar)', border: 'none', color: 'var(--ct-krem)', borderRadius: 8, padding: 10, cursor: 'pointer', fontWeight: 600, opacity: !noviDio.naziv ? 0.5 : 1 }}>
              Dodaj
            </button>
            <button onClick={() => setForma(false)} style={{ background: 'transparent', border: '1px solid var(--ct-rub)', color: 'var(--ct-siva-kafa-negativ)', borderRadius: 8, padding: '10px 16px', cursor: 'pointer' }}>
              Odustani
            </button>
          </div>
        </div>
      )}

      {dijelovi.length === 0 && <div style={{ color: 'var(--ct-siva-kafa-negativ)', textAlign: 'center', padding: 40 }}>Nema dijelova.</div>}

      {dijelovi.map(d => (
        <div key={d.id} style={{ background: 'var(--ct-tamno-braon)', border: `1px solid ${odabrani?.id === d.id ? 'var(--ct-svijetli-bakar)' : 'var(--ct-rub)'}`, borderRadius: 10, padding: 14, marginBottom: 10, cursor: 'pointer' }}
          onClick={(e) => { if (e.target.closest('button')) return; odaberi(d) }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{d.naziv}</div>
              <div style={{ color: d.kolicina <= 0 ? 'var(--ct-greska)' : d.kolicina <= 3 ? 'var(--ct-upozorenje)' : 'var(--ct-uspjeh)', fontSize: 12, fontWeight: 600 }}>
                Stanje: {d.kolicina} {d.jedinica}
              </div>
              <div style={{ color: 'var(--ct-svijetli-bakar)', fontSize: 11, marginTop: 2 }}>{d.id}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={(e) => { e.stopPropagation(); setEditDio({ ...d }) }} style={{ background: 'transparent', border: '1px solid var(--ct-svijetli-bakar)', color: 'var(--ct-svijetli-bakar)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>✏️ Edit</button>
              <button onClick={(e) => obrisi(e, d)} style={{ background: 'transparent', border: '1px solid var(--ct-greska)', color: 'var(--ct-greska)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>Briši</button>
            </div>
          </div>

          {odabrani?.id === d.id && qrUrl && (
            <div style={{ marginTop: 12, borderTop: '1px solid var(--ct-rub)', paddingTop: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
              <img src={qrUrl} alt="QR" style={{ width: 100, height: 100, borderRadius: 8 }} />
              <div>
                <div style={{ color: 'var(--ct-siva-kafa-negativ)', fontSize: 11, marginBottom: 4 }}>QR KOD (nalijepi na kesu)</div>
                <div style={{ color: 'var(--ct-krem-negativ)', fontSize: 12, marginBottom: 8 }}>{d.id}</div>
                <button onClick={preuzmiQR} style={{ background: 'var(--ct-bakar)', border: 'none', color: 'var(--ct-krem)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  📥 Preuzmi QR
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {editDio && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--ct-zastor)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--ct-tamno-braon)', border: '1px solid var(--ct-svijetli-bakar)', borderRadius: 12, padding: 20, width: '100%', maxWidth: 440 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 14, color: 'var(--ct-siva-kafa-negativ)' }}>UREDI DIO — {editDio.id}</h3>
            <input value={editDio.naziv} onChange={e => setEditDio({ ...editDio, naziv: e.target.value })} placeholder="Naziv *" maxLength={150} style={inp} />
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="number" value={editDio.kolicina} onChange={e => setEditDio({ ...editDio, kolicina: e.target.value })} placeholder="Količina" style={{ ...inp, flex: 1 }} />
              <input value={editDio.jedinica || ''} onChange={e => setEditDio({ ...editDio, jedinica: e.target.value })} placeholder="Jedinica" maxLength={20} style={{ ...inp, width: 90 }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={snimiEdit} style={{ flex: 1, background: 'var(--ct-bakar)', border: 'none', color: 'var(--ct-krem)', borderRadius: 8, padding: 10, cursor: 'pointer', fontWeight: 600 }}>Sačuvaj</button>
              <button onClick={() => setEditDio(null)} style={{ background: 'transparent', border: '1px solid var(--ct-rub)', color: 'var(--ct-siva-kafa-negativ)', borderRadius: 8, padding: '10px 16px', cursor: 'pointer' }}>Odustani</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
