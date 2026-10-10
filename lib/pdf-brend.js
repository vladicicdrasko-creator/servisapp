// PDF dokumenti po Coffee Team memorandum standardu (knjiga standarda, str. 09)
import { RGB, KONTAKT } from './brand'

const base64 = async url => {
  const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer())
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

const M = 18 // margina (mm)
const DESNO = 210 - M

export async function noviDokument() {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const fontovi = [['Manrope-400.ttf', 'Manrope', 'normal'], ['Manrope-700.ttf', 'Manrope', 'bold'], ['JetBrainsMono-400.ttf', 'JetBrainsMono', 'normal']]
  const [logo, ...ttf] = await Promise.all([base64('/brand/logo-horizontalni.png'), ...fontovi.map(([f]) => base64('/brand/fonts/' + f))])
  fontovi.forEach(([f, ime, stil], i) => { doc.addFileToVFS(f, ttf[i]); doc.addFont(f, ime, stil) })

  const boja = (ime, tip = 'Text') => doc['set' + tip + 'Color'](...RGB[ime])
  const sans = (vel, stil = 'normal') => { doc.setFont('Manrope', stil); doc.setFontSize(vel); doc.setCharSpace(0) }
  const mono = vel => { doc.setFont('JetBrainsMono', 'normal'); doc.setFontSize(vel); doc.setCharSpace(0.5) }

  // Zaglavlje: horizontalni logo u pozitivu, desno naziv firme i PIB, ispod crta 0,7 mm u espresso
  doc.addImage('data:image/png;base64,' + logo, 'PNG', M, 14, 58, 58 * 132.78 / 708.63)
  mono(7); boja('sivaKafa')
  doc.text(KONTAKT.firma, DESNO, 18, { align: 'right' })
  doc.text('PIB: ' + KONTAKT.pib, DESNO, 22.5, { align: 'right' })
  boja('espresso', 'Draw'); doc.setLineWidth(0.7); doc.line(M, 31, DESNO, 31)

  // Podnožje: telefon, adresa, PIB — tanka krem linija iznad
  boja('papir', 'Draw'); doc.setLineWidth(0.3); doc.line(M, 279, DESNO, 279)
  mono(7); boja('sivaKafa')
  doc.text(KONTAKT.telefon, M, 284)
  doc.text(KONTAKT.adresa, 105, 284, { align: 'center' })
  doc.text('PIB ' + KONTAKT.pib, DESNO, 284, { align: 'right' })

  // Meta red: mjesto · datum · broj
  const metaRed = (mjesto, datum, broj) => {
    mono(8); boja('sivaKafa')
    doc.text(mjesto.toUpperCase(), M, 38)
    doc.text(datum, 105, 38, { align: 'center' })
    doc.text('BR. ' + broj, DESNO, 38, { align: 'right' })
  }
  return { doc, boja, sans, mono, metaRed, M, DESNO }
}
