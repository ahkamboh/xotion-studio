# Xotion demos

Two self-contained motion-graphics videos. Open either HTML file in **Chrome or Edge**
(WebCodecs is required for the download/export button).

## Files

| Open this | What it is | Needs |
|---|---|---|
| **Xotion landing.html** | Marketing landing page | demo-preview.html (embedded in hero) |
| **Xotion dashboard.html** | Product/studio dashboard UI | demo-preview.html (embedded preview) |
| **Xotion demo (16x9).html** | 1920×1080 YouTube explainer — "what Xotion is" | animations.jsx · xotion-explainer-scenes.jsx · xotion-explainer-audio.jsx |
| **demo-preview.html** | 1080×1920 vertical stat video (looping, no UI) | animations.jsx · scenes.jsx |

Keep every file in the same folder — they load each other as siblings. The landing page and
dashboard both embed `demo-preview.html`, which in turn needs `animations.jsx` + `scenes.jsx`.

## Using them

- **Play / preview:** just open the HTML. The 16:9 has top-right controls: 🔊 Music · 🎙 Voice · ▶ Play · ↓ Download.
- **Export for YouTube:** click **↓ Download (YT)** on the 16:9 file → renders a 32s WebM
  (VP9 video + Opus audio, music baked in). Convert to MP4 at cloudconvert.com or:
  `ffmpeg -i xotion-explainer-16x9.webm -c:v libx264 -pix_fmt yuv420p out.mp4`
- **Voice-over** plays live during preview but is **not** in the exported file (browser TTS
  can't be captured). Music *is* in the export. For voiced exports, mix in a recorded/ElevenLabs MP3.

## Fonts
Loaded from Google Fonts at runtime (Fraunces, Inter Tight, JetBrains Mono) — needs internet
on first open. Brand: cream `#f4f0e6` · ink `#0e0d0c` · accent `#e0451f`.
