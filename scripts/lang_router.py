#!/usr/bin/env python3
"""
lang_router.py — cheap language-detection scan that ROUTES speech transcription:

  exactly ONE meaningful language  -> SINGLE path (fast: whisperX / small + forced --language)
  TWO+ meaningful languages         -> CODE-SWITCH path (cs_transcribe large-v3 + MMS_FA)
  low confidence / ambiguous        -> SINGLE (fast) with the most-likely language + a notice

The scan runs Whisper LANGUAGE DETECTION ONLY on a sample of VAD speech segments, with a
SMALL (or tiny) model — never a full large-v3 decode — so it is genuinely cheap
(target < ~0.15x realtime). This lets normal single-language videos get small's speed
automatically, and only pays the ~10x large-v3 cost when the audio is actually mixed.

API:
  detect_language_plan(audio_path, ...) -> {
    "mode": "single" | "code-switch",
    "languages": [lang, ...],          # meaningful languages, by audio share (desc)
    "primary":  lang | None,           # the dominant language (for the SINGLE path)
    "segments": [{start,end,lang,prob}, ...],
    "reason":   str,
    "scan_seconds": float,
  }

CLI (inspection / --cs-detect-only equivalent):
  .venv-whisperx/bin/python scripts/lang_router.py <audio>
      [--cs-scan-model small|tiny] [--cs-min-seg-share 0.20]
      [--cs-min-lang-prob 0.55] [--cs-min-lang-seconds 4] [--cs-max-samples 12]

Deterministic, 100% local, reuses cached models. Reuses cs_transcribe's VAD + audio loader.
"""
import sys, os, json, argparse, time

SDIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SDIR)
SR = 16000
_SCAN = {}


def _scan_model(name):
    """Load (and cache) a SMALL faster-whisper model for the langID scan only."""
    if name not in _SCAN:
        from faster_whisper import WhisperModel
        sys.stderr.write(f"[router] loading scan model '{name}' (cpu/int8) for langID...\n")
        _SCAN[name] = WhisperModel(name, device="cpu", compute_type="int8")
    return _SCAN[name]


def _sample_idx(n, max_samples):
    """Indices of up to max_samples windows spread evenly across the clip."""
    if n <= max_samples:
        return list(range(n))
    step = n / max_samples
    return sorted({min(n - 1, int(i * step)) for i in range(max_samples)})


def detect_language_plan(audio_path, scan_model="small", min_seg_share=0.20,
                         min_lang_prob=0.55, min_lang_seconds=4.0, max_samples=12,
                         short_clip_s=30.0):
    """Cheap langID scan -> routing plan. See module docstring for the schema."""
    import cs_transcribe
    t0 = time.time()
    model = _scan_model(scan_model)
    wav = cs_transcribe._load_audio(audio_path)
    total_s = len(wav) / SR
    windows = cs_transcribe.vad_windows(wav)
    if not windows:
        return {"mode": "single", "languages": [], "primary": None, "segments": [],
                "reason": "no speech detected -> single", "scan_seconds": round(time.time() - t0, 2)}

    idx = list(range(len(windows))) if total_s <= short_clip_s else _sample_idx(len(windows), max_samples)
    segs = []
    for i in idx:
        s, e = windows[i]
        chunk = wav[int(s * SR):int(e * SR)]
        try:
            lang, prob, _ = model.detect_language(chunk)
        except Exception:
            continue
        segs.append({"start": round(s, 2), "end": round(e, 2), "lang": lang, "prob": round(float(prob), 3)})

    scan_s = round(time.time() - t0, 2)
    if not segs:
        return {"mode": "single", "languages": [], "primary": None, "segments": [],
                "reason": "langID unavailable -> single (auto)", "scan_seconds": scan_s}

    agg = {}
    for sg in segs:
        a = agg.setdefault(sg["lang"], {"n": 0, "probs": [], "secs": 0.0})
        a["n"] += 1
        a["probs"].append(sg["prob"])
        a["secs"] += (sg["end"] - sg["start"])
    nseg = len(segs)

    meaningful = []
    for lang, a in agg.items():
        share = a["n"] / nseg
        mean_p = sum(a["probs"]) / len(a["probs"])
        # meaningful if it holds a real share at good confidence, OR covers enough seconds
        # AND isn't a low-confidence guess (the >=0.40 floor stops noise languages slipping in).
        if (share >= min_seg_share and mean_p >= min_lang_prob) or \
           (a["secs"] >= min_lang_seconds and mean_p >= 0.40):
            meaningful.append((lang, round(share, 2), round(mean_p, 2), round(a["secs"], 1)))
    meaningful.sort(key=lambda x: -x[3])  # by total seconds, desc
    langs = [m[0] for m in meaningful]

    if len(langs) >= 2:
        return {"mode": "code-switch", "languages": langs, "primary": langs[0], "segments": segs,
                "reason": f"{len(langs)} meaningful languages {meaningful} -> escalate to large-v3",
                "scan_seconds": scan_s}
    if len(langs) == 1:
        return {"mode": "single", "languages": langs, "primary": langs[0], "segments": segs,
                "reason": f"one meaningful language: {meaningful[0]} -> small path",
                "scan_seconds": scan_s}
    # nothing crossed the bar -> low confidence -> SINGLE with the most-frequent guess
    top = max(agg, key=lambda l: agg[l]["n"])
    return {"mode": "single", "languages": [top], "primary": top, "segments": segs,
            "reason": f"low confidence (no language met thresholds); defaulting to single '{top}'",
            "scan_seconds": scan_s}


def main():
    ap = argparse.ArgumentParser(description="langID scan -> single/code-switch routing plan")
    ap.add_argument("input")
    ap.add_argument("--cs-scan-model", dest="scan_model", default="small")
    ap.add_argument("--cs-min-seg-share", dest="min_seg_share", type=float, default=0.20)
    ap.add_argument("--cs-min-lang-prob", dest="min_lang_prob", type=float, default=0.55)
    ap.add_argument("--cs-min-lang-seconds", dest="min_lang_seconds", type=float, default=4.0)
    ap.add_argument("--cs-max-samples", dest="max_samples", type=int, default=12)
    a = ap.parse_args()
    plan = detect_language_plan(a.input, a.scan_model, a.min_seg_share, a.min_lang_prob,
                                a.min_lang_seconds, a.max_samples)
    print(json.dumps(plan, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
