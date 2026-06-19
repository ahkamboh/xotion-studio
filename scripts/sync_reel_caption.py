#!/usr/bin/env python3
"""
sync_reel_caption.py — pick the real VOCAL hook window + word-onset timings for a reel.

Uses whisperX (via caption.py) to get real word timestamps for the whole song, then:
  1. chooses the densest <hook>s vocal window (so captions sit on actual singing, not an
     instrumental swell that energy-detection wrongly favored),
  2. aligns the CURATED lyric words to the real word onsets in that window (clean text +
     real timing), grouped back into the original lines.

Prints JSON: {"hook_start": s, "dur": d, "words": [{"w","t","line"}], "nlines": N}
Caches the full-song transcript per audio file in reel-cap-cache/.
"""
import os, sys, json, glob, subprocess, hashlib, argparse, re, difflib
try:
    from unidecode import unidecode
except Exception:
    def unidecode(s): return s

HOME = os.path.expanduser("~")
SDIR = os.path.dirname(os.path.abspath(__file__))
STUDIO = os.path.join(SDIR, "..")
WPY = os.path.join(STUDIO, ".venv-whisperx", "bin", "python")
CAP = os.path.join(SDIR, "caption.py")
CACHE = os.path.join(HOME, "Downloads", "reel-cap-cache")
os.makedirs(CACHE, exist_ok=True)


def isolate_vocals(audio):
    """demucs two-stems -> clean vocal mp3 (cached). Returns path or None."""
    key = hashlib.md5(os.path.abspath(audio).encode()).hexdigest()[:12]
    voc = os.path.join(CACHE, key + ".vocals.mp3")
    if not os.path.exists(voc):
        outd = os.path.join(CACHE, "demucs_" + key)
        r = subprocess.run([WPY, "-m", "demucs", "--two-stems=vocals", "-o", outd,
                            "--mp3", audio], capture_output=True, text=True)
        found = glob.glob(os.path.join(outd, "*", "*", "vocals.mp3"))
        if found:
            os.replace(found[0], voc)
    return voc if os.path.exists(voc) else None


def _dehallucinate(words):
    """Whisper loops the same token over silence/instrumental — drop repeated runs."""
    out, run_w, run_n = [], None, 0
    for w in words:
        tok = w["w"].strip()
        if tok == run_w:
            run_n += 1
        else:
            run_w, run_n = tok, 1
        if run_n <= 2:          # keep at most 2 of any consecutive identical token
            out.append(w)
    return out


def transcribe_words(audio, lang, content="music", window_model="small"):
    """Return flat [{w,s,e}] for the whole song from the ISOLATED VOCAL (cached).
    This feeds locate_curated ONLY (window-finding) — final TIMING comes from MMS_FA.
    Window-finding is forgiving, so window_model defaults to 'small' (fast); flip to
    'large-v3' per song only when a hook gets located wrong."""
    key = hashlib.md5((os.path.abspath(audio)+lang+content+window_model+"voc").encode()).hexdigest()[:12]
    cj = os.path.join(CACHE, key + ".json")
    if not os.path.exists(cj):
        src_audio = isolate_vocals(audio) or audio
        outdir = os.path.join(CACHE, key)
        # SYSTEM python3 so small.pt (python3 transcribe.py, needs `whisper`) works.
        subprocess.run(["python3", CAP, src_audio, "--content", content, "--lang", lang,
                        "--model", window_model, "--style", "karaoke", "--out", outdir],
                       capture_output=True, text=True)
        src = os.path.join(outdir, "captions.json")
        caps = json.load(open(src)) if os.path.exists(src) else []
        words = []
        for c in caps:
            for w in c.get("words", []):
                if w.get("w", "").strip():
                    words.append({"w": w["w"], "s": float(w["s"]), "e": float(w["e"])})
        words = _dehallucinate(words)
        json.dump(words, open(cj, "w"), ensure_ascii=False)
    return json.load(open(cj))


def _norm(s):
    """Romanize + reduce to a coarse phonetic key (for cross-script fuzzy match)."""
    s = unidecode(s).lower()
    s = re.sub(r"[^a-z]", "", s)
    s = re.sub(r"(.)\1+", r"\1", s)          # collapse doubled letters (thNdlaa->thndla-ish)
    return s


def locate_curated(curated_lines, words, hooklen):
    """Find where the curated lyric is actually sung by fuzzy-matching its first
    words against the romanized clean-vocal transcription. Returns window start (s)."""
    if not words:
        return 0.0
    # romanized transcription stream
    toks = [(_norm(w["w"]), w["s"]) for w in words]
    toks = [(t, s) for t, s in toks if t]
    if not toks:
        return pick_window(words, hooklen)
    # curated anchor = first ~4 words of the hook, romanized+joined
    flat = [w for line in curated_lines for w in line]
    anchor = _norm("".join(flat[:4]))
    if len(anchor) < 4:
        return pick_window(words, hooklen)
    best_i, best_r = 0, -1.0
    for i in range(len(toks)):
        cand = "".join(t for t, _ in toks[i:i+5])
        r = difflib.SequenceMatcher(None, anchor, cand[:len(anchor)+4]).ratio()
        if r > best_r:
            best_r, best_i = r, i
    if best_r < 0.45:                         # no confident match -> densest vocals
        return pick_window(words, hooklen)
    return round(max(0.0, toks[best_i][1] - 0.15), 2)


def pick_window(words, hooklen):
    """Start of the densest hooklen-second window (most word onsets)."""
    if not words:
        return 0.0
    starts = [w["s"] for w in words]
    best_t, best_n = starts[0], -1
    for st in starts:
        n = sum(1 for s in starts if st <= s < st + hooklen)
        if n > best_n:
            best_n, best_t = n, st
    return round(max(0.0, best_t - 0.3), 2)   # tiny lead-in


def _index_pin(flat, words, win_start, hooklen):
    """LAST-RESORT fallback: pin curated words 1:1 onto ASR onsets in the window
    (the pre-MMS behaviour). Window-relative times. Used only if MMS alignment fails."""
    onsets = [w["s"] - win_start for w in words if win_start <= w["s"] < win_start + hooklen]
    onsets.sort()
    M, K = len(flat), len(onsets)
    out = []
    for j, (w, li) in enumerate(flat):
        if K == 0:
            t = j * (hooklen / max(1, M))
        elif j < K:
            t = onsets[j]
        else:
            step = (onsets[-1] - onsets[max(0, K - 4)]) / max(1, min(K, 4) - 1) if K > 1 else 0.5
            t = onsets[-1] + step * (j - K + 1)
        out.append({"w": w, "t": round(float(t), 3), "line": li})
    for i in range(1, len(out)):
        if out[i]["t"] < out[i - 1]["t"]:
            out[i]["t"] = out[i - 1]["t"]
    return out


def align(curated_lines, words, win_start, hooklen, audio=None, lang="hi"):
    """PRIMARY path: MMS_FA forced-align the curated words to the waveform within the
    window, onset-refine (songs), validate, and return WINDOW-RELATIVE times to match the
    kambojh-reel renderer (CLK runs 0..DUR, word.t relative to hook). Index-pin is the
    try/except last-resort fallback. Returns (out, meta)."""
    flat = [(w, li) for li, line in enumerate(curated_lines) for w in line]
    flat_words = [w for w, _ in flat]
    lines_idx = [li for _, li in flat]

    if audio:
        try:
            sys.path.insert(0, SDIR)
            import mms_align, validate_timing
            def _run(ws, we):
                timed = mms_align.force_align(audio, flat_words, lang=lang,
                                              window=(ws, we), refine=True)
                tagged = [{"text": t["text"], "start": t["start"], "end": t["end"],
                           "score": t["score"], "line": lines_idx[i]} for i, t in enumerate(timed)]
                return validate_timing.validate(tagged, input_count=len(flat_words))
            cleaned, warns = _run(win_start, win_start + hooklen)
            # coverage too low or a wide mid-line gap -> retry once with a wider window
            if any(w["type"] in ("low_coverage", "wide_gap_line") for w in warns):
                sys.stderr.write("[align] widening window and re-aligning (coverage/gap)\n")
                cleaned, warns = _run(max(0.0, win_start - 3.0), win_start + hooklen + 3.0)
            out = [{"w": flat_words[i],
                    "t": round(max(0.0, (c.get("start") or 0.0) - win_start), 3),
                    "line": lines_idx[i]} for i, c in enumerate(cleaned)]
            for i in range(1, len(out)):
                if out[i]["t"] < out[i - 1]["t"]:
                    out[i]["t"] = out[i - 1]["t"]
            sys.stderr.write(f"[align] MMS_FA path OK: {len(out)} words, {len(warns)} warning(s)\n")
            return out, {"path": "mms", "warnings": warns}
        except Exception as e:
            import traceback
            sys.stderr.write(f"[align] MMS_FA failed ({e}); falling back to index-pin\n{traceback.format_exc()}\n")

    return _index_pin(flat, words, win_start, hooklen), {"path": "fallback", "warnings": []}


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("audio")
    ap.add_argument("lines_json", help="JSON: list of word-lists (curated lyric lines)")
    ap.add_argument("--lang", default="hi")
    ap.add_argument("--hook", type=float, default=18.0)
    ap.add_argument("--start", type=float, default=-1, help="force window start (skip auto)")
    ap.add_argument("--content", default="music", choices=["music","speech"])
    ap.add_argument("--window-model", default="small",
                    help="window-finder ASR model (small|large-v3). Default small; flip to "
                         "large-v3 per song only when the hook is located wrong. Final TIMING "
                         "is MMS_FA regardless.")
    a = ap.parse_args()

    curated = json.loads(a.lines_json)
    words = transcribe_words(a.audio, a.lang, a.content, a.window_model)
    ws = a.start if a.start >= 0 else locate_curated(curated, words, a.hook)
    # MMS forced-alignment + onset-refine run on the DEMUCS VOCAL stem (clean, tight syllables)
    voc = isolate_vocals(a.audio) or a.audio
    timed, meta = align(curated, words, ws, a.hook, audio=voc, lang=a.lang)
    print(json.dumps({"hook_start": ws, "dur": a.hook, "words": timed, "nlines": len(curated),
                      "align_path": meta["path"], "warnings": meta["warnings"]}, ensure_ascii=False))
