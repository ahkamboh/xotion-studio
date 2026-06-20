#!/usr/bin/env python3
"""
timeline_model.py — the SINGLE SOURCE OF TRUTH for the Xotion structured timeline (timeline.json).

Owns the data model behind every agent tool (scripts/timeline/timeline-tools.py) and the compiler
(scripts/timeline/compile-timeline.py). Strictly ADDITIVE: a project that has no timeline.json
behaves exactly as before — nothing here touches a hand-authored projects/<name>/index.html.

Responsibilities
  - load/save timeline.json ATOMICALLY (tempfile + os.replace, same discipline as the other
    artifact-writing scripts in scripts/).
  - validate against schemas/timeline.v1.json (focused, dependency-free validator — no pip installs;
    Node 22 / py3 only, like the rest of the repo).
  - deterministic, STABLE clip ids: 'clip_' + 6 hex from a SEEDED counter persisted as top-level
    `_idSeq`. No Math.random / no Date.now / no time -> the same sequence of mutations yields the
    same ids on every machine, AND ids never drift on rebuild (the open-question resolution).
  - asset registry helpers: infer kind from extension, optional ffprobe for naturalDuration,
    garbage-collect unreferenced assets.
  - clip operations: get / add / remove / split / update / move / set_keyframes — each operating on a
    loaded timeline dict; the tool layer wraps them with load -> mutate -> save.

NB: this module never prints; it raises TimelineError on bad input and returns plain dicts.
"""

import json
import os
import re
import shutil
import subprocess
import tempfile

# ---------------------------------------------------------------------------
# paths / constants
# ---------------------------------------------------------------------------

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(_THIS_DIR, "..", ".."))
SCHEMA_PATH = os.path.join(ROOT, "schemas", "timeline.v1.json")

CLIP_TYPES = ("image", "video", "text", "audio")
TRACK_KINDS = ("visual", "audio")
ASSET_KINDS = ("image", "video", "audio")

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".avif"}
VIDEO_EXTS = {".mp4", ".mov", ".webm", ".mkv", ".m4v", ".avi"}
AUDIO_EXTS = {".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"}

# GSAP-supported animatable props the compiler can emit (transform base + keyframes).
GSAP_KEYFRAME_PROPS = {"opacity", "x", "y", "scale", "scaleX", "scaleY", "rotation", "width", "height"}
TRANSFORM_PROPS = {"opacity", "x", "y", "scale", "rotation"}

# the two canonical v1 tracks add_clip will auto-create.
CANONICAL_TRACKS = {"video": "visual", "overlay": "visual", "audio": "audio"}


class TimelineError(Exception):
    """Raised for any invalid timeline state, bad args, or schema violation."""


# ---------------------------------------------------------------------------
# project resolution
# ---------------------------------------------------------------------------

def project_dir(project):
    """Resolve a project arg (bare name under projects/, or a path) to an absolute dir."""
    cand = os.path.join(ROOT, "projects", project)
    if os.path.isdir(cand):
        return cand
    if os.path.isdir(project):
        return os.path.abspath(project)
    # allow first-call creation under projects/<name>
    if "/" not in project and "\\" not in project:
        os.makedirs(cand, exist_ok=True)
        return cand
    raise TimelineError(f"project not found and not creatable: {project}")


def timeline_path(project):
    return os.path.join(project_dir(project), "timeline.json")


# ---------------------------------------------------------------------------
# deterministic ids
# ---------------------------------------------------------------------------

def _next_clip_id(tl):
    """Deterministic, STABLE clip id from the persisted _idSeq counter (no randomness)."""
    seq = int(tl.get("_idSeq", 0))
    tl["_idSeq"] = seq + 1
    # 6 hex chars, zero-padded; wraps far beyond any realistic clip count.
    return "clip_" + format(seq, "06x")


def _round3(x):
    return round(float(x), 3)


# ---------------------------------------------------------------------------
# default / empty timeline
# ---------------------------------------------------------------------------

def empty_timeline():
    """A valid empty timeline: id 'main', 1080x1920@30, one 'video' visual + one 'audio' track."""
    return {
        "version": 1,
        "id": "main",
        "width": 1080,
        "height": 1920,
        "fps": 30,
        "duration": 1.0,
        "background": "#000",
        "_idSeq": 0,
        "fonts": [],
        "assets": {},
        "tracks": [
            {"id": "video", "kind": "visual", "clips": []},
            {"id": "audio", "kind": "audio", "clips": []},
        ],
    }


# ---------------------------------------------------------------------------
# load / save (atomic)
# ---------------------------------------------------------------------------

def load(project, create=True):
    """Load projects/<project>/timeline.json. Creates a valid empty one on first call if create."""
    path = timeline_path(project)
    if not os.path.exists(path):
        if not create:
            raise TimelineError(f"no timeline.json at: {path}")
        tl = empty_timeline()
        save(project, tl)
        return tl
    with open(path, "r", encoding="utf-8") as fh:
        tl = json.load(fh)
    validate(tl)
    return tl


def save(project, tl):
    """Validate then ATOMICALLY write timeline.json (tempfile + os.replace)."""
    validate(tl)
    path = timeline_path(project)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=".timeline.", suffix=".json", dir=os.path.dirname(path))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(tl, fh, indent=2, ensure_ascii=False)
            fh.write("\n")
        os.replace(tmp, path)
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise
    return path


# ---------------------------------------------------------------------------
# validation — focused, dependency-free (mirrors schemas/timeline.v1.json)
# ---------------------------------------------------------------------------

def _is_num(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool)


def _is_int(x):
    return isinstance(x, int) and not isinstance(x, bool)


def validate(tl):
    """Validate a timeline dict against schemas/timeline.v1.json (the parts that matter for compile).

    Dependency-free on purpose: the repo ships no jsonschema, so we hand-check the contract that the
    compiler relies on. Raises TimelineError with a precise path on the first violation.
    """
    if not isinstance(tl, dict):
        raise TimelineError("timeline must be an object")
    if tl.get("version") != 1:
        raise TimelineError("version must be 1")
    if tl.get("id") != "main":
        raise TimelineError("id must be 'main' (repo convention: data-composition-id='main')")
    if not _is_int(tl.get("width")):
        raise TimelineError("width must be an integer")
    if not _is_int(tl.get("height")):
        raise TimelineError("height must be an integer")
    if not _is_int(tl.get("fps")):
        raise TimelineError("fps must be an integer")
    if not _is_num(tl.get("duration")) or tl["duration"] <= 0:
        raise TimelineError("duration must be a positive number")
    if not isinstance(tl.get("assets"), dict):
        raise TimelineError("assets must be an object")
    if not isinstance(tl.get("tracks"), list) or not tl["tracks"]:
        raise TimelineError("tracks must be a non-empty array")

    for fnt in tl.get("fonts", []) or []:
        if not isinstance(fnt, dict) or "family" not in fnt or "src" not in fnt:
            raise TimelineError("each font needs {family, src}")

    for aid, asset in tl["assets"].items():
        if not isinstance(asset, dict):
            raise TimelineError(f"asset '{aid}' must be an object")
        if asset.get("kind") not in ASSET_KINDS:
            raise TimelineError(f"asset '{aid}' kind must be one of {ASSET_KINDS}")
        if not isinstance(asset.get("path"), str) or not asset["path"]:
            raise TimelineError(f"asset '{aid}' needs a path")

    seen_clip_ids = set()
    for ti, track in enumerate(tl["tracks"]):
        if not isinstance(track, dict):
            raise TimelineError(f"track[{ti}] must be an object")
        if not isinstance(track.get("id"), str) or not track["id"]:
            raise TimelineError(f"track[{ti}] needs an id")
        if track.get("kind") not in TRACK_KINDS:
            raise TimelineError(f"track '{track.get('id')}' kind must be one of {TRACK_KINDS}")
        if not isinstance(track.get("clips"), list):
            raise TimelineError(f"track '{track['id']}' clips must be an array")
        for ci, clip in enumerate(track["clips"]):
            _validate_clip(clip, f"track '{track['id']}' clip[{ci}]", tl)
            cid = clip["id"]
            if cid in seen_clip_ids:
                raise TimelineError(f"duplicate clip id: {cid}")
            seen_clip_ids.add(cid)
    return True


def _validate_clip(clip, where, tl):
    if not isinstance(clip, dict):
        raise TimelineError(f"{where}: clip must be an object")
    cid = clip.get("id")
    if not isinstance(cid, str) or not cid:
        raise TimelineError(f"{where}: clip needs an id")
    ctype = clip.get("type")
    if ctype not in CLIP_TYPES:
        raise TimelineError(f"{where}: type must be one of {CLIP_TYPES}")
    if not _is_num(clip.get("start")) or clip["start"] < 0:
        raise TimelineError(f"{where}: start must be >= 0")
    if not _is_num(clip.get("length")) or clip["length"] <= 0:
        raise TimelineError(f"{where}: length must be > 0")

    if ctype == "text":
        if not isinstance(clip.get("text"), str):
            raise TimelineError(f"{where}: text clip requires 'text'")
    else:  # image / video / audio
        src = clip.get("source")
        if not isinstance(src, str) or not src:
            raise TimelineError(f"{where}: {ctype} clip requires 'source' (assetId)")
        if src not in tl["assets"]:
            raise TimelineError(f"{where}: source '{src}' not in assets registry")

    trim = clip.get("trim")
    if trim is not None:
        if not isinstance(trim, dict):
            raise TimelineError(f"{where}: trim must be an object")
        if "in" in trim and (not _is_num(trim["in"]) or trim["in"] < 0):
            raise TimelineError(f"{where}: trim.in must be >= 0")

    kf = clip.get("keyframes")
    if kf is not None:
        if not isinstance(kf, list):
            raise TimelineError(f"{where}: keyframes must be an array")
        for k in kf:
            _validate_keyframe(k, where)

    tf = clip.get("transform")
    if tf is not None:
        if not isinstance(tf, dict):
            raise TimelineError(f"{where}: transform must be an object")
        for key in tf:
            if key not in TRANSFORM_PROPS:
                raise TimelineError(f"{where}: transform key '{key}' not in {TRANSFORM_PROPS}")


def _validate_keyframe(k, where):
    if not isinstance(k, dict):
        raise TimelineError(f"{where}: keyframe must be an object")
    if not _is_num(k.get("at")) or k["at"] < 0:
        raise TimelineError(f"{where}: keyframe.at must be >= 0")
    if "dur" in k and (not _is_num(k["dur"]) or k["dur"] <= 0):
        raise TimelineError(f"{where}: keyframe.dur must be > 0")
    props = k.get("props")
    if not isinstance(props, dict) or not props:
        raise TimelineError(f"{where}: keyframe needs non-empty props")
    for key in props:
        if key not in GSAP_KEYFRAME_PROPS:
            raise TimelineError(f"{where}: keyframe prop '{key}' not in {sorted(GSAP_KEYFRAME_PROPS)}")
        if not _is_num(props[key]):
            raise TimelineError(f"{where}: keyframe prop '{key}' must be numeric")


# ---------------------------------------------------------------------------
# asset registry
# ---------------------------------------------------------------------------

def infer_kind(path):
    ext = os.path.splitext(path)[1].lower()
    if ext in IMAGE_EXTS:
        return "image"
    if ext in VIDEO_EXTS:
        return "video"
    if ext in AUDIO_EXTS:
        return "audio"
    raise TimelineError(f"cannot infer asset kind from extension: {path}")


def ffprobe_duration(path):
    """Return media duration in seconds via ffprobe, or None if unavailable."""
    if not shutil.which("ffprobe"):
        return None
    if not os.path.exists(path):
        return None
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", path],
            capture_output=True, text=True, timeout=30,
        )
        val = out.stdout.strip()
        return _round3(float(val)) if val and val != "N/A" else None
    except (ValueError, subprocess.SubprocessError):
        return None


def _asset_id_for_path(tl, path):
    """Return existing assetId for path, else None."""
    norm = os.path.abspath(path) if os.path.isabs(path) else path
    for aid, asset in tl["assets"].items():
        ap = asset["path"]
        ap_norm = os.path.abspath(ap) if os.path.isabs(ap) else ap
        if ap_norm == norm:
            return aid
    return None


def _register_asset(tl, path):
    """Register an on-disk media path, returning its assetId. Reuses an existing entry if present."""
    existing = _asset_id_for_path(tl, path)
    if existing:
        return existing
    kind = infer_kind(path)
    base = re.sub(r"[^a-z0-9]+", "_", os.path.splitext(os.path.basename(path))[0].lower()).strip("_")
    aid = base or "asset"
    n = 1
    cand = aid
    while cand in tl["assets"]:
        n += 1
        cand = f"{aid}_{n}"
    aid = cand
    entry = {"kind": kind, "path": path}
    if kind in ("video", "audio"):
        dur = ffprobe_duration(path)
        if dur is not None:
            entry["naturalDuration"] = dur
    tl["assets"][aid] = entry
    return aid


def _resolve_source(tl, source):
    """A clip 'source' may be an existing assetId OR an on-disk path. Return a valid assetId."""
    if source in tl["assets"]:
        return source
    # treat as a path -> register
    return _register_asset(tl, source)


def _gc_asset(tl, asset_id):
    """Drop an asset from the registry if no remaining clip references it."""
    for track in tl["tracks"]:
        for clip in track["clips"]:
            if clip.get("source") == asset_id:
                return
    tl["assets"].pop(asset_id, None)


# ---------------------------------------------------------------------------
# track / clip lookup
# ---------------------------------------------------------------------------

def _find_track(tl, track_id):
    for track in tl["tracks"]:
        if track["id"] == track_id:
            return track
    return None


def _ensure_track(tl, track_id):
    track = _find_track(tl, track_id)
    if track:
        return track
    kind = CANONICAL_TRACKS.get(track_id, "visual")
    track = {"id": track_id, "kind": kind, "clips": []}
    tl["tracks"].append(track)
    return track


def _find_clip(tl, clip_id):
    for track in tl["tracks"]:
        for clip in track["clips"]:
            if clip["id"] == clip_id:
                return track, clip
    return None, None


def _recompute_duration(tl):
    """duration = max(stored duration, max(clip.start + clip.length)). Authoritative for the root."""
    mx = 0.0
    for track in tl["tracks"]:
        for clip in track["clips"]:
            mx = max(mx, float(clip["start"]) + float(clip["length"]))
    if mx > tl.get("duration", 0):
        tl["duration"] = _round3(mx)
    if tl["duration"] <= 0:
        tl["duration"] = 1.0


def _clamp_trim(tl, clip):
    """Clamp trim.in + length against the asset's naturalDuration when known."""
    if clip["type"] not in ("video", "audio"):
        return
    asset = tl["assets"].get(clip.get("source"))
    if not asset:
        return
    nat = asset.get("naturalDuration")
    if nat is None:
        return
    trim_in = float(clip.get("trim", {}).get("in", 0))
    if trim_in > nat:
        trim_in = max(0.0, nat - 0.001)
        clip.setdefault("trim", {})["in"] = _round3(trim_in)
    max_len = nat - trim_in
    if max_len > 0 and clip["length"] > max_len:
        clip["length"] = _round3(max_len)


# ---------------------------------------------------------------------------
# compact summary (get_timeline_state)
# ---------------------------------------------------------------------------

def summary(tl):
    """COMPACT orientation summary: ids/types/in-out/track membership. Not full style/keyframes."""
    return {
        "id": tl["id"],
        "width": tl["width"],
        "height": tl["height"],
        "fps": tl["fps"],
        "duration": tl["duration"],
        "background": tl.get("background", "#000"),
        "tracks": [
            {
                "id": t["id"],
                "kind": t["kind"],
                "clips": [
                    {
                        "id": c["id"],
                        "type": c["type"],
                        "start": c["start"],
                        "length": c["length"],
                        **({"source": c["source"]} if "source" in c else {}),
                    }
                    for c in t["clips"]
                ],
            }
            for t in tl["tracks"]
        ],
    }


# ---------------------------------------------------------------------------
# clip operations (operate on a loaded tl dict; tool layer wraps load/save)
# ---------------------------------------------------------------------------

def op_get_clip(tl, clip_id):
    _, clip = _find_clip(tl, clip_id)
    if clip is None:
        raise TimelineError(f"clip not found: {clip_id}")
    return clip


def op_add_clip(tl, track_id, clip):
    """Create a clip on track_id. Assigns a deterministic id, registers asset, appends, bumps dur."""
    if not isinstance(clip, dict):
        raise TimelineError("clip must be an object")
    ctype = clip.get("type")
    if ctype not in CLIP_TYPES:
        raise TimelineError(f"clip.type must be one of {CLIP_TYPES}")

    new = dict(clip)
    new["id"] = _next_clip_id(tl)
    new["start"] = _round3(new.get("start", 0))
    if not _is_num(new.get("length")) or new["length"] <= 0:
        raise TimelineError("clip.length must be > 0")
    new["length"] = _round3(new["length"])

    if ctype != "text":
        src = new.get("source")
        if not isinstance(src, str) or not src:
            raise TimelineError(f"{ctype} clip requires 'source'")
        new["source"] = _resolve_source(tl, src)
    else:
        if not isinstance(new.get("text"), str):
            raise TimelineError("text clip requires 'text'")
        new.pop("source", None)

    track = _ensure_track(tl, track_id)
    if track["kind"] == "audio" and ctype != "audio":
        raise TimelineError(f"track '{track_id}' is audio-only; cannot hold a {ctype} clip")
    track["clips"].append(new)

    _clamp_trim(tl, new)
    _recompute_duration(tl)
    validate(tl)
    return new["id"]


def op_remove_clip(tl, clip_id):
    track, clip = _find_clip(tl, clip_id)
    if clip is None:
        raise TimelineError(f"clip not found: {clip_id}")
    src = clip.get("source")
    track["clips"] = [c for c in track["clips"] if c["id"] != clip_id]
    if src:
        _gc_asset(tl, src)
    _recompute_duration(tl)
    validate(tl)
    return True


def op_split_clip(tl, clip_id, at):
    """Split a clip at ABSOLUTE time `at` into left (orig id) + right (new id)."""
    track, clip = _find_clip(tl, clip_id)
    if clip is None:
        raise TimelineError(f"clip not found: {clip_id}")
    start = float(clip["start"])
    length = float(clip["length"])
    if not (start < at < start + length):
        raise TimelineError(f"split `at` must satisfy {start} < at < {start + length}; got {at}")

    at = _round3(at)
    left_len = _round3(at - start)
    right_len = _round3(start + length - at)

    right = json.loads(json.dumps(clip))  # deep copy of style/transform/etc.
    right["id"] = _next_clip_id(tl)
    right["start"] = at
    right["length"] = right_len

    # advance trim for video/audio so the source stays continuous
    if clip["type"] in ("video", "audio"):
        cur_in = float(clip.get("trim", {}).get("in", 0))
        right["trim"] = dict(right.get("trim", {}))
        right["trim"]["in"] = _round3(cur_in + left_len)

    # partition keyframes by absolute time; rebase right side to its new clip start
    kfs = clip.get("keyframes", []) or []
    left_kfs, right_kfs = [], []
    for k in kfs:
        abs_t = start + float(k["at"])
        if abs_t < at:
            left_kfs.append(k)
        else:
            rk = json.loads(json.dumps(k))
            rk["at"] = _round3(abs_t - at)
            right_kfs.append(rk)
    if "keyframes" in clip:
        clip["keyframes"] = left_kfs
        right["keyframes"] = right_kfs

    clip["length"] = left_len  # left keeps original id

    idx = track["clips"].index(clip)
    track["clips"].insert(idx + 1, right)

    _recompute_duration(tl)
    validate(tl)
    return clip["id"], right["id"]


def _deep_merge_one(dst, patch):
    """One-level deep merge: nested objects merge; a null sub-value deletes the key."""
    for k, v in patch.items():
        if v is None:
            dst.pop(k, None)
        elif isinstance(v, dict) and isinstance(dst.get(k), dict):
            sub = dict(dst[k])
            for sk, sv in v.items():
                if sv is None:
                    sub.pop(sk, None)
                else:
                    sub[sk] = sv
            dst[k] = sub
        else:
            dst[k] = v


def op_update_clip(tl, clip_id, patch):
    """Shallow-merge patch into the clip (objects deep-merge one level). Does NOT touch keyframes."""
    track, clip = _find_clip(tl, clip_id)
    if clip is None:
        raise TimelineError(f"clip not found: {clip_id}")
    patch = dict(patch or {})
    patch.pop("keyframes", None)  # use set_keyframes
    patch.pop("id", None)
    patch.pop("type", None)

    if "source" in patch and patch["source"]:
        old_src = clip.get("source")
        patch["source"] = _resolve_source(tl, patch["source"])
        # GC the old asset after re-point, if now orphaned
        if old_src and old_src != patch["source"]:
            # apply first, then gc
            pass

    _deep_merge_one(clip, patch)

    if "start" in patch and _is_num(clip.get("start")):
        clip["start"] = _round3(clip["start"])
    if "length" in patch and _is_num(clip.get("length")):
        clip["length"] = _round3(clip["length"])

    _clamp_trim(tl, clip)
    _recompute_duration(tl)
    # GC any asset that became orphaned by a source re-point
    for aid in list(tl["assets"].keys()):
        _gc_asset(tl, aid)
    validate(tl)
    return clip["id"]


def op_move_clips_to_track(tl, clip_ids, target_track_id):
    """Move clips to target_track_id (created as visual if absent), preserving start/length."""
    target = _ensure_track(tl, target_track_id)
    moved = []
    for cid in clip_ids:
        src_track, clip = _find_clip(tl, cid)
        if clip is None:
            raise TimelineError(f"clip not found: {cid}")
        if src_track is target:
            moved.append(cid)
            continue
        if target["kind"] == "audio" and clip["type"] != "audio":
            raise TimelineError(f"target track '{target_track_id}' is audio-only")
        src_track["clips"] = [c for c in src_track["clips"] if c["id"] != cid]
        target["clips"].append(clip)
        moved.append(cid)
    validate(tl)
    return moved


def _merge_ranges(ranges):
    """Normalize + merge overlapping/adjacent [a,b] time ranges; drop empty/invalid."""
    rs = sorted([[_round3(a), _round3(b)] for a, b in ranges if float(b) > float(a)])
    out = []
    for a, b in rs:
        if out and a <= out[-1][1] + 1e-9:
            out[-1][1] = max(out[-1][1], b)
        else:
            out.append([a, b])
    return out


def op_cut_ranges(tl, ranges):
    """RIPPLE-DELETE timeline time ranges (the 'delete the words' / transcript-edit behaviour).

    Removes each [a,b] span from EVERY clip on EVERY track and slides later content left to close
    the gap, so the whole timeline stays in sync (video + its audio + captions all shift together
    because they're all remapped through the same gap function). For video/audio clips the source
    `trim.in` advances so the footage stays continuous; keyframes are rebased + filtered per surviving
    segment. A clip spanning a cut is split into the surviving pieces (first piece keeps the orig id).
    Returns {removed, newDuration, clips}.
    """
    cuts = _merge_ranges(ranges)
    if not cuts:
        return {"removed": 0.0, "newDuration": tl["duration"], "clips": sum(len(t["clips"]) for t in tl["tracks"])}
    total_removed = _round3(sum(b - a for a, b in cuts))

    def gap_before(t):
        g = 0.0
        for a, b in cuts:
            if a >= t:
                break
            g += min(b, t) - a
        return g

    def remap(t):
        return _round3(t - gap_before(t))

    dur = float(tl["duration"])
    keeps = []  # complement of the cuts within [0, duration]
    prev = 0.0
    for a, b in cuts:
        if a > prev:
            keeps.append([prev, a])
        prev = max(prev, b)
    if prev < dur:
        keeps.append([prev, dur])

    for track in tl["tracks"]:
        rebuilt = []
        for clip in track["clips"]:
            s = float(clip["start"])
            e = s + float(clip["length"])
            is_av = clip["type"] in ("video", "audio")
            base_trim = float(clip.get("trim", {}).get("in", 0)) if is_av else 0.0
            kfs = clip.get("keyframes") or []
            seg_idx = 0
            for kp, kq in keeps:
                p = max(s, kp)
                q = min(e, kq)
                if q - p <= 1e-6:
                    continue
                seg = json.loads(json.dumps(clip))
                seg["id"] = clip["id"] if seg_idx == 0 else _next_clip_id(tl)
                offset = _round3(p - s)
                seg["start"] = remap(p)
                seg["length"] = _round3(q - p)
                if is_av:
                    seg.setdefault("trim", {})["in"] = _round3(base_trim + offset)
                if kfs:
                    seg["keyframes"] = [
                        {**json.loads(json.dumps(k)), "at": _round3(float(k["at"]) - offset)}
                        for k in kfs
                        if offset - 1e-6 <= float(k["at"]) <= offset + (q - p) + 1e-6
                    ]
                rebuilt.append(seg)
                seg_idx += 1
        track["clips"] = rebuilt

    tl["duration"] = max(0.1, _round3(dur - total_removed))
    _recompute_duration(tl)
    validate(tl)
    return {"removed": total_removed, "newDuration": tl["duration"],
            "clips": sum(len(t["clips"]) for t in tl["tracks"])}


def op_set_keyframes(tl, clip_id, keyframes):
    """REPLACE a clip's keyframes wholesale. Validates props, rejects infinite/repeat, sorts by at."""
    _, clip = _find_clip(tl, clip_id)
    if clip is None:
        raise TimelineError(f"clip not found: {clip_id}")
    if not isinstance(keyframes, list):
        raise TimelineError("keyframes must be an array")
    cleaned = []
    for k in keyframes:
        _validate_keyframe(k, f"clip '{clip_id}'")
        # reject infinite/repeat constructs explicitly
        if "repeat" in k or "yoyo" in k or k.get("dur") in (float("inf"),):
            raise TimelineError("infinite/repeat keyframes are forbidden (determinism)")
        nk = {"at": _round3(k["at"]), "dur": _round3(k.get("dur", 0.5)),
              "ease": k.get("ease", "power2.out"),
              "props": {p: float(v) for p, v in k["props"].items()}}
        cleaned.append(nk)
    cleaned.sort(key=lambda x: x["at"])
    clip["keyframes"] = cleaned
    validate(tl)
    return len(cleaned)
