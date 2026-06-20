# Structured timeline (Daydream-style) — `timeline.json` as the agent's document

**What this is.** A second, *optional* way to drive the engine. Instead of the agent hand-writing a
whole `index.html` for every change, the video is a **structured document** (`timeline.json`):
`tracks → clips → {id, type, start, length, source, position, transform, keyframes, style}`. The
agent edits **one clip at a time** through a small tool surface; a **compiler** turns the document
into the exact same HyperFrames `index.html` the engine already renders; a **single-frame preview**
lets the agent *see the current state* without rendering the whole video.

**Strictly additive.** A project with no `timeline.json` behaves exactly as before. The compiler
writes only into throwaway build dirs (`work/preview`, `$WORK/build`) — it never touches a
hand-authored `projects/<name>/index.html`. The full export still goes through the canonical
`render-with-qa.sh` (hf-guard + the 4 QA ship gates), so nothing about delivery changes.

## Files
- `schemas/timeline.v1.json` — the JSON Schema for `timeline.json`.
- `scripts/timeline/timeline_model.py` — the model: load/save (atomic), validate, deterministic
  stable clip ids (`clip_NNNNNN` from a persisted `_idSeq`, no randomness/clock), asset registry,
  and every clip operation.
- `scripts/timeline/timeline-tools.py` — the agent-facing CLI (one subcommand per tool, JSON in/out).
- `scripts/timeline/compile-timeline.py` — `timeline.json → index.html` (the real GSAP contract).
- `scripts/timeline/preview-frame.sh` — `get_preview_frame`: compile + `hyperframes snapshot` 1 frame.
- `scripts/timeline/export-timeline.sh` — `start_export`: compile (`--copy`) + `render-with-qa.sh`.
- `scripts/timeline/audit.py` — exercises all 10 tools and measures the three claims (below).
- `projects/timeline-demo/` — a worked example (gradient bg + Fraunces title + subtitle, keyframed).

## The tool surface (mirrors Daydream)
All read JSON args, print one JSON result line. `--project` is a name under `projects/` or a path.

```
get_timeline_state   --project P                          # compact, queryable doc (ids/types/in-out)
get_clip             --project P --clip CID               # full clip
add_clip             --project P --track T --json '{...}' # -> {clipId}
remove_clip          --project P --clip CID
split_clip           --project P --clip CID --at 3.2      # -> {left,right}
update_clip          --project P --clip CID --json '{...}'# shallow/deep-merge patch (null deletes)
move_clips_to_track  --project P --clips '["id",...]' --track T
set_keyframes        --project P --clip CID --json '[{at,dur,ease,props},...]'
get_preview_frame    --project P --at 1.5                 # -> {framePath} (1 rendered frame)
start_export         --project P [--json '{"fps":30}']    # -> {runId,index_html,output_mp4}
get_transcript       --project P [--source AID] [--lang]  # transcribe speech -> words @ TIMELINE time
cut_transcript_sections --project P --ranges '[[a,b],...]'# ripple-delete those spans
```

## Transcript-driven editing ("delete the words, the footage goes with them")
`get_transcript` transcribes the project's speech source (first video/audio clip, or `--source`)
and projects every word's *source* time through the clip(s) into **timeline** time. **Timing comes
from FORCED ALIGNMENT** (`scripts/align.py` — the words are forced onto the waveform, never raw ASR
timestamps; reported as `"timing":"forced-align"`). Flags: `--lang xx`; `--code-switch` for
mixed-language speech/songs (Hinglish/Punjabi-English etc., via `cs_transcribe` + MMS_FA, 1100+
languages); `--refresh` to re-run. Falls back to `transcribe.py` ASR timestamps only if the
`.venv-whisperx` aligner is unavailable. Result is cached under `work/transcript/<aid>.json`:
```json
{ "source":"vo", "wordCount":11,
  "words":[ {"text":"Hello","start":0.0,"end":0.22,"clipId":"clip_000001"}, ... ] }
```
The agent reads that, decides which spans to drop (fillers, rambles, a bad take), and calls
`cut_transcript_sections --ranges '[[1.0,1.24],[2.3,2.8]]'`. That **ripple-deletes**: each span is
removed from *every* clip on *every* track and the rest slides left to close the gap, so video + its
audio + captions stay in sync (one shared remap), video/audio `trim.in` advances to keep the source
continuous, and keyframes rebase per surviving piece. Verified end-to-end: cutting 0.7 s of fillers
took a rendered MP4 from 5.14 s → 4.49 s. Plays to the LLM's strength — *editing text*.

Clip shape (text example):
```json
{ "type":"text", "text":"Xotion", "start":0.3, "length":3.7,
  "position":{"x":540,"y":820,"anchor":"center"},
  "style":{"fontFamily":"Fraunces","fontSize":210,"color":"#faf8f3"},
  "transform":{"opacity":0,"scale":0.9},
  "keyframes":[{"at":0,"dur":0.8,"ease":"power3.out","props":{"opacity":1,"scale":1}}] }
```
Types: `image`/`video`/`audio` reference an `assets` entry via `source` (a path auto-registers);
`text` carries `text`. Fonts go in `timeline.fonts` (resolve against the project, then the repo's
shared `assets/fonts/`). Keyframe props are GSAP-animatable (`opacity,x,y,scale,rotation,...`).

## Audit — the three claims, measured (`python3 scripts/timeline/audit.py`)
On the bundled 4-second demo, this machine:

| Claim | Measured | Notes |
|---|---|---|
| **Tokens per edit** | `update_clip` patch ~**31 bytes (~8 tok)** vs rewriting the whole `index.html` ~**3556 bytes (~889 tok)** → **~111× fewer** | grows with composition size — bigger videos = bigger win |
| **Check your work** | `get_preview_frame` ~**4.4s** vs full `start_export` ~**5.6s** → only **~1.3×** here | **honest:** a 4 s render is tiny, so the fixed npx/Chromium cold-start (~4 s) dominates BOTH. The real win is *render 1 frame, not N* — preview latency is ~constant while export grows with `duration × fps × per-frame cost`. On a 60 s or effects-heavy video the gap is large (≈5–50×). |
| **State visibility** | `get_timeline_state` ~**538 bytes**, exact ids/types/in-out | the agent *queries* state instead of re-reading & guessing from ~3.5 KB of HTML |

All 10 tools pass; the full `timeline.json → compile → MP4` loop runs through the existing QA gates.

## When to use which
- **Hand-authored `index.html`** — bespoke, one-off motion graphics (the engine's default; richest).
- **`timeline.json` + tools** — when the agent is doing *many small edits* to a clip-based cut
  (trim, move, restyle, retime, swap a source), wants to *check one moment* cheaply, or needs the
  document to be queryable/undoable/co-editable. Both render through the same pipeline.

## Known follow-ups (not yet done)
- Wire the tools into the desktop app's in-app agent (they already work today via the Bash sidecar).
- Compiler currently supports the common style/transform/keyframe set; richer effects (masks,
  shaders, per-character text animation) still want a hand-authored composition.
