'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase-browser'
const supabase = createClient()
import QRCode from 'qrcode'
import { StatusBadge } from './Dashboard'
import dynamic from 'next/dynamic'

const MapaPicker = dynamic(() => import('./MapaPicker'), { ssr: false })

export default function AparatiTab({ onOdaberiPrijavu }) {
  const [aparati, setAparati] = useState([])
  const [prijave, setPrijave] = useState([])
  const [odabrani, setOdabrani] = useState(null)
  const [povijestModal, setPovijestModal] = useState(null)
  const [modalDijelovi, setModalDijelovi] = useState([])

  useEffect(() => {
    if (!povijestModal) { setModalDijelovi([]); return }
    supabase.from('nalog_dijelovi').select('naziv, kolicina').eq('nalog_id', povijestModal.id)
      .then(({ data }) => setModalDijelovi(data || []))
  }, [povijestModal])

  const exportExcel = async () => {
    const { utils, writeFile } = await import('xlsx')
    const podaci = aparati.map(a => ({
      'ID': a.id,
      'Naziv': a.naziv || '',
      'Vlasnik': a.vlasnik || '',
      'Lokal': a.lokal || '',
      'Adresa': a.adresa || '',
      'Serijski broj': a.serijski_broj || '',
      'Status': a.status || '',
      'Oštećen': a.ostecen ? 'Da' : 'Ne',
      'Datum montaže': a.montaza_datum ? new Date(a.montaza_datum).toLocaleDateString('bs-BA') : '',
      'Ukupno prijava': prijave.filter(p => p.aparat_id === a.id).length,
    }))
    const ws = utils.json_to_sheet(podaci)
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'Aparati')
    writeFile(wb, `aparati_${new Date().toISOString().split('T')[0]}.xlsx`)
  }
  const [forma, setForma] = useState(false)
  const [loading, setLoading] = useState(true)
  const [poruka, setPoruka] = useState(null)
  const [qrUrl, setQrUrl] = useState(null)
  const [pokaziMapu, setPokaziMapu] = useState(false)
  const [pokaziIstoriju, setPokaziIstoriju] = useState({})
  const [editAparat, setEditAparat] = useState(null)
  const [pokaziEditMapu, setPokaziEditMapu] = useState(false)
  const [pokaziNeaktivne, setPokaziNeaktivne] = useState(false)
  const [noviAparat, setNoviAparat] = useState({
    naziv: '', vlasnik: '', lokal: '', adresa: '', serijski_broj: '', ostecen: false, lat: null, lng: null
  })
  const [modeli, setModeli] = useState([])
  const [pokaziModele, setPokaziModele] = useState(false)
  const [noviModel, setNoviModel] = useState({ naziv: '', proizvodjac: '' })
  const [editModel, setEditModel] = useState(null)
  const [modelCheckliste, setModelCheckliste] = useState({})
  const [novaStavka, setNovaStavka] = useState({})

  const KATEGORIJE = ['Curi voda', 'Ne grije', 'Buka / vibracije', 'Mlin ne radi', 'Pušta paru', 'Ostalo']

  useEffect(() => { ucitaj(); ucitajModele() }, [])

  const ucitajModele = async () => {
    const { data } = await supabase.from('modeli_aparata').select('*').order('naziv')
    setModeli(data || [])
  }

  const ucitajCheckliste = async (modelId) => {
    const { data } = await supabase.from('modeli_checkliste').select('*').eq('model_id', modelId)
    const mapa = {}
    ;(data || []).forEach(c => { mapa[c.kategorija] = c })
    setModelCheckliste(mapa)
  }

  const otvoriEditModel = async (m) => {
    setEditModel({ ...m })
    await ucitajCheckliste(m.id)
  }

  const dodajStavku = async (kategorija) => {
    const tekst = novaStavka[kategorija]?.trim()
    if (!tekst) return
    const postojeci = modelCheckliste[kategorija]
    const stavke = postojeci ? [...postojeci.stavke, tekst] : [tekst]
    if (postojeci) {
      await supabase.from('modeli_checkliste').update({ stavke }).eq('id', postojeci.id)
    } else {
      await supabase.from('modeli_checkliste').insert({ model_id: editModel.id, kategorija, stavke })
    }
    setNovaStavka(prev => ({ ...prev, [kategorija]: '' }))
    ucitajCheckliste(editModel.id)
  }

  const obrisiStavku = async (kategorija, idx) => {
    const postojeci = modelCheckliste[kategorija]
    if (!postojeci) return
    const stavke = postojeci.stavke.filter((_, i) => i !== idx)
    await supabase.from('modeli_checkliste').update({ stavke }).eq('id', postojeci.id)
    ucitajCheckliste(editModel.id)
  }

  const uploadPdf = async (fajl) => {
    const path = `modeli/${editModel.id}.pdf`
    await supabase.storage.from('aparati-slike').upload(path, fajl, { upsert: true })
    const { data } = supabase.storage.from('aparati-slike').getPublicUrl(path)
    const pdfUrl = data.publicUrl
    await supabase.from('modeli_aparata').update({ pdf_url: pdfUrl }).eq('id', editModel.id)
    setEditModel(prev => ({ ...prev, pdf_url: pdfUrl }))
    ucitajModele()
  }

  const dodajModel = async () => {
    if (!noviModel.naziv) return
    await supabase.from('modeli_aparata').insert({ naziv: noviModel.naziv, proizvodjac: noviModel.proizvodjac || null })
    setNoviModel({ naziv: '', proizvodjac: '' })
    ucitajModele()
  }

  const snimiModel = async () => {
    await supabase.from('modeli_aparata').update({
      naziv: editModel.naziv,
      proizvodjac: editModel.proizvodjac || null,
      napomena: editModel.napomena || null
    }).eq('id', editModel.id)
    setEditModel(null)
    setModelCheckliste({})
    ucitajModele()
  }

  const obrisiModel = async (id) => {
    if (!window.confirm('Obriši model?')) return
    await supabase.from('modeli_aparata').delete().eq('id', id)
    ucitajModele()
  }

  const ucitaj = async () => {
    const [{ data: a }, { data: p }] = await Promise.all([
      supabase.from('aparati').select('*').order('created_at', { ascending: false }),
      supabase.from('prijave').select('id, aparat_id, status, created_at, opis, lokal, adresa, kategorija').order('created_at', { ascending: false })
    ])
    setAparati(a || [])
    setPrijave(p || [])
    setLoading(false)
  }

  const odaberiAparat = async (a) => {
    if (odabrani?.id === a.id) { setOdabrani(null); setQrUrl(null); return }
    setOdabrani(a)
    const url = `${window.location.origin}/prijava/${a.id}`
    const qr = await QRCode.toDataURL(url, { width: 200, margin: 1 })
    setQrUrl(qr)
  }

  const uploadSlika = async (fajl, aparatId) => {
    const ext = fajl.name.split('.').pop()
    const path = `aparati/${aparatId}.${ext}`
    await supabase.storage.from('aparati-slike').remove([path])
    const { error } = await supabase.storage.from('aparati-slike').upload(path, fajl, { upsert: true })
    if (error) return null
    const { data } = supabase.storage.from('aparati-slike').getPublicUrl(path)
    return data.publicUrl
  }

  const dodajAparat = async () => {
    setLoading(true)
    const id = 'APR-' + Date.now().toString().slice(-6)
    let slikaUrl = null
    if (noviAparat.slika) slikaUrl = await uploadSlika(noviAparat.slika, id)
    const { error } = await supabase.from('aparati').insert({
      id,
      naziv: noviAparat.naziv,
      vlasnik: noviAparat.vlasnik || null,
      lokal: noviAparat.lokal || null,
      adresa: noviAparat.adresa || null,
      serijski_broj: noviAparat.ostecen ? 'OŠTEĆEN' : (noviAparat.serijski_broj || null),
      lat: noviAparat.lat,
      lng: noviAparat.lng,
      status: 'aktivan',
      verifikacija: 'aktivan',
      slika_url: slikaUrl,
    })
    setLoading(false)
    if (error) { setPoruka({ tip: 'greska', tekst: error.message }); return }
    setPoruka({ tip: 'ok', tekst: 'Aparat dodan!' })
    setForma(false)
    setNoviAparat({ naziv: '', vlasnik: '', lokal: '', adresa: '', serijski_broj: '', ostecen: false, lat: null, lng: null })
    ucitaj()
    setTimeout(() => setPoruka(null), 2000)
  }

  const toggleStatus = async (e, a) => {
    e.stopPropagation()
    const noviStatus = a.status === 'neaktivan' ? 'aktivan' : 'neaktivan'
    if (!window.confirm(`${noviStatus === 'neaktivan' ? 'Deaktiviraj' : 'Aktiviraj'} aparat "${a.naziv}"?`)) return
    await supabase.from('aparati').update({ status: noviStatus }).eq('id', a.id)
    ucitaj()
  }

  const otvoriEdit = (e, a) => {
    e.stopPropagation()
    setEditAparat({ ...a, ostecen: a.serijski_broj === 'OŠTEĆEN' })
    setPokaziEditMapu(false)
  }

  const snimiEdit = async () => {
    const { ostecen, novaSlika, ...rest } = editAparat
    let slikaUrl = rest.slika_url
    if (novaSlika) slikaUrl = await uploadSlika(novaSlika, rest.id)
    await supabase.from('aparati').update({
      naziv: rest.naziv,
      vlasnik: rest.vlasnik || null,
      lokal: rest.lokal || null,
      adresa: rest.adresa || null,
      serijski_broj: ostecen ? 'OŠTEĆEN' : (rest.serijski_broj || null),
      lat: rest.lat,
      lng: rest.lng,
      slika_url: slikaUrl,
    }).eq('id', rest.id)
    setEditAparat(null)
    ucitaj()
  }

  const preuzmiQR = () => {
    const ime = [odabrani.naziv, odabrani.lokal, odabrani.id].filter(Boolean).join(' - ').replace(/[\\/:*?"<>|]/g, ' ')
    const link = document.createElement('a')
    link.href = qrUrl
    link.download = `${ime}.png`
    link.click()
  }

  if (loading) return <div style={{ color: '#7B96B2', padding: 40, textAlign: 'center' }}>Učitavam...</div>

  return (
    <>
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>Aparati ({aparati.filter(a => a.status !== 'neaktivan').length})</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportExcel} style={{
            background: 'transparent', border: '1px solid #2A9D8F', color: '#2A9D8F',
            padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13
          }}>↓ Export</button>
          <button onClick={() => { setPokaziModele(!pokaziModele); setForma(false) }} style={{
            background: pokaziModele ? '#1E3A5A' : 'transparent', border: '1px solid #1E3A5A', color: '#7B96B2',
            padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600
          }}>☰ Modeli</button>
          <button onClick={() => { setForma(!forma); setPokaziModele(false) }} style={{
            background: '#1B85B8', border: 'none', color: '#fff',
            padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600
          }}>+ Dodaj aparat</button>
        </div>
      </div>

      {poruka && (
        <div style={{ color: poruka.tip === 'ok' ? '#2A9D8F' : '#E63946', fontSize: 13, marginBottom: 12 }}>
          {poruka.tekst}
        </div>
      )}

      {pokaziModele && (
        <div style={{ background: '#1A2E45', border: '1px solid #1E3A5A', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#7B96B2' }}>MODELI APARATA</h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <input value={noviModel.naziv} onChange={e => setNoviModel({ ...noviModel, naziv: e.target.value })}
              placeholder="Naziv modela *"
              style={{ flex: '1 1 140px', minWidth: 0, background: '#0D1B2A', border: '1px solid #1E3A5A', color: '#E8F4FD', borderRadius: 8, padding: '8px 12px', boxSizing: 'border-box' }} />
            <input value={noviModel.proizvodjac} onChange={e => setNoviModel({ ...noviModel, proizvodjac: e.target.value })}
              placeholder="Proizvođač"
              style={{ flex: '1 1 140px', minWidth: 0, background: '#0D1B2A', border: '1px solid #1E3A5A', color: '#E8F4FD', borderRadius: 8, padding: '8px 12px', boxSizing: 'border-box' }} />
            <button onClick={dodajModel} style={{ background: '#1B85B8', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>+ Dodaj</button>
          </div>
          {modeli.length === 0 && <div style={{ color: '#7B96B2', fontSize: 13 }}>Nema modela.</div>}
          {modeli.map(m => (
            <div key={m.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid #0D1B2A' }}>
                <div style={{ flex: 1, color: '#E8F4FD', fontSize: 13, fontWeight: 600 }}>{m.naziv}</div>
                <div style={{ flex: 1, color: '#7B96B2', fontSize: 12 }}>{m.proizvodjac || '—'}</div>
                <button onClick={() => editModel?.id === m.id ? (setEditModel(null), setModelCheckliste({})) : otvoriEditModel(m)}
                  style={{ background: editModel?.id === m.id ? '#1B85B8' : 'transparent', border: '1px solid #1E3A5A', color: editModel?.id === m.id ? '#fff' : '#7B96B2', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>
                  {editModel?.id === m.id ? 'Zatvori' : 'Uredi'}
                </button>
                <button onClick={() => obrisiModel(m.id)} style={{ background: 'transparent', border: '1px solid #E63946', color: '#E63946', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>Briši</button>
              </div>

              {editModel?.id === m.id && (
                <div style={{ background: '#0D1B2A', borderRadius: 8, padding: 14, margin: '8px 0 12px' }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input value={editModel.naziv} onChange={e => setEditModel({ ...editModel, naziv: e.target.value })}
                      placeholder="Naziv" style={{ flex: 1, background: '#132338', border: '1px solid #1E3A5A', color: '#E8F4FD', borderRadius: 6, padding: '6px 10px' }} />
                    <input value={editModel.proizvodjac || ''} onChange={e => setEditModel({ ...editModel, proizvodjac: e.target.value })}
                      placeholder="Proizvođač" style={{ flex: 1, background: '#132338', border: '1px solid #1E3A5A', color: '#E8F4FD', borderRadius: 6, padding: '6px 10px' }} />
                  </div>
                  <textarea value={editModel.napomena || ''} onChange={e => setEditModel({ ...editModel, napomena: e.target.value })}
                    placeholder="Opšte napomene za ovaj model (posebnosti, poznati problemi...)"
                    rows={2} style={{ width: '100%', background: '#132338', border: '1px solid #1E3A5A', color: '#E8F4FD', borderRadius: 6, padding: '6px 10px', resize: 'none', boxSizing: 'border-box', marginBottom: 8 }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <label style={{ background: '#132338', border: '1px solid #1E3A5A', color: '#7B96B2', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>
                      📄 {editModel.pdf_url ? 'Zamijeni PDF' : 'Upload PDF priručnik'}
                      <input type="file" accept=".pdf" onChange={e => e.target.files[0] && uploadPdf(e.target.files[0])} style={{ display: 'none' }} />
                    </label>
                    {editModel.pdf_url && <a href={editModel.pdf_url} target="_blank" rel="noreferrer" style={{ color: '#1B85B8', fontSize: 12 }}>📄 Otvori PDF</a>}
                  </div>
                  <button onClick={snimiModel} style={{ background: '#2A9D8F', border: 'none', color: '#fff', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13, marginBottom: 16 }}>Snimi osnovne podatke</button>

                  <div style={{ color: '#7B96B2', fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>SAVJETI / STAVKE PO KATEGORIJI KVARA</div>
                  {KATEGORIJE.map(kat => (
                    <div key={kat} style={{ marginBottom: 12, background: '#132338', borderRadius: 8, padding: 10 }}>
                      <div style={{ color: '#1B85B8', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{kat}</div>
                      {(modelCheckliste[kat]?.stavke || []).map((stavka, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span style={{ color: '#1B85B8', fontSize: 14 }}>•</span>
                          <span style={{ flex: 1, color: '#E8F4FD', fontSize: 13 }}>{stavka}</span>
                          <button onClick={() => obrisiStavku(kat, idx)} style={{ background: 'none', border: 'none', color: '#E63946', cursor: 'pointer', fontSize: 14, padding: '0 4px' }}>×</button>
                        </div>
                      ))}
                      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                        <input value={novaStavka[kat] || ''} onChange={e => setNovaStavka(prev => ({ ...prev, [kat]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && dodajStavku(kat)}
                          placeholder="Dodaj stavku..."
                          style={{ flex: 1, background: '#0D1B2A', border: '1px solid #1E3A5A', color: '#E8F4FD', borderRadius: 6, padding: '4px 8px', fontSize: 12 }} />
                        <button onClick={() => dodajStavku(kat)} style={{ background: '#1B85B8', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>+</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {forma && (
        <div style={{ background: '#1A2E45', border: '1px solid #1B85B8', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#7B96B2' }}>NOVI APARAT</h3>

          <select value={noviAparat.naziv} onChange={e => setNoviAparat({ ...noviAparat, naziv: e.target.value })}
            style={{ width: '100%', background: '#0D1B2A', border: '1px solid #1E3A5A', color: noviAparat.naziv ? '#E8F4FD' : '#7B96B2', borderRadius: 8, padding: '8px 12px', marginBottom: 8, boxSizing: 'border-box' }}>
            <option value="">-- Odaberi model aparata *</option>
            {modeli.map(m => <option key={m.id} value={m.naziv}>{m.naziv}{m.proizvodjac ? ` (${m.proizvodjac})` : ''}</option>)}
          </select>

          <input value={noviAparat.vlasnik} onChange={e => setNoviAparat({ ...noviAparat, vlasnik: e.target.value })}
            placeholder="Vlasnik aparata (opcionalno)"
            style={{ width: '100%', background: '#0D1B2A', border: '1px solid #1E3A5A', color: '#E8F4FD', borderRadius: 8, padding: '8px 12px', marginBottom: 8, boxSizing: 'border-box' }} />

          <input value={noviAparat.lokal} onChange={e => setNoviAparat({ ...noviAparat, lokal: e.target.value })}
            placeholder="Lokal (popunjava se pri montaži)"
            style={{ width: '100%', background: '#0D1B2A', border: '1px solid #1E3A5A', color: '#E8F4FD', borderRadius: 8, padding: '8px 12px', marginBottom: 8, boxSizing: 'border-box' }} />

          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input value={noviAparat.adresa} onChange={e => setNoviAparat({ ...noviAparat, adresa: e.target.value })}
              placeholder="Adresa (popunjava se pri montaži)"
              style={{ flex: 1, background: '#0D1B2A', border: '1px solid #1E3A5A', color: '#E8F4FD', borderRadius: 8, padding: '8px 12px', boxSizing: 'border-box' }} />
            <button onClick={() => setPokaziMapu(!pokaziMapu)} style={{
              background: pokaziMapu ? '#1B85B8' : '#0D1B2A', border: '1px solid #1B85B8',
              color: '#E8F4FD', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap'
            }}>
              📍 {noviAparat.lat ? `${noviAparat.lat.toFixed(4)}, ${noviAparat.lng.toFixed(4)}` : 'Odaberi na mapi'}
            </button>
          </div>

          {pokaziMapu && (
            <div style={{ marginBottom: 8, borderRadius: 8, overflow: 'hidden', height: 250 }}>
              <MapaPicker
                lat={noviAparat.lat || 42.71}
                lng={noviAparat.lng || 19.37}
                onOdaberi={(lat, lng) => {
                  setNoviAparat({ ...noviAparat, lat, lng })
                  setPokaziMapu(false)
                }}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <input value={noviAparat.serijski_broj}
              onChange={e => setNoviAparat({ ...noviAparat, serijski_broj: e.target.value })}
              placeholder="Serijski broj (opcionalno)"
              disabled={noviAparat.ostecen}
              style={{ flex: 1, background: '#0D1B2A', border: '1px solid #1E3A5A', color: noviAparat.ostecen ? '#555' : '#E8F4FD', borderRadius: 8, padding: '8px 12px', boxSizing: 'border-box' }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#E63946', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={noviAparat.ostecen}
                onChange={e => setNoviAparat({ ...noviAparat, ostecen: e.target.checked, serijski_broj: '' })}
                style={{ accentColor: '#E63946' }} />
              Oštećen
            </label>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ color: '#7B96B2', fontSize: 11, marginBottom: 6 }}>SLIKA APARATA (opcionalno)</div>
            <input type="file" accept="image/*" onChange={e => setNoviAparat({ ...noviAparat, slika: e.target.files[0] })}
              style={{ color: '#E8F4FD', fontSize: 12 }} />
            {noviAparat.slika && (
              <img src={URL.createObjectURL(noviAparat.slika)} alt="preview"
                style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginTop: 6 }} />
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={dodajAparat} disabled={!noviAparat.naziv}
              style={{ flex: 1, background: '#1B85B8', border: 'none', color: '#fff', borderRadius: 8, padding: 10, cursor: 'pointer', fontWeight: 600, opacity: !noviAparat.naziv ? 0.5 : 1 }}>
              Dodaj
            </button>
            <button onClick={() => { setForma(false); setPokaziMapu(false) }} style={{ background: 'transparent', border: '1px solid #1E3A5A', color: '#7B96B2', borderRadius: 8, padding: '10px 16px', cursor: 'pointer' }}>
              Odustani
            </button>
          </div>
        </div>
      )}

      {editAparat && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#1A2E45', border: '1px solid #1B85B8', borderRadius: 12, padding: 20, width: '100%', maxWidth: 480 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 14, color: '#7B96B2' }}>UREDI APARAT — {editAparat.id}</h3>

            <input value={editAparat.naziv} onChange={e => setEditAparat({ ...editAparat, naziv: e.target.value })}
              placeholder="Naziv aparata *"
              style={{ width: '100%', background: '#0D1B2A', border: '1px solid #1E3A5A', color: '#E8F4FD', borderRadius: 8, padding: '8px 12px', marginBottom: 8, boxSizing: 'border-box' }} />

            <input value={editAparat.vlasnik || ''} onChange={e => setEditAparat({ ...editAparat, vlasnik: e.target.value })}
              placeholder="Vlasnik aparata (opcionalno)"
              style={{ width: '100%', background: '#0D1B2A', border: '1px solid #1E3A5A', color: '#E8F4FD', borderRadius: 8, padding: '8px 12px', marginBottom: 8, boxSizing: 'border-box' }} />

            <input value={editAparat.lokal || ''} onChange={e => setEditAparat({ ...editAparat, lokal: e.target.value })}
              placeholder="Lokal"
              style={{ width: '100%', background: '#0D1B2A', border: '1px solid #1E3A5A', color: '#E8F4FD', borderRadius: 8, padding: '8px 12px', marginBottom: 8, boxSizing: 'border-box' }} />

            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input value={editAparat.adresa || ''} onChange={e => setEditAparat({ ...editAparat, adresa: e.target.value })}
                placeholder="Adresa"
                style={{ flex: 1, background: '#0D1B2A', border: '1px solid #1E3A5A', color: '#E8F4FD', borderRadius: 8, padding: '8px 12px', boxSizing: 'border-box' }} />
              <button onClick={() => setPokaziEditMapu(!pokaziEditMapu)} style={{
                background: pokaziEditMapu ? '#1B85B8' : '#0D1B2A', border: '1px solid #1B85B8',
                color: '#E8F4FD', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', fontSize: 11, whiteSpace: 'nowrap'
              }}>
                📍 {editAparat.lat ? `${Number(editAparat.lat).toFixed(4)}, ${Number(editAparat.lng).toFixed(4)}` : 'Mapa'}
              </button>
            </div>

            {pokaziEditMapu && (
              <div style={{ marginBottom: 8, borderRadius: 8, overflow: 'hidden', height: 220 }}>
                <MapaPicker
                  lat={editAparat.lat || 42.71}
                  lng={editAparat.lng || 19.37}
                  onOdaberi={(lat, lng) => { setEditAparat({ ...editAparat, lat, lng }); setPokaziEditMapu(false) }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
              <input value={editAparat.ostecen ? '' : (editAparat.serijski_broj || '')}
                onChange={e => setEditAparat({ ...editAparat, serijski_broj: e.target.value })}
                placeholder="Serijski broj (opcionalno)"
                disabled={editAparat.ostecen}
                style={{ flex: 1, background: '#0D1B2A', border: '1px solid #1E3A5A', color: editAparat.ostecen ? '#555' : '#E8F4FD', borderRadius: 8, padding: '8px 12px', boxSizing: 'border-box' }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#E63946', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <input type="checkbox" checked={editAparat.ostecen}
                  onChange={e => setEditAparat({ ...editAparat, ostecen: e.target.checked, serijski_broj: '' })}
                  style={{ accentColor: '#E63946' }} />
                Oštećen
              </label>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ color: '#7B96B2', fontSize: 11, marginBottom: 6 }}>SLIKA APARATA</div>
              {editAparat.slika_url && !editAparat.novaSlika && (
                <img src={editAparat.slika_url} alt="trenutna"
                  style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginBottom: 6 }} />
              )}
              {editAparat.novaSlika && (
                <img src={URL.createObjectURL(editAparat.novaSlika)} alt="nova"
                  style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginBottom: 6 }} />
              )}
              <input type="file" accept="image/*" onChange={e => setEditAparat({ ...editAparat, novaSlika: e.target.files[0] })}
                style={{ color: '#E8F4FD', fontSize: 12 }} />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={snimiEdit} disabled={!editAparat.naziv}
                style={{ flex: 1, background: '#1B85B8', border: 'none', color: '#fff', borderRadius: 8, padding: 10, cursor: 'pointer', fontWeight: 600, opacity: !editAparat.naziv ? 0.5 : 1 }}>
                Snimi
              </button>
              <button onClick={() => { setEditAparat(null); setPokaziEditMapu(false) }}
                style={{ background: 'transparent', border: '1px solid #1E3A5A', color: '#7B96B2', borderRadius: 8, padding: '10px 16px', cursor: 'pointer' }}>
                Odustani
              </button>
            </div>
          </div>
        </div>
      )}

      {aparati.filter(a => a.status !== 'neaktivan').map(a => {
        const svePrijave = prijave.filter(p => p.aparat_id === a.id)
        const montazaDatum = a.montaza_datum ? new Date(a.montaza_datum) : null
        const aktuelne = montazaDatum
          ? svePrijave.filter(p => new Date(p.created_at) >= montazaDatum)
          : svePrijave
        const historijske = montazaDatum
          ? svePrijave.filter(p => new Date(p.created_at) < montazaDatum)
          : []
        const aktivne = aktuelne.filter(p => p.status !== 'riješena' && p.status !== 'zatvorena').length

        return (
          <div key={a.id} style={{ background: '#1A2E45', border: `1px solid ${odabrani?.id === a.id ? '#1B85B8' : '#1E3A5A'}`, borderRadius: 10, padding: 14, marginBottom: 10, cursor: 'pointer', opacity: a.status === 'neaktivan' ? 0.5 : 1 }}
            onClick={(e) => { if (e.target.closest('button')) return; odaberiAparat(a) }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{a.naziv || a.lokal}</div>
                {a.lokal && <div style={{ color: '#7B96B2', fontSize: 12 }}>{a.lokal}</div>}
                {a.vlasnik && <div style={{ color: '#7B96B2', fontSize: 12 }}>{a.vlasnik}</div>}
                {a.serijski_broj && <div style={{ color: a.serijski_broj === 'OŠTEĆEN' ? '#E63946' : '#7B96B2', fontSize: 11 }}>SN: {a.serijski_broj}</div>}
                <div style={{ color: '#1B85B8', fontSize: 11, marginTop: 2 }}>{a.id}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ background: aktivne > 0 ? '#E63946' : '#2A9D8F', color: '#fff', fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 700 }}>
                  {aktivne > 0 ? `${aktivne} aktivnih` : 'OK'}
                </span>
                <button onClick={(e) => toggleStatus(e, a)} style={{
                  background: 'transparent', border: `1px solid ${a.status === 'neaktivan' ? '#2A9D8F' : '#E63946'}`,
                  color: a.status === 'neaktivan' ? '#2A9D8F' : '#E63946', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12
                }}>
                  {a.status === 'neaktivan' ? 'Aktiviraj' : 'Deaktiviraj'}
                </button>
                <button onClick={(e) => otvoriEdit(e, a)} style={{
                  background: 'transparent', border: '1px solid #1B85B8',
                  color: '#1B85B8', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12
                }}>
                  ✏️ Edit
                </button>
              </div>
            </div>

            {odabrani?.id === a.id && qrUrl && (
              <div style={{ marginTop: 12, borderTop: '1px solid #1E3A5A', paddingTop: 12 }}>
                {a.slika_url && (
                  <img src={a.slika_url} alt="aparat"
                    onClick={() => window.open(a.slika_url, '_blank')}
                    style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8, marginBottom: 12, cursor: 'pointer' }} />
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                  <img src={qrUrl} alt="QR kod" style={{ width: 100, height: 100, borderRadius: 8 }} />
                  <div>
                    <div style={{ color: '#7B96B2', fontSize: 11, marginBottom: 4 }}>QR KOD</div>
                    <div style={{ color: '#E8F4FD', fontSize: 12, marginBottom: 8 }}>/prijava/{a.id}</div>
                    <div style={{ color: '#7B96B2', fontSize: 11, marginBottom: 8 }}>Ukupno prijava: {svePrijave.length}</div>
                    <button onClick={preuzmiQR} style={{ background: '#1B85B8', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                      📥 Preuzmi QR
                    </button>
                  </div>
                </div>

                <div style={{ color: '#7B96B2', fontSize: 11, marginBottom: 6 }}>
                  AKTUELNE PRIJAVE {montazaDatum && `(od ${montazaDatum.toLocaleDateString('bs-BA')})`}
                </div>
                {aktuelne.length === 0 && <div style={{ color: '#7B96B2', fontSize: 12, marginBottom: 8 }}>Nema prijava.</div>}
                {aktuelne.map(p => (
                  <div key={p.id} onClick={e => { e.stopPropagation(); setPovijestModal(p) }}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #0D1B2A', cursor: 'pointer' }}>
                    <div style={{ fontSize: 12, color: '#E8F4FD' }}>{p.id}</div>
                    <StatusBadge status={p.status} />
                  </div>
                ))}

                {historijske.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <button onClick={() => setPokaziIstoriju(prev => ({ ...prev, [a.id]: !prev[a.id] }))}
                      style={{ background: 'transparent', border: '1px solid #1E3A5A', color: '#7B96B2', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11, marginBottom: 6 }}>
                      {pokaziIstoriju[a.id] ? '▲ Sakrij istoriju' : `▼ Istorija (${historijske.length})`}
                    </button>
                    {pokaziIstoriju[a.id] && historijske.map(p => (
                      <div key={p.id} onClick={e => { e.stopPropagation(); setPovijestModal(p) }}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #0D1B2A', cursor: 'pointer', opacity: 0.6 }}>
                        <div style={{ fontSize: 12, color: '#E8F4FD' }}>{p.id}</div>
                        <StatusBadge status={p.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {aparati.filter(a => a.status === 'neaktivan').length > 0 && (
        <div style={{ marginTop: 8 }}>
          <button onClick={() => setPokaziNeaktivne(p => !p)}
            style={{ background: 'transparent', border: 'none', color: '#7B96B2', cursor: 'pointer', fontSize: 12, padding: '4px 0' }}>
            {pokaziNeaktivne ? '▲ Sakrij deaktivirane' : `▼ Deaktivirani aparati (${aparati.filter(a => a.status === 'neaktivan').length})`}
          </button>
          {pokaziNeaktivne && aparati.filter(a => a.status === 'neaktivan').map(a => (
            <div key={a.id} style={{ background: '#1A2E45', border: '1px solid #1E3A5A', borderRadius: 10, padding: '10px 14px', marginTop: 6, opacity: 0.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{a.naziv || a.lokal}</div>
                <div style={{ color: '#7B96B2', fontSize: 12 }}>{a.adresa}</div>
                <div style={{ color: '#1B85B8', fontSize: 11 }}>{a.id}</div>
              </div>
              <button onClick={e => toggleStatus(e, a)} style={{
                background: 'transparent', border: '1px solid #2A9D8F',
                color: '#2A9D8F', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12
              }}>Aktiviraj</button>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Modal za historijsku prijavu */}
    {povijestModal && (
      <div onClick={() => setPovijestModal(null)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div onClick={e => e.stopPropagation()}
          style={{ background: '#1A2E45', border: '1px solid #1E3A5A', borderRadius: 12, padding: 20, width: 340, maxWidth: '90vw' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ color: '#1B85B8', fontWeight: 700, fontSize: 13 }}>{povijestModal.id}</span>
            <StatusBadge status={povijestModal.status} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ color: '#7B96B2', fontSize: 11, marginBottom: 3 }}>LOKAL</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{povijestModal.lokal || '—'}</div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ color: '#7B96B2', fontSize: 11, marginBottom: 3 }}>ADRESA</div>
            <div style={{ fontSize: 13 }}>{povijestModal.adresa || '—'}</div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ color: '#7B96B2', fontSize: 11, marginBottom: 3 }}>OPIS</div>
            <div style={{ fontSize: 13, background: '#0D1B2A', borderRadius: 8, padding: 10 }}>{povijestModal.opis || '—'}</div>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#7B96B2', marginBottom: 14 }}>
            <span>📂 {povijestModal.kategorija}</span>
            <span>🕐 {new Date(povijestModal.created_at).toLocaleDateString('bs-BA')}</span>
          </div>
          {modalDijelovi.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#7B96B2', fontSize: 11, marginBottom: 6 }}>ZAMIJENJENI DIJELOVI</div>
              {modalDijelovi.map((d, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, background: '#0D1B2A', borderRadius: 6, padding: '6px 10px', marginBottom: 4 }}>
                  <span>🔧 {d.naziv}</span>
                  <span style={{ color: '#2A9D8F', fontWeight: 600 }}>×{d.kolicina}</span>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => setPovijestModal(null)}
            style={{ width: '100%', background: '#0F4C75', border: 'none', color: '#fff', borderRadius: 8, padding: 10, cursor: 'pointer', fontWeight: 600 }}>
            Zatvori
          </button>
        </div>
      </div>
    )}
    </>
  )
}