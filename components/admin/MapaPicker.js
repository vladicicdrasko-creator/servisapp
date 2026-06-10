'use client'

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import { useState } from 'react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function KlikHandler({ onKlik }) {
  useMapEvents({ click: (e) => onKlik(e.latlng.lat, e.latlng.lng) })
  return null
}

export default function MapaPicker({ lat, lng, onOdaberi }) {
  const [marker, setMarker] = useState(lat && lng ? [lat, lng] : null)

  const handleKlik = (la, ln) => {
    setMarker([la, ln])
    onOdaberi(la, ln)
  }

  return (
    <MapContainer center={[lat || 44.0, lng || 17.0]} zoom={13} style={{ height: '100%', width: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <KlikHandler onKlik={handleKlik} />
      {marker && <Marker position={marker} />}
    </MapContainer>
  )
}