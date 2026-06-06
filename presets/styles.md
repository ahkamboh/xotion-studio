# Visual styles (art direction presets)

Each style is a **complete look**: palette + font pairing + layout + motion personality + default
ratio. From the user's prompt, read the signals and pick the closest style (or blend two). A
`brand.json` overrides palette/fonts. Drop the style's `:root` block into the composition and use its
fonts from `assets/fonts/`. Don't invent colors per-element — commit to one style's tokens.

## How to choose (prompt signals → style)

| If the prompt is about… | Use style |
|---|---|
| luxury, fashion, perfume, jewelry, premium, elegant | **Luxe Noir** |
| sale, hype, drop, viral, Gen-Z, loud, social | **Bold Pop** |
| SaaS, B2B, finance, consulting, dashboard, corporate | **Clean Corporate** |
| story, lifestyle, food, travel blog, magazine, editorial | **Warm Editorial** |
| AI, tech, crypto, gaming, futuristic, cyber | **Neon Cyber** |
| wellness, beauty, skincare, kids, soft, gentle | **Soft Pastel** |
| trailer, real estate, travel, dramatic, film | **Cinematic** |
| architecture, portfolio, high-end minimal, gallery | **Minimal Mono** |
| app, event, party, playful, friendly brand | **Playful** |
| sustainability, outdoor, organic, natural, earthy | **Organic Nature** |
| startup, fintech, modern SaaS, product launch | **Tech Gradient** |
| streetwear, music, bold editorial, underground | **Brutalist Bold** |

Mood overrides industry when they conflict (a "playful bank" → lean Playful, keep trustworthy color).
Energy word sets motion: calm/elegant → slow eases; bold/hype → fast punch-in.

---

## Luxe Noir — dark + gold, elegant
Use: luxury, fashion, perfume. Fonts: **Playfair Display** (head) + **Inter** (body) + **Cormorant Garamond** (accent italic). Layout: centered, lots of negative space, thin gold rules. Motion: slow (.7–1s), expo.out, letter-cascade, breathing gold orb. Ratio: 9:16 social / 16:9 film.
```css
:root{ --bg:#0a0a0c; --fg:#f4f1ea; --muted:rgba(244,241,234,.5); --accent:#d4a574; --accent2:#caa15f; }
/* fonts: playfair-display-700, inter-500, cormorant-garamond-500 */
```

## Bold Pop — bright + black, punchy
Use: sales, hype, Gen-Z social. Fonts: **Anton** or **Bebas Neue** (head) + **Poppins** (body). Layout: huge text, off-center, color blocks, sticker tags. Motion: fast (.15–.3s), back.out/punch-in, shake, hard-cut. Ratio: 9:16.
```css
:root{ --bg:#fff200; --fg:#0a0a0a; --muted:rgba(10,10,10,.6); --accent:#ff2e63; --accent2:#08d9d6; }
/* fonts: anton-400, poppins-700 */
```

## Clean Corporate — white + navy, trustworthy
Use: SaaS, finance, B2B. Fonts: **DM Sans** or **Inter** (head) + **Inter** (body). Layout: grid, left-aligned, cards, data. Motion: medium (.3–.5s), power3.out, count-up, slide. Ratio: 16:9.
```css
:root{ --bg:#0b1f3a; --fg:#f5f8ff; --muted:rgba(245,248,255,.6); --accent:#4a90ff; --accent2:#27c7a7; }
/* fonts: dm-sans-700, inter-500  (or light theme: --bg:#f7f9fc --fg:#0b1f3a) */
```

## Warm Editorial — cream + terracotta, magazine
Use: story, lifestyle, food, travel. Fonts: **Fraunces** or **Lora** (head) + **Inter** (body). Layout: editorial columns, big serif headline, ample margins. Motion: gentle (.5–.7s), power2.out, mask-wipe. Ratio: 16:9 / 4:5.
```css
:root{ --bg:#f4ede0; --fg:#2a2018; --muted:rgba(42,32,24,.55); --accent:#c2562f; --accent2:#7a8b5a; }
/* fonts: fraunces-600, inter-500 */
```

## Neon Cyber — black + neon, futuristic
Use: AI, tech, crypto, gaming. Fonts: **Space Grotesk** or **Unbounded** (head) + **JetBrains Mono** (labels/data). Layout: HUD, grid lines, glow, scanlines. Motion: medium-fast, glow-flash, glitch/shake, draw-line. Ratio: 16:9 / 9:16.
```css
:root{ --bg:#06060f; --fg:#e8f0ff; --muted:rgba(232,240,255,.5); --accent:#00f0ff; --accent2:#ff2bd6; }
/* fonts: space-grotesk-700, jetbrains-mono-500 */
```

## Soft Pastel — light + muted, gentle
Use: wellness, beauty, kids. Fonts: **Quicksand** or **Nunito** (head) + **Poppins** (body). Layout: centered, rounded shapes, soft shadows. Motion: soft (.5–.7s), back.out(1.2), float. Ratio: 9:16 / 1:1.
```css
:root{ --bg:#faf3ef; --fg:#4a4039; --muted:rgba(74,64,57,.5); --accent:#e8a598; --accent2:#a8c3b0; }
/* fonts: quicksand-700, poppins-500 */
```

## Cinematic — teal-orange, dramatic
Use: trailers, real estate, travel. Fonts: **Oswald** or **Anton** (head) + **Inter** (body). Layout: full-bleed image, lower-third text, letterbox feel. Motion: slow push (.7–1.2s), ken-burns, crossfade. Ratio: 16:9 (or 9:16 social). Use `scripts/grade.sh ... cine`.
```css
:root{ --bg:#06080a; --fg:#f3f1ec; --muted:rgba(243,241,236,.6); --accent:#f5a623; --accent2:#1f6f8b; }
/* fonts: oswald-600, inter-500 */
```

## Minimal Mono — black/white, restrained
Use: architecture, portfolio, high-end minimal. Fonts: **Space Grotesk** or **Inter** only, weights for hierarchy. Layout: massive negative space, one focal point, hairline rules. Motion: subtle (.4–.6s), opacity + small moves, no bounce. Ratio: 16:9 / 1:1.
```css
:root{ --bg:#0d0d0d; --fg:#fafafa; --muted:rgba(250,250,250,.45); --accent:#fafafa; --accent2:#8a8a8a; }
/* fonts: space-grotesk-700, inter-400  (or invert for light) */
```

## Playful — vibrant multi, bouncy
Use: apps, events, friendly brands. Fonts: **Bricolage Grotesque** or **Gabarito** (head) + **Poppins** (body). Layout: asymmetric, shapes, emoji-scale accents. Motion: fast bouncy, back.out(2), scale-pop, word-pop. Ratio: 9:16 / 1:1.
```css
:root{ --bg:#5b4cff; --fg:#ffffff; --muted:rgba(255,255,255,.7); --accent:#ffd23f; --accent2:#ff6b9d; }
/* fonts: bricolage-grotesque-800, poppins-700 */
```

## Organic Nature — earth tones, flowing
Use: sustainability, outdoor, organic. Fonts: **Spectral** or **EB Garamond** (head) + **Work Sans** (body). Layout: soft, image-led, leaf/curve motifs. Motion: gentle flowing (.6–.8s), sine eases, drift. Ratio: 16:9 / 4:5.
```css
:root{ --bg:#1f2419; --fg:#eef0e6; --muted:rgba(238,240,230,.55); --accent:#8aa86b; --accent2:#c98a3f; }
/* fonts: spectral-600, work-sans-500 */
```

## Tech Gradient — blue-purple gradient, glassy
Use: startups, fintech, modern SaaS. Fonts: **Sora** or **Manrope** (head) + **Inter** (body). Layout: gradient bg, glass cards, centered. Motion: smooth (.4–.6s), expo.out, slide + fade, count-up. Ratio: 16:9 / 9:16.
```css
:root{ --bg:#0b0820; --fg:#f2f0ff; --muted:rgba(242,240,255,.6); --accent:#7b5cff; --accent2:#3fa9ff;
  --grad:linear-gradient(135deg,#7b5cff,#3fa9ff); }
/* fonts: sora-700, inter-500 ; use --grad on bg + glass: rgba(255,255,255,.06)+blur */
```

## Brutalist Bold — raw editorial, hard
Use: streetwear, music, underground. Fonts: **Archivo Black** or **Anton** (head) + **Archivo** (body). Layout: raw grid, oversized type bleeding off-frame, borders. Motion: snappy hard-cut, no easing softness, scale steps. Ratio: 9:16 / 1:1.
```css
:root{ --bg:#ece8e1; --fg:#0a0a0a; --muted:rgba(10,10,10,.6); --accent:#ff3b00; --accent2:#0a0a0a; }
/* fonts: archivo-black-400, archivo-600 */
```

---

## Aspect ratio — pick by platform/intent
| Platform / intent | Ratio | Size |
|---|---|---|
| YouTube, presentation, film, landscape ad | **16:9** | 1920×1080 |
| Shorts, Reels, TikTok, Stories, vertical ad | **9:16** | 1080×1920 |
| Instagram feed (modern) | **4:5** | 1080×1350 |
| Instagram feed (square), profile loops | **1:1** | 1080×1080 |
If the user names a platform, use its ratio. If not and it's social → default 9:16; if it's
"YouTube/explainer/presentation" → 16:9. When unsure between two, ask once.

## The art-direction decision (what the agent does)
1. Brand kit present? → use its tokens, skip palette/font choice.
2. Else: read industry + mood + audience → pick a style above (blend if needed).
3. Pick ratio from platform/intent.
4. Pick motion personality from the style + energy words (slow elegant vs fast punchy).
5. Drop the `:root` block, wire the style's fonts (`@font-face` from `assets/fonts/`), choose
   matching motion presets (`presets/motion-presets.md`) and caption style (`docs/caption-styles.md`).
6. State the style chosen in your reply ("Going with **Luxe Noir** — dark + gold, Playfair") so the
   user can redirect in one word.

---

## Editorial Brutalist — cream + ink + arrest-red, data-journalism
Use: AI/tech stat videos, "the real cost of X", op-ed explainers, numbers-driven social. Fonts: **Fraunces** (head, 900 + italic for emphasis) + **Inter** (body) + **JetBrains Mono** (labels/page-chrome). Layout: magazine furniture — mono label top-left, page counter "01/06" top-right, hairline + year bottom; giant italic serif numbers, tabular-nums; ONE ink-black tension scene mid-video. Motion: punchy (.4–.6s), back.out letter-cascade, count-up, rotated -8° stamps, hard-cut + whoosh. Ratio: 9:16.
```css
:root{ --bg:#f4f0e6; --fg:#0e0d0c; --muted:rgba(14,13,12,.42); --accent:#e0451f; --accent2:#0e0d0c;
  --bg-dark:#0e0d0c; --rule:rgba(14,13,12,.16); }
/* fonts: fraunces-900 (italic accent), inter-500, jetbrains-500 ; tracking head -0.04em / labels +0.18em */
```

## Warm Documentary — bookshelf-dark + lamp-amber + coral, Cursor-style
Use: founder announcements, product reveals, calm "report in numbers", talking-head + screen-recording explainers. Fonts: **Instrument Serif** (head, italic for emphasis) + **Inter** (body / lower-thirds) + **JetBrains Mono** (annotations/chrome). Layout: full-bleed warm interior (bookshelf bars + lamp glow + grain + vignette) OR IDE-editor mock for b-roll; clean no-box lower-thirds; italic-green "// code-comment" annotations. Motion: calm (.6s), power2.out soft fade-up 12–24px, NO overshoot, NO letter stagger, crossfade, slow ken-burns. Ratio: 9:16 / 16:9.
```css
:root{ --bg:#1a120c; --fg:#f6f1e8; --muted:rgba(246,241,232,.65); --accent:#f4c47a; --accent-warm:#d97757;
  --anno:#7fbfa4; --bg-dark:#120c07; --rule:rgba(246,241,232,.14); }
/* fonts: instrument-serif-400 (italic accent), inter-400/500, jetbrains-500 ; tracking head -0.035em / labels +0.22em */
```

**Routing (add to the choose table):**
| AI cost, stat explainer, data-journalism, "the real cost of…" | **Editorial Brutalist** |
| founder reveal, calm announcement, report-in-numbers, Cursor-style | **Warm Documentary** |

---

## Neo-Brutalist — electric flat colors + thick borders + hard shadows, loud & playful
Use: bold launch/hype reels, "loud" announcements, dev / Gen-Z social, anything high-energy. Fonts: **Archivo Black** (display) + **Space Grotesk** (body) + **JetBrains/Space Mono** (labels). Palette: electric flats — yellow #FFD23F, pink #FF5DA2, cyan #4DD9FF, lime #B8F84A, purple #9B5CFF, brand-red #e0451f, black #0a0a0a, cream #F4F1E8. Layout: full-bleed color block per scene (color switches per scene), thick black borders (6–8px), **HARD offset shadows** (no blur, 14–20px), **halftone dot + grain texture**, rotated sticker badges, **giant display numbers** (240–560px) + huge headlines (130–230px), page counters ("STEP 01/06"). Motion: SNAP — back.out overshoot, snap-in, slight entry rotation, hard cuts on the beat, **continuous idle breathe** (`Rich.idle`), motion SFX (slam impacts). **MUST use `templates/lib/richness.js`** (texture/idle/furniture/stacked shadows). Ratio: 9:16 or 16:9.
```css
:root{ --bg:#FFD23F; --fg:#0a0a0a; --accent:#e0451f; --accent2:#FF5DA2; --cyan:#4DD9FF; --lime:#B8F84A; --purple:#9B5CFF; --cream:#F4F1E8; --mono:"JetBrains Mono"; }
/* fonts: archivo-black-400 (display), space-grotesk-700 (body), jetbrains-500 (labels) ; .r-shadow2 stacked shadows + Rich.texture(dots+grain) on every scene */
```

**Routing (add to the choose table):**
| bold/loud launch reel, hype, dev or Gen-Z social, neo-brutalism | **Neo-Brutalist** |

## Psychedelic Poster — yellow + cyan + deep purple + halftone, vintage screen-print
Use: bold launch/manifesto reels, "rallying-cry" announcements, gig-poster aesthetic, anything that wants screen-print grit. Fonts: **Anton** (display, 250–500px) + **Bebas Neue** (kickers + sublabels, 28–80px +0.15em UPPERCASE) + **Inter** body (rare, 22–28px). Palette: poster-acid — yellow `#F5E531`, cyan `#5DD0E5`, deep purple `#2E1660`, accent cream `#FFF6C0`, ink `#0F0825`. Layout: massive headline dominates frame (often two stacked words), small kicker top-rule, sunburst SVG rays radiating from center-bottom or center-top, silhouette/icon hero where applicable. Texture: **heavy halftone dots overlay** (`background-image: radial-gradient(#0F0825 1.2px, transparent 1.4px); background-size: 5–7px;` with `mix-blend-mode: multiply; opacity: .35`) + grain (`svg+turbulence`, .12 opacity) + slight CRT scanline overlay. Motion: SCREEN-PRINT JITTER — `back.out(2)` slam entrances with sub-frame xy jitter idle (`Rich.idle` rot:1.5,scale:.025), occasional 2-frame color-split (cyan +6px offset, yellow -6px) on hero entrance, sunburst rays continuous slow rotation, hard cuts between scenes. **MUST use `templates/lib/richness.js`** (idle + stamp on every scene). Ratio: 9:16 vertical primary, 16:9 horizontal works for marquee. Sources: Stanley Donwood (Radiohead), Reid Miles (Blue Note covers), Aaron Draplin / Avenett modern screen-print poster aesthetic.
