#!/usr/bin/env bash
# help.sh — print the xotion-studio command registry (the `:` shorthand). Backs the `:help` command.
# Usage: scripts/help.sh [group]   (group: make|caption|fx|edit|audio|util|combo ; default: all)
set -euo pipefail
G="${1:-all}"
b(){ printf "\n\033[1m%s\033[0m\n" "$1"; }   # bold heading

[ "$G" = all ] || [ "$G" = make ] && {
b "🎬 MAKE"; cat <<'E'
  :lyric    image+song -> lyric video        :data     numbers/CSV -> charts
  :narrate  narrated motion (voice+music)     :code     animated code typing
  :explain  explainer                         :app      3D device / glass showcase
  :promo    promo / hype edit                 :title    title card / intro
  :music    music visualizer                  :ugc      UGC ad (vertical)
  :cards    one template + CSV -> N videos
E
}
[ "$G" = all ] || [ "$G" = caption ] && {
b "💬 CAPTIONS"; cat <<'E'
  :caption  add synced captions (default)     :gradient teal->blue->violet fill
  :hormozi  caps, black stroke, green active   :minimal  small clean lower-third
  :beast    huge caps, yellow active           :tiktok   white on black bar
  :pill     springy yellow pill                :subs     export 30+ language .srt
  :neon     glowing, cyan active
E
}
[ "$G" = all ] || [ "$G" = fx ] && {
b "✨ OVERLAYS"; cat <<'E'
  :fx       glow particles + kinetic title     :aurora   noise-driven aurora ribbons
  :3d       three.js globe + points            :glass    frosted-glass premium title
  :atmos    light leaks + bokeh + grain
E
}
[ "$G" = all ] || [ "$G" = edit ] && {
b "🎨 FINISH / EDIT"; cat <<'E'
  :enrich   grade+bloom+grain+vignette+sharpen  :thumb    thumbnail
  :blur     motion blur                          :yt       encode for YouTube
  :grade    color grade (=cine|warm|moody...)    :bg       remove background
  :reel     cut vertical reels/Shorts            :gif      export GIF
  :auto     remove silence + filler words
E
}
[ "$G" = all ] || [ "$G" = audio ] && {
b "🔊 AUDIO"; cat <<'E'
  :vo       voiceover TTS (=female|male|af_nova) :sfx      sound FX (whoosh/riser/impact)
  :bed      music bed (=calm|warm|tense|uplift)  :norm     normalize loudness (-14 LUFS)
  :mix      voice over music + auto-duck
E
}
[ "$G" = all ] || [ "$G" = util ] && {
b "🎛 STYLE / BRAND / UTIL"; cat <<'E'
  :style=<name> apply visual style (noir...)    :preview  live hot-reload
  :brand    apply brand.json                     :qa       QA acceptance loop
  :batch    op over many files                   :help     this list
E
}
[ "$G" = all ] || [ "$G" = combo ] && {
b "⚡ COMBOS (one word -> full pipeline)"; cat <<'E'
  :short    autocut -> :hormozi -> :reel -> :enrich       (talking clip -> Short)
  :ship     make -> :caption -> :enrich -> :thumb -> :yt   (build + finish + export)
  :rich     overlay (:fx/:aurora/...) -> :enrich           (plain clip -> rich)
  :ad       :hook -> :caption :hormozi -> CTA overlay -> :enrich   (UGC/product ad)
  :teaser   :title -> :atmos -> :bed=dark -> :enrich=cine  (cinematic teaser)
  :drop     :app -> :glass -> :bed=uplift -> :enrich        (product launch)
  :quote    :cards from a quotes CSV/JSON                   (quote/stat videos)
E
}
b "USAGE"; cat <<'E'
  @file = input · :cmd = action · chain them · =value passes options
  e.g.  :short @podcast.mp4   ·   :lyric @song.mp3 :style=noir   ·   :caption :neon :lang=ur @clip.mp4
  Full reference: COMMANDS.md
E
echo
