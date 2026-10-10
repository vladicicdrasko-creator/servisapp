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

## Pravila upotrebe

- **Tamna podloga (aplikacija):** pozadina `espresso`, kartice i zaglavlja `tamnoBraon`, tekst `kremNegativ`,
  prigušeni tekst i labele `sivaKafaNegativ`, akcent (linkovi, ikone, ivice) `svijetliBakar`, ivice `rub`.
- **Svijetla podloga (sajt, PDF, popupi na mapi):** pozadina `krem`/`papir`, tekst `tamnoBraon`, prigušeno `sivaKafa`, akcent `bakar`.
- **Primarno dugme:** pozadina `bakar`, tekst `krem`.
- **Statusne boje** (`uspjeh`, `upozorenje`, `greska`, `uToku`) samo za status — knjiga ih ne definiše, nikad za dekoraciju.
- **Fontovi:** Manrope za naslove i tekst; JetBrains Mono za labele i oznake (velika slova, razmak između slova),
  brojeve naloga, kontakt i tehničke detalje.
- **Logo:** samo preko `components/BrandLogo.js` (web) i `lib/theme/brand_widgets.dart` (Flutter).
  Na tamnom krem verzija, na svijetlom pozitiv. Minimalno: znak 32 px, horizontalni logo 120 px širine.
  Znak je uvijek jednobojan.
- Zajednički stilovi zaglavlja i formi su u `components/brendStil.js` — nova stranica ih koristi, ne pravi svoje.
