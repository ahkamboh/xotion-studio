/* richness.js — window.Rich: make ANY HyperFrames composition feel rich, for every style/type.
   The style sets COLOR + FONT; Rich enforces DENSITY + MOTION + TEXTURE so no scene reads thin.
   Deterministic (no Math.random/Date) — works with HyperFrames seek + GSAP. Call Rich.css() once.

   THE 3 THINGS THAT KILL "AI-template" look, fixed here:
   1) NEVER STATIC  -> Rich.idle(sceneEl, tl, s, e)   continuous breathe/drift; no dead-still frame
   2) FLAT BG       -> Rich.texture(el, 'dots'|'grain'|'stripes'|'glow', color)
   3) THIN/STIFF    -> Rich.cascade(items, tl, t)  choreographed stagger w/ per-item rotation+ease
   Plus depth (.r-shadow2), furniture (Rich.eyebrow/counter/sticker), Rich.stamp, Rich.enter.
*/
(function(){
  var GRAIN="url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='160' height='160' filter='url(%23n)' opacity='0.5'/></svg>\")";
  function css(){
    if(document.getElementById("rich-css"))return;
    var s=document.createElement("style"); s.id="rich-css";
    s.textContent=`
    .r-shadow{box-shadow:14px 14px 0 var(--rs,#111);}
    .r-shadow2{box-shadow:10px 10px 0 var(--rs1,#fff),20px 20px 0 var(--rs2,#111);}   /* stacked depth */
    .r-tex{position:absolute;inset:0;pointer-events:none;}
    .r-grain{position:absolute;inset:0;pointer-events:none;background-image:${GRAIN};background-size:160px 160px;opacity:.07;mix-blend-mode:multiply;}
    .r-eyebrow{font-family:var(--mono,"JetBrains Mono",monospace);font-weight:700;letter-spacing:.2em;text-transform:uppercase;font-size:30px;}
    .r-counter{font-family:var(--mono,"JetBrains Mono",monospace);font-weight:700;letter-spacing:.12em;font-size:30px;opacity:.85;}
    .r-sticker{display:inline-block;font-family:var(--mono,"JetBrains Mono",monospace);font-weight:700;letter-spacing:.04em;text-transform:uppercase;
      padding:10px 20px;border:5px solid #111;box-shadow:8px 8px 0 #111;background:#fff;color:#111;}`;
    document.head.appendChild(s);
  }
  function dottedDiv(color){ var d=document.createElement("div"); d.className="r-tex";
    d.style.backgroundImage="radial-gradient("+(color||"rgba(0,0,0,.9)")+" 22%, transparent 23%)";
    d.style.backgroundSize="34px 34px"; d.style.opacity=".10"; return d; }
  var Rich={
    css:css,
    /* continuous, never-static motion on a scene/hero. One call per scene container. */
    idle:function(el,tl,s,e,o){ o=o||{}; var dur=Math.max(0.6,e-s);
      var sc=o.scale==null?0.014:o.scale, x=o.x==null?8:o.x, y=o.y==null?8:o.y, rot=o.rot==null?0.5:o.rot;
      gsap.set(el,{transformOrigin:o.origin||"50% 50%"});
      tl.fromTo(el,{scale:1,x:0,y:0,rotation:0},
        {scale:1+sc,x:x,y:-y,rotation:rot,duration:dur,ease:"sine.inOut",yoyo:true,repeat:1},s);
    },
    /* texture layer behind content: 'dots' | 'grain' | 'stripes' | 'glow' */
    texture:function(parent,type,color){ css(); var d;
      if(type==="dots"){ d=dottedDiv(color); }
      else if(type==="grain"){ d=document.createElement("div"); d.className="r-grain"; }
      else if(type==="stripes"){ d=document.createElement("div"); d.className="r-tex";
        d.style.background="repeating-linear-gradient(135deg,"+(color||"rgba(0,0,0,.06)")+" 0 14px, transparent 14px 40px)"; }
      else { d=document.createElement("div"); d.className="r-tex"; /* glow */
        d.style.background="radial-gradient(70% 55% at 50% 35%,"+(color||"rgba(255,255,255,.18)")+", transparent 70%)"; }
      parent.insertBefore(d, parent.firstChild); return d; },
    /* choreographed staggered entrance with per-item rotation + varied ease */
    cascade:function(items,tl,t,o){ o=o||{}; items=Array.prototype.slice.call(items);
      var from=o.from||{y:48,opacity:0,scale:.86}, dur=o.dur||.5, stg=o.stagger==null?.12:o.stagger, rot=o.rot==null?3:o.rot;
      items.forEach(function(el,i){ var f=Object.assign({},from); f.rotation=(i%2?rot:-rot);
        gsap.set(el,f); tl.to(el,{y:0,x:0,opacity:1,scale:1,rotation:0,duration:dur,ease:o.ease||"back.out(2.2)"},t+i*stg); }); },
    /* single entrance preset: slam | pop | rise | drop */
    enter:function(el,tl,t,kind,o){ o=o||{}; var d=o.dur||.4, K={
      slam:[{scale:.5,opacity:0},{ease:"back.out(2.8)"}],
      pop:[{scale:0,opacity:0},{ease:"back.out(2)"}],
      rise:[{y:60,opacity:0},{ease:"power3.out"}],
      drop:[{y:-60,opacity:0,rotation:-4},{ease:"back.out(2)"}]}[kind||"rise"];
      gsap.set(el,K[0]); tl.to(el,Object.assign({scale:1,opacity:1,y:0,x:0,rotation:0,duration:d},K[1]),t); },
    /* oversized rotated stamp slam (stickers / seals / QA marks) */
    stamp:function(el,tl,t,rot){ rot=rot==null?-7:rot; gsap.set(el,{scale:2.2,opacity:0,rotation:rot});
      tl.to(el,{scale:1,opacity:1,duration:.32,ease:"back.out(3)"},t); },
    /* furniture builders -> return an element you position/append */
    eyebrow:function(text,color){ var d=document.createElement("div"); d.className="r-eyebrow"; d.textContent=text; if(color)d.style.color=color; return d; },
    counter:function(cur,total,color){ var d=document.createElement("div"); d.className="r-counter"; d.textContent=cur+" / "+total; if(color)d.style.color=color; return d; },
    sticker:function(text,bg,rot){ var d=document.createElement("div"); d.className="r-sticker"; d.textContent=text;
      if(bg)d.style.background=bg; d.style.transform="rotate("+(rot==null?-8:rot)+"deg)"; return d; }
  };
  window.Rich=Rich;
})();
