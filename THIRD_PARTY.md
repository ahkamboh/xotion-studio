# Third-party software & attribution

xotion-studio builds on open-source components. Their licenses are retained here per their terms.

## HyperFrames — Apache License 2.0  (vendored + forked = self-owned copy)
- Upstream: https://github.com/heygen-com/hyperframes  © HeyGen, Apache-2.0.
- Owned fork (perpetual, editable): https://github.com/ahkamboh/xotion-engine
- Vendored package: vendor/hyperframes-0.6.70.tgz — the engine installs from THIS repo, not the
  npm registry, so the project is self-contained and not dependent on upstream staying online.
- License: Apache-2.0 — commercial use permitted, no per-render fees, no commercial-use thresholds.
  Apache-2.0 rights to this version are perpetual and cannot be revoked.
- "HyperFrames" and "HeyGen" are trademarks of HeyGen; this project is not affiliated with or
  endorsed by HeyGen and does not use their marks to brand the xotion-studio product. The
  Apache-2.0 copyright/license notice is retained in the vendored package and the fork.

## Other tooling
- ffmpeg (LGPL/GPL) — invoked as an external CLI for video/image/audio processing.
- OpenAI Whisper (MIT) — `small` speech model bundled in models/ for offline transcription.
- Kokoro TTS, u2net (background removal) — via HyperFrames media commands.
- GSAP (standard "no charge" license for this use) — loaded in compositions.
- Fonts in assets/fonts/ — from Google Fonts, under the SIL Open Font License (OFL).

The xotion-studio product, its scripts, templates, presets, prompts, and docs are © the project owner.
