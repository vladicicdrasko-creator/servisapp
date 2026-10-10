// Generiše brend fajlove za web aplikaciju, sajt i Flutter aplikaciju iz brand/tokens.json.
// Pokretanje: npm run brand:sync
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LANDING = path.join(ROOT, 'coffeeteam-landing')
const FLUTTER = path.resolve(ROOT, '..', 'servisapp_radnik')
const T = JSON.parse(fs.readFileSync(path.join(ROOT, 'brand/tokens.json'), 'utf8'))
const ZAGLAVLJE = 'GENERISANO iz servisapp/brand/tokens.json (npm run brand:sync) — NE MIJENJATI RUČNO.'

const bez_ = o => Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith('_')))
const osnovne = { ...bez_(T.boje), ...bez_(T.status) }
const alfaHex = a => Math.round(a * 255).toString(16).toUpperCase().padStart(2, '0')
const sve = {} // ime -> { hex (#RRGGBB ili #RRGGBBAA), upotreba }
for (const [k, v] of Object.entries(osnovne)) sve[k] = { hex: v.hex.toUpperCase(), upotreba: v.upotreba }
for (const [k, v] of Object.entries(bez_(T.uloge))) sve[k] = { hex: osnovne[v.od].hex.toUpperCase() + alfaHex(v.alfa), upotreba: v.upotreba }
const kebab = s => s.replace(/[A-Z]/g, m => '-' + m.toLowerCase())
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
const { sans, mono } = T.fontovi
const pisi = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); console.log('  ✓', path.relative(path.dirname(ROOT), p)) }

console.log('Coffee Team brend → generišem:')

// 1) Web aplikacija — CSS varijable
pisi(path.join(ROOT, 'app/brand.css'), `/* ${ZAGLAVLJE} */
:root {
${Object.entries(sve).map(([k, v]) => `  --ct-${kebab(k)}: ${v.hex}; /* ${v.upotreba} */`).join('\n')}
  --ct-font-sans: var(--font-manrope), '${sans.porodica}', ${sans.rezerva};
  --ct-font-mono: var(--font-jetbrains), '${mono.porodica}', ${mono.rezerva};
}
`)

// 2) Web aplikacija — JS konstante (za mjesta gdje CSS varijable ne rade: jsPDF, Leaflet opcije)
pisi(path.join(ROOT, 'lib/brand.js'), `// ${ZAGLAVLJE}
export const BOJE = ${JSON.stringify(Object.fromEntries(Object.entries(sve).map(([k, v]) => [k, v.hex])), null, 2)}

// RGB trojke osnovnih boja (jsPDF)
export const RGB = ${JSON.stringify(Object.fromEntries(Object.entries(osnovne).map(([k, v]) => [k, rgb(v.hex)])))}

export const KONTAKT = ${JSON.stringify(T.kontakt, null, 2)}
`)

// 3) Sajt — Tailwind v4 tema + podaci
pisi(path.join(LANDING, 'src/styles/brand.css'), `/* ${ZAGLAVLJE} */
@theme {
${Object.entries(sve).map(([k, v]) => `  --color-ct-${kebab(k)}: ${v.hex};`).join('\n')}
  --font-sans: '${sans.porodica}', ${sans.rezerva};
  --font-mono: '${mono.porodica}', ${mono.rezerva};
}
`)
const fontUrl = 'https://fonts.googleapis.com/css2?' + [sans, mono].map(f => `family=${f.porodica.replace(/ /g, '+')}:wght@${f.tezine.join(';')}`).join('&') + '&display=swap'
pisi(path.join(LANDING, 'src/brand.ts'), `// ${ZAGLAVLJE}
export const FONT_URL = ${JSON.stringify(fontUrl)}
export const BOJE = ${JSON.stringify(Object.fromEntries(Object.entries(sve).map(([k, v]) => [k, v.hex])), null, 2)} as const
export const KONTAKT = ${JSON.stringify(T.kontakt, null, 2)} as const
`)

// 4) Flutter — Dart klasa
const dartHex = h => '0x' + (h.length === 9 ? h.slice(7, 9) : 'FF') + h.slice(1, 7)
pisi(path.join(FLUTTER, 'lib/theme/brand.dart'), `// ${ZAGLAVLJE}
import 'package:flutter/painting.dart';

/// Coffee Team brend — jedini izvor boja i fontova u aplikaciji.
class CT {
  CT._();

${Object.entries(sve).map(([k, v]) => `  /// ${v.upotreba}\n  static const ${k} = Color(${dartHex(v.hex)});`).join('\n\n')}

  /// ${sans.upotreba}
  static const fontSans = '${sans.flutter}';

  /// ${mono.upotreba}
  static const fontMono = '${mono.flutter}';
}
`)

// 5) Logo i ikonice (iz zvaničnih SVG fajlova u public/brand)
const BRAND = path.join(ROOT, 'public/brand')
const svg = n => fs.readFileSync(path.join(BRAND, n), 'utf8')
const znakKrem = svg('znak-krem.svg')
const [, , vw, vh] = znakKrem.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number)
const unutra = znakKrem.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
const ikona = (vel, { rx = 0, pozadina = sve.espresso.hex, udio = 0.62 } = {}) => {
  const w = vel * udio, h = w * vh / vw
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vel} ${vel}" width="${vel}" height="${vel}">${pozadina ? `<rect width="${vel}" height="${vel}" rx="${rx}" fill="${pozadina}"/>` : ''}<svg x="${(vel - w) / 2}" y="${(vel - h) / 2}" width="${w}" height="${h}" viewBox="0 0 ${vw} ${vh}">${unutra}</svg></svg>`
}
const png = async (svgStr, izlaz, opts = {}) => {
  fs.mkdirSync(path.dirname(izlaz), { recursive: true })
  let s = sharp(Buffer.from(svgStr), { density: opts.density || 72 })
  if (opts.sirina) s = s.resize({ width: opts.sirina })
  await s.png().toFile(izlaz); console.log('  ✓', path.relative(path.dirname(ROOT), izlaz))
}
const favicon = ikona(64, { rx: 14, udio: 0.74 })
pisi(path.join(ROOT, 'app/icon.svg'), favicon)
pisi(path.join(LANDING, 'public/favicon.svg'), favicon)
await png(ikona(180, { udio: 0.62 }), path.join(ROOT, 'app/apple-icon.png'))
await png(ikona(192), path.join(BRAND, 'icon-192.png'))
await png(ikona(512), path.join(BRAND, 'icon-512.png'))
await png(ikona(96, { pozadina: null, udio: 0.86 }), path.join(BRAND, 'badge-96.png'))
await png(svg('logo-horizontalni-krem.svg'), path.join(BRAND, 'logo-horizontalni-krem.png'), { density: 300, sirina: 1200 })
await png(svg('logo-horizontalni.svg'), path.join(BRAND, 'logo-horizontalni.png'), { density: 300, sirina: 1200 })
for (const f of fs.readdirSync(BRAND).filter(f => f.endsWith('.svg'))) {
  fs.mkdirSync(path.join(LANDING, 'public/brand'), { recursive: true })
  fs.copyFileSync(path.join(BRAND, f), path.join(LANDING, 'public/brand', f))
}
console.log('  ✓ coffeeteam-landing/public/brand/*.svg (kopije zvaničnog logotipa)')
await png(svg('logo-vertikalni-krem.svg'), path.join(FLUTTER, 'assets/brand/logo-vertikalni-krem.png'), { density: 300, sirina: 900 })
await png(svg('logo-horizontalni-krem.svg'), path.join(FLUTTER, 'assets/brand/logo-horizontalni-krem.png'), { density: 300, sirina: 1200 })
await png(ikona(1024, { udio: 0.62 }), path.join(FLUTTER, 'assets/brand/launcher.png'))
await png(ikona(1024, { pozadina: null, udio: 0.50 }), path.join(FLUTTER, 'assets/brand/launcher_fg.png'))
// 6) Fontovi (brand/fonts) -> web (PDF potvrde) i Flutter
for (const [dir, ime] of [[path.join(BRAND, 'fonts'), 'public/brand/fonts'], [path.join(FLUTTER, 'assets/fonts'), 'servisapp_radnik/assets/fonts']]) {
  fs.mkdirSync(dir, { recursive: true })
  for (const f of fs.readdirSync(path.join(ROOT, 'brand/fonts'))) fs.copyFileSync(path.join(ROOT, 'brand/fonts', f), path.join(dir, f))
  console.log('  ✓', ime, '(Manrope, JetBrains Mono)')
}
// 7) Flutter pubspec — pozadina adaptivne ikonice = Espresso
const pub = path.join(FLUTTER, 'pubspec.yaml')
fs.writeFileSync(pub, fs.readFileSync(pub, 'utf8').replace(/adaptive_icon_background: "#[0-9A-Fa-f]{6}"/, `adaptive_icon_background: "${sve.espresso.hex}"`))
console.log('  ✓ servisapp_radnik/pubspec.yaml (pozadina ikonice)')
console.log('Gotovo.')
