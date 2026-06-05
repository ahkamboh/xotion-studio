/* charts.js — XChart: tested, reusable, deterministic data-graphics for HyperFrames compositions.
   Avoids re-coding (and re-breaking) charts per video. Each builder injects its own CSS, builds the
   DOM/SVG, and registers GSAP tweens timed to a scene's {s,e,peak} so the climax lands on the
   spoken word (pair with scripts/scene-sync.py). Requires GSAP on the page.

   API (el = a flex-centered scene container; t = {s,e,peak} from window.__SCENES):
     XChart.counter(el, {to,dec,pre,suf,label,cd}, tl, t)
     XChart.bar(el,     {title,years,vals,fmt,cd}, tl, t)   // last bar lands on t.peak
     XChart.donut(el,   {to,label,cd}, tl, t)               // CORRECT arc via dasharray "pct 100"
     XChart.line(el,    {title,sub,points}, tl, t)          // points: [[x,y],...] in 0..1000 x 0..400
*/
(function(){
  function clamp(v,lo,hi){return Math.max(lo,Math.min(hi,v));}
  function peakCS(t,cd){var pk=(t.peak!=null?t.peak:t.s+(t.e-t.s)*0.5);return clamp(pk-cd,t.s+0.2,t.e-0.5);}
  function css(){
    if(document.getElementById("xchart-css"))return;
    var s=document.createElement("style");s.id="xchart-css";
    s.textContent=`
    .xc-num{font-family:"Sora",sans-serif;font-weight:800;font-size:290px;line-height:.9;letter-spacing:-.04em;background:linear-gradient(135deg,#7df9ff,#3fa9ff 50%,#a98bff);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 14px 50px rgba(63,169,255,.35));}
    .xc-rule{width:280px;height:5px;border-radius:3px;transform:scaleX(0);transform-origin:center;background:linear-gradient(90deg,#5cffd0,#3fa9ff,#7b5cff);box-shadow:0 0 20px rgba(63,169,255,.7);}
    .xc-label{font-family:"Inter",sans-serif;font-weight:600;font-size:46px;line-height:1.25;color:rgba(255,255,255,.92);text-shadow:0 4px 24px rgba(0,0,0,.6);max-width:1300px;text-align:center;}
    .xc-ctitle{font-family:"Inter",sans-serif;font-weight:600;font-size:44px;color:#fff;text-shadow:0 4px 24px rgba(0,0,0,.6);text-align:center;}
    .xc-bars{display:flex;align-items:flex-end;gap:54px;height:420px;padding:0 10px;border-bottom:3px solid rgba(255,255,255,.28);}
    .xc-col{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:14px;}
    .xc-bval{font-family:"Sora",sans-serif;font-weight:800;font-size:40px;color:#fff;text-shadow:0 4px 18px rgba(0,0,0,.6);}
    .xc-bar{width:120px;border-radius:14px 14px 0 0;transform:scaleY(0);transform-origin:bottom;background:linear-gradient(180deg,#7df9ff,#3fa9ff 55%,#7b5cff);box-shadow:0 0 34px rgba(63,169,255,.45);}
    .xc-years{display:flex;gap:54px;padding:0 10px;margin-top:8px;}
    .xc-yr{width:120px;text-align:center;font-family:"Inter",sans-serif;font-weight:600;font-size:32px;color:rgba(255,255,255,.72);}
    .xc-ringwrap{position:relative;width:340px;height:340px;display:flex;align-items:center;justify-content:center;}
    .xc-ring{width:340px;height:340px;transform:rotate(-90deg);}
    .xc-track{fill:none;stroke:rgba(255,255,255,.16);stroke-width:24;}
    .xc-prog{fill:none;stroke:url(#xcgr);stroke-width:24;stroke-linecap:round;}
    .xc-rnum{position:absolute;font-family:"Sora",sans-serif;font-weight:800;font-size:118px;color:#fff;text-shadow:0 6px 30px rgba(0,0,0,.5);}
    .xc-lc{width:1240px;height:430px;}
    .xc-area{fill:url(#xcag);opacity:0;}
    .xc-lpath{fill:none;stroke:url(#xclg);stroke-width:8;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 8px 24px rgba(63,169,255,.4));}
    .xc-dot{fill:#aeffff;}
    .xc-sub{font-family:"Inter",sans-serif;font-weight:500;font-size:48px;color:rgba(255,255,255,.85);text-shadow:0 4px 24px rgba(0,0,0,.6);text-align:center;}`;
    document.head.appendChild(s);
  }
  var X={
    counter:function(el,d,tl,t){
      css();
      el.innerHTML='<div class="xc-num">0</div><div class="xc-rule"></div><div class="xc-label">'+(d.label||'')+'</div>';
      var num=el.querySelector('.xc-num'),rule=el.querySelector('.xc-rule'),lab=el.querySelector('.xc-label');
      var cd=d.cd||1.3,cs=peakCS(t,cd),pre=d.pre||'',suf=d.suf||'',dec=d.dec||0;
      gsap.set(num,{scale:.7,opacity:0});gsap.set(lab,{y:24,opacity:0});
      tl.to(num,{scale:1,opacity:1,duration:.5,ease:"back.out(1.8)"},cs-.25);
      tl.to(rule,{scaleX:1,duration:.6,ease:"power3.out"},cs-.05);
      tl.to(lab,{y:0,opacity:1,duration:.5,ease:"power2.out"},cs-.05);
      var p={v:0};tl.to(p,{v:d.to,duration:cd,ease:"power2.out",onUpdate:function(){num.textContent=pre+(dec?p.v.toFixed(dec):Math.round(p.v))+suf;}},cs);
    },
    bar:function(el,d,tl,t){
      css();
      var mx=Math.max.apply(null,d.vals),HH=380,n=d.vals.length,fmt=d.fmt||function(v){return v.toFixed(1);};
      var cols='',yrs='';
      d.vals.forEach(function(v,i){cols+='<div class="xc-col"><div class="xc-bval"></div><div class="xc-bar" style="height:'+(v/mx*HH)+'px"></div></div>';yrs+='<div class="xc-yr">'+d.years[i]+'</div>';});
      el.innerHTML='<div class="xc-ctitle">'+(d.title||'')+'</div><div class="xc-bars">'+cols+'</div><div class="xc-years">'+yrs+'</div>';
      var tt=el.querySelector('.xc-ctitle'),bars=el.querySelectorAll('.xc-bar'),vals=el.querySelectorAll('.xc-bval'),yy=el.querySelectorAll('.xc-yr');
      gsap.set(tt,{y:24,opacity:0});gsap.set(yy,{opacity:0});gsap.set(vals,{opacity:0});
      tl.to(tt,{y:0,opacity:1,duration:.5,ease:"power2.out"},t.s+.1);
      var pd=0.7,gap=0.6,pk=(t.peak!=null?t.peak:t.e-1),lastStart=clamp(pk-pd,t.s+0.4+(n-1)*gap,t.e-pd-0.2);
      d.vals.forEach(function(v,i){
        var st=lastStart-(n-1-i)*gap;
        tl.to(bars[i],{scaleY:1,duration:pd*1.05,ease:"power3.out"},st);
        tl.to(yy[i],{opacity:1,duration:.3},st);tl.to(vals[i],{opacity:1,duration:.3},st);
        var p={v:0};tl.to(p,{v:v,duration:pd*1.05,ease:"power2.out",onUpdate:function(){vals[i].textContent=fmt(p.v);}},st);
      });
    },
    donut:function(el,d,tl,t){
      css();
      el.innerHTML='<div class="xc-ringwrap"><svg class="xc-ring" viewBox="0 0 200 200">'
        +'<defs><linearGradient id="xcgr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5cffd0"/><stop offset="0.6" stop-color="#3fa9ff"/><stop offset="1" stop-color="#7b5cff"/></linearGradient></defs>'
        +'<circle class="xc-track" cx="100" cy="100" r="84"/>'
        +'<circle class="xc-prog" cx="100" cy="100" r="84" pathLength="100"/></svg>'
        +'<div class="xc-rnum">0%</div></div><div class="xc-label">'+(d.label||'')+'</div>';
      var prog=el.querySelector('.xc-prog'),rn=el.querySelector('.xc-rnum'),lab=el.querySelector('.xc-label');
      var cd=d.cd||1.4,cs=peakCS(t,cd);
      gsap.set(prog,{strokeDasharray:"0 100"});gsap.set([rn,lab],{opacity:0,y:18});
      tl.to([rn,lab],{opacity:1,y:0,duration:.5,ease:"power2.out"},cs-.25);
      var p={v:0};tl.to(p,{v:d.to,duration:cd,ease:"power2.out",onUpdate:function(){rn.textContent=Math.round(p.v)+'%';prog.style.strokeDasharray=p.v.toFixed(2)+' 100';}},cs);
    },
    line:function(el,d,tl,t){
      css();
      var pts=d.points||[[0,360],[200,330],[400,278],[600,210],[800,120],[1000,32]];
      var lp='M'+pts.map(function(p){return p[0]+','+p[1];}).join(' L');
      var ap='M0,400 L'+pts.map(function(p){return p[0]+','+p[1];}).join(' L')+' L1000,400 Z';
      var dots=pts.map(function(p){return '<circle class="xc-dot" cx="'+p[0]+'" cy="'+p[1]+'" r="9"/>';}).join('');
      el.innerHTML='<div class="xc-ctitle">'+(d.title||'')+'</div>'
        +'<svg class="xc-lc" viewBox="0 0 1000 400">'
        +'<defs><linearGradient id="xclg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5cffd0"/><stop offset="0.6" stop-color="#3fa9ff"/><stop offset="1" stop-color="#a98bff"/></linearGradient>'
        +'<linearGradient id="xcag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3fa9ff" stop-opacity="0.45"/><stop offset="1" stop-color="#3fa9ff" stop-opacity="0"/></linearGradient></defs>'
        +'<path class="xc-area" d="'+ap+'"/><path class="xc-lpath" pathLength="1" d="'+lp+'"/>'+dots
        +'</svg>'+(d.sub?'<div class="xc-sub">'+d.sub+'</div>':'');
      var tt=el.querySelector('.xc-ctitle'),path=el.querySelector('.xc-lpath'),ar=el.querySelector('.xc-area'),dd=el.querySelectorAll('.xc-dot'),sb=el.querySelector('.xc-sub');
      var pk=(t.peak!=null?t.peak:t.e-0.6),cd=clamp(pk-(t.s+0.4),1.5,3.2),cs=clamp(pk-cd,t.s+0.3,t.e-0.6);
      gsap.set(tt,{y:24,opacity:0});if(sb)gsap.set(sb,{y:20,opacity:0});
      gsap.set(path,{strokeDasharray:1,strokeDashoffset:1});gsap.set(dd,{scale:0,transformOrigin:"center"});
      tl.to(tt,{y:0,opacity:1,duration:.5,ease:"power2.out"},t.s+.1);
      tl.to(path,{strokeDashoffset:0,duration:cd,ease:"power1.inOut"},cs);
      tl.to(ar,{opacity:1,duration:cd*0.8,ease:"power1.out"},cs+.2);
      tl.to(dd,{scale:1,duration:.3,ease:"back.out(2)",stagger:cd/pts.length},cs);
      if(sb)tl.to(sb,{y:0,opacity:1,duration:.5,ease:"power2.out"},cs+cd-0.5);
    }
  };
  window.XChart=X;
})();
