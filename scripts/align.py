#!/usr/bin/env python3
"""
Frame-accurate word timings via whisperX forced alignment (faster + more precise than plain
Whisper for caption/lyric sync). Run with the dedicated venv:

  .venv-whisperx/bin/python scripts/align.py <audio_or_video> [--lang en] [--model small] [--out work/transcript.json]

Outputs a flat word list [{text,start,end}, ...] with onsets aligned to the audio waveform.
Falls back gracefully: if whisperX isn't available, use scripts/transcribe.py instead.
"""
import sys, json, argparse, os

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("--lang", default="en")
    ap.add_argument("--model", default="small")
    ap.add_argument("--out", default="work/transcript.json")
    a = ap.parse_args()

    import whisperx
    device = "cpu"; compute = "int8"
    print(f"[align] loading whisper '{a.model}' (faster-whisper)...", file=sys.stderr)
    model = whisperx.load_model(a.model, device, compute_type=compute, language=a.lang)
    audio = whisperx.load_audio(a.input)
    print("[align] transcribing...", file=sys.stderr)
    result = model.transcribe(audio, language=a.lang, batch_size=8)
    print("[align] loading alignment model + forcing alignment...", file=sys.stderr)
    amodel, meta = whisperx.load_align_model(language_code=a.lang, device=device)
    aligned = whisperx.align(result["segments"], amodel, meta, audio, device,
                             return_char_alignments=False)

    words = []
    for w in aligned.get("word_segments", []):
        if "start" in w and "end" in w:
            words.append({"text": w["word"].strip(),
                          "start": round(float(w["start"]), 3),
                          "end": round(float(w["end"]), 3)})
    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    json.dump(words, open(a.out, "w"), ensure_ascii=False, indent=2)
    print(f"[align] {len(words)} words (forced-aligned) -> {a.out}")
    for w in words[:10]:
        print(f"  {w['start']:6.2f}-{w['end']:6.2f}  {w['text']}")

if __name__ == "__main__":
    main()
