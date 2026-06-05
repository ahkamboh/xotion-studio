# Commands — short names for everything (`:` shorthand)

Type a `:name` in your prompt and the engine runs that workflow. Rules:
- **`@file` = the input, `:cmd` = the action.** e.g. `:caption :hormozi @clip.mp4`
- **Chain commands** — they run in order: `:reel :hormozi :enrich @talk.mp4`
- Pass a value with `=`: `:style=noir`, `:voice=female`, `:lang=ur`, `:dur=15`
- Unknown name → the engine picks the closest match and confirms.
- `:help` → list these. Names are intentionally short (one token).

> These are interpreted by the engine (Claude reading CLAUDE.md), not the shell. The `:` symbol is
> used because `/ @ #` are reserved by Claude Code (skills, file-picker, memory).

---

## 🎬 Make (what kind of video)
| cmd | makes | uses |
|---|---|---|
| `:lyric` | image + song → lyric video (+ thumb + reels) | `prompts/lyric-video.md` |
| `:narrate` | narrated motion-graphics video (voice + music) | `templates/narrated-motion.html` |
| `:explain` | explainer video | `prompts/motion-graphics.md` |
| `:promo` | promo / hype edit | `presets/video-presets.md` |
| `:music` | music visualizer | `templates/music-visualizer.html` |
| `:data` | numbers/CSV → animated charts | `prompts/data-video.md` |
| `:code` | animated code-typing video | `prompts/code-video.md` |
| `:app` | 3D device / glass app showcase | `prompts/app-showcase.md` |
| `:title` | title card / intro | `templates/title-card.html` |
| `:ugc` | UGC ad (vertical) | `templates/ugc-ad-vertical.html` |
| `:cards` | one template + CSV → N videos | `scripts/render-batch.py` |

## 💬 Captions (`:caption` + a preset)
| cmd | look |
|---|---|
| `:caption` | add synced captions (default) — `scripts/caption.py` |
| `:hormozi` | all-caps, black stroke, green active word (the benchmark) |
| `:beast` | MrBeast — huge caps, heavy stroke, yellow active |
| `:pill` | white caps in a springy yellow pill |
| `:neon` | glowing text, cyan active word |
| `:gradient` | teal→blue→violet gradient fill |
| `:minimal` | small clean white lower-third |
| `:tiktok` | white text on a rounded black bar |
| `:subs` | export multi-language subtitle files (30+ langs) |

## ✨ Graphics overlays (rich motion over a clip)
| cmd | adds |
|---|---|
| `:fx` | glow particles + kinetic title |
| `:3d` | three.js wireframe globe + points |
| `:atmos` | light leaks + bokeh + film grain |
| `:aurora` | flowing noise-driven aurora ribbons |
| `:glass` | frosted-glass premium title |

## 🎨 Finish / edit
| cmd | does |
|---|---|
| `:enrich` | **premium finish** — grade + bloom + grain + vignette + sharpen |
| `:blur` | motion blur (smooth fast motion) |
| `:grade` | color grade only (`:grade=cine\|teal-orange\|warm\|moody\|clean\|vibrant`) |
| `:reel` | cut the best vertical reels/Shorts |
| `:auto` | autocut — remove silence + filler words |
| `:thumb` | generate a thumbnail |
| `:yt` | encode for YouTube |
| `:bg` | remove background (green-screen-free) |
| `:gif` | export a GIF |

## 🔊 Audio
| cmd | does |
|---|---|
| `:vo` | add voiceover (TTS) — `:voice=female\|male\|af_nova\|am_onyx…` |
| `:bed` | add a music bed (`:bed=calm\|warm\|tense\|uplift\|dark`) |
| `:mix` | mix voice over music + auto-duck (−14 LUFS) |
| `:sfx` | add sound FX (whoosh/riser/impact) |
| `:norm` | normalize loudness (−14 LUFS) |

## 🎛 Style / brand / utility
| cmd | does |
|---|---|
| `:style=<name>` | apply a visual style (`presets/styles.md`: noir, tech, editorial…) |
| `:brand` | apply `brand.json` (colors/fonts/logo) |
| `:batch` | run an op over many files (`scripts/batch.sh`) |
| `:preview` | live hot-reload preview before render |
| `:qa` | run the QA acceptance loop |
| `:help` | print this list (`scripts/help.sh [group]`) |

## ⚡ Combos (one word → full pipeline)
| cmd | runs |
|---|---|
| `:short` | `:auto` → `:caption :hormozi` → `:reel` → `:enrich` (talking clip → finished Short) |
| `:ship` | make → `:caption` → `:enrich` → `:thumb` → `:yt` (build + finish + export) |
| `:rich` | `:fx` (or named overlay) → `:enrich` (plain clip → graphically rich) |
| `:ad` | hook trim → `:caption :hormozi` → CTA overlay (`docs/overlays.md`) → `:enrich` (UGC/product ad) |
| `:teaser` | `:title` → `:atmos` → `:bed=dark` → `:enrich=cine` (cinematic teaser) |
| `:drop` | `:app` → `:glass` → `:bed=uplift` → `:enrich` (product launch) |
| `:quote` | `:cards` from a quotes CSV/JSON (quote / stat videos) |

---

### Examples
```
:lyric @song.mp3 :style=noir            → noir lyric video from the song
:short @podcast.mp4                      → autocut + Hormozi captions + reels + premium finish
:caption :neon :lang=ur @reel.mp4        → Urdu neon captions on the reel
:rich :aurora @plain.mp4                 → aurora overlay + premium finish
:cards @rows.csv                         → one card template → a video per row
:narrate :voice=female :bed=uplift       → female-narrated explainer over an uplifting bed
:ad @demo.mp4                            → UGC ad: hook + Hormozi caps + CTA + premium finish
:teaser @logo.png "Launching soon"       → cinematic teaser (title + atmosphere + dark bed)
```
Run `scripts/help.sh` (or just `:help`) to print this list in the terminal; `:help combo` for one group.
Default behavior is unchanged — you can still write a normal sentence. Commands are just faster.
