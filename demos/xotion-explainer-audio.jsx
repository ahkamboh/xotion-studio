// xotion-explainer-audio.jsx — editorial score for the 16:9 Xotion explainer (32s)
class ExplainerSound {
  constructor() { this.events = this.build(); this.liveCtx = null; }

  drone(ctx, when, master, dur, vol, freq) {
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, when);
    out.gain.linearRampToValueAtTime(vol, when + 1.4);
    out.gain.setValueAtTime(vol, when + dur - 1.8);
    out.gain.linearRampToValueAtTime(0, when + dur);
    out.connect(master);
    const o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = freq;
    const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = freq * 2; o2.detune.value = -6;
    const g1 = ctx.createGain(); g1.gain.value = 0.55; const g2 = ctx.createGain(); g2.gain.value = 0.12;
    o1.connect(g1).connect(out); o2.connect(g2).connect(out);
    o1.start(when); o2.start(when); o1.stop(when + dur + 0.1); o2.stop(when + dur + 0.1);
  }
  pad(ctx, when, master, dur, vol, freqs) {
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(vol, when + 0.7);
    env.gain.setValueAtTime(vol, when + dur - 0.8);
    env.gain.linearRampToValueAtTime(0, when + dur);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500; lp.Q.value = 0.6;
    env.connect(lp).connect(master);
    for (const f of freqs) [-8, 8].forEach(det => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
      const g = ctx.createGain(); g.gain.value = 0.11 / freqs.length;
      o.connect(g).connect(env); o.start(when); o.stop(when + dur + 0.1);
    });
  }
  piano(ctx, when, master, vol, freq, tail = 2.0) {
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, when);
    out.gain.linearRampToValueAtTime(vol * 0.5, when + 0.008);
    out.gain.exponentialRampToValueAtTime(0.001, when + tail);
    out.connect(master);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = freq * 7; lp.connect(out);
    [[1, 1], [2, 0.5], [3, 0.22], [4, 0.1]].forEach(([mul, v]) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq * mul;
      const g = ctx.createGain(); g.gain.setValueAtTime(v, when);
      g.gain.exponentialRampToValueAtTime(0.001, when + tail * (mul === 1 ? 1 : 0.6));
      o.connect(g).connect(lp); o.start(when); o.stop(when + tail + 0.05);
    });
  }
  kick(ctx, when, master, vol = 0.5) {
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(130, when);
    o.frequency.exponentialRampToValueAtTime(45, when + 0.12);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.005); g.gain.exponentialRampToValueAtTime(0.001, when + 0.3);
    o.connect(g).connect(master); o.start(when); o.stop(when + 0.32);
  }
  tick(ctx, when, master, vol = 0.14, freq = 1400) {
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = freq;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.001); g.gain.exponentialRampToValueAtTime(0.001, when + 0.04);
    o.connect(g).connect(master); o.start(when); o.stop(when + 0.05);
  }
  whoosh(ctx, when, master, vol = 0.4) {
    const len = Math.floor(ctx.sampleRate * 0.5); const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.1;
    bp.frequency.setValueAtTime(200, when); bp.frequency.exponentialRampToValueAtTime(3800, when + 0.4);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol * 0.35, when + 0.22); g.gain.exponentialRampToValueAtTime(0.001, when + 0.5);
    src.connect(bp).connect(g).connect(master); src.start(when);
  }

  build() {
    const ev = []; const add = (t, fn) => ev.push({ t, fn: fn.bind(this) });
    // Sub drone whole piece (A1)
    add(0.0, (c, w, m) => this.drone(c, w, m, 32.0, 0.17, 55));
    // Pads per scene (Am family)
    add(0.0,  (c, w, m) => this.pad(c, w, m, 5.2, 0.10, [220, 261.6, 329.6]));
    add(5.0,  (c, w, m) => this.pad(c, w, m, 5.2, 0.12, [196, 233, 293.7]));   // problem (darker)
    add(10.0, (c, w, m) => this.pad(c, w, m, 6.7, 0.12, [261.6, 329.6, 392]));  // prompt (lift)
    add(16.5, (c, w, m) => this.pad(c, w, m, 5.7, 0.12, [220, 277.2, 329.6]));  // team
    add(22.0, (c, w, m) => this.pad(c, w, m, 5.2, 0.12, [261.6, 329.6, 392]));  // make (bright)
    add(27.0, (c, w, m) => this.pad(c, w, m, 5.0, 0.16, [220, 329.6, 440]));    // kicker resolve
    // Soft kick pulse from scene 3 on (every 1.2s)
    for (let i = 0; i < 16; i++) { const t = 10.0 + i * 1.2; if (t > 26.5) break; add(t, (c, w, m) => this.kick(c, w, m, 0.4)); }
    // Scene-impact piano + whoosh
    [[0.6, 392], [5.0, 261.6], [10.0, 329.6], [16.5, 277.2], [22.0, 392], [27.0, 220]].forEach(([t, f]) => {
      add(t - 0.15, (c, w, m) => this.whoosh(c, w, m, 0.42));
      add(t, (c, w, m) => this.piano(c, w, m, 0.5, f, 2.2));
    });
    // Typing ticks during scene 3 prompt (10.6 → 12.2)
    for (let i = 0; i < 12; i++) add(10.6 + i * 0.13, (c, w, m) => this.tick(c, w, m, 0.12, 1300 + i * 40));
    // Kicker resolve stack
    add(27.0, (c, w, m) => this.piano(c, w, m, 0.55, 220, 3.2));
    add(27.0, (c, w, m) => this.piano(c, w, m, 0.34, 329.6, 2.8));
    add(28.2, (c, w, m) => this.piano(c, w, m, 0.4, 293.7, 2.6));
    return ev.sort((a, b) => a.t - b.t);
  }

  start(fromTime = 0) {
    this.stop();
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain(); master.gain.value = 0.72;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -13; comp.ratio.value = 3.5;
    master.connect(comp).connect(ctx.destination);
    const startAt = ctx.currentTime + 0.06;
    for (const e of this.events) if (e.t >= fromTime && e.t < 32) e.fn(ctx, startAt + (e.t - fromTime), master);
    this.liveCtx = ctx;
  }
  stop() { if (this.liveCtx) { try { this.liveCtx.close(); } catch (_) {} this.liveCtx = null; } }
  async renderOffline(duration = 32, sampleRate = 48000) {
    const ctx = new OfflineAudioContext(2, Math.ceil(sampleRate * duration), sampleRate);
    const master = ctx.createGain(); master.gain.value = 0.72;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -13; comp.ratio.value = 3.5;
    master.connect(comp).connect(ctx.destination);
    for (const e of this.events) if (e.t < duration) e.fn(ctx, e.t, master);
    return ctx.startRendering();
  }
}
window.ExplainerSound = ExplainerSound;
