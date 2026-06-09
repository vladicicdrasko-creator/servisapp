'use client'

import { StatusBadge } from './Dashboard'

export default function PrijaveList({ prijave, onOdaberi }) {
  const hitnostBoja = {
    'kritična': '#E63946',
    'visoka': '#F4A261',
    'srednja': '#1B85B8',
    'niska': '#2A9D8F'
  }

  return (
    <div>
      <h2 style={{ marginBottom: 16, fontSize: 18 }}>Sve prijave</h2>

      {prijave.length === 0 && (
        <div style={{ color: '#7B96B2', textAlign: 'center', padding: 40 }}>
          Nema prijava.
        </div>
      )}

      {prijave.map(p => (
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