#!/usr/bin/env bash
# One-time machine setup. Run after cloning xotion-studio on a new computer.
set -euo pipefail
echo "== xotion-studio setup =="

# 1. Node / ffmpeg checks
command -v node >/dev/null || { echo "!! Node >= 22 required (https://nodejs.org)"; exit 1; }
command -v ffmpeg >/dev/null || { echo "!! ffmpeg required (brew install ffmpeg / apt install ffmpeg)"; exit 1; }
echo "ok: node $(node -v), ffmpeg present"

# 2. HyperFrames CLI + AI skills (installs gsap/hyperframes/etc agent skills)
echo "-- installing HyperFrames skills --"
npx -y skills add heygen-com/hyperframes || echo "  (skills add skipped/failed — rerun manually if needed)"

# 3. Python deps for transcription + amplitude
echo "-- installing python deps (whisper, soundfile) --"
PYFLAGS="--user --break-system-packages"
python3 -m pip install $PYFLAGS openai-whisper soundfile 2>/dev/null \
  || python3 -m pip install --user openai-whisper soundfile \
  || echo "  (pip install failed — install openai-whisper manually)"

echo ""
echo "== done =="
echo "Next: open Claude Code in this folder and paste a prompt from prompts/."
echo "Or run:  ./new-project.sh my-video"
