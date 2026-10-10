'use client'

import { useState } from 'react'
import { StatusBadge } from './Dashboard'

export default function PrijaveList({ prijave, onOdaberi }) {
  const danas = new Date().toISOString().split('T')[0]
  const [filter, setFilter] = useState('danas')
  const [datum, setDatum] = useState(danas)

  const hitnostBoja = {
    'kritična': 'var(--ct-greska)',
    'visoka': 'var(--ct-upozorenje)',
    'srednja': 'var(--ct-svijetli-bakar)',
    'niska': 'var(--ct-uspjeh)'
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
            background: filter === 'danas' ? 'var(--ct-bakar)' : 'transparent',
            border: '1px solid var(--ct-svijetli-bakar)', color: filter === 'danas' ? 'var(--ct-krem)' : 'var(--ct-svijetli-bakar)',
            padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600
          }}>Danas</button>
          <button onClick={() => setFilter('sve')} style={{
            background: filter === 'sve' ? 'var(--ct-bakar)' : 'transparent',
            border: '1px solid var(--ct-rub)', color: filter === 'sve' ? 'var(--ct-krem)' : 'var(--ct-siva-kafa-negativ)',
            padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600
          }}>Sve</button>
          <input type="date" value={datum}
            onChange={e => { setDatum(e.target.value); setFilter('datum') }}
            style={{
              background: filter === 'datum' ? 'var(--ct-bakar)' : 'var(--ct-tamno-braon)',
              border: '1px solid var(--ct-rub)', color: 'var(--ct-krem-negativ)',
              padding: '6px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer'
            }} />
        </div>
      </div>

      {filtrirane.length === 0 && (
        <div style={{ color: 'var(--ct-siva-kafa-negativ)', textAlign: 'center', padding: 40 }}>
          Nema prijava za odabrani dan.
        </div>
      )}

      {filtrirane.map(p => (
        <div key={p.id} onClick={() => onOdaberi(p)}
          style={{
            background: 'var(--ct-tamno-braon)',
            border: `1px solid ${p.status === 'nova' ? 'var(--ct-svijetli-bakar)' : 'var(--ct-rub)'}`,
            borderRadius: 10, padding: 14, marginBottom: 10, cursor: 'pointer'
          }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: 'var(--ct-svijetli-bakar)', fontWeight: 700, fontSize: 12 }}>{p.id}</span>
            <StatusBadge status={p.status} />
          </div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{p.lokal}</div>
          <div style={{ color: 'var(--ct-siva-kafa-negativ)', fontSize: 12, marginBottom: 8 }}>{p.opis}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: hitnostBoja[p.hitnost] || 'var(--ct-siva-kafa-negativ)', fontSize: 11, fontWeight: 700 }}>
              ● {p.hitnost?.toUpperCase()}
            </span>
            <span style={{ color: 'var(--ct-siva-kafa-negativ)', fontSize: 11 }}>
              {new Date(p.created_at).toLocaleString('bs-BA')}
            </span>
          </div>
          {p.radnik_id && (
            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--ct-siva-kafa-negativ)' }}>
              👷 Dodijeljen radnik
            </div>
          )}
        </div>
      ))}
    </div>
  )
}