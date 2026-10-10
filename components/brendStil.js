// Zajednički stilovi panela — koriste ISKLJUČIVO brend tokene (app/brand.css). Isti na svim stranicama.

// Zaglavlje stranice (traka sa logotipom)
export const zaglavljeStil = {
  background: 'var(--ct-tamno-braon)', borderBottom: '1px solid var(--ct-rub)',
  padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
}

// Login i kratke forme
export const forma = {
  centar: { background: 'var(--ct-espresso)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--ct-font-sans)', padding: 16 },
  kartica: { background: 'var(--ct-tamno-braon)', border: '1px solid var(--ct-rub)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 380, boxSizing: 'border-box' },
  label: { fontFamily: 'var(--ct-font-mono)', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--ct-siva-kafa-negativ)', fontSize: 12, display: 'block', marginBottom: 6, marginTop: 4 },
  polje: { width: '100%', background: 'var(--ct-espresso)', border: '1px solid var(--ct-rub)', color: 'var(--ct-krem-negativ)', borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 12 },
  oko: { position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--ct-siva-kafa-negativ)', cursor: 'pointer', fontSize: 16 },
  dugme: { width: '100%', background: 'var(--ct-bakar)', border: 'none', color: 'var(--ct-krem)', borderRadius: 10, padding: 13, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 8 },
  greska: { color: 'var(--ct-greska)', background: 'var(--ct-greska-pozadina)', fontSize: 13, borderRadius: 8, padding: '8px 12px', margin: '8px 0' },
}
