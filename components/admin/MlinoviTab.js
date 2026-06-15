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

  useEffect(() => {
    ucitaj()
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
    const qr = await QRCode.toDataURL(`MLN-${m.id}`, { width: 200, margin: 1 })
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
          <button onClick={() => setForma(!forma)} style={{ background: '#1B85B8', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            + Dodaj mlin
          </button>
        </div>
      </div>

      {poruka && <div style={{ color: poruka.tip === 'ok' ? '#2A9D8F' : '#E63946', fontSize: 13, marginBottom: 12 }}>{poruka.tekst}</div>}

      {forma && (
        <div style={{ background: '#1A2E45', border: '1px solid #1B85B8', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#7B96B2' }}>NOVI MLIN</h3>
          <input value={noviMlin.model} onChange={e => setNoviMlin({ ...noviMlin, model: e.target.value })}
            placeholder="Model *" style={inp} />
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
                  <div style={{ color: '#E8F4FD', fontSize: 12, marginBottom: 8 }}>{m.id}</div>
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
