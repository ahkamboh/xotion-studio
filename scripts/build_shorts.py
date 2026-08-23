#!/usr/bin/env python3
# Batch-build vertical karaoke Shorts (v2 full-bleed) for all KAMBOJH songs.
import os,json,subprocess,glob
import librosa,numpy as np
HOME=os.path.expanduser("~"); DL=HOME+"/Downloads"
# Repo root (this file lives in <root>/scripts/); override with XOTION_STUDIO if needed.
STUDIO=os.environ.get("XOTION_STUDIO") or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJ=STUDIO+"/projects/short-v2"; A=PROJ+"/assets"
OUT=DL+"/SHORTS"; os.makedirs(OUT,exist_ok=True)
HF=STUDIO+"/node_modules/.bin/hyperframes"
HOOK=18

SONGS=[
 {"n":"Dhundla","a":"blurred dream.mp3","c":"Dhundla - Thumbnail (final).jpg","ac":"#a9e6f1","gl":"150,222,240","vid":"kmE3JhFpx1A",
  "L":[["Tu","hai","dhundla","sa","ik","khwaab"],["Main","tujh","mein","doobi","jaaun"],["Na","pakad","sakoon,","na","chhod","sakoon"],["Tere","aur","mere","darmiyaan","kho","gayi"]]},
 {"n":"Andhere Se","a":"Andhere Se.mp3","c":"Andhere Se - Thumbnail (final).jpg","ac":"#ff5247","gl":"255,70,55","vid":"fqMeOic9J_k",
  "L":[["Main","andhere","se","utha,"],["roshni","bana"],["Khaali","haath","aaya,"],["ab","apna","jahaan","bana"]]},
 {"n":"Tere Bina","a":"Tere Bina.mp3","c":"Tere Bina - Thumbnail (final).jpg","ac":"#f6d27a","gl":"246,210,122","vid":"bZ67mcqfGEI",
  "L":[["Tu","hai","to","har","subah","roshan","si"],["Tu","hai","to","har","shaam","suhaani"],["Tere","bina","main","adhoori","si"],["Tu","hi","meri","pyaari","kahani"]]},
 {"n":"Nasha","a":"Nasha 2.mp3","c":"Nasha - Thumbnail (final).jpg","ac":"#a9e6f1","gl":"150,222,240","vid":"yEFc_TUlAFE",
  "L":[["Chal","padein","is","raat","ke","saath"],["Tez,","aur","tez,","thaame","mera","haath"],["Na","rukna","ab,","na","mudna","peechhe"],["Beh","jaayein","is","roshni","ke","neeche"]]},
 {"n":"Crush Tu Hi Tu","a":"Tu Hi Tu  2.mp3","c":"Crush Tu Hi Tu - Thumbnail (final).jpg","ac":"#ff7eb0","gl":"255,130,180","vid":"9nFxjZ78Wdw",
  "L":[["Tu","mera","crush,","baby,","tu","hi","tu"],["Din","raat","bas,","thinkin'","'bout","you"],["Dil","gaya,","oh","my,","ho","gaya"],["Tera","nasha,","feelin'","so","high"]]},
 {"n":"KHO","a":"Kho nah 2.mp3","c":"KHO - Thumbnail (final).jpg","ac":"#ff4fd0","gl":"255,80,210","vid":"KhZIRC3DwYk",
  "L":[["Kho-kho,","kho","jaaun,","raat","mein"],["Bhaag-bhaag,","pakad","nah,","ke"],["Bol-bol,","par","tu","chup","si"],["Chal-chal,","andhere","mein,","kuch","si"]]},
 {"n":"Junoon","a":"Junoon.mp3","c":"Junoon - Thumbnail (final).jpg","ac":"#f0c87b","gl":"255,190,110","vid":"BbzXStF6i2A",
  "L":[["Dil","ki","sadaa,","sunta","hai","kaun"],["Meri","khamoshi","mein,","chhupa","hai","junoon"],["Rasta","naya,","manzil","puraani"],["Har","ik","saans","mein,","meri","kahaani"]]},
 {"n":"Teri Yaad","a":"Teri Yaad.mp3","c":"Teri Yaad - Thumbnail (final).jpg","ac":"#ff5247","gl":"255,70,55","vid":"QdAqWg8n8xY",
  "L":[["Teri","yaad","vich","raataan","langhdiyan"],["Tere","bina","ankhiyan","na","saundiyan"],["Dil","mangda","tainu","har","ghadi"],["Teri","ik","jhalak","nu","taras-diyan"]]},
 {"n":"Aadhi Raat","a":"Aadhi Raat.mp3","c":"Aadhi Raat - Thumbnail (final).jpg","ac":"#f0c87b","gl":"255,190,110","vid":"WG2JECvMLx4",
  "L":[["Tu","ne","toda,","par","main","na","tooti"],["Aansu","chhupa","ke,","muskuraati","rahi"],["Tere","bina","bhi,","main","ji","rahi","hoon"],["Tukde","sameth","ke,","chal","rahi","hoon"]]},
 {"n":"Soniye","a":"Soniye 2.mp3","c":"Soniye - Thumbnail (final).jpg","ac":"#f6d27a","gl":"246,210,122","vid":"DCoXXP4EJEM",
  "L":[["Tu","meri","heroine,"],["main","tera","hero"],["Tere","bina","meri","life","zero","zero"],["Naache","re","dil","—","naache","re"]]},
 {"n":"Khamoshi","a":"Khamoshi (1).mp3","c":"Khamoshi - Thumbnail (final).jpg","ac":"#f0c87b","gl":"255,190,110","vid":"9phMOONZrDY",
  "L":[["KHAMOSHI"],["The","sound","of","silence"]]},
]

def peak_window(path):
    y,sr=librosa.load(path,sr=22050,mono=True)
    hop=sr//2
    rms=librosa.feature.rms(y=y,hop_length=hop)[0]
    win=int(HOOK*2)  # frames in 18s at 2/s
    if len(rms)<=win: return 0.0
    best=0;bs=-1
    # avoid first 12s (intro); search the rest
    start_f=min(24,len(rms)-win)
    for i in range(start_f,len(rms)-win):
        s=rms[i:i+win].sum()
        if s>bs: bs=s; best=i
    return round(best/2.0,1)

manifest=[]
for s in SONGS:
    name=s["n"]; ap=f"{DL}/{s['a']}"; cp=f"{DL}/{s['c']}"
    if not os.path.exists(ap): print("SKIP no audio",name); continue
    if not os.path.exists(cp): print("SKIP no cover",name); continue
    print("=== ",name," ===")
    hs=peak_window(ap); print("  hook @",hs,"s")
    # extract 18s hook
    hk=f"/tmp/hook_{name.replace(' ','_')}.mp3"
    subprocess.run(["ffmpeg","-y","-ss",str(hs),"-t",str(HOOK),"-i",ap,"-af",
        "afade=t=in:st=0:d=0.3,afade=t=out:st=16.5:d=1.5,aresample=44100","-c:a","libmp3lame","-q:a","2",hk],
        capture_output=True)
    # set assets
    subprocess.run(["cp",cp,f"{A}/cover.jpg"])
    with open(f"{A}/song.js","w") as f:
        f.write(f"window.__DUR={HOOK};\nwindow.__ACCENT={json.dumps(s['ac'])};\n")
        f.write("window.__LINES="+json.dumps(s["L"],ensure_ascii=False)+";\n")
    # render
    sil=f"{PROJ}/.silent.mp4"
    r=subprocess.run([HF,"render",PROJ,"--output",sil,"--fps","30"],capture_output=True,cwd=STUDIO)
    if not os.path.exists(sil): print("  RENDER FAIL",name, r.stderr[-300:]); continue
    outmp4=f"{OUT}/{name} - SHORT.mp4"
    subprocess.run(["ffmpeg","-y","-i",sil,"-i",hk,"-map","0:v:0","-map","1:a:0","-shortest",
        "-c:v","libx264","-profile:v","high","-preset","medium","-crf","20","-pix_fmt","yuv420p","-g","60",
        "-movflags","+faststart","-c:a","aac","-b:a","256k","-ar","48000","-ac","2",outmp4],capture_output=True)
    os.remove(sil)
    print("  ✅",outmp4)
    manifest.append({"name":name,"mp4":outmp4,"vid":s["vid"]})

json.dump(manifest,open("/tmp/shorts_manifest.json","w"),ensure_ascii=False,indent=2)
print(f"\n=== BUILT {len(manifest)} shorts -> {OUT} ===")
