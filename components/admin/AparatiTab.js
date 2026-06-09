'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import QRCode from 'qrcode'

export default function AparatiTab() {
  const [aparati, setAparati] = useState([])
  const [prijave, setPrijave] = useState([])
  const [odabrani, setOdabrani] = useState(null)
  const [forma, setForma] = useState(false)
  const [loading, setLoading] = useState(true)
  const [poruka, setPoruka] = useState(null)
  const [qrUrl, setQrUrl] = useState(null)
  const [noviAparat, setNoviAparat] = useState({
    naziv: '', lokal: '', adresa: '', tip: '', serijski_broj: ''
  })

  useEffect(() => {
    ucitaj()
  }, [])

  const ucitaj = async () => {
    const [{ data: a }, { data: p }] = await Promise.all([
      supabase.from('aparati').select('*').order('created_at', { ascending: false }),
      supabase.from('prijave').select('id, aparat_id, status')
    ])
    setAparati(a || [])
    setPrijave(p || [])
    setLoading(false)
  }

  const odaberiAparat = async (a) => {
    if (odabrani?.id === a.id) { setOdabrani(null); setQrUrl(null); return }
    setOdabrani(a)
    const url = `${window.location.origin}/prijava/${a.id}`
    const qr = await QRCode.toDataURL(url, { width: 200, margin: 1 })
    setQrUrl(qr)
  }

  const dodajAparat = async () => {
    setLoading(true)
    const id = 'APR-' + Date.now().toString().slice(-6)
    const { error } = await supabase.from('aparati').insert({
      id,
      naziv: noviAparat.naziv,
      lokal: noviAparat.lokal,
      adresa: noviAparat.adresa,
      tip: noviAparat.tip || null,
      serijski_broj: noviAparat.serijski_broj || null,
      status: 'aktivan',
      verifikacija: 'aktivan'
    })
    setLoading(false)
    if (error) { setPoruka({ tip: 'greska', tekst: error.message }); return }
    setPoruka({ tip: 'ok', tekst: 'Aparat dodan!' })
    setForma(false)
    setNoviAparat({ naziv: '', lokal: '', adresa: '', tip: '', serijski_broj: '' })
    ucitaj()
    setTimeout(() => setPoruka(null), 2000)
  }

  const toggleStatus = async (a) => {
    const noviStatus = a.status === 'aktivan' ? 'neaktivan' : 'aktivan'
    await supabase.from('aparati').update({ status: noviStatus }).eq('id', a.id)
    ucitaj()
  }

  const preuzmiQR = () => {
    const link = document.createElement('a')
    link.href = qrUrl
    link.download = `QR-${odabrani.id}.png`
    link.click()
  }

  if (loading) return <div style={{ color: '#7B96B2', padding: 40, textAlign: 'center' }}>Učitavam...</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>Aparati ({aparati.length})</h2>
        <button onClick={() => setForma(!forma)} style={{
          background: '#1B85B8', border: 'none', color: '#fff',
          padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600
        }}>+ Dodaj aparat</button>
      </div>

      {poruka && (
        <div style={{ color: poruka.tip === 'ok' ? '#2A9D8F' : '#E63946', fontSize: 13, marginBottom: 12 }}>
          {poruka.tekst}
        </div>
      )}

      {forma && (
        <div style={{ background: '#1A2E45', border: '1px solid #1B85B8', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#7B96B2' }}>NOVI APARAT</h3>
          {[
            { key: 'naziv', placeholder: 'Naziv aparata *', required: true },
            { key: 'lokal', placeholder: 'Lokal (gdje se nalazi) *', required: true },
            { key: 'adresa', placeholder: 'Adresa *', required: true },
            { key: 'tip', placeholder: 'Tip / marka (opcionalno)' },
            { key: 'serijski_broj', placeholder: 'Serijski broj (opcionalno)' },
          ].map(f => (
            <input key={f.key} value={noviAparat[f.key]}
              onChange={e => setNoviAparat({ ...noviAparat, [f.key]: e.target.value })}
              placeholder={f.placeholder}
              style={{ width: '100%', background: '#0D1B2A', border: '1px solid #1E3A5A', color: '#E8F4FD', borderRadius: 8, padding: '8px 12px', marginBottom: 8, boxSizing: 'border-box' }} />
          ))}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={dodajAparat} disabled={!noviAparat.naziv || !noviAparat.lokal || !noviAparat.adresa}
              style={{ flex: 1, background: '#1B85B8', border: 'none', color: '#fff', borderRadius: 8, padding: 10, cursor: 'pointer', fontWeight: 600, opacity: (!noviAparat.naziv || !noviAparat.lokal || !noviAparat.adresa) ? 0.5 : 1 }}>
              Dodaj
            </button>
            <button onClick={() => setForma(false)} style={{ background: 'transparent', border: '1px solid #1E3A5A', color: '#7B96B2', borderRadius: 8, padding: '10px 16px', cursor: 'pointer' }}>
              Odustani
            </button>
          </div>
        </div>
      )}

      {aparati.map(a => {
        const ukupno = prijave.filter(p => p.aparat_id === a.id).length
        const aktivne = prijave.filter(p => p.aparat_id === a.id && p.status !== 'riješena').length
        return (
          <div key={a.id} style={{ background: '#1A2E45', border: `1px solid ${odabrani?.id === a.id ? '#1B85B8' : '#1E3A5A'}`, borderRadius: 10, padding: 14, marginBottom: 10, cursor: 'pointer', opacity: a.status === 'neaktivan' ? 0.5 : 1 }}
            onClick={(e) => { if (e.target.closest('button')) return; odaberiAparat(a) }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{a.lokal}</div>
                <div style={{ color: '#7B96B2', fontSize: 12 }}>{a.adresa}</div>
                {a.tip && <div style={{ color: '#7B96B2', fontSize: 11 }}>{a.tip}{a.serijski_broj && ` · SN: ${a.serijski_broj}`}</div>}
                <div style={{ color: '#1B85B8', fontSize: 11, marginTop: 2 }}>{a.id}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ background: aktivne > 0 ? '#E63946' : '#2A9D8F', color: '#fff', fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 700 }}>
                  {aktivne > 0 ? `${aktivne} aktivnih` : 'OK'}
                </span>
                <button onClick={() => toggleStatus(a)} style={{
                  background: 'transparent', border: `1px solid ${a.status === 'aktivan' ? '#E63946' : '#2A9D8F'}`,
                  color: a.status === 'aktivan' ? '#E63946' : '#2A9D8F',
                  borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12
                }}>
                  {a.status === 'aktivan' ? 'Deaktiviraj' : 'Aktiviraj'}
                </button>
              </div>
            </div>

            {odabrani?.id === a.id && qrUrl && (
              <div style={{ marginTop: 12, borderTop: '1px solid #1E3A5A', paddingTop: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
                <img src={qrUrl} alt="QR kod" style={{ width: 100, height: 100, borderRadius: 8 }} />
                <div>
                  <div style={{ color: '#7B96B2', fontSize: 11, marginBottom: 4 }}>QR KOD</div>
                  <div style={{ color: '#E8F4FD', fontSize: 12, marginBottom: 8 }}>/prijava/{a.id}</div>
                  <div style={{ color: '#7B96B2', fontSize: 11, marginBottom: 8 }}>Ukupno prijava: {ukupno}</div>
                  <button onClick={preuzmiQR} style={{ background: '#1B85B8', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                    📥 Preuzmi QR
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}