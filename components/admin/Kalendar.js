'use client'

import { useState } from 'react'

const DANI = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned']
const MJESECI = ['Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun',
  'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar']

export default function Kalendar({ prijave = [], odabraniDan, onOdaberi }) {
  const danas = new Date()
  const [godina, setGodina] = useState(danas.getFullYear())
  const [mjesec, setMjesec] = useState(danas.getMonth())

  const lokalniDatum = (iso) => {
    const dt = new Date(iso)
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
  }
  const danasStr = lokalniDatum(danas)

  const prviDanMjeseca = new Date(godina, mjesec, 1)
  // Ponedjeljak = 0
  let pocetak = prviDanMjeseca.getDay() - 1
  if (pocetak < 0) pocetak = 6

  const brojDana = new Date(godina, mjesec + 1, 0).getDate()

  const prijavePoDatetu = {}
  prijave.forEach(p => {
    const rijesen = p.status === 'riješena' || p.status === 'zatvorena'
    // Riješene idu na dan kad su riješene (updated_at), aktivne na zakazano/kreirano
    const d = rijesen
      ? lokalniDatum(p.rijeseno_at || p.updated_at || p.created_at)
      : (p.zakazano_za ? p.zakazano_za.slice(0, 10) : lokalniDatum(p.created_at))
    if (!prijavePoDatetu[d]) prijavePoDatetu[d] = []
    prijavePoDatetu[d].push(p)
  })

  const prethodniMjesec = () => {
    if (mjesec === 0) { setMjesec(11); setGodina(g => g - 1) }
    else setMjesec(m => m - 1)
  }
  const sljedeciMjesec = () => {
    if (mjesec === 11) { setMjesec(0); setGodina(g => g + 1) }
    else setMjesec(m => m + 1)
  }

  const celije = []
  for (let i = 0; i < pocetak; i++) celije.push(null)
  for (let d = 1; d <= brojDana; d++) celije.push(d)

  return (
    <div style={{ background: 'var(--ct-povrsina)', border: '1px solid var(--ct-rub)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <button onClick={prethodniMjesec} style={s.navBtn}>‹</button>
        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--ct-tekst)' }}>
          {MJESECI[mjesec]} {godina}
        </span>
        <button onClick={sljedeciMjesec} style={s.navBtn}>›</button>
      </div>

      {/* Nazivi dana */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {DANI.map(d => (
          <div key={d} style={{ textAlign: 'center', color: 'var(--ct-prigusen)', fontSize: 10, fontWeight: 700, padding: '4px 0' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Ćelije */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {celije.map((d, i) => {
          if (!d) return <div key={`p-${i}`} />
          const dateStr = `${godina}-${String(mjesec + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
          const prijaveZaDan = prijavePoDatetu[dateStr] || []
          const jeDanas = dateStr === danasStr
          const jeOdabran = dateStr === odabraniDan
          const jeBuduc = dateStr > danasStr
          const aktivne = prijaveZaDan.filter(p => p.status !== 'riješena' && p.status !== 'zatvorena').length
          const rijestene = prijaveZaDan.filter(p => p.status === 'riješena' || p.status === 'zatvorena').length

          return (
            <div key={dateStr} onClick={() => onOdaberi(dateStr)}
              style={{
                borderRadius: 8,
                padding: '6px 2px',
                textAlign: 'center',
                cursor: 'pointer',
                background: jeOdabran ? 'var(--ct-dugme)' : jeDanas ? 'var(--ct-odabrano)' : 'transparent',
                border: `1px solid ${jeOdabran ? 'var(--ct-akcent)' : jeDanas ? 'var(--ct-akcent)' : prijaveZaDan.length > 0 ? 'var(--ct-rub)' : 'transparent'}`,
                opacity: jeBuduc && prijaveZaDan.length === 0 ? 0.4 : 1,
              }}>
              <div style={{ fontSize: 12, fontWeight: jeDanas || jeOdabran ? 700 : 400, color: jeOdabran ? 'var(--ct-dugme-tekst)' : jeDanas ? 'var(--ct-akcent)' : 'var(--ct-tekst)' }}>
                {d}
              </div>
              {prijaveZaDan.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 2, flexWrap: 'wrap' }}>
                  {aktivne > 0 && (
                    <div style={{ background: 'var(--ct-greska)', borderRadius: 10, fontSize: 9, color: 'var(--ct-dugme-tekst)', padding: '0 4px', fontWeight: 700, minWidth: 14 }}>
                      {aktivne}
                    </div>
                  )}
                  {rijestene > 0 && (
                    <div style={{ background: 'var(--ct-uspjeh)', borderRadius: 10, fontSize: 9, color: 'var(--ct-dugme-tekst)', padding: '0 4px', fontWeight: 700, minWidth: 14 }}>
                      {rijestene}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legenda */}
      <div style={{ display: 'flex', gap: 14, marginTop: 12, fontSize: 11, color: 'var(--ct-prigusen)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--ct-greska)' }} />
          Aktivni
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--ct-uspjeh)' }} />
          Riješeni
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--ct-odabrano)', border: '1px solid var(--ct-akcent)' }} />
          Danas
        </div>
      </div>
    </div>
  )
}

const s = {
  navBtn: { background: 'transparent', border: '1px solid var(--ct-rub)', color: 'var(--ct-tekst)', borderRadius: 6, width: 30, height: 30, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }
}
