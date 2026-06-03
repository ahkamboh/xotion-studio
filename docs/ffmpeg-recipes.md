# ffmpeg / ImageMagick recipe book

The video- and image-editing pillar. Copy a recipe, swap paths, run. Re-encode (not `-c copy`)
whenever you need frame accuracy or a filter. Always add `-movflags +faststart` to MP4 output.

---

## PROBE / INSPECT
```bash
ffprobe -v error -show_entries stream=codec_type,codec_name,width,height,r_frame_rate,bit_rate,pix_fmt \
  -show_entries format=duration,size,bit_rate -of default=noprint_wrappers=1 FILE
# duration only:
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1 FILE
# list all keyframe timestamps:
ffprobe -v error -select_streams v -show_entries frame=pts_time,key_frame -of csv FILE | grep ",1$"
```

## TRIM / CUT
```bash
# Lossless (cuts at nearest keyframe — fast, may be slightly off):
ffmpeg -ss 00:00:05 -to 00:00:20 -i in.mp4 -c copy out.mp4
# Frame-accurate (re-encode):
ffmpeg -ss 5 -to 20 -i in.mp4 -c:v libx264 -crf 18 -preset medium -c:a aac -movflags +faststart out.mp4
# Keep first N seconds: -t 10  | Skip first N: -ss 10
```

## CONCATENATE
```bash
# Same codec/size/fps (fast, no re-encode):
printf "file '%s'\n" a.mp4 b.mp4 c.mp4 > list.txt
ffmpeg -f concat -safe 0 -i list.txt -c copy out.mp4
# Different sources (re-encode, normalize first to same w/h/fps/sar):
# scale each to 1080x1920, then concat filter — see scripts/concat.sh
```

## SPEED / TIME
```bash
# 2x faster (video+audio):
ffmpeg -i in.mp4 -filter_complex "[0:v]setpts=0.5*PTS[v];[0:a]atempo=2.0[a]" -map "[v]" -map "[a]" out.mp4
# 0.5x slow-mo (no audio):
ffmpeg -i in.mp4 -filter:v "setpts=2.0*PTS" -an out.mp4
# Reverse:
ffmpeg -i in.mp4 -vf reverse -af areverse out.mp4
# Freeze last frame for 3s: tpad
ffmpeg -i in.mp4 -vf "tpad=stop_mode=clone:stop_duration=3" out.mp4
```

## CROP / ROTATE / FLIP
```bash
ffmpeg -i in.mp4 -vf "crop=W:H:X:Y" out.mp4
ffmpeg -i in.mp4 -vf "transpose=1" out.mp4   # 90° CW (2=CCW)
ffmpeg -i in.mp4 -vf "hflip" out.mp4          # mirror (vflip = vertical)
```

## SCALE / ASPECT CONVERSION
```bash
# Resize keeping aspect, pad to exact size (letterbox):
ffmpeg -i in.mp4 -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" out.mp4
# Landscape -> vertical 9:16 with BLURRED background fill (best for reels):
ffmpeg -i in.mp4 -filter_complex \
 "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=30[bg]; \
  [0:v]scale=1080:-1:force_original_aspect_ratio=decrease[fg]; \
  [bg][fg]overlay=(W-w)/2:(H-h)/2" -c:a copy out.mp4
# Vertical -> square 1080x1080 blurred fill: swap dims above to 1080:1080.
# Upscale small vertical source:
ffmpeg -i in.mp4 -vf "scale=1080:1920:flags=lanczos" -c:v libx264 -crf 18 -r 30 -c:a aac out.mp4
```

## COLOR / LOOK
```bash
# Quick grade: brightness/contrast/saturation
ffmpeg -i in.mp4 -vf "eq=brightness=0.04:contrast=1.12:saturation=1.18" out.mp4
# Warm cinematic + slight vignette:
ffmpeg -i in.mp4 -vf "curves=preset=increase_contrast,colorbalance=rs=.05:gs=.02:bs=-.04,vignette" out.mp4
# Apply a LUT (.cube):
ffmpeg -i in.mp4 -vf "lut3d=look.cube" out.mp4
# Black & white:
ffmpeg -i in.mp4 -vf "hue=s=0" out.mp4
```

## OVERLAY / PICTURE-IN-PICTURE / WATERMARK
```bash
# Logo watermark top-right with 20px margin:
ffmpeg -i in.mp4 -i logo.png -filter_complex "overlay=W-w-20:20" out.mp4
# Scaled PiP bottom-right:
ffmpeg -i main.mp4 -i pip.mp4 -filter_complex "[1:v]scale=480:-1[p];[0:v][p]overlay=W-w-30:H-h-30" out.mp4
# Animated position uses expressions, e.g. overlay=x='if(gte(t,2), W-w-20, -w)':y=20
```

## GREEN SCREEN / CHROMA KEY
```bash
ffmpeg -i fg.mp4 -i bg.mp4 -filter_complex \
 "[0:v]chromakey=0x00FF00:0.30:0.10[ck];[1:v][ck]overlay" out.mp4
# For a transparent subject without a green screen, use scripts/remove-bg.sh (u2net).
```

## TRANSITIONS BETWEEN CLIPS
```bash
# 1s crossfade at the 4s mark (xfade needs matching size/fps):
ffmpeg -i a.mp4 -i b.mp4 -filter_complex \
 "[0][1]xfade=transition=fade:duration=1:offset=4" -c:a copy out.mp4
# Other transitions: wipeleft, slideup, circleopen, dissolve, pixelize, smoothleft...
```

## SUBTITLES / BURN-IN
```bash
# Burn an SRT (styled):
ffmpeg -i in.mp4 -vf "subtitles=subs.srt:force_style='FontName=Poppins,Fontsize=22,PrimaryColour=&HFFFFFF&,Outline=1'" out.mp4
# Soft (toggleable) subs:
ffmpeg -i in.mp4 -i subs.srt -c copy -c:s mov_text out.mp4
# For DESIGNED captions/animation, build them in HyperFrames instead.
```

## AUDIO
```bash
ffmpeg -i in.mp4 -vn -acodec libmp3lame -q:a 2 out.mp3        # extract audio
ffmpeg -i in.mp4 -an out.mp4                                   # strip audio
ffmpeg -i video.mp4 -i music.mp3 -map 0:v -map 1:a -shortest -c:v copy out.mp4   # replace audio
# Mix voiceover over bg music (duck music to 25%):
ffmpeg -i voice.wav -i music.mp3 -filter_complex \
 "[1:a]volume=0.25[m];[0:a][m]amix=inputs=2:duration=longest" out.wav
ffmpeg -i in.mp4 -af "afade=t=in:d=1,afade=t=out:st=28:d=2" out.mp4   # audio fade in/out
```

## STABILIZE (shaky footage)
```bash
ffmpeg -i in.mp4 -vf vidstabdetect=shakiness=8:result=t.trf -f null -
ffmpeg -i in.mp4 -vf vidstabtransform=input=t.trf:smoothing=30,unsharp=5:5:0.8 out.mp4
```

## GIF
```bash
# High-quality GIF via palette:
ffmpeg -i in.mp4 -vf "fps=15,scale=640:-1:flags=lanczos,palettegen" pal.png
ffmpeg -i in.mp4 -i pal.png -lavfi "fps=15,scale=640:-1:flags=lanczos[x];[x][1:v]paletteuse" out.gif
```

## FRAMES <-> VIDEO
```bash
ffmpeg -i in.mp4 -vf fps=1 frames/%04d.png     # extract 1 fps
ffmpeg -framerate 30 -i frames/%04d.png -c:v libx264 -pix_fmt yuv420p out.mp4   # frames -> video
ffmpeg -ss 6 -i in.mp4 -frames:v 1 -q:v 2 poster.jpg   # single poster frame
```

---

# IMAGE EDITING

```bash
# Resize / crop (ffmpeg):
ffmpeg -i in.png -vf "scale=1080:-1" out.png
ffmpeg -i in.png -vf "crop=1080:1080:(iw-1080)/2:(ih-1080)/2" square.png
# Convert format:
ffmpeg -i in.webp out.png      # webp->png   (also heic, tiff, etc.)
# Text on image:
ffmpeg -i in.jpg -vf "drawtext=fontfile=assets/fonts/poppins-700.ttf:text='HELLO':fontsize=72:fontcolor=white:x=(w-tw)/2:y=(h-th)/2" out.jpg
# Composite logo onto image:
ffmpeg -i base.jpg -i logo.png -filter_complex "overlay=W-w-40:40" out.jpg
# Blur / vignette / grade: same -vf filters as video (gblur, eq, vignette, curves).
```

ImageMagick (if installed — `brew install imagemagick`):
```bash
magick in.jpg -resize 1080x1080^ -gravity center -extent 1080x1080 square.jpg   # crop-to-fill
magick in.png -background none -gravity center -extent 1080x1920 padded.png      # pad transparent
magick a.png b.png c.png +append row.png    # horizontal collage (-append = vertical)
magick in.jpg -modulate 105,120,100 -brightness-contrast 4x10 graded.jpg
```

**For designed graphics** (text + layout + brand fonts), build a 1-frame HyperFrames composition
and grab the frame — full CSS control beats drawtext for anything complex.
