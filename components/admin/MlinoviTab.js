'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase-browser'
import QRCode from 'qrcode'

const supabase = createClient()

export default function MlinoviTab() {
  const [mlinovi, setMlinovi] = useState([])
  const [aparati, setAparati] = useState([])
  const [loading, setLoading] = useState(true)
  const [forma, setForma] = useState(false)
  const [poruka, setPoruka] = useState(null)
  const [odabrani, setOdabrani] = useState(null)
  const [qrUrl, setQrUrl] = useState(null)
  const [editMlin, setEditMlin] = useState(null)
  const [noviMlin, setNoviMlin] = useState({ model: '', marka: '', lokal: '', serijski_broj: '' })
  const [modeli, setModeli] = useState([])
  const [pokaziModele, setPokaziModele] = useState(false)
  const [noviModel, setNoviModel] = useState({ naziv: '', proizvodjac: '' })
  const [editModel, setEditModel] = useState(null)
  const [modelCheckliste, setModelCheckliste] = useState({})
  const [novaStavka, setNovaStavka] = useState({})

  const KATEGORIJE = ['Curi voda', 'Ne grije', 'Buka / vibracije', 'Mlin ne radi', 'Pušta paru', 'Ostalo']

  const ucitajModele = async () => {
    const { data } = await supabase.from('modeli_mlinova').select('*').order('naziv')
    setModeli(data || [])
  }

  const dodajModel = async () => {
    if (!noviModel.naziv) return
    await supabase.from('modeli_mlinova').insert({ naziv: noviModel.naziv, proizvodjac: noviModel.proizvodjac || null })
    setNoviModel({ naziv: '', proizvodjac: '' })
    ucitajModele()
  }

  const ucitajCheckliste = async (modelId) => {
    const { data } = await supabase.from('modeli_mlinova_checkliste').select('*').eq('model_id', modelId)
    const mapa = {}
    ;(data || []).forEach(c => { mapa[c.kategorija] = c })
    setModelCheckliste(mapa)
  }

  const otvoriEditModel = async (m) => { setEditModel({ ...m }); await ucitajCheckliste(m.id) }

  const snimiModel = async () => {
    await supabase.from('modeli_mlinova').update({ naziv: editModel.naziv, proizvodjac: editModel.proizvodjac || null, napomena: editModel.napomena || null }).eq('id', editModel.id)
    setEditModel(null); setModelCheckliste({}); ucitajModele()
  }

  const obrisiModel = async (id) => {
    if (!window.confirm('Obriši model?')) return
    await supabase.from('modeli_mlinova').delete().eq('id', id)
    ucitajModele()
  }

  const dodajStavku = async (kategorija) => {
    const tekst = novaStavka[kategorija]?.trim()
    if (!tekst) return
    const postojeci = modelCheckliste[kategorija]
    const stavke = postojeci ? [...postojeci.stavke, tekst] : [tekst]
    if (postojeci) await supabase.from('modeli_mlinova_checkliste').update({ stavke }).eq('id', postojeci.id)
    else await supabase.from('modeli_mlinova_checkliste').insert({ model_id: editModel.id, kategorija, stavke })
    setNovaStavka(prev => ({ ...prev, [kategorija]: '' }))
    ucitajCheckliste(editModel.id)
  }

  const obrisiStavku = async (kategorija, idx) => {
    const postojeci = modelCheckliste[kategorija]
    if (!postojeci) return
    const stavke = postojeci.stavke.filter((_, i) => i !== idx)
    await supabase.from('modeli_mlinova_checkliste').update({ stavke }).eq('id', postojeci.id)
    ucitajCheckliste(editModel.id)
  }

  const uploadPdf = async (fajl) => {
    const path = `modeli-mlinova/${editModel.id}.pdf`
    await supabase.storage.from('aparati-slike').upload(path, fajl, { upsert: true })
    const { data } = supabase.storage.from('aparati-slike').getPublicUrl(path)
    await supabase.from('modeli_mlinova').update({ pdf_url: data.publicUrl }).eq('id', editModel.id)
    setEditModel(prev => ({ ...prev, pdf_url: data.publicUrl }))
    ucitajModele()
  }

  useEffect(() => {
    ucitaj()
    ucitajModele()
    const kanal = supabase
      .channel('mlinovi-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mlinovi' }, () => ucitaj())
      .subscribe()
    const interval = setInterval(ucitaj, 15000)
    return () => { supabase.removeChannel(kanal); clearInterval(interval) }
  }, [])

  const ucitaj = async () => {
    const [{ data: m }, { data: a }] = await Promise.all([
      supabase.from('mlinovi').select('*').order('created_at', { ascending: false }),
      supabase.from('aparati').select('lokal').eq('status', 'aktivan').not('lokal', 'is', null),
    ])
    setMlinovi(m || [])
    const lokali = [...new Set((a || []).map(x => x.lokal).filter(Boolean))].sort()
    setAparati(lokali)
    setLoading(false)
  }

  const lokali = aparati

  const odaberiMlin = async (m) => {
    if (odabrani?.id === m.id) { setOdabrani(null); setQrUrl(null); return }
    setOdabrani(m)
    const url = `${window.location.origin}/prijava/${m.id}`
    const qr = await QRCode.toDataURL(url, { width: 200, margin: 1 })
    setQrUrl(qr)
  }

  const preuzmiQR = () => {
    const link = document.createElement('a')
    link.href = qrUrl
    link.download = `QR-${odabrani.id}.png`
    link.click()
  }

  const uploadSlika = async (fajl, id) => {
    const ext = fajl.name.split('.').pop()
    const path = `mlinovi/${id}.${ext}`
    await supabase.storage.from('aparati-slike').upload(path, fajl, { upsert: true })
    const { data } = supabase.storage.from('aparati-slike').getPublicUrl(path)
    return data.publicUrl
  }

  const dodajMlin = async () => {
    setLoading(true)
    const id = 'MLN-' + Date.now().toString().slice(-6)
    let slikaUrl = null
    if (noviMlin.slika) slikaUrl = await uploadSlika(noviMlin.slika, id)
    const { error } = await supabase.from('mlinovi').insert({
      id, model: noviMlin.model, marka: noviMlin.marka || null,
      lokal: noviMlin.lokal || null, serijski_broj: noviMlin.serijski_broj || null,
      status: 'aktivan', slika_url: slikaUrl,
    })
    setLoading(false)
    if (error) { setPoruka({ tip: 'greska', tekst: error.message }); return }
    setPoruka({ tip: 'ok', tekst: 'Mlin dodan!' })
    setForma(false)
    setNoviMlin({ model: '', marka: '', lokal: '', serijski_broj: '' })
    ucitaj()
    setTimeout(() => setPoruka(null), 2000)
  }

  const snimiEdit = async () => {
    let slikaUrl = editMlin.slika_url
    if (editMlin.novaSlika) slikaUrl = await uploadSlika(editMlin.novaSlika, editMlin.id)
    await supabase.from('mlinovi').update({
      model: editMlin.model, marka: editMlin.marka || null,
      lokal: editMlin.lokal || null, serijski_broj: editMlin.serijski_broj || null,
      slika_url: slikaUrl,
    }).eq('id', editMlin.id)
    setEditMlin(null)
    ucitaj()
  }

  const toggleStatus = async (e, m) => {
    e.stopPropagation()
    const noviStatus = m.status === 'neaktivan' ? 'aktivan' : 'neaktivan'
    if (!window.confirm(`${noviStatus === 'neaktivan' ? 'Deaktiviraj' : 'Aktiviraj'} mlin "${m.model}"?`)) return
    await supabase.from('mlinovi').update({ status: noviStatus }).eq('id', m.id)
    ucitaj()
  }

  const exportExcel = async () => {
    const { utils, writeFile } = await import('xlsx')
    const podaci = mlinovi.map(m => ({
      'ID': m.id, 'Model': m.model || '', 'Marka': m.marka || '',
      'Lokal': m.lokal || '', 'Serijski broj': m.serijski_broj || '', 'Status': m.status || '',
    }))
    const ws = utils.json_to_sheet(podaci)
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'Mlinovi')
    writeFile(wb, `mlinovi_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const inp = { width: '100%', background: '#0D1B2A', border: '1px solid #1E3A5A', color: '#E8F4FD', borderRadius: 8, padding: '8px 12px', marginBottom: 8, boxSizing: 'border-box' }
  const sel = { ...inp, marginBottom: 8 }

  if (loading) return <div style={{ color: '#7B96B2', padding: 40, textAlign: 'center' }}>Učitavam...</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>Mlinovi ({mlinovi.filter(m => m.status !== 'neaktivan').length})</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportExcel} style={{ background: 'transparent', border: '1px solid #2A9D8F', color: '#2A9D8F', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>↓ Export</button>
          <button onClick={() => { setPokaziModele(!pokaziModele); setForma(false) }} style={{ background: pokaziModele ? '#1E3A5A' : 'transparent', border: '1px solid #1E3A5A', color: '#7B96B2', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>☰ Modeli</button>
          <button onClick={() => { setForma(!forma); setPokaziModele(false) }} style={{ background: '#1B85B8', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            + Dodaj mlin
          </button>
        </div>
      </div>

      {poruka && <div style={{ color: poruka.tip === 'ok' ? '#2A9D8F' : '#E63946', fontSize: 13, marginBottom: 12 }}>{poruka.tekst}</div>}

      {pokaziModele && (
        <div style={{ background: '#1A2E45', border: '1px solid #1E3A5A', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#7B96B2' }}>MODELI MLINOVA</h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input value={noviModel.naziv} onChange={e => setNoviModel({ ...noviModel, naziv: e.target.value })} placeholder="Naziv modela *" style={{ flex: 1, background: '#0D1B2A', border: '1px solid #1E3A5A', color: '#E8F4FD', borderRadius: 8, padding: '8px 12px', boxSizing: 'border-box' }} />
            <input value={noviModel.proizvodjac} onChange={e => setNoviModel({ ...noviModel, proizvodjac: e.target.value })} placeholder="Proizvođač" style={{ flex: 1, background: '#0D1B2A', border: '1px solid #1E3A5A', color: '#E8F4FD', borderRadius: 8, padding: '8px 12px', boxSizing: 'border-box' }} />
            <button onClick={dodajModel} style={{ background: '#1B85B8', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontWeight: 600 }}>+ Dodaj</button>
          </div>
          {modeli.length === 0 && <div style={{ color: '#7B96B2', fontSize: 13 }}>Nema modela.</div>}
          {modeli.map(m => (
            <div key={m.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid #0D1B2A' }}>
                <div style={{ flex: 1, color: '#E8F4FD', fontSize: 13, fontWeight: 600 }}>{m.naziv}</div>
                <div style={{ flex: 1, color: '#7B96B2', fontSize: 12 }}>{m.proizvodjac || '—'}</div>
                <button onClick={() => editModel?.id === m.id ? (setEditModel(null), setModelCheckliste({})) : otvoriEditModel(m)} style={{ background: editModel?.id === m.id ? '#1B85B8' : 'transparent', border: '1px solid #1E3A5A', color: editModel?.id === m.id ? '#fff' : '#7B96B2', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>{editModel?.id === m.id ? 'Zatvori' : 'Uredi'}</button>
                <button onClick={() => obrisiModel(m.id)} style={{ background: 'transparent', border: '1px solid #E63946', color: '#E63946', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>Briši</button>
              </div>
              {editModel?.id === m.id && (
                <div style={{ background: '#0D1B2A', borderRadius: 8, padding: 14, margin: '8px 0 12px' }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input value={editModel.naziv} onChange={e => setEditModel({ ...editModel, naziv: e.target.value })} placeholder="Naziv" style={{ flex: 1, background: '#132338', border: '1px solid #1E3A5A', color: '#E8F4FD', borderRadius: 6, padding: '6px 10px' }} />
                    <input value={editModel.proizvodjac || ''} onChange={e => setEditModel({ ...editModel, proizvodjac: e.target.value })} placeholder="Proizvođač" style={{ flex: 1, background: '#132338', border: '1px solid #1E3A5A', color: '#E8F4FD', borderRadius: 6, padding: '6px 10px' }} />
                  </div>
                  <textarea value={editModel.napomena || ''} onChange={e => setEditModel({ ...editModel, napomena: e.target.value })} placeholder="Opšte napomene za ovaj model" rows={2} style={{ width: '100%', background: '#132338', border: '1px solid #1E3A5A', color: '#E8F4FD', borderRadius: 6, padding: '6px 10px', resize: 'none', boxSizing: 'border-box', marginBottom: 8 }} />
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
                        <input value={novaStavka[kat] || ''} onChange={e => setNovaStavka(prev => ({ ...prev, [kat]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && dodajStavku(kat)} placeholder="Dodaj stavku..." style={{ flex: 1, background: '#0D1B2A', border: '1px solid #1E3A5A', color: '#E8F4FD', borderRadius: 6, padding: '4px 8px', fontSize: 12 }} />
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
          <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#7B96B2' }}>NOVI MLIN</h3>
          <select value={noviMlin.model} onChange={e => {
              const mod = modeli.find(x => x.naziv === e.target.value)
              setNoviMlin({ ...noviMlin, model: e.target.value, marka: mod?.proizvodjac || noviMlin.marka })
            }} style={{ ...sel, color: noviMlin.model ? '#E8F4FD' : '#7B96B2' }}>
            <option value="">-- Odaberi model mlina *</option>
            {modeli.map(m => <option key={m.id} value={m.naziv}>{m.naziv}{m.proizvodjac ? ` (${m.proizvodjac})` : ''}</option>)}
          </select>
          <input value={noviMlin.marka} onChange={e => setNoviMlin({ ...noviMlin, marka: e.target.value })}
            placeholder="Marka / Proizvođač" style={inp} />
          <select value={noviMlin.lokal} onChange={e => setNoviMlin({ ...noviMlin, lokal: e.target.value })} style={sel}>
            <option value="">-- Odaberi lokal</option>
            {lokali.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <input value={noviMlin.serijski_broj} onChange={e => setNoviMlin({ ...noviMlin, serijski_broj: e.target.value })}
            placeholder="Serijski broj (opcionalno)" style={inp} />
          <div style={{ marginBottom: 8 }}>
            <label style={{ color: '#7B96B2', fontSize: 12, display: 'block', marginBottom: 4 }}>SLIKA (opcionalno)</label>
            <input type="file" accept="image/*" onChange={e => setNoviMlin({ ...noviMlin, slika: e.target.files[0] })}
              style={{ color: '#7B96B2', fontSize: 12 }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={dodajMlin} disabled={!noviMlin.model}
              style={{ flex: 1, background: '#1B85B8', border: 'none', color: '#fff', borderRadius: 8, padding: 10, cursor: 'pointer', fontWeight: 600, opacity: !noviMlin.model ? 0.5 : 1 }}>
              Dodaj
            </button>
            <button onClick={() => setForma(false)} style={{ background: 'transparent', border: '1px solid #1E3A5A', color: '#7B96B2', borderRadius: 8, padding: '10px 16px', cursor: 'pointer' }}>
              Odustani
            </button>
          </div>
        </div>
      )}

      {mlinovi.filter(m => m.status !== 'neaktivan').map(m => (
        <div key={m.id} style={{ background: '#1A2E45', border: `1px solid ${odabrani?.id === m.id ? '#1B85B8' : '#1E3A5A'}`, borderRadius: 10, padding: 14, marginBottom: 10, cursor: 'pointer' }}
          onClick={(e) => { if (e.target.closest('button')) return; odaberiMlin(m) }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{m.model}</div>
              {m.lokal && <div style={{ color: '#7B96B2', fontSize: 12 }}>{m.lokal}</div>}
              {m.marka && <div style={{ color: '#7B96B2', fontSize: 12 }}>{m.marka}</div>}
              {m.serijski_broj && <div style={{ color: '#7B96B2', fontSize: 11 }}>SN: {m.serijski_broj}</div>}
              <div style={{ color: '#1B85B8', fontSize: 11, marginTop: 2 }}>{m.id}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={(e) => { e.stopPropagation(); setEditMlin({ ...m }) }} style={{ background: 'transparent', border: '1px solid #1B85B8', color: '#1B85B8', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>✏️ Edit</button>
              <button onClick={(e) => toggleStatus(e, m)} style={{ background: 'transparent', border: '1px solid #E63946', color: '#E63946', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>Deaktiviraj</button>
            </div>
          </div>

          {odabrani?.id === m.id && qrUrl && (
            <div style={{ marginTop: 12, borderTop: '1px solid #1E3A5A', paddingTop: 12 }}>
              {m.slika_url && <img src={m.slika_url} alt="mlin" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8, marginBottom: 12 }} />}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <img src={qrUrl} alt="QR" style={{ width: 100, height: 100, borderRadius: 8 }} />
                <div>
                  <div style={{ color: '#7B96B2', fontSize: 11, marginBottom: 4 }}>QR KOD</div>
                  <div style={{ color: '#E8F4FD', fontSize: 12, marginBottom: 8 }}>/prijava/{m.id}</div>
                  <button onClick={preuzmiQR} style={{ background: '#1B85B8', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                    📥 Preuzmi QR
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {editMlin && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#1A2E45', border: '1px solid #1B85B8', borderRadius: 12, padding: 20, width: '100%', maxWidth: 440 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 14, color: '#7B96B2' }}>UREDI MLIN — {editMlin.id}</h3>
            <input value={editMlin.model} onChange={e => setEditMlin({ ...editMlin, model: e.target.value })} placeholder="Model *" style={inp} />
            <input value={editMlin.marka || ''} onChange={e => setEditMlin({ ...editMlin, marka: e.target.value })} placeholder="Marka" style={inp} />
            <select value={editMlin.lokal || ''} onChange={e => setEditMlin({ ...editMlin, lokal: e.target.value })} style={sel}>
              <option value="">-- Odaberi lokal</option>
              {lokali.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <input value={editMlin.serijski_broj || ''} onChange={e => setEditMlin({ ...editMlin, serijski_broj: e.target.value })} placeholder="Serijski broj" style={inp} />
            {editMlin.slika_url && !editMlin.novaSlika && (
              <img src={editMlin.slika_url} alt="slika" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />
            )}
            <input type="file" accept="image/*" onChange={e => setEditMlin({ ...editMlin, novaSlika: e.target.files[0] })} style={{ color: '#7B96B2', fontSize: 12, marginBottom: 12 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={snimiEdit} style={{ flex: 1, background: '#1B85B8', border: 'none', color: '#fff', borderRadius: 8, padding: 10, cursor: 'pointer', fontWeight: 600 }}>Sačuvaj</button>
              <button onClick={() => setEditMlin(null)} style={{ background: 'transparent', border: '1px solid #1E3A5A', color: '#7B96B2', borderRadius: 8, padding: '10px 16px', cursor: 'pointer' }}>Odustani</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
