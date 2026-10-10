'use client'

import { useState, useEffect, useRef } from 'react'
import { use } from 'react'
import { supabase } from '../../../lib/supabase'
import { noviDokument } from '../../../lib/pdf-brend'
import BrandLogo from '../../../components/BrandLogo'
import { zaglavljeStil } from '../../../components/brendStil'

export default function PrijavaPage({ params }) {
  const { aparatId } = use(params)
  const [aparat, setAparat] = useState(null)
  const [ucitava, setUcitava] = useState(true)
  const [kategorija, setKategorija] = useState('')
  const [opis, setOpis] = useState('')
  const [kontaktIme, setKontaktIme] = useState('')
  const [kontaktTel, setKontaktTel] = useState('06')
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

 const telDigits = kontaktTel.replace(/\D/g, '')
 const kontaktOk = kontaktIme.trim() && telDigits.length === 9
 const formaOk = kategorija && opis && kontaktOk

 const posaljiPrijavu = async () => {
  if (!formaOk) return
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

  const jeMlin = aparat.tip === 'mlin'
  const { error } = await supabase.from('prijave').insert({
    id,
    aparat_id: jeMlin ? null : aparatId,
    mlin_id: jeMlin ? aparatId : null,
    oprema_tip: jeMlin ? 'mlin' : 'aparat',
    lokal: aparat.lokal,
    adresa: aparat.adresa,
    lat: aparat.lat,
    lng: aparat.lng,
    opis,
    kategorija,
    kontakt: [kontaktIme, kontaktTel].filter(Boolean).join(' / ') || null,
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
      <div style={{ color: 'var(--ct-siva-kafa-negativ)' }}>Učitavam...</div>
    </div>
  )

  if (!aparat) return (
    <div style={s.centar}>
      <div style={{ color: 'var(--ct-greska)', fontWeight: 700 }}>Aparat nije pronađen.</div>
    </div>
  )

  const preuzmiPDF = async () => {
    const { doc, boja, sans, mono, metaRed, M, DESNO } = await noviDokument()
    const vrijeme = vrijemePrijaveRef.current || new Date()
    metaRed('Podgorica', vrijeme.toLocaleDateString('bs-BA'), brojPrijave)

    sans(16, 'bold'); boja('tamnoBraon')
    doc.text('Potvrda o prijavi kvara', M, 52)
    sans(10, 'bold'); boja('uspjeh')
    doc.text('Prijava je uspješno primljena', M, 59)

    // Broj prijave — istaknuto (bakar)
    boja('papir', 'Fill'); doc.roundedRect(M, 66, DESNO - M, 24, 3, 3, 'F')
    mono(8); boja('sivaKafa')
    doc.text('BROJ PRIJAVE', 105, 74, { align: 'center' })
    sans(20, 'bold'); boja('bakar')
    doc.text(brojPrijave, 105, 84, { align: 'center' })

    const detalji = [
      ['Datum i vrijeme', vrijeme.toLocaleString('bs-BA')],
      ['Lokacija', aparat.lokal],
      ['Adresa', aparat.adresa],
      ['Aparat', aparat.id],
      ['Vrsta kvara', kategorija],
      ['Opis', opis],
    ]
    const kontaktStr = [kontaktIme, kontaktTel].filter(Boolean).join(' / ')
    if (kontaktStr) detalji.push(['Kontakt', kontaktStr])

    let y = 102
    detalji.forEach(([label, value]) => {
      mono(7.5); boja('sivaKafa')
      doc.text(label.toUpperCase(), M, y)
      sans(10.5); boja('tamnoBraon')
      const linije = doc.splitTextToSize(value || '—', DESNO - 70)
      doc.text(linije, 70, y)
      y += Math.max(1, linije.length) * 5.5 + 3
      boja('papir', 'Draw'); doc.setLineWidth(0.2); doc.line(M, y - 4.5, DESNO, y - 4.5)
    })

    sans(9.5); boja('tamnoBraon')
    doc.text(doc.splitTextToSize('Serviser će biti upućen u najkraćem roku. Sačuvajte ovaj dokument kao potvrdu vaše prijave.', DESNO - M), M, y + 6)

    doc.save('prijava-' + brojPrijave + '.pdf')
  }

  if (poslato) return (
    <div style={s.centar}>
      <div style={{ textAlign: 'center' }}>
        <div style={s.uspjehKrug}>✓</div>
        <h2 style={{ color: 'var(--ct-krem-negativ)', marginBottom: 8 }}>Prijava poslata!</h2>
        <p style={{ color: 'var(--ct-siva-kafa-negativ)', marginBottom: 8 }}>Vaš broj prijave:</p>
        <div style={s.brojPrijave}>{brojPrijave}</div>
        <p style={{ color: 'var(--ct-siva-kafa-negativ)', fontSize: 12 }}>
          {vrijemePrijaveRef.current?.toLocaleString('bs-BA')}
        </p>
        <p style={{ color: 'var(--ct-siva-kafa-negativ)', fontSize: 13, marginBottom: 24 }}>
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
        <BrandLogo visina={28} oznaka="Prijava kvara" />
      </div>

      {/* Info aparat/mlin */}
      <div style={s.card}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{aparat.tip === 'mlin' ? aparat.naziv : aparat.lokal}</div>
        {aparat.tip === 'mlin' ? (
          aparat.lokal && <div style={{ color: 'var(--ct-siva-kafa-negativ)', fontSize: 12 }}>{aparat.lokal}</div>
        ) : (
          <div style={{ color: 'var(--ct-siva-kafa-negativ)', fontSize: 12 }}>{aparat.adresa}</div>
        )}
        <div style={{ color: 'var(--ct-siva-kafa-negativ)', fontSize: 11, marginTop: 2 }}>
          {aparat.tip === 'mlin' ? 'Mlin' : 'Aparat'}: <span style={{ color: 'var(--ct-svijetli-bakar)' }}>{aparat.id}</span>
        </div>
      </div>

      {/* Forma */}
      <div style={{ padding: '0 16px 16px' }}>
        <h3 style={{ color: 'var(--ct-krem-negativ)', marginBottom: 16, fontSize: 16 }}>
          Prijavi kvar
        </h3>

        {/* Kategorija */}
        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>VRSTA KVARA</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {kategorije.map(k => (
              <button key={k} onClick={() => setKategorija(k)}
                style={{ ...s.kategorijaBtn, background: kategorija === k ? 'var(--ct-bakar)' : 'var(--ct-tamno-braon)', border: `1px solid ${kategorija === k ? 'var(--ct-svijetli-bakar)' : 'var(--ct-rub)'}` }}>
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
        style={{ position: 'absolute', top: 8, right: 8, background: 'var(--ct-greska)', border: 'none', color: 'var(--ct-krem)', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 16 }}>
        ×
      </button>
    </div>
  )}
  {!slikaPreview && (
    <label style={{ display: 'block', background: 'var(--ct-tamno-braon)', border: '1px dashed var(--ct-rub)', borderRadius: 8, padding: '20px', textAlign: 'center', cursor: 'pointer', color: 'var(--ct-siva-kafa-negativ)', fontSize: 13 }}>
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
          <label style={s.label}>VAŠ KONTAKT *</label>
          <input value={kontaktIme} onChange={e => setKontaktIme(e.target.value)}
            placeholder="Vaše ime" maxLength={100}
            style={{ ...s.input, marginBottom: 8 }} />
          <input
            value={kontaktTel}
            onChange={e => {
              let v = e.target.value.replace(/\D/g, '')
              if (v.length < 2) v = '06'
              else if (!v.startsWith('06')) v = '06' + v.slice(2)
              v = v.slice(0, 9)
              let f = v
              if (v.length > 6) f = v.slice(0,3) + ' ' + v.slice(3,6) + ' ' + v.slice(6)
              else if (v.length > 3) f = v.slice(0,3) + ' ' + v.slice(3)
              setKontaktTel(f)
            }}
            placeholder="06X XXX XXX"
            inputMode="tel"
            style={s.input} />
        </div>

        <button onClick={posaljiPrijavu}
          disabled={!formaOk || saljem}
          style={{ ...s.btn, background: formaOk ? 'var(--ct-bakar)' : 'var(--ct-rub)', cursor: formaOk ? 'pointer' : 'not-allowed' }}>
          {saljem ? 'Slanje...' : 'Pošalji prijavu'}
        </button>
      </div>
    </div>
  )
}

const s = {
  wrapper: { background: 'var(--ct-espresso)', minHeight: '100vh', fontFamily: 'var(--ct-font-sans)', color: 'var(--ct-krem-negativ)' },
  centar: { background: 'var(--ct-espresso)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--ct-font-sans)' },
  header: zaglavljeStil,
  card: { margin: 16, background: 'var(--ct-tamno-braon)', borderRadius: 12, padding: 14, border: '1px solid var(--ct-rub)' },
  label: { fontFamily: 'var(--ct-font-mono)', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--ct-siva-kafa-negativ)', fontSize: 12, display: 'block', marginBottom: 6 },
  kategorijaBtn: { color: 'var(--ct-krem-negativ)', borderRadius: 8, padding: '10px 8px', fontSize: 12, cursor: 'pointer', textAlign: 'left' },
  textarea: { width: '100%', background: 'var(--ct-tamno-braon)', border: '1px solid var(--ct-rub)', borderRadius: 8, padding: '10px 12px', color: 'var(--ct-krem-negativ)', fontSize: 13, resize: 'none', minHeight: 90, outline: 'none', boxSizing: 'border-box' },
  input: { width: '100%', background: 'var(--ct-tamno-braon)', border: '1px solid var(--ct-rub)', borderRadius: 8, padding: '10px 12px', color: 'var(--ct-krem-negativ)', fontSize: 13, outline: 'none', boxSizing: 'border-box' },
  btn: { width: '100%', border: 'none', color: 'var(--ct-krem)', borderRadius: 10, padding: 14, fontSize: 15, fontWeight: 700 },
  uspjehKrug: { width: 80, height: 80, background: 'var(--ct-uspjeh)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 36, color: 'var(--ct-krem)' },
  brojPrijave: { fontFamily: 'var(--ct-font-mono)', background: 'var(--ct-tamno-braon)', border: '1px solid var(--ct-rub)', borderRadius: 10, padding: '12px 24px', display: 'inline-block', color: 'var(--ct-svijetli-bakar)', fontSize: 20, fontWeight: 700, letterSpacing: 2, marginBottom: 20 },
  pdfBtn: { background: 'var(--ct-bakar)', border: 'none', color: 'var(--ct-krem)', borderRadius: 10, padding: '13px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
}