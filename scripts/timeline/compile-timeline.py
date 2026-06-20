#!/usr/bin/env python3
"""
compile-timeline.py — compile timeline.json -> a standalone HyperFrames index.html.

ADDITIVE: never overwrites a project's hand-authored projects/<name>/index.html. It writes into a
SEPARATE build dir (work/preview for preview, $WORK/build for export) and copies/symlinks the
referenced assets + fonts so relative paths resolve. The OUTPUT is contractually identical in shape
to the verified hand-authored compositions (projects/neo-demo/index.html) and the engine's blank
template (node_modules/hyperframes/dist/templates/blank/index.html), so every downstream consumer
(hf-guard, lint, render, qa-*, license-auditor) works unchanged.

Emitted contract (the REAL hyperframes input from the engine map):
  ROOT  <div id="root" data-composition-id="main" data-start="0" data-duration data-width data-height>
  HEAD  inline CDN GSAP tag (same one the templates use) + local @font-face from timeline.fonts
  CLIPS one DOM node per clip, EMITTED AT BUILD TIME (never inside tl.call()):
          image -> <div class="clip" style="background-image:url(...)">
          video -> <video class="clip" muted playsinline data-media-start> + companion <audio>
          text  -> <div class="clip">{HTML-escaped}</div>
          audio -> <audio class="clip" ...>
        each carries class="clip", data-start, data-duration, data-track-index;
        video/audio carry data-media-start (trim.in) + data-volume.
  SCRIPT one PAUSED gsap.timeline registered as window.__timelines["main"]; per clip:
          tl.set(el,{visibility:'visible'},start) + tl.set(el,{visibility:'hidden'},start+length)
          gsap.set(el, base transform/opacity)
          one tl.to(el,{...props,duration,ease}, start+kf.at) per keyframe
        ALL positions absolute seconds (toFixed(3)). Selectors SCOPED via Q. No randomness/network.

Usage:
  python3 scripts/timeline/compile-timeline.py --project <name> --out <build-dir> [--copy]
    --out   build dir (created). index.html + assets/ + assets/fonts/ land here.
    --copy  copy referenced media (export); default symlinks (fast preview).
"""

import argparse
import html
import json
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import timeline_model as tm  # noqa: E402

GSAP_CDN = "https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"


def _f3(x):
    """Format a number with 3-decimal precision, trimming trailing zeros (deterministic)."""
    return f"{float(x):.3f}".rstrip("0").rstrip(".") or "0"


def _link_or_copy(src, dst, copy):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if os.path.exists(dst) or os.path.islink(dst):
        try:
            os.remove(dst)
        except OSError:
            shutil.rmtree(dst, ignore_errors=True)
    if copy:
        shutil.copy2(src, dst)
    else:
        os.symlink(os.path.abspath(src), dst)


def _resolve_asset_path(proj_dir, path):
    """Resolve a project-relative or absolute asset path to an absolute on-disk path."""
    if os.path.isabs(path):
        return path
    return os.path.join(proj_dir, path)


# ---------------------------------------------------------------------------
# CSS / style helpers
# ---------------------------------------------------------------------------

_STYLE_PX = {"fontSize", "borderRadius"}
_STYLE_CSS_KEY = {
    "fontFamily": "font-family",
    "fontSize": "font-size",
    "fontWeight": "font-weight",
    "color": "color",
    "background": "background",
    "textAlign": "text-align",
    "lineHeight": "line-height",
    "letterSpacing": "letter-spacing",
    "padding": "padding",
    "objectFit": "object-fit",
    "borderRadius": "border-radius",
}


def _style_to_css(style):
    """Build a CSS fragment from the whitelisted clip.style keys (zIndexBoost handled separately)."""
    out = []
    for key, css_key in _STYLE_CSS_KEY.items():
        if key not in style:
            continue
        val = style[key]
        if key in _STYLE_PX:
            val = f"{val}px"
        if key == "fontFamily":
            val = f'"{val}", sans-serif'
        out.append(f"{css_key}:{val}")
    return ";".join(out)


def _position_css(clip, default_full_frame):
    """Build position CSS (absolute box). Full-frame media default = inset:0."""
    pos = clip.get("position") or {}
    has_box = any(k in pos for k in ("x", "y", "w", "h"))
    parts = ["position:absolute"]
    if not has_box and default_full_frame:
        parts.append("inset:0")
        parts.append("width:100%")
        parts.append("height:100%")
        return ";".join(parts), False
    anchor = pos.get("anchor", "topleft")
    if "x" in pos:
        parts.append(f"left:{_f3(pos['x'])}px")
    if "y" in pos:
        parts.append(f"top:{_f3(pos['y'])}px")
    if "w" in pos:
        parts.append(f"width:{_f3(pos['w'])}px")
    if "h" in pos:
        parts.append(f"height:{_f3(pos['h'])}px")
    if not has_box and not default_full_frame:
        # centered auto-box default for text
        parts.append("left:50%")
        parts.append("top:50%")
        return ";".join(parts), True  # signal centered anchor
    centered = anchor == "center"
    return ";".join(parts), centered


def _z_index(track_index, style):
    return track_index * 100 + int(style.get("zIndexBoost", 0))


def _luminance(bg):
    """Relative luminance 0..1 of a #hex background (else 0 = treat as dark)."""
    s = bg.strip().lstrip("#") if isinstance(bg, str) else ""
    if len(s) == 3:
        s = "".join(c * 2 for c in s)
    if len(s) < 6:
        return 0.0
    try:
        r, g, b = int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16)
    except ValueError:
        return 0.0
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255.0


def _text_defaults(tl):
    """Sensible, overridable defaults so a BARE text clip (no style) renders readably.

    Without this, a text clip with no font-size/color inherits the browser default (tiny + often
    low-contrast) — which makes the agent's `add_clip text` blind-unfriendly. The agent can still
    override any of these via clip.style; these are only the fallbacks.
    """
    lum = _luminance(tl.get("background", "#000"))
    fonts = tl.get("fonts") or []
    return {
        "color": "#15120e" if lum > 0.6 else "#ffffff",
        "size": max(28, round(int(tl["height"]) * 0.05)),
        "family": fonts[0]["family"] if fonts else "sans-serif",
        "maxw": round(int(tl["width"]) * 0.86),
    }


# ---------------------------------------------------------------------------
# element emission
# ---------------------------------------------------------------------------

def _el_id(clip_id):
    """DOM id derived from clip id so split/update stay addressable. clip_ ids are CSS-safe."""
    return "c_" + clip_id


def _emit_clip(clip, track_index, asset_rel, audio_els, defaults):
    """Return (html_for_element) and append any companion <audio> string to audio_els."""
    ctype = clip["type"]
    eid = _el_id(clip["id"])
    style = clip.get("style") or {}
    start = _f3(clip["start"])
    length = _f3(clip["length"])
    z = _z_index(track_index, style)

    if ctype == "image":
        pos_css, centered = _position_css(clip, default_full_frame=True)
        obj_fit = style.get("objectFit", "cover")
        css = _style_to_css(style)
        src = asset_rel[clip["source"]]
        transform = "transform:translate(-50%,-50%);" if centered else ""
        el = (
            f'<div id="{eid}" class="clip" data-start="{start}" data-duration="{length}" '
            f'data-track-index="{track_index}" '
            f'style="{pos_css};z-index:{z};background-image:url(\'{src}\');'
            f'background-size:{obj_fit};background-position:center;background-repeat:no-repeat;'
            f'{transform}{(";" + css) if css else ""}"></div>'
        )
        return el

    if ctype == "video":
        pos_css, centered = _position_css(clip, default_full_frame=True)
        obj_fit = style.get("objectFit", "cover")
        src = asset_rel[clip["source"]]
        media_start = _f3(clip.get("trim", {}).get("in", 0))
        transform = "transform:translate(-50%,-50%);" if centered else ""
        el = (
            f'<video id="{eid}" class="clip" src="{src}" muted playsinline '
            f'data-start="{start}" data-duration="{length}" data-media-start="{media_start}" '
            f'data-track-index="{track_index}" '
            f'style="{pos_css};z-index:{z};object-fit:{obj_fit};{transform}"></video>'
        )
        au = clip.get("audio") or {}
        if not au.get("mute", False):
            vol = _f3(au.get("volume", 1))
            audio_els.append(
                f'<audio id="{eid}_a" src="{src}" data-start="{start}" data-duration="{length}" '
                f'data-media-start="{media_start}" data-volume="{vol}" '
                f'data-track-index="{track_index}"></audio>'
            )
        return el

    if ctype == "text":
        pos_css, centered = _position_css(clip, default_full_frame=False)
        css = _style_to_css(style)
        transform = "transform:translate(-50%,-50%);" if centered else ""
        # readable max-width so long bare text wraps inside the frame (centered auto-box only)
        maxw = f"max-width:{defaults['maxw']}px;" if centered and "w" not in (clip.get("position") or {}) else ""
        text = html.escape(clip.get("text", ""))
        # `text-clip` class supplies the overridable defaults (size/color/weight/align); inline css wins.
        el = (
            f'<div id="{eid}" class="clip text-clip" data-start="{start}" data-duration="{length}" '
            f'data-track-index="{track_index}" '
            f'style="{pos_css};z-index:{z};{maxw}{transform}{css}">{text}</div>'
        )
        return el

    if ctype == "audio":
        src = asset_rel[clip["source"]]
        media_start = _f3(clip.get("trim", {}).get("in", 0))
        au = clip.get("audio") or {}
        vol = _f3(au.get("volume", 1))
        el = (
            f'<audio id="{eid}" class="clip" src="{src}" data-start="{start}" '
            f'data-duration="{length}" data-media-start="{media_start}" data-volume="{vol}" '
            f'data-track-index="{track_index}"></audio>'
        )
        return el

    raise tm.TimelineError(f"unknown clip type: {ctype}")


# ---------------------------------------------------------------------------
# timeline script emission
# ---------------------------------------------------------------------------

def _emit_clip_script(clip):
    """Emit lifecycle + base transform + keyframes for one clip. Scoped via Q(). Absolute seconds."""
    eid = _el_id(clip["id"])
    sel = f'Q("#{eid}")'
    start = _f3(clip["start"])
    end = _f3(float(clip["start"]) + float(clip["length"]))
    lines = []
    # (a) visibility lifecycle (matches neo-demo)
    lines.append(f'  tl.set({sel},{{visibility:"visible"}},{start});')
    lines.append(f'  tl.set({sel},{{visibility:"hidden"}},{end});')
    # (b) base transform/opacity via gsap.set at clip start
    tf = clip.get("transform") or {}
    base = {}
    for k in ("opacity", "x", "y", "scale", "rotation"):
        if k in tf:
            base[k] = tf[k]
    if base:
        base_js = ",".join(f"{k}:{_f3(v)}" for k, v in base.items())
        lines.append(f"  gsap.set({sel},{{{base_js}}});")
    # (c) one tl.to per keyframe at absolute time start+at
    for kf in clip.get("keyframes", []) or []:
        at_abs = _f3(float(clip["start"]) + float(kf["at"]))
        dur = _f3(kf.get("dur", 0.5))
        ease = kf.get("ease", "power2.out")
        props_js = ",".join(f"{p}:{_f3(v)}" for p, v in kf["props"].items())
        lines.append(
            f'  tl.to({sel},{{{props_js},duration:{dur},ease:"{ease}"}},{at_abs});'
        )
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# main compile
# ---------------------------------------------------------------------------

def compile_timeline(project, out_dir, copy=False):
    proj_dir = tm.project_dir(project)
    tl = tm.load(project, create=False)

    os.makedirs(out_dir, exist_ok=True)
    out_assets = os.path.join(out_dir, "assets")
    os.makedirs(out_assets, exist_ok=True)

    # ---- assets: link/copy each referenced asset into out_dir/assets, build rel-url map ----
    asset_rel = {}
    referenced = set()
    for track in tl["tracks"]:
        for clip in track["clips"]:
            if clip.get("source"):
                referenced.add(clip["source"])
    for aid in referenced:
        asset = tl["assets"][aid]
        src_path = _resolve_asset_path(proj_dir, asset["path"])
        if not os.path.exists(src_path):
            raise tm.TimelineError(f"asset '{aid}' file missing on disk: {src_path}")
        fname = f"{aid}{os.path.splitext(src_path)[1].lower()}"
        dst = os.path.join(out_assets, fname)
        _link_or_copy(src_path, dst, copy)
        asset_rel[aid] = f"assets/{fname}"

    # ---- fonts: link/copy each .ttf, emit @font-face ----
    font_faces = []
    for fnt in tl.get("fonts", []) or []:
        src = fnt["src"]
        src_font = _resolve_asset_path(proj_dir, src)
        # fonts usually live in the repo's SHARED assets/fonts/, not per-project — fall back to ROOT
        # so a src like "assets/fonts/fraunces-900.ttf" resolves even when the project has no fonts dir.
        if not os.path.exists(src_font) and not os.path.isabs(src):
            alt = os.path.join(tm.ROOT, src)
            if os.path.exists(alt):
                src_font = alt
        rel = src if not os.path.isabs(src) else f"assets/fonts/{os.path.basename(src)}"
        if not os.path.exists(src_font):
            raise tm.TimelineError(f"font '{fnt.get('family')}' file missing: {src} "
                                   f"(looked in project and {tm.ROOT})")
        dst = os.path.join(out_dir, rel)
        _link_or_copy(src_font, dst, copy)
        weight = fnt.get("weight", "400")
        font_faces.append(
            f'@font-face{{font-family:"{fnt["family"]}";font-weight:{weight};'
            f'src:url("{rel}") format("truetype");}}'
        )

    # ---- elements ----
    defaults = _text_defaults(tl)
    body_els = []
    audio_els = []
    for track_index, track in enumerate(tl["tracks"]):
        for clip in track["clips"]:
            body_els.append(_emit_clip(clip, track_index, asset_rel, audio_els, defaults))

    # ---- timeline script ----
    script_lines = []
    for track in tl["tracks"]:
        for clip in track["clips"]:
            script_lines.append(_emit_clip_script(clip))
    timeline_body = "\n".join(s for s in script_lines if s)

    w, h = tl["width"], tl["height"]
    bg = tl.get("background", "#000")
    duration = _f3(tl["duration"])

    font_css = "\n      ".join(font_faces)
    elements_html = "\n      ".join(body_els + audio_els)

    doc = f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width={w}, height={h}" />
    <script src="{GSAP_CDN}"></script>
    <style>
      {font_css}
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ width: {w}px; height: {h}px; overflow: hidden; background: {bg}; }}
      #root {{ position: relative; width: {w}px; height: {h}px; overflow: hidden; background: {bg}; }}
      .clip {{ visibility: hidden; }}
      .text-clip {{ font-family: "{defaults['family']}", -apple-system, system-ui, sans-serif;
        font-size: {defaults['size']}px; font-weight: 600; color: {defaults['color']};
        text-align: center; line-height: 1.2; white-space: pre-wrap; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{duration}" data-width="{w}" data-height="{h}" style="position:relative;width:{w}px;height:{h}px;overflow:hidden;background:{bg}">
      {elements_html}
    </div>
    <script>
      window.__timelines = window.__timelines || {{}};
      var tl = gsap.timeline({{ paused: true }});
      // Scope every selector to this composition (CLAUDE.md rule).
      var Q = function (s) {{ return '[data-composition-id="main"] ' + s; }};
{timeline_body}
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
"""

    out_html = os.path.join(out_dir, "index.html")
    with open(out_html, "w", encoding="utf-8") as fh:
        fh.write(doc)
    return out_html


def main():
    ap = argparse.ArgumentParser(description="Compile timeline.json -> HyperFrames index.html")
    ap.add_argument("--project", required=True, help="project name (under projects/) or path")
    ap.add_argument("--out", required=True, help="build dir to write index.html + assets into")
    ap.add_argument("--copy", action="store_true", help="copy media instead of symlinking (export)")
    args = ap.parse_args()
    try:
        out = compile_timeline(args.project, args.out, copy=args.copy)
    except tm.TimelineError as e:
        sys.stderr.write(f"[compile-timeline] ERROR: {e}\n")
        sys.exit(1)
    print(json.dumps({"index_html": os.path.abspath(out)}))


if __name__ == "__main__":
    main()
