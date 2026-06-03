# Encoding cheatsheet

## Probe anything
```bash
ffprobe -v error -show_entries stream=codec_type,width,height,r_frame_rate,bit_rate,profile,pix_fmt \
  -show_entries format=duration,size,bit_rate -of default=noprint_wrappers=1 FILE
```

## YouTube master (16:9, 1080p)
```bash
./scripts/encode-youtube.sh in.mp4 out-youtube.mp4 "TITLE"
```

## Shorts / Reels / Pinterest (9:16, 1080×1920)
Render the composition at 1080×1920, then cut:
```bash
./scripts/cut-reels.sh master.mp4 segments.txt renders/reels
# segments.txt lines:  START|DURATION|hook label
```

## Fix sparse keyframes before compositing a source video
```bash
ffmpeg -i in.mp4 -c:v libx264 -r 30 -g 30 -keyint_min 30 \
  -movflags +faststart -preset fast -crf 18 -c:a aac -b:a 192k out.mp4
```

## Upscale a small vertical source to 1080×1920
```bash
ffmpeg -i in.mp4 -vf "scale=1080:1920:flags=lanczos" -c:v libx264 -crf 18 \
  -r 30 -g 30 -keyint_min 30 -movflags +faststart -c:a aac -b:a 192k out.mp4
```

## Extract verification frames (always do this before declaring done)
```bash
ffmpeg -y -ss 6 -i render.mp4 -frames:v 1 -vf scale=540:-1 work/check.jpg
```

## Thumbnail
```bash
./scripts/thumbnail.sh render.mp4 6 renders/thumb.jpg
```

## Whisper language codes
en, ur (Urdu), hi (Hindi), es, fr-fr, it, pt-br, ja, zh, de, ar, ru...
- Known English → `--model small.en`
- Known other  → `--model small --lang <code>`  (NEVER *.en — it translates)
- Unknown      → `--model small` (auto-detect)
