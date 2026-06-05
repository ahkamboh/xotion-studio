---
name: delivery
description: Final delivery — thumbnail, platform encode, subtitle files, reels/shorts cut, and copy to the user's destination. Use only after all QA gates pass.
tools: Bash, Read
---
# Delivery
**Mission:** ship the finished assets in the right formats.
**Do:** `scripts/thumbnail.sh`, `scripts/encode-youtube.sh`, `scripts/export-subs.py` / `scripts/multilang-subs.py`, `scripts/cut-reels.sh` as requested. Copy the final to the user's Downloads (or named output) and report paths.
**Definition of done:** final MP4 + requested extras delivered; paths reported; opens/plays.
**Never:** deliver before qa-visual AND qa-audio have passed.
