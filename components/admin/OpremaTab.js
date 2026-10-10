'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase-browser'
import AparatiTab from './AparatiTab'
import MlinoviTab from './MlinoviTab'
import DijeloviTab from './DijeloviTab'

const supabase = createClient()

export default function OpremaTab({ onOdaberiPrijavu }) {
  const [subTab, setSubTab] = useState('aparati')
  const [aparati, setAparati] = useState([])
  const [mlinovi, setMlinovi] = useState([])
  const [filterLokal, setFilterLokal] = useState('')
  const [odabraniId, setOdabraniId] = useState(null)

  useEffect(() => {
    if (subTab === 'sve') ucitajSve()
  }, [subTab])

  const ucitajSve = async () => {
    const [{ data: a }, { data: m }] = await Promise.all([
      supabase.from('aparati').select('id, naziv, lokal, vlasnik, adresa, serijski_broj, slika_url, status').eq('status', 'aktivan').order('lokal'),
      supabase.from('mlinovi').select('*').eq('status', 'aktivan').order('lokal'),
    ])
    setAparati(a || [])
    setMlinovi(m || [])
  }

  const lokali = [...new Set([
    ...(aparati.map(a => a.lokal).filter(Boolean)),
    ...(mlinovi.map(m => m.lokal).filter(Boolean)),
  ])].sort()

  const q = filterLokal.trim().toLowerCase()
  const filtriranAparati = q ? aparati.filter(a => (a.lokal || '').toLowerCase().includes(q)) : aparati
  const filtriranMlinovi = q ? mlinovi.filter(m => (m.lokal || '').toLowerCase().includes(q)) : mlinovi

  const SubBtn = ({ id, label }) => (
    <button onClick={() => setSubTab(id)} style={{
      background: subTab === id ? 'var(--ct-dugme)' : 'transparent',
      border: `1px solid ${subTab === id ? 'var(--ct-akcent)' : 'var(--ct-rub)'}`,
      color: subTab === id ? 'var(--ct-dugme-tekst)' : 'var(--ct-prigusen)',
      borderRadius: 8, padding: '6px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13
    }}>{label}</button>
  )

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
        <SubBtn id="aparati" label="Aparati" />
        <SubBtn id="mlinovi" label="Mlinovi" />
        <SubBtn id="dijelovi" label="Dijelovi" />
        <SubBtn id="sve" label="Po lokalu" />
      </div>

      {subTab === 'aparati' && <AparatiTab onOdaberiPrijavu={onOdaberiPrijavu} />}
      {subTab === 'mlinovi' && <MlinoviTab />}
      {subTab === 'dijelovi' && <DijeloviTab />}

      {subTab === 'sve' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <input value={filterLokal} onChange={e => setFilterLokal(e.target.value)}
              list="lokali-lista" placeholder="Pretraži po lokalu..."
              style={{ background: 'var(--ct-povrsina)', border: '1px solid var(--ct-rub)', color: 'var(--ct-tekst)', borderRadius: 8, padding: '8px 12px', fontSize: 13, minWidth: 250, boxSizing: 'border-box' }} />
            <datalist id="lokali-lista">
              {lokali.map(l => <option key={l} value={l} />)}
            </datalist>
            {filterLokal && (
              <button onClick={() => setFilterLokal('')}
                style={{ marginLeft: 8, background: 'transparent', border: '1px solid var(--ct-rub)', color: 'var(--ct-prigusen)', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 13 }}>✕</button>
            )}
          </div>

          {filtriranAparati.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: 'var(--ct-font-mono)', color: 'var(--ct-prigusen)', fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>APARATI ({filtriranAparati.length})</div>
              {filtriranAparati.map(a => {
                const otvoren = odabraniId === 'a_' + a.id
                return (
                  <div key={a.id} onClick={() => setOdabraniId(otvoren ? null : 'a_' + a.id)}
                    style={{ background: 'var(--ct-povrsina)', border: `1px solid ${otvoren ? 'var(--ct-akcent)' : 'var(--ct-rub)'}`, borderRadius: 10, padding: '10px 14px', marginBottom: 8, cursor: 'pointer' }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{a.naziv}</div>
                    {a.lokal && <div style={{ color: 'var(--ct-prigusen)', fontSize: 12 }}>{a.lokal}</div>}
                    {a.vlasnik && <div style={{ color: 'var(--ct-prigusen)', fontSize: 12 }}>{a.vlasnik}</div>}
                    {a.serijski_broj && <div style={{ color: 'var(--ct-prigusen)', fontSize: 11 }}>SN: {a.serijski_broj}</div>}
                    <div style={{ color: 'var(--ct-akcent)', fontSize: 11 }}>{a.id}</div>
                    {otvoren && (
                      <div style={{ marginTop: 10, borderTop: '1px solid var(--ct-rub)', paddingTop: 10 }}>
                        {a.slika_url && <img src={a.slika_url} alt={a.naziv} style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />}
                        {a.adresa && <div style={{ color: 'var(--ct-prigusen)', fontSize: 12 }}>📍 {a.adresa}</div>}
                        <div style={{ color: 'var(--ct-uspjeh)', fontSize: 11, marginTop: 4 }}>Status: {a.status}</div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {filtriranMlinovi.length > 0 && (
            <div>
              <div style={{ fontFamily: 'var(--ct-font-mono)', color: 'var(--ct-prigusen)', fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>MLINOVI ({filtriranMlinovi.length})</div>
              {filtriranMlinovi.map(m => {
                const otvoren = odabraniId === 'm_' + m.id
                return (
                  <div key={m.id} onClick={() => setOdabraniId(otvoren ? null : 'm_' + m.id)}
                    style={{ background: 'var(--ct-povrsina)', border: `1px solid ${otvoren ? 'var(--ct-akcent)' : 'var(--ct-rub)'}`, borderRadius: 10, padding: '10px 14px', marginBottom: 8, cursor: 'pointer' }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{m.model}</div>
                    {m.lokal && <div style={{ color: 'var(--ct-prigusen)', fontSize: 12 }}>{m.lokal}</div>}
                    {m.marka && <div style={{ color: 'var(--ct-prigusen)', fontSize: 12 }}>{m.marka}</div>}
                    {m.serijski_broj && <div style={{ color: 'var(--ct-prigusen)', fontSize: 11 }}>SN: {m.serijski_broj}</div>}
                    <div style={{ color: 'var(--ct-akcent)', fontSize: 11 }}>{m.id}</div>
                    {otvoren && (
                      <div style={{ marginTop: 10, borderTop: '1px solid var(--ct-rub)', paddingTop: 10 }}>
                        {m.slika_url && <img src={m.slika_url} alt={m.model} style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />}
                        <div style={{ color: 'var(--ct-uspjeh)', fontSize: 11 }}>Status: {m.status}</div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {filtriranAparati.length === 0 && filtriranMlinovi.length === 0 && (
            <div style={{ color: 'var(--ct-prigusen)', textAlign: 'center', padding: 40 }}>Nema opreme{filterLokal ? ` na lokalu "${filterLokal}"` : ''}.</div>
          )}
        </div>
      )}
    </div>
  )
}
