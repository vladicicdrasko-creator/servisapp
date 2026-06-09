'use client'

import { useState } from 'react'
import { StatusBadge } from './Dashboard'

export default function PrijaveList({ prijave, onOdaberi }) {
  const danas = new Date().toISOString().split('T')[0]
  const [filter, setFilter] = useState('danas')
  const [datum, setDatum] = useState(danas)

  const hitnostBoja = {
    'kritična': '#E63946',
    'visoka': '#F4A261',
    'srednja': '#1B85B8',
    'niska': '#2A9D8F'
  }

  const filtrirane = prijave.filter(p => {
    if (filter === 'danas') return new Date(p.created_at).toISOString().split('T')[0] === danas
    if (filter === 'datum') return new Date(p.created_at).toISOString().split('T')[0] === datum
    return true // sve
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>Prijave</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setFilter('danas')} style={{
            background: filter === 'danas' ? '#1B85B8' : 'transparent',
            border: '1px solid #1B85B8', color: filter === 'danas' ? '#fff' : '#1B85B8',
            padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600
          }}>Danas</button>
          <button onClick={() => setFilter('sve')} style={{
            background: filter === 'sve' ? '#1B85B8' : 'transparent',
            border: '1px solid #1E3A5A', color: filter === 'sve' ? '#fff' : '#7B96B2',
            padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600
          }}>Sve</button>
          <input type="date" value={datum}
            onChange={e => { setDatum(e.target.value); setFilter('datum') }}
            style={{
              background: filter === 'datum' ? '#1B85B8' : '#1A2E45',
              border: '1px solid #1E3A5A', color: '#E8F4FD',
              padding: '6px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer'
            }} />
        </div>
      </div>

      {filtrirane.length === 0 && (
        <div style={{ color: '#7B96B2', textAlign: 'center', padding: 40 }}>
          Nema prijava za odabrani dan.
        </div>
      )}

      {filtrirane.map(p => (
        <div key={p.id} onClick={() => onOdaberi(p)}
          style={{
            background: '#1A2E45',
            border: `1px solid ${p.status === 'nova' ? '#1B85B8' : '#1E3A5A'}`,
            borderRadius: 10, padding: 14, marginBottom: 10, cursor: 'pointer'
          }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#1B85B8', fontWeight: 700, fontSize: 12 }}>{p.id}</span>
            <StatusBadge status={p.status} />
          </div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{p.lokal}</div>
          <div style={{ color: '#7B96B2', fontSize: 12, marginBottom: 8 }}>{p.opis}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: hitnostBoja[p.hitnost] || '#7B96B2', fontSize: 11, fontWeight: 700 }}>
              ● {p.hitnost?.toUpperCase()}
            </span>
            <span style={{ color: '#7B96B2', fontSize: 11 }}>
              {new Date(p.created_at).toLocaleString('bs-BA')}
            </span>
          </div>
          {p.radnik_id && (
            <div style={{ marginTop: 6, fontSize: 11, color: '#7B96B2' }}>
              👷 Dodijeljen radnik
            </div>
          )}
        </div>
      ))}
    </div>
  )
}