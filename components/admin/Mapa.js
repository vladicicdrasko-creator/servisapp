'use client'

import { useEffect, useRef, useState } from 'react'

const KATEGORIJE = [
  { id: 'sve', label: 'Sve' },
  { id: 'prijava', label: 'Prijava' },
  { id: 'montaza', label: 'Montaža' },
  { id: 'demontaza', label: 'Demontaža' },
  { id: 'kvar', label: 'Kvar' },
  { id: 'ostalo', label: 'Ostalo' },
]

export default function Mapa({ prijave = [], radnici = [] }) {
  const mapaRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markeriRef = useRef([])
  const [filter, setFilter] = useState('sve')

  const filtrirane = filter === 'sve' ? prijave : prijave.filter(p => p.kategorija === filter)

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

      mapInstanceRef.current = L.default.map(mapaRef.current, { preferCanvas: true }).setView([44.817, 20.457], 12)

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

  // Re-crtaj markere kad se promijeni filter ili podaci
  useEffect(() => {
    if (!mapInstanceRef.current) return

    import('leaflet').then(L => {
      // Ukloni stare markere
      markeriRef.current.forEach(m => m.remove())
      markeriRef.current = []

      const ikona = (boja, velicina = 14) => L.default.divIcon({
        html: `<div style="width:${velicina}px;height:${velicina}px;border-radius:50%;background:${boja};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.5)"></div>`,
        className: '',
        iconSize: [velicina, velicina],
        iconAnchor: [velicina / 2, velicina / 2],
      })

      filtrirane.forEach(p => {
        if (!p.lat || !p.lng) return
        const statusBoja = p.status === 'riješena' ? '#2A9D8F' : p.status === 'u_toku' ? '#F4A261' : '#E63946'
        const m = L.default.marker([p.lat, p.lng], { icon: ikona(statusBoja) })
          .addTo(mapInstanceRef.current)
          .bindPopup(`<b>${p.lokal || ''}</b><br/>${p.kategorija || ''}<br/><i>${p.opis || ''}</i><br/><span style="font-size:11px;color:#888">${p.status}</span>`)
        markeriRef.current.push(m)
      })

      radnici.forEach(r => {
        if (!r.lat || !r.lng) return
        const m = L.default.marker([r.lat, r.lng], { icon: ikona('#1B85B8', 18) })
          .addTo(mapInstanceRef.current)
          .bindPopup(`<b>👷 ${r.ime}</b><br/><span style="color:#1B85B8">${r.status}</span>`)
        markeriRef.current.push(m)
      })
    })
  }, [filtrirane, radnici])

  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #1E3A5A' }}>
      {/* Filter bar */}
      <div style={{ background: '#132338', padding: '10px 14px', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {KATEGORIJE.map(k => (
          <button key={k.id} onClick={() => setFilter(k.id)} style={{
            background: filter === k.id ? '#1B85B8' : '#0D1B2A',
            border: `1px solid ${filter === k.id ? '#1B85B8' : '#1E3A5A'}`,
            color: filter === k.id ? '#fff' : '#7B96B2',
            borderRadius: 20, padding: '4px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600
          }}>
            {k.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, fontSize: 11 }}>
          {[
            { boja: '#E63946', label: 'Nova' },
            { boja: '#F4A261', label: 'U toku' },
            { boja: '#2A9D8F', label: 'Riješena' },
            { boja: '#1B85B8', label: 'Radnik' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: l.boja }} />
              <span style={{ color: '#7B96B2' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div ref={mapaRef} style={{ height: 450, width: '100%' }} />
    </div>
  )
}
