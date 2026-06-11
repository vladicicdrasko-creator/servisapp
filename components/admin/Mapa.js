'use client'

import { useEffect, useRef, useState } from 'react'

const KATEGORIJE = [
  { id: 'sve', label: 'Sve naloge' },
  { id: 'prijava', label: 'Prijava' },
  { id: 'montaza', label: 'Montaža' },
  { id: 'demontaza', label: 'Demontaža' },
  { id: 'kvar', label: 'Kvar' },
  { id: 'ostalo', label: 'Ostalo' },
]

// GPS aktivan ako je lokacija ažurirana u zadnjih 5 minuta
const gpsAktivan = (r) => {
  if (!r.lat || !r.lng || !r.lokacija_updated_at) return false
  return (Date.now() - new Date(r.lokacija_updated_at).getTime()) < 5 * 60 * 1000
}

const formatVrijeme = (ts) => {
  if (!ts) return 'nepoznato'
  const d = new Date(ts)
  const sad = new Date()
  const diffMin = Math.floor((sad - d) / 60000)
  if (diffMin < 1) return 'upravo sada'
  if (diffMin < 60) return `prije ${diffMin} min`
  if (diffMin < 1440) return `prije ${Math.floor(diffMin / 60)} h`
  return d.toLocaleDateString('bs-BA')
}

export default function Mapa({ prijave = [], radnici = [] }) {
  const mapaRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markeriRef = useRef([])
  const [filterNalog, setFilterNalog] = useState('sve')
  const [filterRadnik, setFilterRadnik] = useState('svi')

  const filtriranePrijave = filterNalog === 'sve'
    ? prijave
    : prijave.filter(p => p.kategorija === filterNalog)

  const filtriranRadnici = filterRadnik === 'svi'
    ? radnici
    : radnici.filter(r => r.id === filterRadnik)

  useEffect(() => {
    if (typeof window === 'undefined' || !mapaRef.current) return

    import('leaflet').then(L => {
      if (mapInstanceRef.current) return

      delete L.default.Icon.Default.prototype._getIconUrl
      L.default.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      mapInstanceRef.current = L.default.map(mapaRef.current, { preferCanvas: true }).setView([42.708, 19.374], 8)
      L.default.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(mapInstanceRef.current)
    })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!mapInstanceRef.current) return

    import('leaflet').then(L => {
      markeriRef.current.forEach(m => m.remove())
      markeriRef.current = []

      const krugIkona = (boja, velicina = 14) => L.default.divIcon({
        html: `<div style="width:${velicina}px;height:${velicina}px;border-radius:50%;background:${boja};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.5)"></div>`,
        className: '',
        iconSize: [velicina, velicina],
        iconAnchor: [velicina / 2, velicina / 2],
      })

      const radnikIkona = (aktivan) => L.default.divIcon({
        html: `<div style="width:22px;height:22px;border-radius:50%;background:${aktivan ? '#2A9D8F' : '#7B96B2'};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;font-size:11px">👷</div>`,
        className: '',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      })

      // Nalozi
      filtriranePrijave.forEach(p => {
        if (!p.lat || !p.lng) return
        const boja = p.status === 'riješena' ? '#2A9D8F' : p.status === 'u_toku' ? '#F4A261' : '#E63946'
        const datum = new Date(p.created_at).toLocaleString('bs-BA')
        const m = L.default.marker([p.lat, p.lng], { icon: krugIkona(boja) })
          .addTo(mapInstanceRef.current)
          .bindPopup(`
            <div style="font-family:sans-serif;min-width:180px">
              <div style="font-weight:700;margin-bottom:4px">${p.lokal || ''}</div>
              <div style="color:#555;font-size:12px;margin-bottom:2px">${p.adresa || ''}</div>
              <div style="margin-bottom:4px"><span style="background:${boja};color:#fff;border-radius:4px;padding:1px 7px;font-size:11px;font-weight:600">${p.status}</span>
              <span style="background:#eee;border-radius:4px;padding:1px 7px;font-size:11px;margin-left:4px">${p.kategorija || ''}</span></div>
              <div style="font-size:12px;color:#333;font-style:italic;margin-bottom:4px">"${p.opis || ''}"</div>
              <div style="font-size:11px;color:#888">${p.id} · ${datum}</div>
            </div>
          `)
        markeriRef.current.push(m)
      })

      // Radnici
      filtriranRadnici.forEach(r => {
        if (!r.lat || !r.lng) return
        const aktivan = gpsAktivan(r)
        const zadnjiPut = formatVrijeme(r.lokacija_updated_at)
        const m = L.default.marker([r.lat, r.lng], { icon: radnikIkona(aktivan) })
          .addTo(mapInstanceRef.current)
          .bindPopup(`
            <div style="font-family:sans-serif;min-width:160px">
              <div style="font-weight:700;margin-bottom:4px">👷 ${r.ime}</div>
              <div style="margin-bottom:6px"><span style="background:${aktivan ? '#2A9D8F' : '#aaa'};color:#fff;border-radius:4px;padding:1px 8px;font-size:11px;font-weight:600">
                ${aktivan ? '● GPS aktivan' : '○ GPS neaktivan'}
              </span></div>
              <div style="font-size:12px;color:#555">Status: <b>${r.status}</b></div>
              <div style="font-size:11px;color:#888;margin-top:4px">Zadnji put viđen: <b>${zadnjiPut}</b></div>
              ${r.telefon ? `<div style="font-size:11px;color:#888;margin-top:2px">📞 ${r.telefon}</div>` : ''}
            </div>
          `)
        markeriRef.current.push(m)
      })
    })
  }, [filtriranePrijave, filtriranRadnici])

  const selectStil = {
    background: '#0D1B2A', border: '1px solid #1E3A5A', color: '#E8F4FD',
    borderRadius: 8, padding: '6px 12px', fontSize: 13, cursor: 'pointer', outline: 'none'
  }

  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #1E3A5A' }}>
      <div style={{ background: '#132338', padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={filterNalog} onChange={e => setFilterNalog(e.target.value)} style={selectStil}>
          {KATEGORIJE.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
        </select>

        <select value={filterRadnik} onChange={e => setFilterRadnik(e.target.value)} style={selectStil}>
          <option value="svi">Svi radnici</option>
          {radnici.map(r => (
            <option key={r.id} value={r.id}>
              {r.ime}{gpsAktivan(r) ? ' ●' : ' ○'}
            </option>
          ))}
        </select>
      </div>
      <div ref={mapaRef} style={{ height: 450, width: '100%' }} />
    </div>
  )
}
