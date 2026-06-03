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
