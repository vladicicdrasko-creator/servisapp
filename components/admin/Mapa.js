'use client'

import { useEffect, useRef } from 'react'

export default function Mapa({ prijave = [], radnici = [], obilaski = [] }) {
  const mapaRef = useRef(null)
  const mapInstanceRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!mapaRef.current) return

    let map = null

    import('leaflet').then(L => {
      if (mapInstanceRef.current) return

      delete L.default.Icon.Default.prototype._getIconUrl
      L.default.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      map = L.default.map(mapaRef.current, { preferCanvas: true }).setView([44.817, 20.457], 12)
      mapInstanceRef.current = map

      L.default.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(map)

      const ikona = (boja) => L.default.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:${boja};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
        className: '',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      })

      prijave.forEach(p => {
        if (!p.lat || !p.lng) return
        L.default.marker([p.lat, p.lng], { icon: ikona('#E63946') })
          .addTo(map)
          .bindPopup(`<b>${p.lokal}</b><br/>${p.opis}`)
      })

      obilaski.forEach(o => {
        if (!o.lat || !o.lng) return
        L.default.marker([o.lat, o.lng], { icon: ikona('#F4A261') })
          .addTo(map)
          .bindPopup(`<b>${o.lokal}</b><br/>Obilazak`)
      })

      radnici.forEach(r => {
        if (!r.lat || !r.lng) return
        L.default.marker([r.lat, r.lng], { icon: ikona('#1B85B8') })
          .addTo(map)
          .bindPopup(`<b>${r.ime}</b>`)
      })
    })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #1E3A5A' }}>
      <div style={{ background: '#132338', padding: '10px 16px', display: 'flex', gap: 20, fontSize: 12 }}>
        {[
          { boja: '#E63946', label: 'Prijave' },
          { boja: '#F4A261', label: 'Obilaski' },
          { boja: '#1B85B8', label: 'Radnici' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: l.boja }} />
            <span style={{ color: '#7B96B2' }}>{l.label}</span>
          </div>
        ))}
      </div>
      <div ref={mapaRef} style={{ height: 400, width: '100%' }} />
    </div>
  )
}