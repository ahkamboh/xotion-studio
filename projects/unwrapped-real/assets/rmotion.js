/* ============================================================
   rmotion.js — verbatim port of Remotion's spring() + interpolate() + Easing
   (damped harmonic oscillator, frame-stepped) so Xotion reproduces the
   EXACT motion curves of github-unwrapped. Deterministic, pure fn of frame.
   Source: remotion/dist/cjs/spring/spring-utils.js + interpolate.js
   ============================================================ */
(function(g){
  const FPS = 30;
  const defaultSpringConfig = { damping:10, mass:1, stiffness:100, overshootClamping:false };

  function advance(animation, now, config){
    const { toValue, lastTimestamp, current, velocity } = animation;
    const deltaTime = Math.min(now - lastTimestamp, 64);
    const c = config.damping, m = config.mass, k = config.stiffness;
    const v0 = -velocity, x0 = toValue - current;
    const zeta   = c / (2 * Math.sqrt(k * m));
    const omega0 = Math.sqrt(k / m);
    const omega1 = omega0 * Math.sqrt(1 - zeta**2);
    const t = deltaTime / 1000;
    const sin1 = Math.sin(omega1 * t), cos1 = Math.cos(omega1 * t);
    const ude  = Math.exp(-zeta * omega0 * t);
    const udf1 = ude * (sin1 * ((v0 + zeta*omega0*x0)/omega1) + x0*cos1);
    const udPos = toValue - udf1;
    const udVel = zeta*omega0*udf1 - ude*(cos1*(v0+zeta*omega0*x0) - omega1*x0*sin1);
    const cde   = Math.exp(-omega0 * t);
    const cdPos = toValue - cde*(x0 + (v0+omega0*x0)*t);
    const cdVel = cde*(v0*(t*omega0-1) + t*x0*omega0*omega0);
    return {
      toValue, prevPosition: current, lastTimestamp: now,
      current:  zeta < 1 ? udPos : cdPos,
      velocity: zeta < 1 ? udVel : cdVel,
    };
  }

  function springCalculation(frame, fps, config){
    let animation = { lastTimestamp:0, current:0, toValue:1, velocity:0, prevPosition:0 };
    const fc = Math.max(0, frame), ur = fc % 1;
    for (let f = 0; f <= Math.floor(fc); f++){
      if (f === Math.floor(fc)) f += ur;
      const time = (f / fps) * 1000;
      animation = advance(animation, time, Object.assign({}, defaultSpringConfig, config));
    }
    return animation;
  }

  // natural settle frame (within threshold of rest)
  const _measCache = {};
  function measureSpring(config, fps){
    const key = JSON.stringify(config)+'-'+fps;
    if (_measCache[key]) return _measCache[key];
    const threshold = 0.005, max = fps * 20;
    let f = 0, res = max;
    for (; f <= max; f++){
      const s = springCalculation(f, fps, config);
      if (Math.abs(s.current - 1) < threshold && Math.abs(s.velocity) < threshold){ res = f; break; }
    }
    _measCache[key] = res; return res;
  }

  // Remotion spring(): value at `frame`, optional from/to/delay/durationInFrames
  function spring(opts){
    const { fps=FPS, config={}, from=0, to=1, delay=0 } = opts;
    const durationInFrames = opts.durationInFrames;
    const cfg = Object.assign({}, defaultSpringConfig, config);
    const delayed = (opts.frame||0) - delay;
    let frame = delayed, nat;
    if (durationInFrames != null){
      nat = measureSpring(cfg, fps);
      frame = delayed / (durationInFrames / nat);
      if (delayed > durationInFrames) return to;
    }
    const spr = springCalculation(frame, fps, cfg);
    let inner = spr.current;
    if (cfg.overshootClamping) inner = to >= from ? Math.min(inner, to) : Math.max(inner, to);
    return from === 0 && to === 1 ? inner : (inner * (to - from) + from);
  }

  // interpolate() — multi-segment, with easing + extrapolate
  function findRange(input, inputRange){
    let i; for (i = 1; i < inputRange.length - 1; i++){ if (inputRange[i] >= input) break; }
    return i - 1;
  }
  function interpolate(input, inputRange, outputRange, options){
    options = options || {};
    const easing = options.easing || ((x)=>x);
    const exL = options.extrapolateLeft  || 'extend';
    const exR = options.extrapolateRight || 'extend';
    const r = findRange(input, inputRange);
    const iMin = inputRange[r], iMax = inputRange[r+1];
    const oMin = outputRange[r], oMax = outputRange[r+1];
    let result = input;
    if (result < iMin){ if (exL==='identity') return result; if (exL==='clamp') result = iMin; }
    if (result > iMax){ if (exR==='identity') return result; if (exR==='clamp') result = iMax; }
    if (oMin === oMax) return oMin;
    result = (result - iMin) / (iMax - iMin);
    result = easing(result);
    return result * (oMax - oMin) + oMin;
  }

  // cubic-bezier easing (Newton-Raphson), like Remotion Easing.bezier
  function cubicBezier(x1,y1,x2,y2){
    function A(a,b){return 1-3*b+3*a;} function B(a,b){return 3*b-6*a;} function C(a){return 3*a;}
    function calc(t,a,b){return ((A(a,b)*t+B(a,b))*t+C(a))*t;}
    function slope(t,a,b){return 3*A(a,b)*t*t+2*B(a,b)*t+C(a);}
    function tForX(x){ let t=x; for(let i=0;i<8;i++){ const xs=calc(t,x1,x2)-x; const d=slope(t,x1,x2); if(Math.abs(d)<1e-6)break; t-=xs/d; } return t; }
    return (x)=> x<=0?0 : x>=1?1 : calc(tForX(x), y1, y2);
  }
  const Easing = {
    linear:(x)=>x,
    ease: cubicBezier(0.25,0.1,0.25,1),
    quad:(x)=>x*x, cubic:(x)=>x*x*x,
    sin:(x)=>1-Math.cos((x*Math.PI)/2),
    bezier: cubicBezier,
    in:(e)=>e, out:(e)=>(x)=>1-e(1-x), inOut:(e)=>(x)=>x<0.5?e(x*2)/2:1-e((1-x)*2)/2,
  };

  /* ---- GSAP bridge ----
     springGsap(config, durationInFrames) -> {duration, ease}
     Use: tl.fromTo(el,{p:from},{p:to, duration:s.duration, ease:s.ease}, start)
     so the GSAP tween follows Remotion's EXACT spring curve. */
  function springGsap(config, durationInFrames, fps){
    fps = fps || FPS;
    const cfg = Object.assign({}, defaultSpringConfig, config||{});
    const nat = measureSpring(cfg, fps);
    const N = (durationInFrames != null) ? durationInFrames : nat;
    const ease = (p)=>{
      if (durationInFrames != null) return spring({frame:p*N, fps, config:cfg, durationInFrames:N, from:0, to:1});
      return springCalculation(p*N, fps, cfg).current;
    };
    return { duration: N / fps, ease, frames: N };
  }
  // convenience: an ease fn for a linear interpolate with a given Easing (for GSAP)
  function easeFn(e){ return (p)=> e(p); }

  g.RM = { spring, interpolate, Easing, springCalculation, measureSpring, springGsap, easeFn, cubicBezier, FPS };
})(window);
