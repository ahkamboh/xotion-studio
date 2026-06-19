#!/usr/bin/env python3
import os,subprocess
DL=os.path.expanduser("~/Downloads")
BASE=f"/tmp/doc_base.mp4"; BR=DL+"/doc-broll"
TMP="/tmp/docseg"; os.makedirs(TMP,exist_ok=True)
# (start, end, source)  source="base" or broll name
SEG=[
 (0,5,"base"),
 (5,18,"ai"),
 (18,22,"base"),
 (22,34,"coding"),
 (34,48,"base"),
 (48,60,"rocket"),
 (60,78,"data"),
 (78,88,"base"),
 (88,100,"typing"),
 (100,110,"base"),
 (110,124,"classroom"),
 (124,140,"student"),
 (140,152,"base"),
 (152,172,"future"),
 (172,183.5,"base"),
]
VENC=["-c:v","libx264","-preset","medium","-crf","19","-pix_fmt","yuv420p","-r","30"]
parts=[]
for i,(s,e,src) in enumerate(SEG):
    dur=round(e-s,3); out=f"{TMP}/seg{i:02d}.mp4"
    if src=="base":
        subprocess.run(["ffmpeg","-y","-ss",str(s),"-to",str(e),"-i",BASE,"-an",
            "-vf","scale=1920:1080,fps=30,format=yuv420p",*VENC,out],capture_output=True)
    else:
        clip=f"{BR}/{src}.mp4"
        subprocess.run(["ffmpeg","-y","-stream_loop","-1","-i",clip,"-t",str(dur),"-an",
            "-vf","scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30,eq=saturation=1.04:contrast=1.03,format=yuv420p",
            *VENC,out],capture_output=True)
    ok=os.path.exists(out) and os.path.getsize(out)>1000
    print(("✅" if ok else "❌"),f"seg{i:02d}",src,f"{dur}s")
    if ok: parts.append(out)
# concat list
lst=f"{TMP}/list.txt"
open(lst,"w").write("\n".join(f"file '{p}'" for p in parts))
vid=f"{TMP}/video.mp4"
subprocess.run(["ffmpeg","-y","-f","concat","-safe","0","-i",lst,"-c","copy",vid],capture_output=True)
# mux continuous base audio
final=f"{DL}/AI Documentary - Edited.mp4"
subprocess.run(["ffmpeg","-y","-i",vid,"-i",BASE,"-map","0:v:0","-map","1:a:0","-shortest",
    "-c:v","copy","-c:a","aac","-b:a","256k","-movflags","+faststart",final],capture_output=True)
print("✅ FINAL:",final, str(os.path.getsize(final)//(1024*1024))+"MB" if os.path.exists(final) else "FAIL")
