/* textfx.js — the text-ANIMATION engine. Turns a kit's named animation
   (mask-wipe / letter-cascade / punch-in / rise-blur / typewriter / squash-pop /
   glitch / pressure) into ACTUAL deterministic GSAP motion, so motion-builder
   calls a function by name instead of hand-coding (which always defaulted to pop).

   'pressure' needs a VARIABLE font with a wide wght axis — the library ships
   assets/fonts/roboto-flex-variable.ttf (wght 100-1000). @font-face it and the
   sweep fattens each letter as an invisible cursor passes (weight wave).

   Usage (after gsap + this script):
     TextFX.enter(el, tl, at, kit.text_anim.entrance, opts)   // entrance at time `at`
     TextFX.exit (el, tl, at, kit.text_anim.exit, opts)       // exit
   `el` is a text element (its text is split into spans as needed at call time,
   which runs at timeline-construction — NOT inside tl.call — so selectors resolve).
   Deterministic: no Math.random / Date. Finite tweens. */
(function(){
  function splitChars(el){
    if(el.__split) return el.__chars;
    var chars=[];
    // Walk the tree so child WRAPPER elements (e.g. <span class="a"> accent words)
    // are PRESERVED — split only text nodes into per-char spans that stay INSIDE
    // their wrapper. Flattening el.textContent (old behavior) destroyed every
    // accent/color span, so highlight words rendered as plain ink.
    function walk(node){
      var kids = Array.prototype.slice.call(node.childNodes);
      for(var k=0;k<kids.length;k++){
        var ch=kids[k];
        if(ch.nodeType===3){
          var txt=ch.nodeValue, frag=document.createDocumentFragment();
          for(var i=0;i<txt.length;i++){
            var s=document.createElement('span'); s.style.display='inline-block';
            s.style.whiteSpace='pre'; s.textContent = txt[i]===' ' ? ' ' : txt[i];
            frag.appendChild(s); chars.push(s);
          }
          node.replaceChild(frag, ch);
        } else if(ch.nodeType===1){
          if(!ch.style.display) ch.style.display='inline-block';
          walk(ch);
        }
      }
    }
    walk(el); el.__split=true; el.__chars=chars; return chars;
  }
  function splitWords(el){
    if(el.__wsplit) return el.__words;
    var parts = el.textContent.split(' '), frag=document.createDocumentFragment(), words=[];
    for(var i=0;i<parts.length;i++){
      var s=document.createElement('span'); s.style.display='inline-block';
      s.textContent=parts[i]; frag.appendChild(s); words.push(s);
      if(i<parts.length-1) frag.appendChild(document.createTextNode(' '));
    }
    el.textContent=''; el.appendChild(frag); el.__wsplit=true; el.__words=words; return words;
  }
  function wrapMask(el){
    if(el.__masked) return el.__inner;
    var inner=document.createElement('span'); inner.style.display='inline-block';
    while(el.firstChild) inner.appendChild(el.firstChild);
    el.appendChild(inner); el.style.display='inline-block'; el.style.overflow='hidden';
    el.__masked=true; el.__inner=inner; return inner;
  }

  var ENTER = {
    // elegant default — whole element rises + de-blurs
    'rise-blur': function(el,tl,at,o){ o=o||{};
      gsap.set(el,{y:o.y||42,scale:o.scale||0.96,opacity:0,filter:"blur(9px)"});
      tl.to(el,{y:0,scale:1,opacity:1,filter:"blur(0px)",duration:o.dur||0.8,ease:o.ease||"expo.out"},at); },
    // pixel/title — inner wipes up behind a mask edge
    'mask-wipe': function(el,tl,at,o){ o=o||{}; var inner=wrapMask(el);
      gsap.set(inner,{yPercent:110}); gsap.set(el,{opacity:1});
      tl.fromTo(inner,{yPercent:110},{yPercent:0,duration:o.dur||0.8,ease:o.ease||"expo.out"},at); },
    // kinetic typography — per letter cascade
    'letter-cascade': function(el,tl,at,o){ o=o||{}; var c=splitChars(el);
      gsap.set(c,{y:o.y||44,opacity:0,scale:0.9,filter:"blur(8px)"});
      tl.to(c,{y:0,opacity:1,scale:1,filter:"blur(0px)",duration:o.dur||0.6,ease:o.ease||"expo.out",
        stagger:o.stagger||0.035},at); },
    // hype — per word punch-in overshoot
    'punch-in': function(el,tl,at,o){ o=o||{}; var w=splitWords(el);
      gsap.set(w,{scale:1.6,opacity:0,transformOrigin:"50% 50%"});
      tl.to(w,{scale:1,opacity:1,duration:o.dur||0.32,ease:o.ease||"back.out(2.6)",stagger:o.stagger||0.05},at); },
    // explainer/quote — chars type on
    'typewriter': function(el,tl,at,o){ o=o||{}; var c=splitChars(el);
      gsap.set(c,{opacity:0}); gsap.set(el,{opacity:1});
      tl.to(c,{opacity:1,duration:0.01,stagger:o.stagger||0.045,ease:"none"},at); },
    // sticker-pop — the slam (kept, but now ONE of many, not the default)
    'squash-pop': function(el,tl,at,o){ o=o||{};
      gsap.set(el,{scale:0,opacity:0,transformOrigin:o.origin||"50% 50%"});
      tl.to(el,{scale:1,opacity:1,duration:o.dur||0.42,ease:o.ease||"back.out(3)"},at); },
    // pixel/retro — glitchy jitter in
    'glitch': function(el,tl,at,o){ o=o||{};
      gsap.set(el,{opacity:0,x:-14,skewX:8});
      tl.to(el,{opacity:1,duration:0.06},at);
      tl.to(el,{x:10,skewX:-6,duration:0.05},at+0.06).to(el,{x:-6,skewX:3,duration:0.05},at+0.11)
        .to(el,{x:0,skewX:0,duration:0.08,ease:"power2.out"},at+0.16); },
    // variable-font weight sweep — an invisible cursor crosses the word once;
    // each letter's wght swells as the cursor nears (pressure wave) and relaxes
    // after it passes. REQUIRES a variable font (roboto-flex-variable.ttf).
    // opts: dur(2) minWeight(100) maxWeight(900) falloff(0.5 of text width)
    //       ease("power2.inOut") hold(false — true keeps letters bold after pass)
    'pressure': function(el,tl,at,o){ o=o||{};
      var chars=splitChars(el),
          minW=o.minWeight||100, maxW=o.maxWeight||900,
          dur=o.dur||2, fall=(o.falloff==null?0.5:o.falloff), hold=!!o.hold;
      function setW(s,w){ s.style.fontVariationSettings="'wght' "+Math.round(w); }
      for(var i=0;i<chars.length;i++) setW(chars[i],minW);
      gsap.set(el,{opacity:1});
      // geometry measured lazily on the first update (fonts are loaded by
      // render time; measuring at construction could see pre-font layout).
      var geo=null;
      function measure(){
        var r=el.getBoundingClientRect(), centers=[];
        for(var i=0;i<chars.length;i++){
          var c=chars[i].getBoundingClientRect();
          centers.push(c.left + c.width/2 - r.left);
        }
        return { w:r.width, centers:centers, fallPx:Math.max(1,r.width*fall) };
      }
      var p={t:0};
      tl.to(p,{t:1,duration:dur,ease:o.ease||"power2.inOut",onUpdate:function(){
        if(!geo) geo=measure();
        // cursor sweeps from -fallPx to width+fallPx so edge letters fully
        // relax once it has passed (unless hold keeps them bold)
        var start=-geo.fallPx, end=geo.w+(hold?0:geo.fallPx),
            cx=start+(end-start)*p.t;
        for(var i=0;i<chars.length;i++){
          var w;
          if(hold && geo.centers[i]<=cx){ w=maxW; }
          else {
            var k=Math.min(1, Math.abs(cx-geo.centers[i])/geo.fallPx);
            w=maxW-(maxW-minW)*k;
          }
          setW(chars[i], Math.max(minW, Math.min(maxW, w)));
        }
      }},at); }
  };
  var EXIT = {
    'fade-up': function(el,tl,at,o){ o=o||{}; tl.to(el,{y:-(o.y||14),opacity:0,filter:"blur(5px)",duration:o.dur||0.45,ease:"power2.in"},at); },
    'scale-down': function(el,tl,at,o){ o=o||{}; tl.to(el,{scale:0.92,opacity:0,duration:o.dur||0.4,ease:"power2.in"},at); },
    'pop-out': function(el,tl,at,o){ o=o||{}; tl.to(el,{scale:0,opacity:0,duration:o.dur||0.3,ease:"back.in(2)"},at); },
    'mask-out': function(el,tl,at,o){ o=o||{}; var inner=wrapMask(el); tl.to(inner,{yPercent:-110,duration:o.dur||0.5,ease:"power2.in"},at); }
  };

  window.TextFX = {
    splitChars:splitChars, splitWords:splitWords,
    enter:function(el,tl,at,name,o){ (ENTER[name]||ENTER['rise-blur'])(el,tl,at,o); },
    exit: function(el,tl,at,name,o){ (EXIT[name]||EXIT['fade-up'])(el,tl,at,o); },
    has:function(name){ return !!ENTER[name]; },
    entrances:Object.keys(ENTER), exits:Object.keys(EXIT)
  };
})();
