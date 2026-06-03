# Prompt: Auto-cut / tighten raw footage (remove dead space + fillers)

Paste into Claude Code inside `xotion-studio`. Turns long raw talking footage into a tight edit.

```
Tighten my raw footage in the xotion-studio engine (auto-cut layer).

INPUTS:
- VIDEO   = "<path to raw talking-head / podcast / UGC clip>"
- TIGHTEN = "normal"   (gentle | normal | aggressive)
- FILLERS = "yes"      (remove um/uh/er; "aggressive" also cuts like/you know/etc.)
- THEN    = ""         (optional: "add captions", "9:16 reel", "color grade cine", "logo")

DO:
1. Probe the video. For anything over ~2 min, generate a review aid:
   python3 scripts/filmstrip.py VIDEO --out-dir work   (read filmstrip.jpg + waveform.png cheaply).
2. Transcribe WORD-LEVEL:  python3 scripts/transcribe.py VIDEO --model small [--lang xx]
3. Auto-cut:
   python3 scripts/autocut.py VIDEO work/transcript.json --out work/cut.mp4 \
     --max-gap <0.8 gentle | 0.6 normal | 0.4 aggressive> \
     [--remove-fillers] [--aggressive]    # 30ms fades at cuts are automatic
   Use --report first to preview kept/removed time, then render.
4. ACCEPTANCE LOOP (docs/qa-protocol.md): scripts/qa.sh on the cut; also extract frames right at
   each cut boundary (from the --keep-list segment ends) and confirm cuts look/sound clean — no
   mid-word chops, no jarring jumps. Re-tune --max-gap/--pad if a cut is too tight or too loose.
5. If THEN was given, run that next on work/cut.mp4 (captions = prompts/captioned-video.md;
   reel = aspect-fill recipe; grade = scripts/grade.sh; etc.).
6. Update the project's project.md with the decisions (tighten level, fillers, kept duration).
   Deliver the final + report time saved.
```
