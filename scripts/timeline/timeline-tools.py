#!/usr/bin/env python3
"""
timeline-tools.py — the agent-facing CLI surface for the structured timeline.

Every timeline tool is a subcommand that reads JSON args and writes a JSON result on stdout.
This is what the Bash-only desktop sidecar invokes (allowedTools = Bash/Read/Write/...), so the
timeline tools work TODAY with ZERO SDK custom-tool wiring.

  python3 scripts/timeline/timeline-tools.py get_timeline_state --project NAME
  python3 scripts/timeline/timeline-tools.py get_clip          --project NAME --clip CLIP_ID
  python3 scripts/timeline/timeline-tools.py add_clip          --project NAME --track video --json '{...}'
  python3 scripts/timeline/timeline-tools.py remove_clip       --project NAME --clip CLIP_ID
  python3 scripts/timeline/timeline-tools.py split_clip        --project NAME --clip CLIP_ID --at 3.2
  python3 scripts/timeline/timeline-tools.py update_clip       --project NAME --clip CLIP_ID --json '{...}'
  python3 scripts/timeline/timeline-tools.py move_clips_to_track --project NAME --clips '["id1","id2"]' --track overlay
  python3 scripts/timeline/timeline-tools.py set_keyframes     --project NAME --clip CLIP_ID --json '[{...}]'
  python3 scripts/timeline/timeline-tools.py get_preview_frame --project NAME --at 1.0
  python3 scripts/timeline/timeline-tools.py start_export      --project NAME [--json '{"fps":30}']

All mutating subcommands do load -> mutate -> atomic save in timeline_model.py.
Read tools never write. Errors print a JSON {"error": "..."} to stdout and exit 1.
"""

import argparse
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib"))
import runtime  # noqa: E402
import timeline_model as tm  # noqa: E402

ROOT = tm.ROOT
THIS_DIR = os.path.dirname(os.path.abspath(__file__))


def _ok(obj):
    print(json.dumps(obj))
    sys.exit(0)


def _err(msg):
    print(json.dumps({"error": str(msg)}))
    sys.exit(1)


# ---------------------------------------------------------------------------
# read tools
# ---------------------------------------------------------------------------

def cmd_get_timeline_state(a):
    tl = tm.load(a.project, create=True)
    _ok(tm.summary(tl))


def cmd_get_clip(a):
    tl = tm.load(a.project, create=False)
    _ok(tm.op_get_clip(tl, a.clip))


def cmd_get_transcript(a):
    """Transcribe the project's speech source and map every word to TIMELINE time.

    Picks the first video/audio clip's source (or --source), runs scripts/transcribe.py (cached
    under work/transcript/<aid>.json), then projects each word's source time through the clip(s)
    that reference it -> {text, start, end} in timeline seconds. The agent reads this, decides which
    spans to drop, and calls cut_transcript_sections with those ranges.
    """
    tl = tm.load(a.project, create=False)
    aid = a.source
    if not aid:
        for t in tl["tracks"]:
            for c in t["clips"]:
                src = c.get("source")
                if src and tl["assets"].get(src, {}).get("kind") in ("video", "audio"):
                    aid = src
                    break
            if aid:
                break
    if not aid or aid not in tl["assets"]:
        _err("no video/audio source clip to transcribe (pass --source <assetId>)")

    proj_dir = tm.project_dir(a.project)
    asset = tl["assets"][aid]
    media = asset["path"] if os.path.isabs(asset["path"]) else os.path.join(proj_dir, asset["path"])
    if not os.path.exists(media):
        _err(f"source media missing on disk: {media}")

    tdir = os.path.join(proj_dir, "work", "transcript")
    os.makedirs(tdir, exist_ok=True)
    tjson = os.path.join(tdir, f"{aid}.json")
    timing = None
    if a.refresh or not os.path.exists(tjson):
        venv = runtime.whisperx_python(ROOT)
        # PREFER forced alignment (frame-accurate). Repo principle: timing comes from forcing the
        # words onto the WAVEFORM, never from raw ASR timestamps (scripts/align.py). --code-switch
        # routes through cs_transcribe + MMS_FA for mixed-language speech/songs (1100+ langs).
        if os.path.exists(venv):
            cmd = [venv, os.path.join(ROOT, "scripts", "align.py"), media, "--out", tjson]
            if a.code_switch:
                cmd += ["--code-switch"]
            elif a.lang:
                cmd += ["--lang", a.lang]
            r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
            if r.returncode == 0 and os.path.exists(tjson):
                timing = "forced-align" + ("/code-switch" if a.code_switch else "")
        # fall back to raw whisper word timestamps if the aligner venv is missing or failed
        if timing is None:
            cmd = [runtime.python_cmd(), os.path.join(ROOT, "scripts", "transcribe.py"), media, "--model", "small", "--out", tjson]
            if a.lang:
                cmd += ["--lang", a.lang]
            r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
            if r.returncode != 0 or not os.path.exists(tjson):
                _err(f"transcribe/align failed: {(r.stderr or r.stdout).strip()[-400:]}")
            timing = "asr-timestamps"
    else:
        timing = "cached"

    words = json.load(open(tjson))
    clips = [c for t in tl["tracks"] for c in t["clips"] if c.get("source") == aid]
    out = []
    for w in words:
        ws, we = float(w["start"]), float(w["end"])
        for c in clips:
            ti = float(c.get("trim", {}).get("in", 0))
            cs, ln = float(c["start"]), float(c["length"])
            if ti - 1e-6 <= ws <= ti + ln + 1e-6:
                out.append({"text": w["text"], "start": round(cs + (ws - ti), 2),
                            "end": round(cs + (we - ti), 2), "clipId": c["id"]})
                break
    _ok({"source": aid, "timing": timing, "wordCount": len(out), "words": out})


# ---------------------------------------------------------------------------
# mutate tools
# ---------------------------------------------------------------------------

def cmd_add_clip(a):
    clip = json.loads(a.json)
    tl = tm.load(a.project, create=True)
    cid = tm.op_add_clip(tl, a.track, clip)
    tm.save(a.project, tl)
    _ok({"clipId": cid})


def cmd_remove_clip(a):
    tl = tm.load(a.project, create=False)
    tm.op_remove_clip(tl, a.clip)
    tm.save(a.project, tl)
    _ok({"removed": True})


def cmd_split_clip(a):
    tl = tm.load(a.project, create=False)
    left, right = tm.op_split_clip(tl, a.clip, float(a.at))
    tm.save(a.project, tl)
    _ok({"left": left, "right": right})


def cmd_update_clip(a):
    patch = json.loads(a.json)
    tl = tm.load(a.project, create=False)
    cid = tm.op_update_clip(tl, a.clip, patch)
    tm.save(a.project, tl)
    _ok({"clipId": cid})


def cmd_move_clips_to_track(a):
    clip_ids = json.loads(a.clips)
    tl = tm.load(a.project, create=False)
    moved = tm.op_move_clips_to_track(tl, clip_ids, a.track)
    tm.save(a.project, tl)
    _ok({"moved": moved})


def cmd_set_keyframes(a):
    keyframes = json.loads(a.json)
    tl = tm.load(a.project, create=False)
    count = tm.op_set_keyframes(tl, a.clip, keyframes)
    tm.save(a.project, tl)
    _ok({"clipId": a.clip, "count": count})


def cmd_cut_transcript_sections(a):
    """RIPPLE-DELETE timeline ranges (seconds) — 'delete the words, the footage goes with them'.

    --ranges '[[12.4,18.1],[33.0,35.5]]' (timeline seconds, usually picked from get_transcript).
    Removes those spans from every clip and slides the rest left to close the gaps.
    """
    ranges = json.loads(a.ranges)
    if not isinstance(ranges, list):
        _err("--ranges must be a JSON array of [start,end] pairs")
    tl = tm.load(a.project, create=False)
    res = tm.op_cut_ranges(tl, ranges)
    tm.save(a.project, tl)
    _ok(res)


# ---------------------------------------------------------------------------
# preview / export (delegate to the shell wrappers / canonical chain)
# ---------------------------------------------------------------------------

def cmd_get_preview_frame(a):
    # ensure the timeline exists / is valid before snapshotting
    tm.load(a.project, create=True)
    at = float(a.at)
    script = os.path.join(THIS_DIR, "preview-frame.sh")
    res = subprocess.run(["bash", script, a.project, f"{at}"],
                         capture_output=True, text=True)
    if res.returncode != 0:
        _err(f"preview failed: {res.stderr.strip() or res.stdout.strip()}")
    frame_path = res.stdout.strip().splitlines()[-1].strip() if res.stdout.strip() else ""
    if not frame_path or not os.path.exists(frame_path):
        _err(f"preview produced no frame (stdout={res.stdout.strip()[-400:]})")
    _ok({"framePath": os.path.abspath(frame_path), "at": at})


def cmd_start_export(a):
    opts = json.loads(a.json) if a.json else {}
    tm.load(a.project, create=False)
    script = os.path.join(THIS_DIR, "export-timeline.sh")
    cmd = ["bash", script, a.project]
    if "fps" in opts:
        cmd += ["--fps", str(opts["fps"])]
    if "output" in opts:
        cmd += ["-o", str(opts["output"])]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        _err(f"export failed: {res.stderr.strip() or res.stdout.strip()}")
    # the wrapper prints a final JSON line with runId/paths
    last = ""
    for line in res.stdout.strip().splitlines():
        line = line.strip()
        if line.startswith("{") and line.endswith("}"):
            last = line
    if last:
        _ok(json.loads(last))
    _ok({"raw": res.stdout.strip()[-800:]})


# ---------------------------------------------------------------------------
# dispatch
# ---------------------------------------------------------------------------

def build_parser():
    ap = argparse.ArgumentParser(description="Xotion structured-timeline tool surface")
    sub = ap.add_subparsers(dest="cmd", required=True)

    def add(name, fn, *args):
        p = sub.add_parser(name)
        p.add_argument("--project", required=True)
        for spec in args:
            p.add_argument(*spec[0], **spec[1])
        p.set_defaults(fn=fn)
        return p

    add("get_timeline_state", cmd_get_timeline_state)
    add("get_clip", cmd_get_clip, (["--clip"], {"required": True}))
    add("get_transcript", cmd_get_transcript,
        (["--source"], {"required": False, "default": None}),
        (["--lang"], {"required": False, "default": None}),
        (["--code-switch"], {"action": "store_true"}),
        (["--refresh"], {"action": "store_true"}))
    add("add_clip", cmd_add_clip, (["--track"], {"required": True}), (["--json"], {"required": True}))
    add("remove_clip", cmd_remove_clip, (["--clip"], {"required": True}))
    add("split_clip", cmd_split_clip, (["--clip"], {"required": True}), (["--at"], {"required": True}))
    add("update_clip", cmd_update_clip, (["--clip"], {"required": True}), (["--json"], {"required": True}))
    add("move_clips_to_track", cmd_move_clips_to_track,
        (["--clips"], {"required": True}), (["--track"], {"required": True}))
    add("set_keyframes", cmd_set_keyframes, (["--clip"], {"required": True}), (["--json"], {"required": True}))
    add("cut_transcript_sections", cmd_cut_transcript_sections, (["--ranges"], {"required": True}))
    add("get_preview_frame", cmd_get_preview_frame, (["--at"], {"required": True}))
    add("start_export", cmd_start_export, (["--json"], {"required": False, "default": ""}))
    return ap


def main():
    ap = build_parser()
    a = ap.parse_args()
    try:
        a.fn(a)
    except tm.TimelineError as e:
        _err(e)
    except (json.JSONDecodeError, ValueError) as e:
        _err(f"bad input: {e}")


if __name__ == "__main__":
    main()
