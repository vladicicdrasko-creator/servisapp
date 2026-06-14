'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase-browser'
import AparatiTab from './AparatiTab'
import MlinoviTab from './MlinoviTab'

const supabase = createClient()

export default function OpremaTab({ onOdaberiPrijavu }) {
  const [subTab, setSubTab] = useState('aparati')
  const [aparati, setAparati] = useState([])
  const [mlinovi, setMlinovi] = useState([])
  const [filterLokal, setFilterLokal] = useState('')

  useEffect(() => {
    if (subTab === 'sve') ucitajSve()
  }, [subTab])

  const ucitajSve = async () => {
    const [{ data: a }, { data: m }] = await Promise.all([
      supabase.from('aparati').select('id, naziv, lokal, vlasnik, serijski_broj, status').eq('status', 'aktivan').order('lokal'),
      supabase.from('mlinovi').select('*').eq('status', 'aktivan').order('lokal'),
    ])
    setAparati(a || [])
    setMlinovi(m || [])
  }

  const lokali = [...new Set([
    ...(aparati.map(a => a.lokal).filter(Boolean)),
    ...(mlinovi.map(m => m.lokal).filter(Boolean)),
  ])].sort()

  const filtriranAparati = filterLokal ? aparati.filter(a => a.lokal === filterLokal) : aparati
  const filtriranMlinovi = filterLokal ? mlinovi.filter(m => m.lokal === filterLokal) : mlinovi

  const SubBtn = ({ id, label }) => (
    <button onClick={() => setSubTab(id)} style={{
      background: subTab === id ? '#1B85B8' : 'transparent',
      border: `1px solid ${subTab === id ? '#1B85B8' : '#1E3A5A'}`,
      color: subTab === id ? '#fff' : '#7B96B2',
      borderRadius: 8, padding: '6px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13
    }}>{label}</button>
  )

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <SubBtn id="aparati" label="Aparati" />
        <SubBtn id="mlinovi" label="Mlinovi" />
        <SubBtn id="dijelovi" label="Dijelovi" />
        <SubBtn id="sve" label="Po lokalu" />
      </div>

      {subTab === 'aparati' && <AparatiTab onOdaberiPrijavu={onOdaberiPrijavu} />}
      {subTab === 'mlinovi' && <MlinoviTab />}
      {subTab === 'dijelovi' && (
        <div style={{ color: '#7B96B2', padding: 40, textAlign: 'center' }}>Dijelovi — u pripremi</div>
      )}

      {subTab === 'sve' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <select value={filterLokal} onChange={e => setFilterLokal(e.target.value)}
              style={{ background: '#132338', border: '1px solid #1E3A5A', color: '#E8F4FD', borderRadius: 8, padding: '8px 12px', fontSize: 13, minWidth: 200 }}>
              <option value="">Svi lokali</option>
              {lokali.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          {filtriranAparati.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ color: '#7B96B2', fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>APARATI ({filtriranAparati.length})</div>
              {filtriranAparati.map(a => (
                <div key={a.id} style={{ background: '#1A2E45', border: '1px solid #1E3A5A', borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{a.naziv}</div>
                  {a.lokal && <div style={{ color: '#7B96B2', fontSize: 12 }}>{a.lokal}</div>}
                  {a.vlasnik && <div style={{ color: '#7B96B2', fontSize: 12 }}>{a.vlasnik}</div>}
                  {a.serijski_broj && <div style={{ color: '#7B96B2', fontSize: 11 }}>SN: {a.serijski_broj}</div>}
                  <div style={{ color: '#1B85B8', fontSize: 11 }}>{a.id}</div>
                </div>
              ))}
            </div>
          )}

          {filtriranMlinovi.length > 0 && (
            <div>
              <div style={{ color: '#7B96B2', fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>MLINOVI ({filtriranMlinovi.length})</div>
              {filtriranMlinovi.map(m => (
                <div key={m.id} style={{ background: '#1A2E45', border: '1px solid #1E3A5A', borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{m.model}</div>
                  {m.lokal && <div style={{ color: '#7B96B2', fontSize: 12 }}>{m.lokal}</div>}
                  {m.marka && <div style={{ color: '#7B96B2', fontSize: 12 }}>{m.marka}</div>}
                  {m.serijski_broj && <div style={{ color: '#7B96B2', fontSize: 11 }}>SN: {m.serijski_broj}</div>}
                  <div style={{ color: '#1B85B8', fontSize: 11 }}>{m.id}</div>
                </div>
              ))}
            </div>
          )}

          {filtriranAparati.length === 0 && filtriranMlinovi.length === 0 && (
            <div style={{ color: '#7B96B2', textAlign: 'center', padding: 40 }}>Nema opreme{filterLokal ? ` na lokalu "${filterLokal}"` : ''}.</div>
          )}
        </div>
      )}
    </div>
  )
}
