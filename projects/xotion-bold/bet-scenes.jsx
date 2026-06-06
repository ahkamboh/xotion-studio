// bet-scenes.jsx — Xotion demo video in the bold "What's your bet?" style.
// White ground, heavy black Archivo type, electric green accent, glossy dice + ribbons.

const BW = 1080, BH = 1920;
const E = window.Easing;
const cl = (v,a=0,b=1)=>Math.max(a,Math.min(b,v));

const BLACK = '"Archivo Black", system-ui, sans-serif';
const SANS  = '"Archivo", system-ui, sans-serif';
const G = { green:'#21b24b', greenD:'#0c6e2c', greenL:'#5fe07f', ink:'#0a0a0a', white:'#ffffff' };

// auto-fit so heavy headlines never exceed the frame
function useFit(ref, deps, max=880){
  const [fit,setFit]=React.useState(1);
  React.useLayoutEffect(()=>{
    let on=true;
    const m=()=>{const el=ref.current;if(!el||!on)return;
      const w=el.offsetWidth; setFit(w>max?max/w:1);};
    m(); if(document.fonts&&document.fonts.ready){document.fonts.ready.then(()=>requestAnimationFrame(m));}
    return ()=>{on=false;};
  },deps); // eslint-disable-line
  return fit;
}

// ── White ground with soft green glow ───────────────────────────────────
function Ground(){
  return <div style={{position:'absolute',inset:0,overflow:'hidden',
    background:'radial-gradient(70% 50% at 72% 16%, #f1fff6 0%, rgba(241,255,246,0) 60%), #ffffff'}}/>;
}

// ── Glossy green die rendered as a proper isometric cube ────────────────
function pips(n){const m={1:[[.5,.5]],2:[[.3,.3],[.7,.7]],3:[[.27,.27],[.5,.5],[.73,.73]],
  4:[[.3,.3],[.7,.3],[.3,.7],[.7,.7]],5:[[.27,.27],[.73,.27],[.5,.5],[.27,.73],[.73,.73]],
  6:[[.3,.25],[.7,.25],[.3,.5],[.7,.5],[.3,.75],[.7,.75]]};return m[n];}
// bilinear map of unit-square (u,v) into a quad A(tl) B(tr) C(br) D(bl)
function fp(A,B,C,D,u,v){return [
  A[0]*(1-u)*(1-v)+B[0]*u*(1-v)+C[0]*u*v+D[0]*(1-u)*v,
  A[1]*(1-u)*(1-v)+B[1]*u*(1-v)+C[1]*u*v+D[1]*(1-u)*v];}
// round the corners of a polygon → rounded-cube faces
const _sub=(a,b)=>[a[0]-b[0],a[1]-b[1]];
const _nrm=(a)=>{const l=Math.hypot(a[0],a[1])||1;return[a[0]/l,a[1]/l];};
const _dst=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function roundPoly(pts,r){let d='';const n=pts.length;for(let i=0;i<n;i++){
  const p0=pts[(i-1+n)%n],p1=pts[i],p2=pts[(i+1)%n];
  const v1=_nrm(_sub(p1,p0)),v2=_nrm(_sub(p2,p1));
  const rr=Math.min(r,_dst(p0,p1)/2,_dst(p1,p2)/2);
  const a=[p1[0]-v1[0]*rr,p1[1]-v1[1]*rr],b=[p1[0]+v2[0]*rr,p1[1]+v2[1]*rr];
  d+=(i===0?`M${a[0].toFixed(1)},${a[1].toFixed(1)}`:`L${a[0].toFixed(1)},${a[1].toFixed(1)}`)
   +` Q${p1[0]},${p1[1]} ${b[0].toFixed(1)},${b[1].toFixed(1)}`;}
  return d+'Z';}
function DieSVG({face=6,id='d',label=null}){
  // cube vertices (viewBox 0 0 260 290)
  const T=[130,26], R=[232,90], C0=[130,154], L=[28,90], L2=[28,214], R2=[232,214], B=[130,278];
  const TOP  ={A:L, B:T, C:R, D:C0};
  const FRONT={A:L, B:C0, C:B, D:L2};
  const SIDE ={A:C0, B:R, C:R2, D:B};
  const topV=2, sideV=4;
  const hex = roundPoly([T,R,R2,B,L2,L], 22);   // rounded OUTER silhouette only
  const seam = `M${L} L${C0} L${R} M${C0} L${B}`; // internal edges meet at centre
  const P=(s)=>s[0]+','+s[1];
  const pip=(q,v,fill)=>pips(v).map(([x,y],i)=>{const[px,py]=fp(q.A,q.B,q.C,q.D,x,y);
    return <ellipse key={i} cx={px} cy={py} rx="13" ry="10.5" fill={fill} stroke="#0c6e2c" strokeWidth="2"/>;});
  return (
    <svg width="100%" height="100%" viewBox="0 0 260 290" style={{overflow:'visible',
      filter:'drop-shadow(0 20px 18px rgba(20,90,40,.3))'}}>
      <defs>
        <linearGradient id={'top'+id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#caffd8"/><stop offset="100%" stopColor="#7fe39a"/></linearGradient>
        <linearGradient id={'fr'+id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#46d96a"/><stop offset="100%" stopColor="#1c9c41"/></linearGradient>
        <linearGradient id={'sd'+id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1c9c41"/><stop offset="100%" stopColor="#0a5723"/></linearGradient>
        <clipPath id={'clip'+id}><path d={hex}/></clipPath>
      </defs>
      {/* solid body + faces, all clipped to the rounded silhouette so faces meet with no gap */}
      <g clipPath={`url(#clip${id})`}>
        <path d={hex} fill="#1c9c41"/>
        <polygon points={`${P(L)} ${P(T)} ${P(R)} ${P(C0)}`} fill={`url(#top${id})`}/>
        <polygon points={`${P(L)} ${P(C0)} ${P(B)} ${P(L2)}`} fill={`url(#fr${id})`}/>
        <polygon points={`${P(C0)} ${P(R)} ${P(R2)} ${P(B)}`} fill={`url(#sd${id})`}/>
        <path d={seam} fill="none" stroke="#0c6e2c" strokeWidth="3" strokeLinecap="round" strokeOpacity=".55"/>
      </g>
      {/* crisp outer outline + top gloss */}
      <path d={hex} fill="none" stroke="#0c6e2c" strokeWidth="4" strokeLinejoin="round"/>
      <path d={`M${L[0]+12},${L[1]+7} L${T} L${R[0]-12},${R[1]+7}`} fill="none" stroke="#ffffff" strokeWidth="3" strokeOpacity=".5" strokeLinejoin="round"/>
      {label
        ? (()=>{const[cx,cy]=fp(FRONT.A,FRONT.B,FRONT.C,FRONT.D,.5,.5);
            return <text x={cx} y={cy+12} textAnchor="middle" fontFamily={BLACK} fontSize="34" fill="#eafff0">{label}</text>;})()
        : <>{pip(TOP,topV,'#e6fff0')}{pip(FRONT,face,'#eafff0')}{pip(SIDE,sideV,'#d6f7e2')}</>}
    </svg>
  );
}
function Die({x,y,size,face,label,id,localTime,delay=0,spin=18,r0=0}){
  const intro=E.easeOutBack(cl((localTime-delay)/0.95));
  const rot=r0+(localTime-delay)*spin;
  const fy=Math.sin(localTime*1.3+r0)*9;
  return <div style={{position:'absolute',left:x,top:y,width:size,height:size,opacity:cl((localTime-delay)/0.5),
    transform:`translateY(${(1-intro)*-130+fy}px) rotate(${rot}deg) scale(${0.5+0.5*intro})`}}>
    <DieSVG face={face} label={label} id={id}/></div>;
}

// ── Ribbon that draws on ─────────────────────────────────────────────────
function Ribbon({x,y,w,h,d,len,localTime,delay=0,sw=40}){
  const off=len*(1-E.easeOutCubic(cl((localTime-delay)/1.3)));
  const sway=Math.sin(localTime*0.9)*2;
  return <div style={{position:'absolute',left:x,top:y,transform:`rotate(${sway}deg)`}}>
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs><linearGradient id={'rg'+x+y} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#7ff0a0"/><stop offset="50%" stopColor="#21b24b"/><stop offset="100%" stopColor="#0c6e2c"/>
      </linearGradient></defs>
      <path d={d} fill="none" stroke={`url(#rg${x}${y})`} strokeWidth={sw} strokeLinecap="round"
        strokeDasharray={len} strokeDashoffset={off}
        style={{filter:'drop-shadow(0 8px 12px rgba(15,90,40,.3))'}}/>
    </svg></div>;
}

// ── Heavy headline (auto-fit, slam-in) ──────────────────────────────────
function Big({parts,size,top,delay,localTime,align='center',left=0}){
  const t=E.easeOutCubic(cl((localTime-delay)/0.6));
  const ref=React.useRef(null); const fit=useFit(ref,[size,parts.map(p=>p.t).join('')]);
  const centered = align==='center';
  return (
    <div style={{position:'absolute',top,left:centered?'50%':left,
      transform:`translateX(${centered?'-50%':'0px'}) translateY(${(1-t)*42}px)`,opacity:t}}>
      <span ref={ref} style={{display:'inline-block',width:'max-content',fontFamily:BLACK,fontSize:size,lineHeight:.82,
        letterSpacing:'-.04em',whiteSpace:'nowrap',transform:`scale(${fit})`,transformOrigin:'center top'}}>
        {parts.map((p,i)=><span key={i} style={{color:p.c||G.ink,position:'relative'}}>
          {p.t}{p.strike && <span style={{position:'absolute',left:'-4%',right:'-4%',top:'52%',height:'0.1em',
            background:G.ink,borderRadius:99,transformOrigin:'left',rotate:'-4deg',
            transform:`scaleX(${E.easeOutCubic(cl((localTime-delay-0.5)/0.5))})`}}/>}
        </span>)}
      </span>
    </div>
  );
}
function Kick({text,top,delay,localTime,color=G.green,left=84,size=52,align='left'}){
  const t=cl((localTime-delay)/0.6);
  return <div style={{position:'absolute',top,left:align==='center'?0:left,right:align==='center'?0:'auto',
    textAlign:align,fontFamily:SANS,fontWeight:800,fontSize:size,color,letterSpacing:'-.01em',
    opacity:t,transform:`translateY(${(1-t)*16}px)`}}>{text}</div>;
}
function Underline({x,y,w,delay,localTime,color=G.green,h=18}){
  const s=E.easeOutCubic(cl((localTime-delay)/0.6));
  return <div style={{position:'absolute',left:x,top:y,width:w,height:h,background:color,borderRadius:99,
    transformOrigin:'left',transform:`scaleX(${s})`}}/>;
}

// ── SCENES ───────────────────────────────────────────────────────────────
function B1(){const{localTime:t}=useSprite();return(<div style={{position:'absolute',inset:0}}>
  <Ground/>
  <Ribbon x={560} y={-40} w={560} h={420} len={2400} localTime={t} delay={0.1} sw={42}
    d="M40 340 C120 240 220 280 250 180 C280 80 200 50 300 40 C400 30 430 140 520 110 C600 85 590 190 540 230"/>
  <Kick text="WHAT'S YOUR" top={300} delay={0.2} localTime={t}/>
  <Big parts={[{t:'MOVE'},{t:'?',c:G.green}]} size={290} top={380} delay={0.35} localTime={t}/>
  <Die x={250} y={920} size={250} face={3} id="a" localTime={t} delay={0.6} spin={-10} r0={-12}/>
  <Die x={470} y={1080} size={340} face={6} id="b" localTime={t} delay={0.75} spin={14} r0={8}/>
  <Big parts={[{t:'YOUR PROMPT IS THE ROLL.'}]} size={70} top={1560} delay={1.1} localTime={t}/>
  <Kick text="XOTION STUDIO" top={1700} delay={1.3} localTime={t} color={G.ink} size={40}/>
</div>);}

function B2(){const{localTime:t}=useSprite();return(<div style={{position:'absolute',inset:0}}>
  <Ground/>
  <Kick text="THE OLD WAY" top={300} delay={0.1} localTime={t}/>
  <Big parts={[{t:'STOP'}]} size={300} top={380} delay={0.25} localTime={t}/>
  <Big parts={[{t:'dragging',c:G.green,strike:true}]} size={180} top={720} delay={0.5} localTime={t}/>
  <Big parts={[{t:'tiny clips.'}]} size={180} top={930} delay={0.7} localTime={t}/>
  <Die x={690} y={1180} size={300} face={1} id="c" localTime={t} delay={0.9} spin={16} r0={6}/>
  <Big parts={[{t:'No timeline. No '},{t:'keyframes.',c:G.green}]} size={66} top={1560} delay={1.2} localTime={t}/>
</div>);}

function B3(){const{localTime:t}=useSprite();return(<div style={{position:'absolute',inset:0}}>
  <Ground/>
  <Kick text="THE NEW WAY" top={300} delay={0.1} localTime={t}/>
  <Big parts={[{t:'JUST'}]} size={260} top={380} delay={0.25} localTime={t}/>
  <Big parts={[{t:'PROMPT',c:G.green}]} size={260} top={660} delay={0.45} localTime={t}/>
  <Big parts={[{t:'IT.'}]} size={260} top={940} delay={0.6} localTime={t}/>
  <Underline x={90} y={1250} w={500} delay={0.9} localTime={t}/>
  <Big parts={[{t:'“make a 15s reel about Q3 —'}]} size={56} top={1340} delay={1.0} localTime={t}/>
  <Big parts={[{t:'bold, and a little loud.”'}]} size={56} top={1430} delay={1.15} localTime={t}/>
  <Die x={798} y={108} size={200} face={5} id="d" localTime={t} delay={0.8} spin={-12} r0={10}/>
</div>);}

function B4(){const{localTime:t}=useSprite();
  const n=Math.round(60*E.easeOutCubic(cl((t-0.3)/1.3)));
  return(<div style={{position:'absolute',inset:0}}>
  <Ground/>
  <Kick text="THE SPEED" top={300} delay={0.1} localTime={t} align="center"/>
  <div style={{position:'absolute',top:430,left:0,right:0,textAlign:'center',fontFamily:BLACK,
    fontSize:560,lineHeight:.8,color:G.green,opacity:cl((t-0.2)/0.5),letterSpacing:'-.05em'}}>{n}</div>
  <Big parts={[{t:'SECONDS '},{t:'FLAT.',c:G.green}]} size={150} top={1130} delay={0.6} localTime={t}/>
  <Big parts={[{t:'sentence → share —'}]} size={58} top={1390} delay={1.05} localTime={t}/>
  <Big parts={[{t:'before the coffee’s cold.'}]} size={58} top={1480} delay={1.2} localTime={t}/>
  <Die x={400} y={1610} size={250} face={6} id="e" localTime={t} delay={0.9} spin={20} r0={-8}/>
</div>);}

function B5(){const{localTime:t}=useSprite();return(<div style={{position:'absolute',inset:0}}>
  <Ground/>
  <Kick text="THE EXPORT" top={300} delay={0.1} localTime={t} align="center"/>
  <Big parts={[{t:'EVERY'}]} size={240} top={400} delay={0.25} localTime={t}/>
  <Big parts={[{t:'FORMAT',c:G.green}]} size={200} top={650} delay={0.4} localTime={t}/>
  <Die x={120} y={1100} size={240} face={0} label="MP4"  id="f1" localTime={t} delay={0.7} spin={14} r0={-6}/>
  <Die x={420} y={1180} size={240} face={0} label="WEBM" id="f2" localTime={t} delay={0.85} spin={-12} r0={8}/>
  <Die x={720} y={1100} size={240} face={0} label="GIF"  id="f3" localTime={t} delay={1.0} spin={16} r0={-4}/>
  <Big parts={[{t:'watermark-free · any ratio'}]} size={60} top={1560} delay={1.3} localTime={t}/>
</div>);}

function B6(){const{localTime:t}=useSprite();return(<div style={{position:'absolute',inset:0}}>
  <Ground/>
  <Ribbon x={-20} y={70} w={400} h={340} len={1600} localTime={t} delay={0.3} sw={34}
    d="M30 300 C90 240 60 150 140 160 C220 170 180 80 260 100 C340 120 320 210 260 230"/>
  <Kick text="YOUR TURN" top={360} delay={0.1} localTime={t} align="center"/>
  <Big parts={[{t:'ROLL WITH'}]} size={170} top={470} delay={0.25} localTime={t}/>
  <Big parts={[{t:'XOTION',c:G.green}]} size={250} top={650} delay={0.45} localTime={t}/>
  <Die x={400} y={1040} size={300} face={6} id="g" localTime={t} delay={0.7} spin={18} r0={6}/>
  <Big parts={[{t:'START FREE — THREE ON THE HOUSE'}]} size={56} top={1480} delay={1.1} localTime={t}/>
  <div style={{position:'absolute',top:1580,left:0,right:0,textAlign:'center',fontFamily:BLACK,
    fontSize:64,color:G.green,letterSpacing:'.02em',opacity:cl((t-1.3)/0.6)}}>XOTION.COM</div>
</div>);}

function BetVideo(){return(<>
  <Sprite start={0.0}  end={2.6}>  <B1/> </Sprite>
  <Sprite start={2.6}  end={5.0}>  <B2/> </Sprite>
  <Sprite start={5.0}  end={7.6}>  <B3/> </Sprite>
  <Sprite start={7.6}  end={10.0}> <B4/> </Sprite>
  <Sprite start={10.0} end={12.4}> <B5/> </Sprite>
  <Sprite start={12.4} end={15.0}> <B6/> </Sprite>
</>);}

Object.assign(window, { BetVideo, BW, BH });
