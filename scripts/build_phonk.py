#!/usr/bin/env python3
import os,subprocess
DL=os.path.expanduser("~/Downloads")
COV=DL+"/KAMBOJH Music Covers"
OUT=DL  # deliver alongside other songs
# (display name, audio file, cover file, target LUFS, bass boost?)
SONGS=[
 ("Nagin","NAGIN.mp3","kambojh-nagin-cover.png",-9,True),
 ("Taandav","TAANDAV.mp3","kambojh-taandav-cover.png",-9,True),
 ("Kaali","KAALI.mp3","kambojh-kaali-cover.png",-9,True),
 ("Zehar","ZEHAR.mp3","kambojh-zehar-cover.png",-9,True),
 ("Baarood","BAAROOD.mp3","kambojh-baarood-cover.png",-9,True),
 ("Gully","GULLY.mp3","kambojh-gully-cover.png",-9.5,True),
 ("Bewafa","BEWAFA.mp3","kambojh-bewafa-cover.png",-12,False),
]
for name,af,cf,lufs,bass in SONGS:
    ap=f"{DL}/{af}"; cp=f"{COV}/{cf}"
    if not os.path.exists(ap): print("SKIP no audio",name); continue
    if not os.path.exists(cp): print("SKIP no cover",name); continue
    print("===",name,"===")
    # thumbnail
    thumb=f"{OUT}/{name} - Thumbnail (final).jpg"
    subprocess.run(["ffmpeg","-y","-i",cp,"-vf","scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720","-q:v","3",thumb],capture_output=True)
    # audio master filter
    af_chain=("bass=g=3:f=90," if bass else "")+f"loudnorm=I={lufs}:TP=-1:LRA=9,aresample=48000"
    out=f"{OUT}/{name} - KAMBOJH (Official Audio).mp4"
    r=subprocess.run(["ffmpeg","-y","-loop","1","-i",cp,"-i",ap,"-map","0:v","-map","1:a","-shortest",
        "-af",af_chain,
        "-vf","scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,format=yuv420p",
        "-c:v","libx264","-profile:v","high","-level","4.2","-preset","medium","-crf","18","-tune","stillimage","-r","30","-g","60",
        "-movflags","+faststart","-c:a","aac","-b:a","320k","-ar","48000","-ac","2",
        "-metadata",f"title={name} - KAMBOJH",out],capture_output=True)
    sz=os.path.getsize(out)//(1024*1024) if os.path.exists(out) else 0
    print(f"  ✅ {name}: video {sz}MB, thumb ok" if sz else f"  ❌ FAIL {r.stderr[-200:]}")
print("=== phonk batch done ===")
