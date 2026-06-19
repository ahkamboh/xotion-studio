#!/usr/bin/env python3
"""
Frame-accurate word timings via forced alignment. Two engines:

  DEFAULT (backward-compatible): whisperX forced alignment (great for single-language speech).
    .venv-whisperx/bin/python scripts/align.py <audio> [--lang en] [--model small] [--out work/transcript.json]

  UNIVERSAL (--code-switch): cs_transcribe (per-segment langID, large-v3) for the WORDS, then
    MMS_FA forced alignment for the TIMING, then validate_timing. Handles ANY language and
    mixed-language (Hinglish/Punjabi-English) audio. Words from ASR, timing from the waveform.
    .venv-whisperx/bin/python scripts/align.py <audio> --code-switch [--dual hi en] [--initial-prompt "..."]

Outputs a flat word list [{text,start,end}, ...] with ABSOLUTE times (matches mountCaptions).
Per the core principle, final timing is ALWAYS forced alignment — never raw ASR timestamps.
"""
import sys, json, argparse, os

SDIR = os.path.dirname(os.path.abspath(__file__))


def whisperx_path(a):
    import whisperx
    device = "cpu"; compute = "int8"
    print(f"[align] whisperX '{a.model}' (faster-whisper)...", file=sys.stderr)
    model = whisperx.load_model(a.model, device, compute_type=compute, language=a.lang)
    audio = whisperx.load_audio(a.input)
    result = model.transcribe(audio, language=a.lang, batch_size=8)
    print("[align] forcing alignment...", file=sys.stderr)
    amodel, meta = whisperx.load_align_model(language_code=a.lang, device=device)
    aligned = whisperx.align(result["segments"], amodel, meta, audio, device, return_char_alignments=False)
    words = []
    for w in aligned.get("word_segments", []):
        if "start" in w and "end" in w:
            words.append({"text": w["word"].strip(),
                          "start": round(float(w["start"]), 3), "end": round(float(w["end"]), 3)})
    return words


def universal_path(a):
    """cs_transcribe (words) -> MMS_FA (timing, refine off for speech) -> validate."""
    sys.path.insert(0, SDIR)
    import cs_transcribe, mms_align, validate_timing
    cs_words, seg_report = cs_transcribe.transcribe(
        a.input, model_name=a.model_cs, dual=a.dual, initial_prompt=a.initial_prompt)
    langs = sorted(set(r["lang"] for r in seg_report))
    print(f"[align] code-switch: {len(cs_words)} words, per-segment langs={langs}", file=sys.stderr)
    for r in seg_report:
        print(f"    {r['start']}-{r['end']}s  lang={r['lang']}  words={r['words']}", file=sys.stderr)
    display = [w["w"] for w in cs_words]
    timed = mms_align.force_align(a.input, display, lang="auto", window=None, refine=False)
    tagged = [{"text": t["text"], "start": t["start"], "end": t["end"], "score": t["score"]} for t in timed]
    cleaned, warns = validate_timing.validate(tagged, input_count=len(display))
    if warns:
        print(f"[align] validation: {len(warns)} warning(s)", file=sys.stderr)
    return [{"text": c["text"], "start": c.get("start"), "end": c.get("end")} for c in cleaned]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("--lang", default="en")
    ap.add_argument("--model", default="small", help="whisperX model (default path)")
    ap.add_argument("--out", default="work/transcript.json")
    ap.add_argument("--code-switch", action="store_true",
                    help="universal path: cs_transcribe (large-v3, per-seg langID) + MMS_FA timing")
    ap.add_argument("--model-cs", dest="model_cs", default="large-v3",
                    help="faster-whisper model for code-switch transcription")
    ap.add_argument("--dual", nargs=2, default=None, metavar=("LANG_A", "LANG_B"))
    ap.add_argument("--initial-prompt", dest="initial_prompt", default=None)
    a = ap.parse_args()

    words = universal_path(a) if a.code_switch else whisperx_path(a)
    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    json.dump(words, open(a.out, "w"), ensure_ascii=False, indent=2)
    print(f"[align] {len(words)} words (forced-aligned) -> {a.out}")
    for w in words[:10]:
        s = w.get("start"); e = w.get("end")
        print(f"  {s if s is None else round(s,2):>6}-{e if e is None else round(e,2):<6}  {w['text']}")


if __name__ == "__main__":
    main()
