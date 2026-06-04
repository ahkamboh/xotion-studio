#!/usr/bin/env python3
"""
CAPTION AGENT — the one tool to build perfectly-synced captions for ANY language, in one pass.
Encapsulates every hard-won rule so captions never come out early/late/missing/duplicated.

What it does:
  1. Gets frame-accurate word timings:
       - whisperX forced alignment (41 languages) via .venv-whisperx  ->  best sync
       - falls back to Whisper small.pt (scripts/transcribe.py) for other languages
  2. Cleans the events: collapses repeated words (no "oh oh oh" fl: flashing),
     continuous display (each word holds until the next onset; drops on long gaps),
     NO lead/lag (uses exact onsets).
  3. Emits a self-contained caption layer: captions.js  (+ captions.json data)
     The composition just includes it and calls window.mountCaptions(tl, opts).

Usage:
  python3 scripts/caption.py <audio_or_video> --lang en [options]

Options:
  --lang CODE        language (en, ur, hi, es, fr, ar, zh, ...) — REQUIRED for non-English accuracy
  --style word|line  word = single centered word (IShowSpeed); line = phrase lines (default word)
  --pos center|bottom   caption position (default center for word, bottom for line)
  --transition none|pop|fade   word transition (default none = instant; pop = scale-in)
  --font NAME        CSS font-family (default Poppins) ; --font-file path for @font-face
  --color HEX        text color (default #ffffff)
  --size PX          font size px (default 108 for word, 84 for line)
  --maxchars N       line style: max chars per line (default 42)
  --out DIR          project dir to write captions.js/.json (default: cwd)

Then in your composition's <script> (after building tl, before registering):
  <script src="captions.js"></script>
  window.mountCaptions(tl, { suppress: [[4.15,4.95]] });   // suppress = optional [start,end] windows
"""
import sys, json, argparse, subprocess, os, re

WHISPERX_LANGS = {"ar","ca","cs","da","de","el","en","es","eu","fa","fi","fr","gl","he","hi",
"hr","hu","id","it","ja","ka","ko","lv","ml","nl","nn","no","pl","pt","ro","ru","sk","sl",
"sv","te","tl","tr","uk","ur","vi","zh"}

def repo_root():
    return os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def get_words(media, lang):
    """Return [{text,start,end}] using whisperX if possible, else small.pt."""
    root = repo_root(); tmp = "work/_caption_words.json"
    os.makedirs("work", exist_ok=True)
    venv = os.path.join(root, ".venv-whisperx/bin/python")
    if lang in WHISPERX_LANGS and os.path.exists(venv):
        sys.stderr.write(f"[caption] aligning with whisperX ({lang})...\n")
        r = subprocess.run([venv, os.path.join(root,"scripts/align.py"), media,
                            "--lang", lang, "--out", tmp], capture_output=True, text=True)
        if r.returncode == 0 and os.path.exists(tmp):
            return json.load(open(tmp))
        sys.stderr.write("[caption] whisperX failed, falling back to small.pt\n"+r.stderr[-400:]+"\n")
    sys.stderr.write(f"[caption] transcribing with small.pt ({lang})...\n")
    cmd = ["python3", os.path.join(root,"scripts/transcribe.py"), media, "--model","small","--out",tmp]
    if lang: cmd += ["--lang", lang]
    subprocess.run(cmd, check=True)
    return json.load(open(tmp))

def build_events(words, style, maxchars):
    # collapse consecutive duplicates (chants)
    merged=[]
    for w in words:
        t=w["text"].strip()
        if not t: continue
        key=re.sub(r"[^\w]","",t.lower())
        if merged and re.sub(r"[^\w]","",merged[-1]["text"].lower())==key:
            merged[-1]["end"]=w["end"]
        else:
            merged.append({"text":t,"start":float(w["start"]),"end":float(w["end"])})
    if style=="word":
        ev=[]
        for i,w in enumerate(merged):
            s=w["start"]
            nxt=merged[i+1]["start"] if i+1<len(merged) else w["end"]
            end = nxt if (nxt-w["end"])<0.6 else w["end"]+0.20   # hold to next, drop on gaps
            ev.append({"t":w["text"],"s":round(s,3),"e":round(max(s+0.12,end),3)})
        return ev
    # line style: group words into readable lines (sentence punct / pause / maxchars)
    lines=[]; cur=[]
    for i,w in enumerate(merged):
        cur.append(w); txt=" ".join(x["text"] for x in cur)
        nxt=merged[i+1] if i+1<len(merged) else None
        gap = (nxt["start"]-w["end"]) if nxt else 9
        if w["text"].rstrip().endswith((".","?","!",",","…")) or gap>=0.6 or len(txt)>=maxchars or nxt is None:
            lines.append({"t":txt.strip(),"s":round(cur[0]["start"],3),"e":round(cur[-1]["end"]+min(0.3,gap),3)})
            cur=[]
    return lines

def emit(ev, args):
    os.makedirs(args.out, exist_ok=True)
    json.dump(ev, open(os.path.join(args.out,"captions.json"),"w"), ensure_ascii=False, indent=2)
    pos = args.pos or ("center" if args.style=="word" else "bottom")
    size = args.size or (108 if args.style=="word" else 84)
    fontface = ""
    if args.font_file:
        fontface = f'@font-face{{font-family:"{args.font}";font-weight:700;src:url("{args.font_file}") format("truetype");}}'
    posrule = ("top:50%;margin-top:-{0}px;".format(int(size*0.7)) if pos=="center"
               else "bottom:130px;")
    trans = args.transition
    data = json.dumps(ev, ensure_ascii=False)
    js = """/* captions.js — generated by scripts/caption.py (the caption agent). Do not hand-edit timings. */
window.__CAPTIONS = %DATA%;
window.mountCaptions = function(tl, opts){
  opts = opts || {};
  var compId = opts.comp || "main";
  var sup = opts.suppress || [];
  var Q = function(s){ return '[data-composition-id="'+compId+'"] '+s; };
  var root = document.querySelector('[data-composition-id="'+compId+'"]');
  if(!root){ console.warn("captions: root not found"); return; }
  // inject style once
  var st = document.createElement("style");
  st.textContent = `%FONTFACE%
  .xcap{position:absolute;left:0;right:0;%POS%text-align:center;opacity:0;z-index:45;
    font-family:"%FONT%",sans-serif;font-weight:700;font-size:%SIZEpx;line-height:1.05;
    letter-spacing:-.01em;color:%COLOR%;padding:0 60px;
    text-shadow:0 4px 18px rgba(0,0,0,.6),0 2px 5px rgba(0,0,0,.55);}`;
  document.head.appendChild(st);
  function hidden(s){ for(var i=0;i<sup.length;i++){ if(s>=sup[i][0]&&s<=sup[i][1]) return true; } return false; }
  window.__CAPTIONS.forEach(function(c,idx){
    if(hidden(c.s)) return;
    var d=document.createElement("div"); d.className="xcap"; d.textContent=c.t; root.appendChild(d);
    var TR="%TRANS%";
    if(TR==="pop"){
      tl.fromTo(d,{opacity:0,scale:.82},{opacity:1,scale:1,duration:.15,ease:"back.out(2.2)"},c.s);
      tl.to(d,{opacity:0,scale:1.05,duration:.12,ease:"power2.in"},c.e-0.03);
    } else if(TR==="fade"){
      tl.fromTo(d,{opacity:0},{opacity:1,duration:.12,ease:"power1.out"},c.s);
      tl.to(d,{opacity:0,duration:.12,ease:"power1.in"},c.e-0.02);
    } else { /* none = instant */
      tl.set(d,{opacity:1},c.s); tl.set(d,{opacity:0},c.e);
    }
  });
};
"""
    js = (js.replace("%DATA%",data).replace("%FONTFACE%",fontface).replace("%POS%",posrule)
            .replace("%FONT%",args.font).replace("%SIZE",str(size)).replace("%COLOR%",args.color)
            .replace("%TRANS%",trans))
    open(os.path.join(args.out,"captions.js"),"w").write(js)
    print(f"[caption] {len(ev)} {args.style} captions -> {args.out}/captions.js (+ captions.json)")
    print(f"[caption] in composition: <script src=\"captions.js\"></script> then window.mountCaptions(tl, {{suppress:[]}});")

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("--lang", default="en")
    ap.add_argument("--style", choices=["word","line"], default="word")
    ap.add_argument("--pos", choices=["center","bottom"], default=None)
    ap.add_argument("--transition", choices=["none","pop","fade"], default="none")
    ap.add_argument("--font", default="Poppins")
    ap.add_argument("--font-file", default=None)
    ap.add_argument("--color", default="#ffffff")
    ap.add_argument("--size", type=int, default=None)
    ap.add_argument("--maxchars", type=int, default=42)
    ap.add_argument("--out", default=".")
    a=ap.parse_args()
    words=get_words(a.input, a.lang)
    ev=build_events(words, a.style, a.maxchars)
    emit(ev, a)

if __name__=="__main__":
    main()
