// Provjera brend standarda: nijedna boja ni font van brand/tokens.json.
// Pokretanje: npm run brand:check  (izlazni kod 1 ako nađe prekršaj)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FLUTTER = path.resolve(ROOT, '..', 'servisapp_radnik')

// Generisani fajlovi (jedino mjesto gdje boje smiju biti zapisane vrijednošću)
const DOZVOLJENI = ['app/brand.css', 'lib/brand.js', 'coffeeteam-landing/src/styles/brand.css', 'coffeeteam-landing/src/brand.ts', 'lib/theme/brand.dart']

const PRAVILA = {
  web: [
    [/#[0-9a-fA-F]{3,8}\b(?![\w-])/g, 'boja zapisana kao hex — koristi var(--ct-…) ili BOJE iz lib/brand.js'],
    [/\brgba?\(/g, 'rgb/rgba boja — koristi token'],
    [/set(Fill|Text|Draw)Color\(\s*\d/g, 'jsPDF boja brojevima — koristi RGB iz lib/brand.js'],
    [/fontFamily:(?!\s*'var\(--ct-font-(sans|mono)\)')/g, 'font van tokena — koristi var(--ct-font-sans|mono)'],
    [/font-family:(?!\s*(var\(--ct-font-(sans|mono)\)|inherit))/g, 'font van tokena'],
    [/\b(bg|text|border|from|via|to|ring|placeholder|fill|stroke)-(gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g, 'Tailwind boja van brenda — koristi ct-* klase'],
    [/\b(bg|text|border)-(white|black)\b/g, 'bijela/crna van brenda — koristi ct-* klase'],
  ],
  dart: [
    [/Color\(0x[0-9a-fA-F]{8}\)/g, 'boja zapisana vrijednošću — koristi CT.*'],
    [/Colors\.(?!transparent\b)\w+/g, 'Material boja van brenda — koristi CT.*'],
    [/fontFamily:\s*'(?!Manrope'|JetBrainsMono')/g, 'font van tokena — koristi CT.fontSans / CT.fontMono'],
  ],
}

const skupi = (dir, ext, izuzmi = []) => {
  const out = []
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) { if (!['node_modules', '.next', 'api', 'dist', '.astro', ...izuzmi].includes(e.name)) out.push(...skupi(p, ext, izuzmi)) }
    else if (ext.test(e.name)) out.push(p)
  }
  return out
}

const fajlovi = [
  ...['app', 'components', 'lib'].flatMap(d => skupi(path.join(ROOT, d), /\.(js|jsx|css)$/).map(f => [f, 'web', ROOT])),
  ...skupi(path.join(ROOT, 'coffeeteam-landing/src'), /\.(astro|ts|css|js)$/).map(f => [f, 'web', ROOT]),
  ...skupi(path.join(FLUTTER, 'lib'), /\.dart$/).map(f => [f, 'dart', FLUTTER]),
]

let greske = 0
for (const [f, tip, baza] of fajlovi) {
  const rel = path.relative(baza, f).split(path.sep).join('/')
  if (DOZVOLJENI.includes(rel)) continue
  fs.readFileSync(f, 'utf8').split('\n').forEach((linija, i) => {
    if (/brand-check:\s*dozvoljeno/.test(linija)) return
    for (const [re, poruka] of PRAVILA[tip]) {
      for (const m of linija.matchAll(re)) {
        greske++
        console.log(`${tip === 'dart' ? 'servisapp_radnik/' : ''}${rel}:${i + 1}  "${m[0]}"  → ${poruka}`)
      }
    }
  })
}

// Fajlovi na koje kod pokazuje (logotipi, ikonice, fontovi) moraju postojati
const dart = fs.readFileSync(path.join(FLUTTER, 'lib/theme/brand.dart'), 'utf8')
const potrebni = [
  ...[...dart.matchAll(/'(assets\/[^']+)'/g)].map(m => path.join(FLUTTER, m[1])),
  ...['logo-horizontalni.svg', 'logo-horizontalni-krem.svg', 'logo-vertikalni.svg', 'logo-vertikalni-krem.svg', 'znak.svg', 'znak-krem.svg', 'logo-horizontalni.png', 'icon-192.png', 'badge-96.png']
    .map(f => path.join(ROOT, 'public/brand', f)),
  ...fs.readdirSync(path.join(ROOT, 'brand/fonts')).flatMap(f => [path.join(ROOT, 'public/brand/fonts', f), path.join(FLUTTER, 'assets/fonts', f)]),
]
for (const f of potrebni) {
  if (!fs.existsSync(f)) { greske++; console.log(`FALI FAJL: ${path.relative(path.dirname(ROOT), f)}  → pokreni npm run brand:sync`) }
}

console.log(greske ? `\n✗ ${greske} odstupanja od brend standarda` : `✓ Brend standard OK (${fajlovi.length} fajlova, ${potrebni.length} brend fajlova postoji)`)
process.exit(greske ? 1 : 0)
