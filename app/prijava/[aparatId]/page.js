'use client'

import { useState, useEffect, useRef } from 'react'
import { use } from 'react'

export default function PrijavaPage({ params }) {
  const { aparatId } = use(params)
  const [aparat, setAparat] = useState(null)
  const [ucitava, setUcitava] = useState(true)
  const [kategorija, setKategorija] = useState('')
  const [opis, setOpis] = useState('')
  const [kontakt, setKontakt] = useState('')
  const [slika, setSlika] = useState(null)
  const [slikaPreview, setSlikaPreview] = useState(null)
  const [saljem, setSaljem] = useState(false)
  const [poslato, setPoslato] = useState(false)
  const [brojPrijave, setBrojPrijave] = useState('')
  const vrijemePrijaveRef = useRef(null)

 const kategorije = [
  'Curi voda',
  'Ne grije',
  'Buka / vibracije',
  'Mlin ne radi',
  'Pušta paru',
  'Ostalo'
]
  useEffect(() => {
    const ucitajAparat = async () => {
      const res = await fetch(`/api/aparat/${aparatId}`)
      if (res.ok) {
        const data = await res.json()
        setAparat(data)
      }
      setUcitava(false)
    }
    ucitajAparat()
  }, [aparatId])

 const posaljiPrijavu = async () => {
  if (!kategorija || !opis) return
  setSaljem(true)

  const id = 'PR-' + Date.now().toString().slice(-6)

  let slikaUrl = null
  if (slika) {
    const ext = slika.name.split('.').pop()
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('prijave-slike')
      .upload(id + '.' + ext, slika)
    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from('prijave-slike')
        .getPublicUrl(id + '.' + ext)
      slikaUrl = urlData.publicUrl
    }
  }

  const { error } = await supabase.from('prijave').insert({
    id,
    aparat_id: aparatId,
    lokal: aparat.lokal,
    adresa: aparat.adresa,
    lat: aparat.lat,
    lng: aparat.lng,
    opis,
    kategorija,
    kontakt: kontakt || null,
    slika_url: slikaUrl,
    status: 'nova',
    hitnost: 'srednja'
  })

 if (!error) {
  vrijemePrijaveRef.current = new Date()
  setBrojPrijave(id)
  setPoslato(true)
  fetch('/api/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: '🔔 Nova prijava',
      body: aparat.lokal + ' – ' + kategorija,
      url: '/admin'
    })
  })
}
  setSaljem(false)
}

  if (ucitava) return (
    <div style={s.centar}>
      <div style={{ color: '#7B96B2' }}>Učitavam...</div>
    </div>
  )

  if (!aparat) return (
    <div style={s.centar}>
      <div style={{ color: '#E63946', fontWeight: 700 }}>Aparat nije pronađen.</div>
    </div>
  )

  const preuzmiPDF = async () => {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })

    const vrijeme = vrijemePrijaveRef.current
    const datumStr = vrijeme ? vrijeme.toLocaleString('bs-BA') : new Date().toLocaleString('bs-BA')

    // Header traka
    doc.setFillColor(15, 76, 117)
    doc.rect(0, 0, 210, 28, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('ServisApp', 14, 12)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Potvrda o prijavi kvara', 14, 20)

    // Zelena traka uspjeha
    doc.setFillColor(42, 157, 143)
    doc.rect(0, 28, 210, 16, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Prijava je uspješno primljena', 14, 38)

    // Broj prijave — istaknuto
    doc.setFillColor(19, 35, 56)
    doc.roundedRect(14, 52, 182, 22, 4, 4, 'F')
    doc.setTextColor(27, 133, 184)
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text(brojPrijave, 105, 66, { align: 'center' })

    doc.setTextColor(123, 150, 178)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('Broj prijave', 105, 58, { align: 'center' })

    // Detalji prijave
    const detalji = [
      ['Datum i vrijeme', datumStr],
      ['Lokacija', aparat.lokal],
      ['Adresa', aparat.adresa],
      ['Aparat ID', aparat.id],
      ['Vrsta kvara', kategorija],
      ['Opis', opis],
    ]
    if (kontakt) detalji.push(['Kontakt', kontakt])

    let y = 84
    doc.setFontSize(10)
    detalji.forEach(([label, value], i) => {
      if (i % 2 === 0) {
        doc.setFillColor(245, 247, 250)
        doc.rect(14, y - 5, 182, 10, 'F')
      }
      doc.setTextColor(100, 120, 140)
      doc.setFont('helvetica', 'normal')
      doc.text(label + ':', 16, y)
      doc.setTextColor(20, 40, 60)
      doc.setFont('helvetica', 'bold')
      const lines = doc.splitTextToSize(value || '—', 120)
      doc.text(lines, 70, y)
      y += lines.length > 1 ? lines.length * 6 + 4 : 10
    })

    // Footer
    doc.setFillColor(230, 235, 240)
    doc.rect(0, 275, 210, 22, 'F')
    doc.setTextColor(100, 120, 140)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('Tehničar će biti upućen u najkraćem roku. Čuvajte ovaj dokument kao potvrdu vaše prijave.', 105, 283, { align: 'center' })
    doc.text('ServisApp © ' + new Date().getFullYear(), 105, 290, { align: 'center' })

    doc.save('prijava-' + brojPrijave + '.pdf')
  }

  if (poslato) return (
    <div style={s.centar}>
      <div style={{ textAlign: 'center' }}>
        <div style={s.uspjehKrug}>✓</div>
        <h2 style={{ color: '#E8F4FD', marginBottom: 8 }}>Prijava poslata!</h2>
        <p style={{ color: '#7B96B2', marginBottom: 8 }}>Vaš broj prijave:</p>
        <div style={s.brojPrijave}>{brojPrijave}</div>
        <p style={{ color: '#7B96B2', fontSize: 12 }}>
          {vrijemePrijaveRef.current?.toLocaleString('bs-BA')}
        </p>
        <p style={{ color: '#7B96B2', fontSize: 13, marginBottom: 24 }}>
          Tehničar će biti upućen u najkraćem roku.
        </p>
        <button onClick={preuzmiPDF} style={s.pdfBtn}>
          ⬇ Preuzmi potvrdu (PDF)
        </button>
      </div>
    </div>
  )

  return (
    <div style={s.wrapper}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerIkona}>🔧</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>ServisApp</div>
          <div style={{ fontSize: 11, opacity: 0.7 }}>{aparat.lokal}</div>
        </div>
      </div>

      {/* Info aparat */}
      <div style={s.card}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{aparat.lokal}</div>
        <div style={{ color: '#7B96B2', fontSize: 12 }}>{aparat.adresa}</div>
        <div style={{ color: '#7B96B2', fontSize: 11, marginTop: 2 }}>
          Aparat: <span style={{ color: '#1B85B8' }}>{aparat.id}</span>
        </div>
      </div>

      {/* Forma */}
      <div style={{ padding: '0 16px 16px' }}>
        <h3 style={{ color: '#E8F4FD', marginBottom: 16, fontSize: 16 }}>
          Prijavi kvar
        </h3>

        {/* Kategorija */}
        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>VRSTA KVARA</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {kategorije.map(k => (
              <button key={k} onClick={() => setKategorija(k)}
                style={{ ...s.kategorijaBtn, background: kategorija === k ? '#1B85B8' : '#132338', border: `1px solid ${kategorija === k ? '#1B85B8' : '#1E3A5A'}` }}>
                {k}
              </button>
            ))}
          </div>
        </div>

        {/* Opis */}
        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>OPIS KVARA</label>
          <textarea value={opis} onChange={e => setOpis(e.target.value)}
            placeholder="Opišite problem što detaljnije..."
            style={s.textarea} />
        </div>
        {/* Slika */}
<div style={{ marginBottom: 14 }}>
  <label style={s.label}>DODAJ SLIKU (opciono)</label>
  {slikaPreview && (
    <div style={{ marginBottom: 8, position: 'relative' }}>
      <img src={slikaPreview} alt="preview" style={{ width: '100%', borderRadius: 8, maxHeight: 200, objectFit: 'cover' }} />
      <button onClick={() => { setSlika(null); setSlikaPreview(null) }}
        style={{ position: 'absolute', top: 8, right: 8, background: '#E63946', border: 'none', color: '#fff', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 16 }}>
        ×
      </button>
    </div>
  )}
  {!slikaPreview && (
    <label style={{ display: 'block', background: '#132338', border: '1px dashed #1E3A5A', borderRadius: 8, padding: '20px', textAlign: 'center', cursor: 'pointer', color: '#7B96B2', fontSize: 13 }}>
      📷 Klikni za dodavanje slike
      <input type="file" accept="image/*" capture="environment"
        onChange={e => {
          const f = e.target.files[0]
          if (f) {
            setSlika(f)
            setSlikaPreview(URL.createObjectURL(f))
          }
        }}
        style={{ display: 'none' }} />
    </label>
  )}
</div>
        {/* Kontakt */}
        <div style={{ marginBottom: 20 }}>
          <label style={s.label}>VAŠ KONTAKT (opciono)</label>
          <input value={kontakt} onChange={e => setKontakt(e.target.value)}
            placeholder="Ime i broj telefona"
            style={s.input} />
        </div>

        <button onClick={posaljiPrijavu}
          disabled={!kategorija || !opis || saljem}
          style={{ ...s.btn, background: kategorija && opis ? '#1B85B8' : '#1E3A5A', cursor: kategorija && opis ? 'pointer' : 'not-allowed' }}>
          {saljem ? 'Slanjem...' : 'Pošalji prijavu'}
        </button>
      </div>
    </div>
  )
}

const s = {
  wrapper: { background: '#0D1B2A', minHeight: '100vh', fontFamily: "'Segoe UI', sans-serif", color: '#E8F4FD' },
  centar: { background: '#0D1B2A', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI', sans-serif" },
  header: { background: '#0F4C75', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 },
  headerIkona: { width: 36, height: 36, background: '#1B85B8', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 },
  card: { margin: 16, background: '#132338', borderRadius: 12, padding: 14, border: '1px solid #1E3A5A' },
  label: { color: '#7B96B2', fontSize: 12, display: 'block', marginBottom: 6 },
  kategorijaBtn: { color: '#E8F4FD', borderRadius: 8, padding: '10px 8px', fontSize: 12, cursor: 'pointer', textAlign: 'left' },
  textarea: { width: '100%', background: '#132338', border: '1px solid #1E3A5A', borderRadius: 8, padding: '10px 12px', color: '#E8F4FD', fontSize: 13, resize: 'none', minHeight: 90, outline: 'none', boxSizing: 'border-box' },
  input: { width: '100%', background: '#132338', border: '1px solid #1E3A5A', borderRadius: 8, padding: '10px 12px', color: '#E8F4FD', fontSize: 13, outline: 'none', boxSizing: 'border-box' },
  btn: { width: '100%', border: 'none', color: '#fff', borderRadius: 10, padding: 14, fontSize: 15, fontWeight: 700 },
  uspjehKrug: { width: 80, height: 80, background: '#2A9D8F', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 36, color: '#fff' },
  brojPrijave: { background: '#132338', border: '1px solid #1E3A5A', borderRadius: 10, padding: '12px 24px', display: 'inline-block', color: '#1B85B8', fontSize: 20, fontWeight: 700, letterSpacing: 2, marginBottom: 20 },
  pdfBtn: { background: '#1B85B8', border: 'none', color: '#fff', borderRadius: 10, padding: '13px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
}