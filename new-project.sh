#!/usr/bin/env bash
# Scaffold a new video project. Usage: ./new-project.sh <name> [width] [height] [duration]
set -euo pipefail
NAME="${1:?usage: ./new-project.sh <name> [W] [H] [duration]}"
W="${2:-1080}"; H="${3:-1920}"; D="${4:-30}"
cd projects
npx -y hyperframes init "$NAME" --width "$W" --height "$H" --fps 30 --duration "$D" --non-interactive
mkdir -p "$NAME/assets/fonts" "$NAME/work"
# copy the full font library so any family is available in the project
cp ../assets/fonts/*.ttf "$NAME/assets/fonts/" 2>/dev/null || true
echo "  (copied $(ls ../assets/fonts/*.ttf 2>/dev/null | wc -l | tr -d ' ') font files — see docs/FONTS.md)"
echo "Created projects/$NAME ($W x $H, ${D}s). Copy media into projects/$NAME/assets/."
echo "Then pick a template from templates/ and adapt it as projects/$NAME/index.html."
