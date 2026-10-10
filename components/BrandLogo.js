// Coffee Team logo — JEDINA komponenta za prikaz logotipa. Koristi zvanične SVG fajlove iz knjige standarda (public/brand).
// ton: 'krem' = negativ (za tamne podloge), 'pozitiv' = za svijetle podloge
const VARIJANTE = {
  horizontalni: { fajl: 'logo-horizontalni', odnos: 708.63 / 132.78, minVisina: 23 }, // min. 120 px širine
  vertikalni: { fajl: 'logo-vertikalni', odnos: 383.6 / 210.68, minVisina: 40 },
  znak: { fajl: 'znak', odnos: 191.6 / 168.4, minVisina: 28 }, // min. 32 px širine
}

// oznaka: opciono ime sekcije pored logotipa (npr. "ADMIN") — JetBrains Mono, velika slova, razmak
export default function BrandLogo({ varijanta = 'horizontalni', ton = 'krem', visina = 32, oznaka, style }) {
  const v = VARIJANTE[varijanta]
  const h = Math.max(visina, v.minVisina)
  const slika = (
    <img
      src={`/brand/${v.fajl}${ton === 'krem' ? '-krem' : ''}.svg`}
      alt="Coffee Team"
      width={Math.round(h * v.odnos)}
      height={h}
      style={{ display: 'block', height: h, width: 'auto', ...(oznaka ? {} : style) }}
    />
  )
  if (!oznaka) return slika
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, ...style }}>
      {slika}
      <span style={{
        fontFamily: 'var(--ct-font-mono)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase',
        color: 'var(--ct-siva-kafa-negativ)', borderLeft: '1px solid var(--ct-rub)', paddingLeft: 12, lineHeight: `${h}px`,
      }}>{oznaka}</span>
    </div>
  )
}

// Zaglavlje login/forme: vertikalni logo centriran + oznaka ispod (isto na svim login ekranima)
export function BrandZaglavljeForme({ oznaka }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 28 }}>
      <BrandLogo varijanta="vertikalni" visina={96} style={{ margin: '0 auto' }} />
      {oznaka && (
        <div style={{
          fontFamily: 'var(--ct-font-mono)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase',
          color: 'var(--ct-siva-kafa-negativ)', marginTop: 16,
        }}>{oznaka}</div>
      )}
    </div>
  )
}

