#!/usr/bin/env python3
"""
Transcribe a byNothing song MP3 with WhisperX and produce timestamp-aware song.js.
For each written lyric line, finds the closest matching segment start time.

Usage:
  python3 scripts/sync-bynothing-lyrics.py <mp3_path> <title> <out_song_js>

Returns the song.js with:
  window.__TITLE = "Title";
  window.__DUR   = 244;
  window.__LINES = [
    {text: "We made paper boats from the pages we tore,", t: 12.4},
    {text: "sent them down the gutter when the rain came to pour.", t: 16.8},
    ...
  ];
"""
import sys, os, json, re, subprocess, tempfile

def get_duration(path):
    r = subprocess.run(["ffprobe","-v","error","-show_entries","format=duration",
                        "-of","csv=p=0",path], capture_output=True, text=True)
    return float(r.stdout.strip())

def transcribe(mp3):
    """Run WhisperX small on mp3, return segments [{text,start,end}]"""
    scripts = os.path.join(os.path.dirname(__file__))
    work_dir = tempfile.mkdtemp()
    out_json = os.path.join(work_dir, "transcript.json")
    subprocess.run([
        sys.executable, os.path.join(scripts, "transcribe.py"),
        mp3, "--model", "small", "--lang", "en", "--out", out_json
    ], check=True, capture_output=True)
    segs_file = out_json + ".segments"
    if not os.path.exists(segs_file):
        # fallback: use word list grouped into segments
        with open(out_json) as f:
            words = json.load(f)
        segs = group_words_into_segments(words)
    else:
        with open(segs_file) as f:
            segs = json.load(f)
    return segs

def group_words_into_segments(words, pause_threshold=0.4, max_words=12):
    """Group words into segments by pause length or max word count."""
    if not words:
        return []
    segs = []
    cur = [words[0]]
    for w in words[1:]:
        gap = w["start"] - cur[-1]["end"]
        if gap > pause_threshold or len(cur) >= max_words:
            segs.append({"text": " ".join(x["text"].strip() for x in cur),
                         "start": cur[0]["start"], "end": cur[-1]["end"]})
            cur = [w]
        else:
            cur.append(w)
    if cur:
        segs.append({"text": " ".join(x["text"].strip() for x in cur),
                     "start": cur[0]["start"], "end": cur[-1]["end"]})
    return segs

def normalize(text):
    """Lowercase, strip punctuation for matching."""
    return re.sub(r"[^a-z0-9\s]", "", text.lower()).split()

def line_score(lyric_words, seg_words):
    """Word overlap score between lyric line and segment."""
    if not lyric_words or not seg_words:
        return 0
    lw = set(lyric_words[:6])  # only first 6 words of lyric for anchor
    sw = set(seg_words)
    return len(lw & sw) / max(len(lw), 1)

def match_lyrics_to_timestamps(lyric_lines, segments):
    """
    For each lyric line, find the best matching segment timestamp.
    Uses a greedy forward pass: each lyric must be >= the previous match.
    Returns list of (text, start_time) tuples.
    """
    seg_start = 0
    seg_norm = [normalize(s["text"]) for s in segments]

    # Phase 1: match, tracking which segment index each line matched
    raw = []  # (text, t, matched_seg_idx)
    for line in lyric_lines:
        lw = normalize(line)
        best_idx, best_score = seg_start, 0
        for i in range(seg_start, len(segments)):
            sc = line_score(lw, seg_norm[i])
            if sc > best_score:
                best_score = sc
                best_idx = i
            if i > seg_start + 30 and best_score > 0.3:
                break

        t = segments[best_idx]["start"] if best_score > 0.1 else None
        matched = best_idx if best_score > 0.1 else -1
        raw.append((line, t, matched))

        if best_score > 0.1:
            seg_start = best_idx

    # Phase 2: de-duplicate by segment index.
    # When consecutive lines map to the same segment only the last survives
    # in findIdx (backward scan). Set extras to None → fill_missing spaces them.
    deduped = []
    prev_seg = None
    for text, t, seg_idx in raw:
        if seg_idx != -1 and seg_idx == prev_seg:
            deduped.append((text, None))
        else:
            deduped.append((text, t))
            prev_seg = seg_idx

    return fill_missing(deduped, segments)

def fill_missing(result, segments):
    """Replace None timestamps by linear interpolation between known anchors."""
    out = list(result)
    n = len(out)
    if n == 0:
        return out
    last_seg_t = segments[-1]["start"] if segments else 10.0

    # Replace all Nones: first pass to collect anchor indices
    anchors = [(i, t) for i, (_, t) in enumerate(out) if t is not None]

    if not anchors:
        # no anchors at all — evenly space from 0
        for i in range(n):
            out[i] = (out[i][0], float(i) * 4.0)
        return out

    # Fill head (before first anchor)
    first_ai, first_at = anchors[0]
    for i in range(first_ai):
        out[i] = (out[i][0], max(0.0, first_at - (first_ai - i) * 3.0))

    # Fill tail (after last anchor)
    last_ai, last_at = anchors[-1]
    for i in range(last_ai + 1, n):
        out[i] = (out[i][0], last_at + (i - last_ai) * 3.0)

    # Interpolate gaps between anchors
    for k in range(len(anchors) - 1):
        ai, at = anchors[k]
        bi, bt = anchors[k + 1]
        for j in range(ai + 1, bi):
            frac = (j - ai) / (bi - ai)
            out[j] = (out[j][0], at + frac * (bt - at))

    return out

def build_song_js(title, dur, timed_lines):
    lines_js = []
    for text, t in timed_lines:
        esc = text.replace("\\","\\\\").replace('"','\\"').replace("'","\\'")
        lines_js.append(f'  {{text:"{esc}",t:{t:.2f}}}')
    body = ",\n".join(lines_js)
    return (
        f'window.__TITLE="{title}";\n'
        f'window.__DUR={int(dur)};\n'
        f'window.__LINES=[\n{body}\n];\n'
    )

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: sync-bynothing-lyrics.py <mp3> <title> <out_song_js>")
        sys.exit(1)

    mp3_path = sys.argv[1]
    title    = sys.argv[2]
    out_js   = sys.argv[3]

    # Load lyrics from the caller's environment (passed as 4th arg = JSON array)
    lyric_lines = json.loads(sys.argv[4]) if len(sys.argv) > 4 else []

    dur = get_duration(mp3_path)
    print(f"  transcribing {title} ({dur:.0f}s)…", flush=True)
    segs = transcribe(mp3_path)
    print(f"  got {len(segs)} segments, matching {len(lyric_lines)} lyric lines…", flush=True)

    timed = match_lyrics_to_timestamps(lyric_lines, segs)
    js = build_song_js(title, dur, timed)
    with open(out_js, "w") as f:
        f.write(js)
    print(f"  → {out_js}", flush=True)
