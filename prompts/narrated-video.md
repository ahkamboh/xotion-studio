# Prompt: Narrated motion-graphic video (voice + music)

Paste into Claude Code inside `xotion-studio`.

```
Make a narrated motion-graphic video (voiceover + background music) — see presets/video-presets.md.

INPUTS:
- TOPIC / SCRIPT = "<what it's about, or a full script>"
- VOICE  = "female" | "male" | a specific Kokoro id (see docs/voices.md)  [default: pick by tone]
- MUSIC  = "<path to a track>" | "generate <calm|warm|uplift|tense|dark>"
- FORMAT = "16:9" (YouTube) | "9:16" (Shorts)
- PRESET = "auto"  (explainer | promo | product | data | quote)  [from video-presets.md]
- CAPTIONS = "on" | "off"   [on for social]
- BRAND  = ""  (colors/fonts/logo, or a brand.json)

DO:
1. Write/clean the script into clear narration beats. Pick a voice from docs/voices.md to fit
   the tone (state which). tts.sh script.txt <voice> work/vo.wav.
2. transcribe.py work/vo.wav  -> sentence times that drive scene start/end.
3. Music: use the provided track or music-bed.sh work/bed.wav <dur> <mood>.
   mix-audio.sh work/vo.wav <music> assets/master.wav   (auto-ducks music under voice, -14 LUFS).
4. Build from templates/narrated-motion.html (or the matching preset's example). One .scene per
   beat, timed to the VO transcript. Apply motion presets (presets/motion-presets.md). Captions
   from the VO transcript if CAPTIONS=on.
5. data-duration = master audio length. Lint 0/0 -> render.
6. RUN THE ACCEPTANCE LOOP (docs/qa-protocol.md): scripts/qa.sh + read frames; confirm voice is
   audible, music ducks under it, scenes match narration timing, text correct, brand applied.
   Loop until all criteria pass, then deliver (+ thumbnail; offer reels if 9:16).
```
