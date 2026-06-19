
/* captions-pressure.js — karaoke timing drives a variable-font pressure wave.
   The invisible cursor FOLLOWS THE VOICE: it sits on each word through its
   spoken window (whisperX onsets), gliding to the next at the boundary, and
   every word's wght derives from cursor distance — active word fattest.
   Deterministic: proxy tweens on the paused master tl, no rAF/Date/random. */
(function(){
  var DATA = [{"s": 5.467, "e": 6.717, "words": [{"w": "This", "s": 5.467, "e": 5.667}, {"w": "is", "s": 5.667, "e": 5.867}, {"w": "sick.", "s": 5.867, "e": 6.367}]}, {"s": 25.515, "e": 26.646, "words": [{"w": "Are", "s": 25.515, "e": 25.615}, {"w": "you", "s": 25.615, "e": 25.695}, {"w": "gonna", "s": 25.695, "e": 25.895}, {"w": "be", "s": 25.895, "e": 26.035}, {"w": "live?", "s": 26.035, "e": 26.296}]}, {"s": 27.356, "e": 27.916, "words": [{"w": "Of", "s": 27.356, "e": 27.496}, {"w": "course.", "s": 27.496, "e": 27.896}]}, {"s": 27.916, "e": 30.507, "words": [{"w": "I'm", "s": 27.916, "e": 29.577}, {"w": "speed.", "s": 29.577, "e": 30.157}]}, {"s": 31.198, "e": 32.428, "words": [{"w": "I", "s": 31.198, "e": 31.278}, {"w": "need", "s": 31.278, "e": 31.478}, {"w": "to", "s": 31.478, "e": 31.578}, {"w": "be", "s": 31.578, "e": 31.738}, {"w": "live.", "s": 31.738, "e": 32.078}]}, {"s": 39.565, "e": 40.646, "words": [{"w": "Yo,", "s": 39.565, "e": 40.306}, {"w": "I'm...", "s": 40.306, "e": 40.486}]}, {"s": 40.646, "e": 41.447, "words": [{"w": "What's", "s": 40.646, "e": 41.067}, {"w": "up,", "s": 41.067, "e": 41.207}, {"w": "man?", "s": 41.207, "e": 41.427}]}, {"s": 41.447, "e": 42.448, "words": [{"w": "How", "s": 41.447, "e": 41.707}, {"w": "are", "s": 41.707, "e": 41.828}, {"w": "you,", "s": 41.828, "e": 41.988}, {"w": "brother?", "s": 41.988, "e": 42.328}]}, {"s": 42.448, "e": 43.009, "words": [{"w": "I'm", "s": 42.448, "e": 42.608}, {"w": "good.", "s": 42.608, "e": 42.989}]}, {"s": 43.009, "e": 43.149, "words": [{"w": "I'm...", "s": 43.009, "e": 43.129}]}, {"s": 43.149, "e": 43.93, "words": [{"w": "Welcome.", "s": 43.149, "e": 43.79}]}, {"s": 43.93, "e": 44.951, "words": [{"w": "Great", "s": 43.93, "e": 44.17}, {"w": "to", "s": 44.17, "e": 44.33}, {"w": "have", "s": 44.33, "e": 44.47}, {"w": "you", "s": 44.47, "e": 44.631}, {"w": "here.", "s": 44.631, "e": 44.851}]}, {"s": 44.951, "e": 45.732, "words": [{"w": "Thank", "s": 44.951, "e": 45.271}, {"w": "you.", "s": 45.271, "e": 45.452}]}, {"s": 45.732, "e": 46.242, "words": [{"w": "So,", "s": 45.732, "e": 45.892}]}, {"s": 46.653, "e": 47.794, "words": [{"w": "what", "s": 46.653, "e": 46.833}, {"w": "are", "s": 46.833, "e": 46.973}, {"w": "your", "s": 46.973, "e": 47.233}, {"w": "plans", "s": 47.233, "e": 47.654}, {"w": "for", "s": 47.654, "e": 47.774}]}, {"s": 47.794, "e": 48.785, "words": [{"w": "the", "s": 47.794, "e": 47.894}, {"w": "World", "s": 47.894, "e": 48.114}, {"w": "Cup?", "s": 48.114, "e": 48.435}]}, {"s": 50.958, "e": 51.558, "words": [{"w": "I", "s": 50.958, "e": 51.038}, {"w": "guess", "s": 51.038, "e": 51.198}, {"w": "you", "s": 51.198, "e": 51.298}, {"w": "have", "s": 51.298, "e": 51.438}, {"w": "to", "s": 51.438, "e": 51.518}]}, {"s": 51.558, "e": 52.389, "words": [{"w": "wait", "s": 51.558, "e": 51.698}, {"w": "and", "s": 51.698, "e": 51.839}, {"w": "see.", "s": 51.839, "e": 52.039}]}];
  window.mountPressureCaptions = function(tl, opts){
    opts = opts || {};
    var minW = opts.minWeight || 300, maxW = opts.maxWeight || 900,
        fall = opts.falloffWords == null ? 1.15 : opts.falloffWords;
    var root = document.querySelector('[data-composition-id="main"]');
    var holder = document.createElement('div');
    holder.style.cssText = 'position:absolute;left:0;right:0;bottom:'+(opts.bottom||52)+
      'px;height:0;z-index:45;pointer-events:none;';
    root.appendChild(holder);
    DATA.forEach(function(line){
      var el = document.createElement('div');
      el.style.cssText = "position:absolute;bottom:0;left:50%;transform:translateX(-50%);"+
        "font-family:'Roboto Flex',sans-serif;font-size:"+(opts.size||62)+"px;color:#fff;"+
        "white-space:nowrap;letter-spacing:.015em;opacity:0;"+
        "text-shadow:0 3px 16px rgba(0,0,0,.85),0 1px 3px rgba(0,0,0,.9);";
      var spans = [];
      line.words.forEach(function(wd, i){
        var s = document.createElement('span');
        s.style.display = 'inline-block'; s.style.whiteSpace = 'pre';
        s.textContent = wd.w + (i < line.words.length-1 ? ' ' : '');
        s.style.fontVariationSettings = "'wght' " + minW;
        el.appendChild(s); spans.push(s);
      });
      holder.appendChild(el);
      tl.set(el, {opacity:1}, line.s);
      tl.set(el, {opacity:0}, line.e);
      var geo = null;
      function measure(){
        var r = el.getBoundingClientRect();
        var cs = spans.map(function(s){ var b = s.getBoundingClientRect(); return b.left + b.width/2 - r.left; });
        var avg = r.width / Math.max(1, spans.length);
        return { centers: cs, fallPx: Math.max(24, avg * fall) };
      }
      var p = {t:0}, dur = line.e - line.s;
      tl.to(p, {t:1, duration:dur, ease:'none', onUpdate:function(){
        if(!geo) geo = measure();
        var time = line.s + p.t * dur, ws = line.words, cx;
        var mid = function(w){ return (w.s + w.e) / 2; };
        if(time <= mid(ws[0])) cx = geo.centers[0];
        else if(time >= mid(ws[ws.length-1])) cx = geo.centers[ws.length-1];
        else for(var k=0; k<ws.length-1; k++){
          var t0 = mid(ws[k]), t1 = mid(ws[k+1]);
          if(time >= t0 && time <= t1){
            var u = (time - t0) / (t1 - t0); u = u*u*(3-2*u); // smoothstep dwell
            cx = geo.centers[k] + (geo.centers[k+1] - geo.centers[k]) * u; break;
          }
        }
        for(var i=0; i<spans.length; i++){
          var d = Math.abs(cx - geo.centers[i]), kk = Math.min(1, d / geo.fallPx);
          spans[i].style.fontVariationSettings = "'wght' " + Math.round(maxW - (maxW - minW) * kk);
        }
      }}, line.s);
    });
  };
})();
