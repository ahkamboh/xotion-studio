# Font library

~73 design-grade families (Canva/Illustrator-class) ship in `assets/fonts/` as `.ttf`.
Files are named `<family-slug>-<weight>.ttf` (e.g. `montserrat-700.ttf`, `bebas-neue-400.ttf`).

**Use in a composition** — copy the font into the project and add `@font-face`:
```css
@font-face {
  font-family: "Montserrat";
  font-weight: 700;
  src: url("assets/fonts/montserrat-700.ttf") format("truetype");
}
```
`new-project.sh` copies the whole library into each project's `assets/fonts/`. Reference only
the weights you actually use. Re-download / top up anytime: `python3 scripts/download-fonts.py`.

## Pick by job

| Need | Reach for |
|---|---|
| Clean modern UI / body | Inter, DM Sans, Manrope, Plus Jakarta Sans, Figtree, Hanken Grotesk, Work Sans |
| Friendly / rounded | Poppins, Nunito, Quicksand, Comfortaa, Mulish, Rubik |
| Bold poster headline | Bebas Neue, Anton, Archivo Black, Alfa Slab One, Titan One, Passion One, Fjalla One |
| Condensed / sporty | Oswald, Teko, Khand, Barlow Condensed, Saira Condensed, Archivo Narrow |
| Trendy / editorial display | Space Grotesk, Syne, Unbounded, Bricolage Grotesque, Gabarito, Schibsted Grotesk |
| Elegant serif headline | Playfair Display, DM Serif Display, Fraunces, Cormorant Garamond, Bodoni Moda, Abril Fatface |
| Readable serif body | Lora, Merriweather, EB Garamond, Source Serif 4, Spectral, Newsreader, Crimson Pro, Libre Baskerville |
| Editorial italic accent | Instrument Serif (italic), Playfair Display italic, Fraunces |
| Script / handwriting | Pacifico, Dancing Script, Great Vibes, Caveat, Satisfy, Sacramento, Allura, Lobster, Kaushan Script, Yellowtail, Cookie, Parisienne |
| Code / mono / tech HUD | JetBrains Mono, Space Mono, IBM Plex Mono, Fira Code, Roboto Mono |

## Pairing cheat sheet (safe, high-impact combos)

- **Modern brand:** Space Grotesk (head) + Inter (body)
- **Editorial / luxury:** Playfair Display or Fraunces (head) + Lora or Source Serif (body)
- **Bold social / promo:** Anton or Bebas Neue (head) + Poppins (body)
- **Friendly product:** Poppins (head) + Nunito (body)
- **Tech / data:** Space Grotesk (head) + JetBrains Mono (data/labels)
- **Romantic / wedding:** Great Vibes or Dancing Script (script) + Cormorant Garamond (body)
- **Editorial contrast:** Instrument Serif italic (accent words) + Inter (rest) — the house lyric look

## Full family list

Sans: inter, poppins, montserrat, roboto, open-sans, lato, work-sans, dm-sans, manrope,
plus-jakarta-sans, outfit, sora, figtree, hanken-grotesk, archivo, nunito, nunito-sans,
quicksand, josefin-sans, comfortaa, mulish, rubik, barlow, karla, epilogue, onest, schibsted-grotesk

Display: bebas-neue, anton, oswald, archivo-black, bungee, righteous, teko, khand,
bricolage-grotesque, unbounded, syne, gabarito, fjalla-one, alfa-slab-one, titan-one, passion-one

Serif: playfair-display, merriweather, lora, cormorant-garamond, eb-garamond, libre-baskerville,
dm-serif-display, dm-serif-text, instrument-serif, crimson-pro, source-serif-4, fraunces,
newsreader, spectral, bodoni-moda, abril-fatface

Script: pacifico, dancing-script, great-vibes, caveat, satisfy, sacramento, allura, lobster,
kaushan-script, yellowtail, cookie, parisienne

Mono: jetbrains-mono, space-mono, ibm-plex-mono, fira-code, roboto-mono

Condensed: barlow-condensed, saira-condensed, archivo-narrow

Trendy: space-grotesk

> Tip: list available weights for a family with `ls assets/fonts/<slug>-*.ttf`.
