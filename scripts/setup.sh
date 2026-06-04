#!/usr/bin/env bash
# One-time machine setup. Run after cloning xotion-studio on a new computer.
set -euo pipefail
echo "== xotion-studio setup =="

# 1. Node / ffmpeg checks
command -v node >/dev/null || { echo "!! Node >= 22 required (https://nodejs.org)"; exit 1; }
command -v ffmpeg >/dev/null || { echo "!! ffmpeg required (brew install ffmpeg / apt install ffmpeg)"; exit 1; }
echo "ok: node $(node -v), ffmpeg present"

# 2. HyperFrames — installed LOCALLY from the committed lockfile (pinned v0.6.70).
#    After this one-time install, `npx hyperframes` (or node_modules/.bin/hyperframes)
#    runs the local copy instantly — no per-use downloads, works offline.
echo "-- installing HyperFrames (local, from package-lock.json) --"
cd "$(dirname "$0")/.."
npm ci 2>/dev/null || npm install
echo "ok: hyperframes $(node_modules/.bin/hyperframes --version 2>/dev/null) installed locally"

# 2b. Pre-fetch the headless browser so the first render doesn't stall (one-time, ~170MB).
echo "-- fetching render browser (one-time) --"
node_modules/.bin/hyperframes browser 2>/dev/null \
  || node_modules/.bin/hyperframes doctor 2>/dev/null \
  || echo "  (browser will auto-download on first render)"

# 2c. AI coding skills for the agent (optional — improves agent guidance)
echo "-- installing HyperFrames agent skills --"
npx -y skills add heygen-com/hyperframes 2>/dev/null || echo "  (skills add skipped — rerun manually if needed)"

# 3. Python deps for transcription + amplitude
echo "-- installing python deps (whisper, soundfile) --"
PYFLAGS="--user --break-system-packages"
python3 -m pip install $PYFLAGS openai-whisper soundfile 2>/dev/null \
  || python3 -m pip install --user openai-whisper soundfile \
  || echo "  (pip install failed — install openai-whisper manually)"

# 4. Install the bundled Whisper 'small' model into the cache (no re-download).
#    The model ships in the repo via Git LFS (models/small.pt). We copy it to
#    ~/.cache/whisper/small.pt where openai-whisper looks for it.
echo "-- installing bundled Whisper model --"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODEL_SRC="$REPO_ROOT/models/small.pt"
CACHE_DIR="$HOME/.cache/whisper"
EXPECTED_SHA="9ecf779972d90ba49c06d968637d720dd632c55bbf19d441fb42bf17a411e794"
mkdir -p "$CACHE_DIR"
if [ -f "$MODEL_SRC" ] && [ "$(wc -c < "$MODEL_SRC")" -gt 100000000 ]; then
  # verify it's the real LFS content, not a 130-byte LFS pointer
  GOT_SHA="$(shasum -a 256 "$MODEL_SRC" | cut -d' ' -f1)"
  if [ "$GOT_SHA" = "$EXPECTED_SHA" ]; then
    cp -f "$MODEL_SRC" "$CACHE_DIR/small.pt"
    echo "ok: Whisper small model installed from repo -> $CACHE_DIR/small.pt"
  else
    echo "!! models/small.pt SHA mismatch — run 'git lfs pull' then re-run setup."
  fi
else
  echo "!! models/small.pt missing or is an LFS pointer."
  echo "   Run: git lfs install && git lfs pull   (then re-run ./scripts/setup.sh)"
fi

echo ""
echo "== done =="
echo "Next: open Claude Code in this folder and paste a prompt from prompts/."
echo "Or run:  ./new-project.sh my-video"

# 5. (optional) whisperX for frame-accurate caption alignment — needs Python 3.12.
#    Far better lyric/caption sync than small.pt. One-time:
#      brew install python@3.12
#      python3.12 -m venv .venv-whisperx && ./.venv-whisperx/bin/pip install whisperx
#    Then align with:  ./.venv-whisperx/bin/python scripts/align.py <audio> --out work/transcript.json
