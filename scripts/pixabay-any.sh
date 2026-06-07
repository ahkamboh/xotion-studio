#!/usr/bin/env bash
# pixabay-any.sh — unified Pixabay asset fetcher. One entry point, every type.
#
#   scripts/pixabay-any.sh <type> "<query>" <out> [type-specific args...]
#
# Types:
#   photo         — JSON API   (out.jpg / .png)
#   illustration  — JSON API   (out.png)
#   vector        — JSON API   (out.svg, falls back to PNG raster)
#   video         — JSON API   (out.mp4)
#   music         — puppeteer  (out.mp3) — no public API; scrapes detail page
#   sfx           — puppeteer  (out.mp3) — same
#   gif           — puppeteer  (out.gif) — no public API; scrapes detail page
#   3d            — puppeteer  (out-dir/) — 15-frame turntable PNG sequence
#                   + 1s turntable.mp4. NOT source .glb/.obj.
#
# All routes write <out>.license.json (or <dir>/license.json for 3d) with
# Pixabay Content License metadata.
set -euo pipefail
TYPE="${1:?usage: pixabay-any.sh <photo|illustration|vector|video|music|sfx|gif|3d> <query> <out> [extra]}"
shift
DIR="$(cd "$(dirname "$0")" && pwd)"
case "$TYPE" in
  photo)        exec "$DIR/pixabay-photo.sh"        "$@" ;;
  illustration) exec "$DIR/pixabay-illustration.sh" "$@" ;;
  vector)       exec "$DIR/pixabay-vector.sh"       "$@" ;;
  video)        exec "$DIR/pixabay-video.sh"        "$@" ;;
  music)        exec "$DIR/pixabay-music.sh"        "$@" ;;
  sfx)          exec "$DIR/pixabay-sfx.sh"          "$@" ;;
  gif)          exec "$DIR/pixabay-gif.sh"          "$@" ;;
  3d)           exec "$DIR/pixabay-3d.sh"           "$@" ;;
  *) echo "[pixabay-any] unknown type '$TYPE' — must be photo|illustration|vector|video|music|sfx|gif|3d" >&2; exit 2 ;;
esac
