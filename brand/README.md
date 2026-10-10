# Coffee Team brend

Jedini izvor boja, fontova i kontakt podataka za **web aplikaciju, sajt i Flutter aplikaciju** je
[`tokens.json`](tokens.json), prepisan iz knjige standarda (`logo/2026_Knjiga_Standarda_Coffee_team_company_logo.pdf`, v1.1).
Zvanični logotipi su u [`public/brand/`](../public/brand), fontovi u [`fonts/`](fonts).

## Komande

```bash
npm run brand:sync    # posle izmjene tokens.json — regeneriše sve ispod
npm run brand:check   # pada ako se bilo gdje pojavi boja ili font van tokena
```

`brand:sync` generiše (ne mijenjati ručno):

| Fajl | Za |
|------|----|
| `app/brand.css` | CSS varijable `--ct-*` za web aplikaciju |
| `lib/brand.js` | JS konstante (jsPDF, Leaflet opcije — mjesta gdje CSS varijable ne rade) |
| `coffeeteam-landing/src/styles/brand.css`, `src/brand.ts` | Tailwind tema `ct-*` i kontakt podaci za sajt |
| `servisapp_radnik/lib/theme/brand.dart` | Klasa `CT` za Flutter |
| ikonice, PNG logotipi, kopije fontova | favicon, push notifikacije, ikonica aplikacije, PDF |

## Teme

U `tokens.json` su dvije teme — `pozitiv` (svijetla, "Mono" iz knjige — osnovna upotreba) i `negativ` (tamna).
Aktivna je ona u polju `aktivnaTema`. Kod NE koristi boje palete direktno nego **uloge**, pa se cijeli
izgled (web, sajt, Flutter) mijenja promjenom jedne riječi i `npm run brand:sync`:

| Uloga | pozitiv | negativ |
|-------|---------|---------|
| `pozadina` | papir | espresso |
| `povrsina` (kartice, zaglavlje) | krem | tamno braon |
| `tekst` | tamno braon | krem negativ |
| `prigusen` | tamno braon 70% | siva kafa negativ |
| `akcent` | bakar | svijetli bakar |
| `dugme` / `dugmeTekst` | bakar / krem | bakar / krem |
| `rub`, `odabrano`, `zastor` | providne varijante palete | providne varijante palete |

## Pravila upotrebe

- U kodu se koriste samo uloge (`var(--ct-pozadina)`, `bg-ct-povrsina`, `CT.tekst`…). Paleta direktno samo za
  fiksne stvari: PDF memorandum i iskačući prozori na mapi (uvijek svijetli).
- **Primarno dugme:** pozadina `bakar`, tekst `krem`.
- **Statusne boje** (`uspjeh`, `upozorenje`, `greska`, `uToku`) samo za status — knjiga ih ne definiše, nikad za dekoraciju.
  Svaka tema ima svoje nijanse (u pozitivu tamnije, zbog kontrasta).
- **Fontovi:** Manrope za naslove i tekst; JetBrains Mono za labele i oznake (velika slova, razmak između slova),
  brojeve naloga, kontakt i tehničke detalje.
- **Logo:** samo preko `components/BrandLogo.js` (web) i `lib/theme/brand_widgets.dart` (Flutter).
  Ton logotipa bira aktivna tema (pozitiv ili krem). Minimalno: znak 32 px, horizontalni logo 120 px širine.
  Znak je uvijek jednobojan.
- Zajednički stilovi zaglavlja i formi su u `components/brendStil.js` — nova stranica ih koristi, ne pravi svoje.
