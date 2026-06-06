// riso-scenes.jsx — Xotion demo in psychedelic risograph style.
// Yellow/cyan duotone, grain, sunburst rays, bold condensed retro type.

const RW = 1080, RH = 1920;
const E = window.Easing;
const cl = (v,a=0,b=1)=>Math.max(a,Math.min(b,v));

const DISP = '"Anton", "Arial Narrow", sans-serif';
const SANS = '"Oswald", system-ui, sans-serif';
const C = { yellow:'#f4dc1e', cyan:'#27c1e8', cyanD:'#149ec2', purple:'#3a1f6b', ink:'#10204a' };

// auto-fit (offsetWidth + max-content, reliable)
function useFit(ref, deps, max=900){
  const [fit,setFit]=React.useState(1);
  React.useLayoutEffect(()=>{
    let on=true;
    const m=()=>{const el=ref.current;if(!el||!on)return;const w=el.offsetWidth;setFit(w>max?max/w:1);};
    m(); if(document.fonts&&document.fonts.ready){document.fonts.ready.then(()=>requestAnimationFrame(m));}
    return ()=>{on=false;};
  },deps); // eslint-disable-line
  return fit;
}

// ── Risograph background: cyan ground + rotating sunburst + grain + duotone corners
function RisoBG({localTime}){
  const rot = localTime*4; // slow ray rotation
  return (
    <div style={{position:'absolute',inset:0,overflow:'hidden',background:C.cyan}}>
      {/* sunburst rays from bottom-centre */}
      <div style={{position:'absolute',left:'-30%',top:'-30%',width:'160%',height:'160%',
        transformOrigin:'50% 78%',transform:`rotate(${rot}deg)`,
        background:`repeating-conic-gradient(from 200deg at 50% 88%, ${C.yellow} 0deg 3deg, transparent 3deg 6.6deg)`,
        WebkitMaskImage:'radial-gradient(120% 90% at 50% 92%, #000 8%, rgba(0,0,0,.85) 32%, transparent 70%)',
        maskImage:'radial-gradient(120% 90% at 50% 92%, #000 8%, rgba(0,0,0,.85) 32%, transparent 70%)'}}/>
      {/* bright core glow bottom */}
      <div style={{position:'absolute',inset:0,
        background:`radial-gradient(60% 36% at 50% 96%, ${C.yellow} 0%, rgba(244,220,30,0) 70%)`}}/>
      {/* purple duotone corners (top) */}
      <div style={{position:'absolute',inset:0,mixBlendMode:'multiply',
        background:`radial-gradient(50% 36% at 4% 2%, ${C.purple} 0%, rgba(58,31,107,0) 60%),`+
                   `radial-gradient(50% 36% at 96% 4%, ${C.purple} 0%, rgba(58,31,107,0) 60%)`}}/>
      {/* grain / dither */}
      <div style={{position:'absolute',inset:0,opacity:0.5,mixBlendMode:'overlay',
        backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.62' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"}}/>
    </div>
  );
}

// ── Kicker (condensed caps, yellow) ──────────────────────────────────────
function Kick({text,top,delay,localTime,color=C.yellow,size=46}){
  const t=cl((localTime-delay)/0.6);
  const ref=React.useRef(null); const fit=useFit(ref,[text,size],960);
  return (
    <div style={{position:'absolute',top,left:'50%',transform:`translateX(-50%) translateY(${(1-t)*-14}px)`,opacity:t}}>
      <span ref={ref} style={{display:'inline-block',width:'max-content',whiteSpace:'nowrap',
        fontFamily:SANS,fontWeight:700,fontSize:size,letterSpacing:'.04em',textTransform:'uppercase',
        color,transform:`scale(${fit})`,transformOrigin:'center top',
        textShadow:'0 2px 0 rgba(16,32,74,.35)'}}>{text}</span>
    </div>
  );
}

// ── Big condensed display line, duotone fill, auto-fit, centered ─────────
function Big({text,size,top,delay,localTime}){
  const t=E.easeOutCubic(cl((localTime-delay)/0.6));
  const ref=React.useRef(null); const fit=useFit(ref,[size,text]);
  return (
    <div style={{position:'absolute',top,left:'50%',
      transform:`translateX(-50%) translateY(${(1-t)*46}px)`,opacity:t}}>
      <span ref={ref} style={{display:'inline-block',width:'max-content',whiteSpace:'nowrap',
        fontFamily:DISP,fontWeight:400,fontSize:size,lineHeight:.86,letterSpacing:'.005em',
        transform:`scale(${fit})`,transformOrigin:'center top',
        background:`linear-gradient(180deg, #fffde6 0%, ${C.yellow} 20%, ${C.yellow} 62%, #aee9f4 100%)`,
        WebkitBackgroundClip:'text',backgroundClip:'text',color:'transparent',
        filter:`drop-shadow(0 6px 0 ${C.cyanD}) drop-shadow(0 16px 20px rgba(16,32,74,.35))`}}>{text}</span>
    </div>
  );
}

// little footer mark
function Foot({localTime}){
  const t=cl((localTime-1.0)/0.6);
  return <div style={{position:'absolute',bottom:64,left:0,right:0,textAlign:'center',
    fontFamily:SANS,fontWeight:600,fontSize:26,letterSpacing:'.28em',textTransform:'uppercase',
    color:C.ink,opacity:t*0.8}}>✦ xotion © 2026 ✦</div>;
}

// ── SCENES ───────────────────────────────────────────────────────────────
function Scene({kick,l1,l2,s1=300,s2=300,localTime,footer}){
  return (
    <div style={{position:'absolute',inset:0}}>
      <RisoBG localTime={localTime}/>
      <Kick text={kick} top={140} delay={0.15} localTime={localTime}/>
      <Big text={l1} size={s1} top={260} delay={0.35} localTime={localTime}/>
      <Big text={l2} size={s2} top={260+s1*0.92} delay={0.55} localTime={localTime}/>
      {footer && <Foot localTime={localTime}/>}
    </div>
  );
}

function R1(){const{localTime:t}=useSprite();return <Scene localTime={t}
  kick="TO PROMPT IS TO CREATE —" l1="MAKE" l2="MOTION" s1={272} s2={224} footer/>;}
function R2(){const{localTime:t}=useSprite();return <Scene localTime={t}
  kick="STEP ONE · SAY IT PLAINLY" l1="DESCRIBE" l2="THE EDIT" s1={182} s2={190}/>;}
function R3(){const{localTime:t}=useSprite();return <Scene localTime={t}
  kick="STEP TWO · IT RENDERS ITSELF" l1="SIXTY" l2="SECONDS" s1={264} s2={196}/>;}
function R4(){const{localTime:t}=useSprite();return <Scene localTime={t}
  kick="STEP THREE · ANY SHAPE THAT SCROLLS" l1="EXPORT" l2="IT ALL" s1={236} s2={236}/>;}

function R5(){const{localTime:t}=useSprite();
  return (
    <div style={{position:'absolute',inset:0}}>
      <RisoBG localTime={t}/>
      <Kick text="NO DESIGNER. NO TIMELINE." top={300} delay={0.15} localTime={t}/>
      <Big text="JUST" size={236} top={420} delay={0.35} localTime={t}/>
      <Big text="BEGIN" size={300} top={640} delay={0.55} localTime={t}/>
      <Big text="ANEW" size={300} top={920} delay={0.75} localTime={t}/>
    </div>
  );
}

function R6(){const{localTime:t}=useSprite();return (
  <div style={{position:'absolute',inset:0}}>
    <RisoBG localTime={t}/>
    <Kick text="YOUR TURN —" top={420} delay={0.15} localTime={t}/>
    <Big text="ROLL WITH" size={150} top={560} delay={0.3} localTime={t}/>
    <Big text="XOTION" size={260} top={720} delay={0.5} localTime={t}/>
    <div style={{position:'absolute',top:1180,left:0,right:0,textAlign:'center',fontFamily:SANS,fontWeight:700,
      fontSize:62,letterSpacing:'.06em',textTransform:'uppercase',color:C.ink,
      opacity:cl((t-0.9)/0.6)}}>START FREE</div>
    <div style={{position:'absolute',top:1300,left:0,right:0,textAlign:'center',fontFamily:DISP,
      fontSize:96,letterSpacing:'.02em',color:C.yellow,opacity:cl((t-1.1)/0.6),
      filter:`drop-shadow(0 5px 0 ${C.cyanD})`}}>XOTION.COM</div>
    <Foot localTime={t}/>
  </div>
);}

function RisoVideo(){return(<>
  <Sprite start={0.0}  end={2.6}>  <R1/> </Sprite>
  <Sprite start={2.6}  end={5.0}>  <R2/> </Sprite>
  <Sprite start={5.0}  end={7.4}>  <R3/> </Sprite>
  <Sprite start={7.4}  end={9.8}>  <R4/> </Sprite>
  <Sprite start={9.8}  end={12.4}> <R5/> </Sprite>
  <Sprite start={12.4} end={15.0}> <R6/> </Sprite>
</>);}

Object.assign(window, { RisoVideo, RW, RH });
