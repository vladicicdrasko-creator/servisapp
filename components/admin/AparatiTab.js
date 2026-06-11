'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import QRCode from 'qrcode'
import { StatusBadge } from './Dashboard'
import dynamic from 'next/dynamic'

const MapaPicker = dynamic(() => import('./MapaPicker'), { ssr: false })

export default function AparatiTab({ onOdaberiPrijavu }) {
  const [aparati, setAparati] = useState([])
  const [prijave, setPrijave] = useState([])
  const [odabrani, setOdabrani] = useState(null)
  const [povijestModal, setPovijestModal] = useState(null)
  const [forma, setForma] = useState(false)
  const [loading, setLoading] = useState(true)
  const [poruka, setPoruka] = useState(null)
  const [qrUrl, setQrUrl] = useState(null)
  const [pokaziMapu, setPokaziMapu] = useState(false)
  const [pokaziIstoriju, setPokaziIstoriju] = useState({})
  const [editAparat, setEditAparat] = useState(null)
  const [pokaziEditMapu, setPokaziEditMapu] = useState(false)
  const [noviAparat, setNoviAparat] = useState({
    naziv: '', lokal: '', adresa: '', serijski_broj: '', ostecen: false, lat: null, lng: null
  })

  useEffect(() => { ucitaj() }, [])

  const ucitaj = async () => {
    const [{ data: a }, { data: p }] = await Promise.all([
      supabase.from('aparati').select('*').order('created_at', { ascending: false }),
      supabase.from('prijave').select('id, aparat_id, status, created_at, opis, lokal, adresa, kategorija').order('created_at', { ascending: false })
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
      serijski_broj: noviAparat.ostecen ? 'OŠTEĆEN' : (noviAparat.serijski_broj || null),
      lat: noviAparat.lat,
      lng: noviAparat.lng,
      status: 'aktivan',
      verifikacija: 'aktivan'
    })
    setLoading(false)
    if (error) { setPoruka({ tip: 'greska', tekst: error.message }); return }
    setPoruka({ tip: 'ok', tekst: 'Aparat dodan!' })
    setForma(false)
    setNoviAparat({ naziv: '', lokal: '', adresa: '', serijski_broj: '', ostecen: false, lat: null, lng: null })
    ucitaj()
    setTimeout(() => setPoruka(null), 2000)
  }

  const otvoriEdit = (e, a) => {
    e.stopPropagation()
    setEditAparat({ ...a, ostecen: a.serijski_broj === 'OŠTEĆEN' })
    setPokaziEditMapu(false)
  }

  const snimiEdit = async () => {
    const { ostecen, ...rest } = editAparat
    await supabase.from('aparati').update({
      naziv: rest.naziv,
      lokal: rest.lokal,
      adresa: rest.adresa,
      serijski_broj: ostecen ? 'OŠTEĆEN' : (rest.serijski_broj || null),
      lat: rest.lat,
      lng: rest.lng,
    }).eq('id', rest.id)
    setEditAparat(null)
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
    <>
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

          <input value={noviAparat.naziv} onChange={e => setNoviAparat({ ...noviAparat, naziv: e.target.value })}
            placeholder="Naziv aparata *"
            style={{ width: '100%', background: '#0D1B2A', border: '1px solid #1E3A5A', color: '#E8F4FD', borderRadius: 8, padding: '8px 12px', marginBottom: 8, boxSizing: 'border-box' }} />

          <input value={noviAparat.lokal} onChange={e => setNoviAparat({ ...noviAparat, lokal: e.target.value })}
            placeholder="Lokal (gdje se nalazi) *"
            style={{ width: '100%', background: '#0D1B2A', border: '1px solid #1E3A5A', color: '#E8F4FD', borderRadius: 8, padding: '8px 12px', marginBottom: 8, boxSizing: 'border-box' }} />

          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input value={noviAparat.adresa} onChange={e => setNoviAparat({ ...noviAparat, adresa: e.target.value })}
              placeholder="Adresa *"
              style={{ flex: 1, background: '#0D1B2A', border: '1px solid #1E3A5A', color: '#E8F4FD', borderRadius: 8, padding: '8px 12px', boxSizing: 'border-box' }} />
            <button onClick={() => setPokaziMapu(!pokaziMapu)} style={{
              background: pokaziMapu ? '#1B85B8' : '#0D1B2A', border: '1px solid #1B85B8',
              color: '#E8F4FD', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap'
            }}>
              📍 {noviAparat.lat ? `${noviAparat.lat.toFixed(4)}, ${noviAparat.lng.toFixed(4)}` : 'Odaberi na mapi'}
            </button>
          </div>

          {pokaziMapu && (
            <div style={{ marginBottom: 8, borderRadius: 8, overflow: 'hidden', height: 250 }}>
              <MapaPicker
                lat={noviAparat.lat || 44.0}
                lng={noviAparat.lng || 17.0}
                onOdaberi={(lat, lng) => {
                  setNoviAparat({ ...noviAparat, lat, lng })
                  setPokaziMapu(false)
                }}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <input value={noviAparat.serijski_broj}
              onChange={e => setNoviAparat({ ...noviAparat, serijski_broj: e.target.value })}
              placeholder="Serijski broj (opcionalno)"
              disabled={noviAparat.ostecen}
              style={{ flex: 1, background: '#0D1B2A', border: '1px solid #1E3A5A', color: noviAparat.ostecen ? '#555' : '#E8F4FD', borderRadius: 8, padding: '8px 12px', boxSizing: 'border-box' }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#E63946', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={noviAparat.ostecen}
                onChange={e => setNoviAparat({ ...noviAparat, ostecen: e.target.checked, serijski_broj: '' })}
                style={{ accentColor: '#E63946' }} />
              Oštećen
            </label>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={dodajAparat} disabled={!noviAparat.naziv || !noviAparat.lokal || !noviAparat.adresa}
              style={{ flex: 1, background: '#1B85B8', border: 'none', color: '#fff', borderRadius: 8, padding: 10, cursor: 'pointer', fontWeight: 600, opacity: (!noviAparat.naziv || !noviAparat.lokal || !noviAparat.adresa) ? 0.5 : 1 }}>
              Dodaj
            </button>
            <button onClick={() => { setForma(false); setPokaziMapu(false) }} style={{ background: 'transparent', border: '1px solid #1E3A5A', color: '#7B96B2', borderRadius: 8, padding: '10px 16px', cursor: 'pointer' }}>
              Odustani
            </button>
          </div>
        </div>
      )}

      {editAparat && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#1A2E45', border: '1px solid #1B85B8', borderRadius: 12, padding: 20, width: '100%', maxWidth: 480 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 14, color: '#7B96B2' }}>UREDI APARAT — {editAparat.id}</h3>

            <input value={editAparat.naziv} onChange={e => setEditAparat({ ...editAparat, naziv: e.target.value })}
              placeholder="Naziv aparata *"
              style={{ width: '100%', background: '#0D1B2A', border: '1px solid #1E3A5A', color: '#E8F4FD', borderRadius: 8, padding: '8px 12px', marginBottom: 8, boxSizing: 'border-box' }} />

            <input value={editAparat.lokal} onChange={e => setEditAparat({ ...editAparat, lokal: e.target.value })}
              placeholder="Lokal *"
              style={{ width: '100%', background: '#0D1B2A', border: '1px solid #1E3A5A', color: '#E8F4FD', borderRadius: 8, padding: '8px 12px', marginBottom: 8, boxSizing: 'border-box' }} />

            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input value={editAparat.adresa} onChange={e => setEditAparat({ ...editAparat, adresa: e.target.value })}
                placeholder="Adresa *"
                style={{ flex: 1, background: '#0D1B2A', border: '1px solid #1E3A5A', color: '#E8F4FD', borderRadius: 8, padding: '8px 12px', boxSizing: 'border-box' }} />
              <button onClick={() => setPokaziEditMapu(!pokaziEditMapu)} style={{
                background: pokaziEditMapu ? '#1B85B8' : '#0D1B2A', border: '1px solid #1B85B8',
                color: '#E8F4FD', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', fontSize: 11, whiteSpace: 'nowrap'
              }}>
                📍 {editAparat.lat ? `${Number(editAparat.lat).toFixed(4)}, ${Number(editAparat.lng).toFixed(4)}` : 'Mapa'}
              </button>
            </div>

            {pokaziEditMapu && (
              <div style={{ marginBottom: 8, borderRadius: 8, overflow: 'hidden', height: 220 }}>
                <MapaPicker
                  lat={editAparat.lat || 44.0}
                  lng={editAparat.lng || 17.0}
                  onOdaberi={(lat, lng) => { setEditAparat({ ...editAparat, lat, lng }); setPokaziEditMapu(false) }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
              <input value={editAparat.ostecen ? '' : (editAparat.serijski_broj || '')}
                onChange={e => setEditAparat({ ...editAparat, serijski_broj: e.target.value })}
                placeholder="Serijski broj (opcionalno)"
                disabled={editAparat.ostecen}
                style={{ flex: 1, background: '#0D1B2A', border: '1px solid #1E3A5A', color: editAparat.ostecen ? '#555' : '#E8F4FD', borderRadius: 8, padding: '8px 12px', boxSizing: 'border-box' }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#E63946', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <input type="checkbox" checked={editAparat.ostecen}
                  onChange={e => setEditAparat({ ...editAparat, ostecen: e.target.checked, serijski_broj: '' })}
                  style={{ accentColor: '#E63946' }} />
                Oštećen
              </label>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={snimiEdit} disabled={!editAparat.naziv || !editAparat.lokal || !editAparat.adresa}
                style={{ flex: 1, background: '#1B85B8', border: 'none', color: '#fff', borderRadius: 8, padding: 10, cursor: 'pointer', fontWeight: 600, opacity: (!editAparat.naziv || !editAparat.lokal || !editAparat.adresa) ? 0.5 : 1 }}>
                Snimi
              </button>
              <button onClick={() => { setEditAparat(null); setPokaziEditMapu(false) }}
                style={{ background: 'transparent', border: '1px solid #1E3A5A', color: '#7B96B2', borderRadius: 8, padding: '10px 16px', cursor: 'pointer' }}>
                Odustani
              </button>
            </div>
          </div>
        </div>
      )}

      {aparati.map(a => {
        const svePrijave = prijave.filter(p => p.aparat_id === a.id)
        const montazaDatum = a.montaza_datum ? new Date(a.montaza_datum) : null
        const aktuelne = montazaDatum
          ? svePrijave.filter(p => new Date(p.created_at) >= montazaDatum)
          : svePrijave
        const historijske = montazaDatum
          ? svePrijave.filter(p => new Date(p.created_at) < montazaDatum)
          : []
        const aktivne = aktuelne.filter(p => p.status !== 'riješena' && p.status !== 'zatvorena').length

        return (
          <div key={a.id} style={{ background: '#1A2E45', border: `1px solid ${odabrani?.id === a.id ? '#1B85B8' : '#1E3A5A'}`, borderRadius: 10, padding: 14, marginBottom: 10, cursor: 'pointer', opacity: a.status === 'neaktivan' ? 0.5 : 1 }}
            onClick={(e) => { if (e.target.closest('button')) return; odaberiAparat(a) }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{a.lokal}</div>
                <div style={{ color: '#7B96B2', fontSize: 12 }}>{a.adresa}</div>
                {a.serijski_broj && <div style={{ color: a.serijski_broj === 'OŠTEĆEN' ? '#E63946' : '#7B96B2', fontSize: 11 }}>SN: {a.serijski_broj}</div>}
                <div style={{ color: '#1B85B8', fontSize: 11, marginTop: 2 }}>{a.id}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ background: aktivne > 0 ? '#E63946' : '#2A9D8F', color: '#fff', fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 700 }}>
                  {aktivne > 0 ? `${aktivne} aktivnih` : 'OK'}
                </span>
                <button onClick={(e) => otvoriEdit(e, a)} style={{
                  background: 'transparent', border: '1px solid #1B85B8',
                  color: '#1B85B8', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12
                }}>
                  ✏️ Edit
                </button>
              </div>
            </div>

            {odabrani?.id === a.id && qrUrl && (
              <div style={{ marginTop: 12, borderTop: '1px solid #1E3A5A', paddingTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                  <img src={qrUrl} alt="QR kod" style={{ width: 100, height: 100, borderRadius: 8 }} />
                  <div>
                    <div style={{ color: '#7B96B2', fontSize: 11, marginBottom: 4 }}>QR KOD</div>
                    <div style={{ color: '#E8F4FD', fontSize: 12, marginBottom: 8 }}>/prijava/{a.id}</div>
                    <div style={{ color: '#7B96B2', fontSize: 11, marginBottom: 8 }}>Ukupno prijava: {svePrijave.length}</div>
                    <button onClick={preuzmiQR} style={{ background: '#1B85B8', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                      📥 Preuzmi QR
                    </button>
                  </div>
                </div>

                <div style={{ color: '#7B96B2', fontSize: 11, marginBottom: 6 }}>
                  AKTUELNE PRIJAVE {montazaDatum && `(od ${montazaDatum.toLocaleDateString('bs-BA')})`}
                </div>
                {aktuelne.length === 0 && <div style={{ color: '#7B96B2', fontSize: 12, marginBottom: 8 }}>Nema prijava.</div>}
                {aktuelne.map(p => (
                  <div key={p.id} onClick={e => { e.stopPropagation(); setPovijestModal(p) }}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #0D1B2A', cursor: 'pointer' }}>
                    <div style={{ fontSize: 12, color: '#E8F4FD' }}>{p.id}</div>
                    <StatusBadge status={p.status} />
                  </div>
                ))}

                {historijske.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <button onClick={() => setPokaziIstoriju(prev => ({ ...prev, [a.id]: !prev[a.id] }))}
                      style={{ background: 'transparent', border: '1px solid #1E3A5A', color: '#7B96B2', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11, marginBottom: 6 }}>
                      {pokaziIstoriju[a.id] ? '▲ Sakrij istoriju' : `▼ Istorija (${historijske.length})`}
                    </button>
                    {pokaziIstoriju[a.id] && historijske.map(p => (
                      <div key={p.id} onClick={e => { e.stopPropagation(); setPovijestModal(p) }}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #0D1B2A', cursor: 'pointer', opacity: 0.6 }}>
                        <div style={{ fontSize: 12, color: '#E8F4FD' }}>{p.id}</div>
                        <StatusBadge status={p.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>

    {/* Modal za historijsku prijavu */}
    {povijestModal && (
      <div onClick={() => setPovijestModal(null)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div onClick={e => e.stopPropagation()}
          style={{ background: '#1A2E45', border: '1px solid #1E3A5A', borderRadius: 12, padding: 20, width: 340, maxWidth: '90vw' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ color: '#1B85B8', fontWeight: 700, fontSize: 13 }}>{povijestModal.id}</span>
            <StatusBadge status={povijestModal.status} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ color: '#7B96B2', fontSize: 11, marginBottom: 3 }}>LOKAL</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{povijestModal.lokal || '—'}</div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ color: '#7B96B2', fontSize: 11, marginBottom: 3 }}>ADRESA</div>
            <div style={{ fontSize: 13 }}>{povijestModal.adresa || '—'}</div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ color: '#7B96B2', fontSize: 11, marginBottom: 3 }}>OPIS</div>
            <div style={{ fontSize: 13, background: '#0D1B2A', borderRadius: 8, padding: 10 }}>{povijestModal.opis || '—'}</div>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#7B96B2', marginBottom: 16 }}>
            <span>📂 {povijestModal.kategorija}</span>
            <span>🕐 {new Date(povijestModal.created_at).toLocaleDateString('bs-BA')}</span>
          </div>
          <button onClick={() => setPovijestModal(null)}
            style={{ width: '100%', background: '#0F4C75', border: 'none', color: '#fff', borderRadius: 8, padding: 10, cursor: 'pointer', fontWeight: 600 }}>
            Zatvori
          </button>
        </div>
      </div>
    )}
    </>
  )
}