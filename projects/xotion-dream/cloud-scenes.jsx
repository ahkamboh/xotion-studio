// cloud-scenes.jsx — Xotion demo video in a vintage editorial "dream poster" style.
// Deep textured blue, Didone swash serif, painted cloud metaphor, micro-captions.

const CW = 1080, CH = 1920;
const E = window.Easing;
const cl = (v,a=0,b=1)=>Math.max(a,Math.min(b,v));

const SERIF = '"Playfair Display", "Times New Roman", serif';

// Auto-fit hook: scales an element down so it never exceeds the frame width.
// Re-measures after web fonts load (fallback fonts mis-measure otherwise).
function useFit(ref, deps, max=900){
  const [fit,setFit] = React.useState(1);
  React.useLayoutEffect(()=>{
    let alive=true;
    const measure=()=>{ const el=ref.current; if(!el||!alive) return;
      const w=el.offsetWidth; setFit(w>max ? max/w : 1); };
    measure();
    if(document.fonts && document.fonts.ready){
      document.fonts.ready.then(()=>{ requestAnimationFrame(measure); });
    }
    return ()=>{ alive=false; };
  }, deps); // eslint-disable-line
  return fit;
}
const SANS  = '"Archivo", system-ui, sans-serif';
const COL = {
  ink:'#eaf3ff', dim:'#bcd6ff', faint:'#9fc0f0',
  gold:'#e8c987',
};

// ── Poster background: gradient + grain + vignette ──────────────────────
function PosterBG() {
  return (
    <div style={{position:'absolute',inset:0,overflow:'hidden',
      background:'radial-gradient(120% 80% at 50% 12%, #2f72c9 0%, rgba(47,114,201,0) 55%),'+
                 'linear-gradient(178deg,#1456a8 0%, #0e4391 42%, #0a3a86 72%, #0b3f8f 100%)'}}>
      <div style={{position:'absolute',inset:0,opacity:0.16,mixBlendMode:'overlay',
        backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"}}/>
      <div style={{position:'absolute',inset:0,mixBlendMode:'multiply',
        background:'radial-gradient(120% 100% at 50% 42%, transparent 56%, rgba(3,16,40,.55) 100%)'}}/>
    </div>
  );
}

// ── Corner labels ───────────────────────────────────────────────────────
function Corners({tl,tr,bl,br,t=1}) {
  const o = cl(t);
  const base = {position:'absolute',fontFamily:SANS,fontSize:26,fontWeight:600,
    letterSpacing:'0.22em',color:COL.dim,display:'flex',alignItems:'center',gap:13,opacity:o};
  const Dot = ()=> <span style={{width:12,height:12,borderRadius:'50%',background:COL.dim}}/>;
  return (
    <>
      {tl&&<div style={{...base,top:60,left:64}}><Dot/>{tl}</div>}
      {tr&&<div style={{...base,top:60,right:64}}>{tr}<Dot/></div>}
      {bl&&<div style={{...base,bottom:60,left:64}}><Dot/>{bl}</div>}
      {br&&<div style={{...base,bottom:60,right:64}}>{br}<Dot/></div>}
    </>
  );
}

// ── Micro caption (uppercase, fades in) ─────────────────────────────────
function Micro({x,y,w,rot=0,delay,text,localTime,align='left'}) {
  const o = cl((localTime-delay)/0.7)*0.82;
  return (
    <div style={{position:'absolute',left:x,top:y,width:w,transform:`rotate(${rot}deg)`,
      fontFamily:SANS,fontSize:17,fontWeight:500,letterSpacing:'0.06em',lineHeight:1.5,
      color:COL.dim,textTransform:'uppercase',opacity:o,textAlign:align}}
      dangerouslySetInnerHTML={{__html:text}}/>
  );
}

// ── Title line with swash first-letters ────────────────────────────────
// parts: array of {t, sw:bool}
function Title({parts,size,sw,top,delay,localTime,color=COL.ink}) {
  const t = E.easeOutCubic(cl((localTime-delay)/0.9));
  const ref = React.useRef(null);
  const fit = useFit(ref, [size,sw,parts.map(p=>p.t).join('')]);
  return (
    <div style={{position:'absolute',top,left:'50%',
      transform:`translateX(-50%) translateY(${(1-t)*26}px)`,opacity:t}}>
      <span ref={ref} style={{display:'inline-block',width:'max-content',
        fontFamily:SERIF,fontStyle:'italic',fontWeight:800,color,lineHeight:0.92,
        whiteSpace:'nowrap',letterSpacing:'-0.02em',
        transform:`scale(${fit})`,transformOrigin:'center top',
        textShadow:'0 3px 16px rgba(3,16,40,.4)'}}>
        {parts.map((p,i)=>(
          <span key={i} style={{fontSize:p.sw?sw:size,fontWeight:p.sw?900:800}}>{p.t}</span>
        ))}
      </span>
    </div>
  );
}

// Upright serif caps subline — auto-fits width
function Sub({text,size,top,delay,localTime,ls='0.04em'}) {
  const t = E.easeOutCubic(cl((localTime-delay)/0.9));
  const ref = React.useRef(null);
  const fit = useFit(ref, [size,text]);
  return (
    <div style={{position:'absolute',top,left:'50%',
      transform:`translateX(-50%) translateY(${(1-t)*20}px)`,opacity:t}}>
      <span ref={ref} style={{display:'inline-block',width:'max-content',whiteSpace:'nowrap',
        fontFamily:SERIF,fontStyle:'normal',fontWeight:700,fontSize:size,letterSpacing:ls,
        color:COL.ink,transform:`scale(${fit})`,transformOrigin:'center top'}}>{text}</span>
    </div>
  );
}

// ── Painted cloud ───────────────────────────────────────────────────────
function Cloud({w=680,h=430}) {
  return (
    <svg width={w} height={h} viewBox="0 0 680 430" style={{overflow:'visible',
      filter:'drop-shadow(0 26px 40px rgba(3,16,40,.4))'}}>
      <defs>
        <radialGradient id="clg" cx="44%" cy="40%" r="72%">
          <stop offset="0%" stopColor="#ffffff"/><stop offset="70%" stopColor="#f2f7ff"/>
          <stop offset="100%" stopColor="#cbdcf2"/>
        </radialGradient>
        <filter id="fl" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter>
      </defs>
      <g fill="url(#clg)" filter="url(#fl)" transform="translate(0,-30)">
        <ellipse cx="230" cy="270" rx="180" ry="135"/>
        <ellipse cx="430" cy="270" rx="200" ry="145"/>
        <ellipse cx="300" cy="195" rx="135" ry="110"/>
        <ellipse cx="430" cy="178" rx="135" ry="110"/>
        <ellipse cx="345" cy="315" rx="240" ry="120"/>
        <ellipse cx="520" cy="296" rx="118" ry="100"/>
        <ellipse cx="160" cy="298" rx="110" ry="92"/>
      </g>
    </svg>
  );
}

// Clothespin + rope motif
function Peg() {
  return (
    <svg width="100" height="210" viewBox="0 0 116 240" style={{filter:'drop-shadow(0 10px 16px rgba(3,16,40,.45))'}}>
      <defs><linearGradient id="wd" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#e0b577"/><stop offset="45%" stopColor="#cb9a5c"/><stop offset="100%" stopColor="#a3702f"/>
      </linearGradient></defs>
      <path d="M36 30 Q36 8 58 8 Q80 8 80 30 L75 232 L63 232 L60 150 L56 150 L53 232 L41 232 Z"
        fill="url(#wd)" stroke="#7c5526" strokeWidth="2.5" strokeLinejoin="round"/>
      <g stroke="#3f78c4" strokeWidth="6" fill="none" strokeLinecap="round">
        <circle cx="58" cy="118" r="19"/><path d="M39 118 L33 148 M77 118 L83 148"/>
      </g>
    </svg>
  );
}

// Falling drops (loops within scene via localTime)
function Rain({x,y,w=320,localTime,labels=null,count=9}) {
  const drops=[];
  for(let i=0;i<count;i++){
    const dur=2.6+(i%4)*0.4, delay=(i*0.5)%dur;
    const ph=((localTime+delay)%dur)/dur;
    const op = ph<0.12 ? ph/0.12 : ph>0.82 ? (1-ph)/0.18 : 1;
    const dx=(i*73)%w, len=300;
    drops.push(
      <div key={i} style={{position:'absolute',left:dx,top:ph*len,opacity:cl(op),
        fontFamily:SANS,fontSize:labels?20:0,fontWeight:700,letterSpacing:'0.1em',color:COL.ink}}>
        {labels? labels[i%labels.length] :
          <svg width="20" height="30" viewBox="0 0 22 32"><path d="M11 0 C11 0 21 16 21 23 A10 10 0 1 1 1 23 C1 16 11 0 11 0 Z" fill="#dCeBff" opacity=".9"/></svg>}
      </div>
    );
  }
  return <div style={{position:'absolute',left:x,top:y,width:w,height:320}}>{drops}</div>;
}

// little cloud glyph row
function MiniClouds({top,delay,localTime}) {
  const t=cl((localTime-delay)/0.8);
  return <div style={{position:'absolute',top,left:0,right:0,textAlign:'center',
    fontSize:48,letterSpacing:'0.14em',color:'#cfe4ff',opacity:t*0.9}}>☁ ☁ ☁</div>;
}

// ── SCENES ──────────────────────────────────────────────────────────────
function S1(){ const {localTime:t}=useSprite(); return (
  <div style={{position:'absolute',inset:0}}>
    <PosterBG/>
    <Corners tl="XOTION" tr="STUDIO" bl="MOTION" br="REEL №02" t={cl(t/0.6)}/>
    <MiniClouds top={250} delay={0.1} localTime={t}/>
    <Title parts={[{t:'X',sw:true},{t:'OTION',sw:false}]} size={230} sw={300} top={360} delay={0.2} localTime={t}/>
    <Sub text="PROMPT-DRIVEN MOTION" size={62} top={690} delay={0.5} localTime={t}/>
    <Micro x={300} y={830} w={480} delay={0.9} align="center" localTime={t}
      text="DESCRIBE IT — AND WATCH IT<br/>FALL INTO PLACE."/>
    <Title parts={[{t:'A',sw:true},{t:' QUIET KIND OF MAGIC',sw:false}]} size={70} sw={104}
      top={1280} delay={1.1} localTime={t} color={COL.gold}/>
    <Sub text="EST. 2026 · NO DESIGNER REQUIRED" size={30} top={1470} delay={1.4} localTime={t}/>
  </div>
);}

function S2(){ const {localTime:t}=useSprite(); return (
  <div style={{position:'absolute',inset:0}}>
    <PosterBG/>
    <Corners tl="STEP I" br="THE PROMPT" t={cl(t/0.6)}/>
    <Sub text="YOU SAY IT PLAINLY" size={34} top={300} delay={0.1} localTime={t} ls="0.16em"/>
    <Title parts={[{t:'D',sw:true},{t:'ESCRIBE',sw:false}]} size={180} sw={240} top={420} delay={0.25} localTime={t}/>
    <Title parts={[{t:'T',sw:true},{t:'HE EDIT',sw:false}]} size={180} sw={240} top={620} delay={0.45} localTime={t}/>
    {/* the typed line */}
    <div style={{position:'absolute',top:980,left:90,right:90,
      fontFamily:SERIF,fontStyle:'italic',fontWeight:500,fontSize:50,lineHeight:1.4,
      color:COL.ink,textAlign:'center',
      opacity:cl((t-0.8)/0.7),transform:`translateY(${(1-cl((t-0.8)/0.7))*18}px)`}}>
      “make a 15-second video about<br/>our Q3 numbers — bold, and a<br/>little bit dreamy.”
    </div>
    <Micro x={80} y={1320} w={420} delay={1.2} localTime={t}
      text="EVERY WORD IS A BRUSHSTROKE.<br/>THE SENTENCE BECOMES A SCENE."/>
    <Micro x={640} y={1360} w={360} delay={1.4} align="right" localTime={t}
      text="NO TIMELINE. NO KEYFRAMES.<br/>JUST THE THING YOU MEANT."/>
  </div>
);}

function S3(){ const {localTime:t}=useSprite(); const bob=Math.sin(t*1.1)*0.6; return (
  <div style={{position:'absolute',inset:0}}>
    <PosterBG/>
    <Corners tl="STEP II" br="THE MOTION" t={cl(t/0.6)}/>
    <Sub text="IT RENDERS WHILE YOU WAIT" size={32} top={250} delay={0.1} localTime={t} ls="0.14em"/>
    {/* rope */}
    <svg style={{position:'absolute',top:780,left:0,width:1080,height:120,opacity:cl((t-0.3)/0.6)}} viewBox="0 0 1080 120" preserveAspectRatio="none">
      <path d="M0 50 Q540 96 1080 54" fill="none" stroke="#dfeaff" strokeWidth="3" opacity=".85"/>
    </svg>
    {/* cloud pinned */}
    <div style={{position:'absolute',top:800,left:'50%',transform:`translateX(-50%) rotate(${bob}deg)`,
      transformOrigin:'top center',opacity:cl((t-0.2)/0.7)}}><Cloud/></div>
    <div style={{position:'absolute',top:710,left:'50%',transform:`translateX(-50%) rotate(${bob*1.6}deg)`,
      transformOrigin:'top center',opacity:cl((t-0.1)/0.6)}}><Peg/></div>
    <Rain x={420} y={1180} localTime={t}/>
    <Title parts={[{t:'R',sw:true},{t:'AIN OF',sw:false}]} size={150} sw={196} top={1300} delay={0.7} localTime={t}/>
    <Title parts={[{t:'F',sw:true},{t:'INISHED FRAMES',sw:false}]} size={96} sw={130} top={1500} delay={0.9} localTime={t}/>
    <Micro x={70} y={870} w={360} delay={1.1} localTime={t}
      text="YOUR PROMPT BECOMES A CLOUD —<br/>AND IT RAINS FINISHED SHOTS."/>
    <Micro x={690} y={900} w={330} delay={1.3} align="right" localTime={t}
      text="MOTION, TYPE & SOUND,<br/>GENERATED — NOT DRAGGED."/>
  </div>
);}

function S4(){ const {localTime:t}=useSprite(); return (
  <div style={{position:'absolute',inset:0}}>
    <PosterBG/>
    <Corners tl="STEP III" br="THE EXPORT" t={cl(t/0.6)}/>
    <Title parts={[{t:'E',sw:true},{t:'VERY FORMAT',sw:false}]} size={134} sw={178} top={380} delay={0.2} localTime={t}/>
    <Title parts={[{t:'F',sw:true},{t:'ALLS FREE',sw:false}]} size={140} sw={186} top={560} delay={0.4} localTime={t}/>
    <Rain x={300} y={840} w={520} localTime={t} labels={['MP4','WEBM','GIF','MOV','4K']} count={7}/>
    <Micro x={300} y={1500} w={480} delay={1.0} align="center" localTime={t}
      text="WATERMARK-FREE · POST THE SAME DAY<br/>9:16 · 1:1 · 16:9 — ANY SHAPE THAT SCROLLS"/>
  </div>
);}

function S5(){ const {localTime:t}=useSprite();
  const n=Math.round(60*E.easeOutCubic(cl((t-0.3)/1.2)));
  return (
  <div style={{position:'absolute',inset:0}}>
    <PosterBG/>
    <Corners tl="THE MATH" br="ONE MINUTE" t={cl(t/0.6)}/>
    <Sub text="FROM SENTENCE TO SHARE" size={34} top={420} delay={0.1} localTime={t} ls="0.14em"/>
    <div style={{position:'absolute',top:560,left:0,right:0,textAlign:'center',
      fontFamily:SERIF,fontStyle:'italic',fontWeight:900,fontSize:520,color:COL.ink,lineHeight:0.8,
      opacity:cl((t-0.2)/0.6),textShadow:'0 6px 30px rgba(3,16,40,.45)'}}>{n}</div>
    <Title parts={[{t:'S',sw:true},{t:'ECONDS, FLAT',sw:false}]} size={120} sw={158} top={1240} delay={0.7} localTime={t}/>
    <Micro x={300} y={1470} w={480} delay={1.1} align="center" localTime={t}
      text="THE TIME IT TAKES TO POUR A COFFEE —<br/>AND YOUR VIDEO IS ALREADY DRY."/>
  </div>
);}

function S6(){ const {localTime:t}=useSprite(); return (
  <div style={{position:'absolute',inset:0}}>
    <PosterBG/>
    <Corners tl="XOTION" tr="STUDIO" bl="MOTION" br="DREAM" t={cl(t/0.6)}/>
    <MiniClouds top={420} delay={0.1} localTime={t}/>
    <Title parts={[{t:'M',sw:true},{t:'AKE',sw:false}]} size={206} sw={272} top={560} delay={0.2} localTime={t}/>
    <Title parts={[{t:'A',sw:true},{t:' MOMENT',sw:false}]} size={168} sw={224} top={830} delay={0.4} localTime={t}/>
    <Rain x={470} y={1130} w={160} localTime={t} count={5}/>
    <Sub text="START FREE — THREE ON THE HOUSE" size={42} top={1370} delay={0.9} localTime={t}/>
    <div style={{position:'absolute',top:1500,left:0,right:0,textAlign:'center',
      fontFamily:SANS,fontWeight:700,fontSize:50,letterSpacing:'0.18em',color:COL.gold,
      opacity:cl((t-1.2)/0.6)}}>XOTION.COM</div>
  </div>
);}

function CloudVideo(){
  return (
    <>
      <Sprite start={0.0}  end={2.8}>  <S1/> </Sprite>
      <Sprite start={2.8}  end={5.6}>  <S2/> </Sprite>
      <Sprite start={5.6}  end={8.8}>  <S3/> </Sprite>
      <Sprite start={8.8}  end={11.0}> <S4/> </Sprite>
      <Sprite start={11.0} end={13.0}> <S5/> </Sprite>
      <Sprite start={13.0} end={15.0}> <S6/> </Sprite>
    </>
  );
}

Object.assign(window, { CloudVideo, CW, CH });
