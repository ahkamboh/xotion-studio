// xotion-explainer-scenes.jsx
// 16:9 (1920×1080) product explainer — "What is Xotion?"
// Editorial Brutalist brand (matches the Xotion landing page).

const XW = 1920;
const XH = 1080;

const XC = {
  bg:      '#f4f0e6',
  bgDark:  '#0e0d0c',
  ink:     '#0e0d0c',
  inkDim:  '#6b6458',
  cream:   '#f4f0e6',
  creamDim:'rgba(244,240,230,0.55)',
  accent:  '#e0451f',
  green:   '#1f8a5b',
  rule:    'rgba(14,13,12,0.16)',
  ruleDark:'rgba(244,240,230,0.16)',
  ide:     '#1a1816',
};

const XSERIF = '"Fraunces", "Times New Roman", serif';
const XSANS  = '"Inter Tight", "Inter", system-ui, sans-serif';
const XMONO  = '"JetBrains Mono", ui-monospace, monospace';

// ─── Paper / texture ────────────────────────────────────────────────────────
function XPaper({ dark = false }) {
  const time = useTime();
  const drift = 1 + (time % 4) * 0.008;
  return (
    <div style={{ position: 'absolute', inset: 0, background: dark ? XC.bgDark : XC.bg, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0, transform: `scale(${drift})`, transformOrigin: 'center',
        opacity: dark ? 0.10 : 0.06,
        backgroundImage:
          'radial-gradient(circle at 15% 20%, rgba(0,0,0,0.5) 0, transparent 55%),' +
          'radial-gradient(circle at 85% 80%, rgba(0,0,0,0.5) 0, transparent 50%)',
        mixBlendMode: 'multiply',
      }}/>
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.05,
        backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.5) 0 1px, transparent 1px 3px)',
        mixBlendMode: dark ? 'screen' : 'multiply',
      }}/>
    </div>
  );
}

// ─── Magazine chrome (16:9) ─────────────────────────────────────────────────
function XChrome({ step, label, dark = false }) {
  const time = useTime();
  const fade = Easing.easeOutCubic(clamp(time / 0.5, 0, 1));
  const ink = dark ? XC.cream : XC.ink;
  const dim = dark ? XC.creamDim : XC.inkDim;
  const rule = dark ? XC.ruleDark : XC.rule;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: fade, fontFamily: XMONO, pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute', top: 56, left: 72, display: 'flex', alignItems: 'center', gap: 14,
        fontSize: 18, letterSpacing: '0.20em', textTransform: 'uppercase', fontWeight: 600, color: dim,
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" style={{ display: 'block', flex: '0 0 auto' }}><rect width="24" height="24" rx="6" fill={XC.accent}/><path d="M9.5 7 L18 12 L9.5 17 Z" fill={XC.cream}/></svg>
        <span style={{ color: ink, fontWeight: 700 }}>Xotion</span>
        <span style={{ opacity: 0.6 }}>/ the prompt-native editor</span>
      </div>
      <div style={{
        position: 'absolute', top: 56, right: 72, fontSize: 18, letterSpacing: '0.20em',
        textTransform: 'uppercase', fontWeight: 600, color: dim,
      }}>
        <span style={{ color: ink, fontWeight: 700 }}>{step}</span> / 06
      </div>
      <div style={{ position: 'absolute', left: 72, right: 72, bottom: 64, height: 1, background: rule }}/>
      <div style={{
        position: 'absolute', left: 72, right: 72, bottom: 34, display: 'flex',
        justifyContent: 'space-between', fontSize: 16, letterSpacing: '0.18em',
        textTransform: 'uppercase', color: dim,
      }}>
        <span>{label}</span><span>describe the edit · get the video</span>
      </div>
    </div>
  );
}

// letter-by-letter line
function XLine({ text, delay, size, color, italic = false, weight = 900, font = XSERIF, ls = '-0.04em', lh = 0.95 }) {
  const { localTime } = useSprite();
  return (
    <div style={{ fontFamily: font, fontWeight: weight, fontSize: size, lineHeight: lh,
      letterSpacing: ls, color, fontStyle: italic ? 'italic' : 'normal' }}>
      {text.split('').map((ch, i) => {
        const t = clamp((localTime - delay - i * 0.02) / 0.4, 0, 1);
        const e = Easing.easeOutBack(t);
        return <span key={i} style={{ display: 'inline-block', opacity: t,
          transform: `translateY(${(1 - e) * 30}px)` }}>{ch === ' ' ? '\u00A0' : ch}</span>;
      })}
    </div>
  );
}

function Fade({ delay = 0, dist = 16, children, style }) {
  const { localTime } = useSprite();
  const t = Easing.easeOutCubic(clamp((localTime - delay) / 0.6, 0, 1));
  return <div style={{ ...style, opacity: t, transform: `translateY(${(1 - t) * dist}px)` }}>{children}</div>;
}

// ─── Scene 1 — Title ────────────────────────────────────────────────────────
function XSceneTitle() {
  const { localTime } = useSprite();
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <XPaper />
      <XChrome step="01" label="What is Xotion" />
      <div style={{ position: 'absolute', left: 120, top: 300, right: 120 }}>
        <Fade delay={0.1} style={{ marginBottom: 30 }}>
          <div style={{ fontFamily: XMONO, fontSize: 24, letterSpacing: '0.22em', textTransform: 'uppercase',
            color: XC.accent, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ width: 28, height: 1, background: XC.accent }}/>
            The prompt-native video editor
          </div>
        </Fade>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 0 }}>
          <XLine text="X" delay={0.3} size={300} color={XC.accent} italic />
          <XLine text="otion" delay={0.45} size={300} color={XC.ink} />
        </div>
        <Fade delay={1.3} style={{ marginTop: 20 }}>
          <div style={{ fontFamily: XSERIF, fontStyle: 'italic', fontWeight: 700, fontSize: 92,
            color: XC.ink, letterSpacing: '-0.03em', lineHeight: 1 }}>
            Describe the edit. <span style={{ color: XC.accent }}>Get the video.</span>
          </div>
        </Fade>
        <Fade delay={1.9} style={{ marginTop: 36 }}>
          <div style={{ fontFamily: XSANS, fontWeight: 400, fontSize: 36, color: XC.inkDim,
            lineHeight: 1.4, maxWidth: 1100 }}>
            No timeline scrubbing. No keyframing. <span style={{ color: XC.ink, fontWeight: 500 }}>Just a prompt</span> — and a
            team of agents that produces it, checks its own work, and ships it.
          </div>
        </Fade>
      </div>
    </div>
  );
}

// ─── Scene 2 — The old way ──────────────────────────────────────────────────
function XSceneProblem() {
  const { localTime } = useSprite();
  const pains = [
    { k: 'Timeline scrubbing', v: 'drag · trim · nudge · repeat' },
    { k: 'Manual keyframing', v: 'every property, every frame' },
    { k: 'Per-render fees', v: 'the meter is always running' },
    { k: 'Tool sprawl', v: 'AE · Premiere · 6 plugins' },
  ];
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <XPaper />
      <XChrome step="02" label="The old way" />
      <div style={{ position: 'absolute', left: 120, top: 230, right: 120,
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 120px', alignItems: 'start' }}>
        <div>
          <Fade delay={0.1}>
            <div style={{ fontFamily: XMONO, fontSize: 24, letterSpacing: '0.22em', textTransform: 'uppercase',
              color: XC.accent, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ width: 28, height: 1, background: XC.accent }}/> Editing is slow
            </div>
          </Fade>
          <XLine text="Hours of" delay={0.3} size={150} color={XC.ink} />
          <XLine text="dragging clips." delay={0.6} size={150} color={XC.ink} italic />
          <Fade delay={1.6} style={{ marginTop: 36 }}>
            <div style={{ fontFamily: XSANS, fontSize: 34, color: XC.inkDim, lineHeight: 1.4, maxWidth: 720 }}>
              Professional tools have steep learning curves. Simple tools lack flexibility.
              <span style={{ color: XC.ink, fontWeight: 500 }}> You lose the afternoon either way.</span>
            </div>
          </Fade>
        </div>
        <div style={{ marginTop: 40 }}>
          {pains.map((p, i) => {
            const t = clamp((localTime - 0.8 - i * 0.18) / 0.5, 0, 1);
            const e = Easing.easeOutCubic(t);
            return (
              <div key={p.k} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                gap: 24, padding: '24px 0', borderBottom: `1px solid ${XC.rule}`,
                opacity: t, transform: `translateX(${(1 - e) * 30}px)` }}>
                <div>
                  <div style={{ fontFamily: XSERIF, fontWeight: 700, fontSize: 46, color: XC.ink,
                    letterSpacing: '-0.02em', lineHeight: 1 }}>{p.k}</div>
                  <div style={{ fontFamily: XMONO, fontSize: 18, color: XC.inkDim, letterSpacing: '0.08em',
                    marginTop: 8 }}>{p.v}</div>
                </div>
                <div style={{ fontFamily: XSERIF, fontStyle: 'italic', fontWeight: 900, fontSize: 56,
                  color: XC.accent, lineHeight: 1 }}>✕</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Scene 3 — The shift (prompt → output) ──────────────────────────────────
function XScenePrompt() {
  const { localTime } = useSprite();
  const typed = 'make a 30s explainer on our launch, female VO, stock b-roll + animated stats';
  const chars = Math.floor(clamp((localTime - 0.6) / 1.6, 0, 1) * typed.length);
  const showOut = localTime > 2.4;
  const steps = ['script', 'voiceover', 'b-roll', 'motion', 'captions', 'mix', 'QA', 'ship'];
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <XPaper dark />
      <XChrome step="03" label="The shift" dark />
      <div style={{ position: 'absolute', left: 120, top: 210, right: 120 }}>
        <Fade delay={0.1}>
          <div style={{ fontFamily: XMONO, fontSize: 24, letterSpacing: '0.22em', textTransform: 'uppercase',
            color: XC.accent, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ width: 28, height: 1, background: XC.accent }}/> You just prompt
          </div>
        </Fade>
        {/* prompt box */}
        <div style={{ marginTop: 28, background: XC.ide, border: `1px solid ${XC.ruleDark}`,
          borderRadius: 12, padding: '32px 36px', maxWidth: 1400 }}>
          <div style={{ fontFamily: XMONO, fontSize: 20, color: XC.creamDim, letterSpacing: '0.06em', marginBottom: 16 }}>
            <span style={{ color: XC.green }}>~/projects/launch</span> $ xotion
          </div>
          <div style={{ fontFamily: XSERIF, fontSize: 56, color: XC.cream, lineHeight: 1.25, fontWeight: 500 }}>
            <span style={{ color: XC.accent }}>&gt; </span>{typed.slice(0, chars)}
            <span style={{ opacity: (Math.floor(localTime * 2) % 2) ? 1 : 0.2, color: XC.accent }}>▋</span>
          </div>
        </div>
        {/* pipeline chips */}
        <div style={{ marginTop: 40, display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', opacity: showOut ? 1 : 0,
          transition: 'opacity 0.4s' }}>
          {steps.map((s, i) => {
            const t = clamp((localTime - 2.6 - i * 0.12) / 0.4, 0, 1);
            const done = localTime > 2.6 + i * 0.12 + 0.5;
            return (
              <React.Fragment key={s}>
                <div style={{ fontFamily: XMONO, fontSize: 22, letterSpacing: '0.10em', textTransform: 'uppercase',
                  padding: '12px 18px', borderRadius: 8,
                  border: `1px solid ${done ? XC.green : XC.ruleDark}`,
                  color: done ? XC.green : XC.creamDim, fontWeight: 600,
                  opacity: t, transform: `translateY(${(1 - Easing.easeOutBack(t)) * 16}px)`,
                  display: 'flex', alignItems: 'center', gap: 10 }}>
                  {done && <span>✓</span>}{s}
                </div>
                {i < steps.length - 1 && <span style={{ color: XC.creamDim, opacity: t }}>→</span>}
              </React.Fragment>
            );
          })}
        </div>
        <Fade delay={4.0} style={{ marginTop: 40 }}>
          <div style={{ fontFamily: XSANS, fontSize: 34, color: XC.creamDim, lineHeight: 1.4 }}>
            It plans the shot list, writes the script, voices it, pulls the footage, animates the graphics
            in sync with the words, mixes audio, and <span style={{ color: XC.cream, fontWeight: 500 }}>verifies every frame.</span>
          </div>
        </Fade>
      </div>
    </div>
  );
}

// ─── Scene 4 — The agent team ───────────────────────────────────────────────
function XSceneTeam() {
  const { localTime } = useSprite();
  const cols = [
    { h: 'Pre-prod', items: ['scriptwriter', 'art-director', 'stock-scout', 'audio-engineer'] },
    { h: 'Production', items: ['sync-master', 'motion-builder', 'editor', 'captioner'] },
    { h: 'QA gates', items: ['proofreader', 'colorist', 'qa-audio', 'qa-visual'], gate: true },
    { h: 'Ship', items: ['delivery'], ship: true },
  ];
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <XPaper />
      <XChrome step="04" label="Why it doesn't make mistakes" />
      <div style={{ position: 'absolute', left: 120, top: 200, right: 120 }}>
        <Fade delay={0.1}>
          <div style={{ fontFamily: XMONO, fontSize: 24, letterSpacing: '0.22em', textTransform: 'uppercase',
            color: XC.accent, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ width: 28, height: 1, background: XC.accent }}/> A team of agents, with QA gates
          </div>
        </Fade>
        <div style={{ marginTop: 18 }}>
          <XLine text="Not one model winging it." delay={0.3} size={104} color={XC.ink} />
        </div>
        <div style={{ marginTop: 56, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
          {cols.map((c, ci) => {
            const t = clamp((localTime - 0.9 - ci * 0.22) / 0.5, 0, 1);
            const e = Easing.easeOutCubic(t);
            return (
              <div key={c.h} style={{ opacity: t, transform: `translateY(${(1 - e) * 30}px)`,
                border: `1px solid ${c.gate ? XC.accent : XC.rule}`,
                background: c.ship ? XC.ink : (c.gate ? 'rgba(224,69,31,0.06)' : 'transparent'),
                borderRadius: 10, padding: '24px 22px', minHeight: 360 }}>
                <div style={{ fontFamily: XMONO, fontSize: 19, letterSpacing: '0.16em', textTransform: 'uppercase',
                  fontWeight: 700, color: c.ship ? XC.cream : (c.gate ? XC.accent : XC.inkDim), marginBottom: 20 }}>
                  {c.gate && '◆ '}{c.h}
                </div>
                {c.items.map((it, ii) => {
                  const it_t = clamp((localTime - 1.2 - ci * 0.22 - ii * 0.08) / 0.4, 0, 1);
                  return (
                    <div key={it} style={{ fontFamily: XSERIF, fontWeight: 700, fontSize: 36,
                      letterSpacing: '-0.02em', lineHeight: 1.25,
                      color: c.ship ? XC.cream : XC.ink, opacity: it_t }}>{it}</div>
                  );
                })}
                {c.gate && (
                  <div style={{ fontFamily: XMONO, fontSize: 16, color: XC.accent, marginTop: 18,
                    letterSpacing: '0.08em', opacity: clamp((localTime - 2.0) / 0.5, 0, 1) }}>
                    nothing ships<br/>until it passes
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Scene 5 — What you can make ────────────────────────────────────────────
function XSceneMake() {
  const { localTime } = useSprite();
  const pillars = [
    { n: '01', h: 'Motion graphics', e: 'HyperFrames', items: 'explainers · kinetic type · animated data · lyric videos' },
    { n: '02', h: 'Video editing', e: 'FFmpeg', items: 'trim · split-screen · grade · green-screen · reels · auto-cut' },
    { n: '03', h: 'Image editing', e: 'ImageMagick', items: 'resize · compose · bg removal · thumbnails · social graphics' },
  ];
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <XPaper />
      <XChrome step="05" label="Three pillars" />
      <div style={{ position: 'absolute', left: 120, top: 220, right: 120 }}>
        <Fade delay={0.1}>
          <div style={{ fontFamily: XMONO, fontSize: 24, letterSpacing: '0.22em', textTransform: 'uppercase',
            color: XC.accent, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ width: 28, height: 1, background: XC.accent }}/> What you can make
          </div>
        </Fade>
        <div style={{ marginTop: 18 }}>
          <XLine text="One prompt. Any format." delay={0.3} size={110} color={XC.ink} italic />
        </div>
        <div style={{ marginTop: 56, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28 }}>
          {pillars.map((p, i) => {
            const t = clamp((localTime - 0.9 - i * 0.2) / 0.5, 0, 1);
            const e = Easing.easeOutCubic(t);
            return (
              <div key={p.n} style={{ opacity: t, transform: `translateY(${(1 - e) * 34}px)`,
                borderTop: `3px solid ${XC.accent}`, paddingTop: 28 }}>
                <div style={{ fontFamily: XMONO, fontSize: 20, color: XC.inkDim, letterSpacing: '0.16em' }}>
                  {p.n} · {p.e}
                </div>
                <div style={{ fontFamily: XSERIF, fontWeight: 900, fontSize: 64, color: XC.ink,
                  letterSpacing: '-0.03em', lineHeight: 1, marginTop: 16 }}>{p.h}</div>
                <div style={{ fontFamily: XSANS, fontSize: 28, color: XC.inkDim, lineHeight: 1.5, marginTop: 20 }}>
                  {p.items}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Scene 6 — Kicker ───────────────────────────────────────────────────────
function XSceneKicker() {
  const { localTime } = useSprite();
  const lineA = Easing.easeOutBack(clamp((localTime - 0.3) / 0.7, 0, 1));
  const lineB = Easing.easeOutBack(clamp((localTime - 1.1) / 0.7, 0, 1));
  const ruleT = Easing.easeOutCubic(clamp((localTime - 2.0) / 0.7, 0, 1));
  const tail  = clamp((localTime - 2.6) / 0.7, 0, 1);
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <XPaper dark />
      <XChrome step="06" label="Cursor for editors" dark />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 320, textAlign: 'center' }}>
        <div style={{ fontFamily: XSERIF, fontWeight: 900, fontSize: 180, color: XC.cream,
          letterSpacing: '-0.04em', lineHeight: 0.98 }}>
          <div style={{ opacity: lineA, transform: `translateY(${(1 - lineA) * 30}px)` }}>Cursor for</div>
          <div style={{ opacity: lineB, transform: `translateY(${(1 - lineB) * 30}px)`, fontStyle: 'italic', color: XC.accent }}>editors.</div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 360, right: 360, top: 800, height: 2, background: XC.accent,
        opacity: 0.7, transformOrigin: 'center', transform: `scaleX(${ruleT})` }}/>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 850, textAlign: 'center',
        fontFamily: XSANS, fontWeight: 400, fontSize: 40, color: XC.creamDim, lineHeight: 1.4,
        opacity: tail, transform: `translateY(${(1 - tail) * 20}px)` }}>
        Offline. No API keys. <span style={{ color: XC.cream, fontWeight: 500 }}>No per-render fees.</span>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 940, textAlign: 'center',
        fontFamily: XMONO, fontSize: 24, letterSpacing: '0.24em', textTransform: 'uppercase',
        color: XC.accent, fontWeight: 700, opacity: clamp((localTime - 3.4) / 0.6, 0, 1) }}>
        Xotion · describe the edit, get the video
      </div>
    </div>
  );
}

// ─── Root ───────────────────────────────────────────────────────────────────
function XotionExplainer() {
  return (
    <>
      <Sprite start={0.0}  end={5.0}>   <XSceneTitle/>   </Sprite>
      <Sprite start={5.0}  end={10.0}>  <XSceneProblem/> </Sprite>
      <Sprite start={10.0} end={16.5}>  <XScenePrompt/>  </Sprite>
      <Sprite start={16.5} end={22.0}>  <XSceneTeam/>    </Sprite>
      <Sprite start={22.0} end={27.0}>  <XSceneMake/>    </Sprite>
      <Sprite start={27.0} end={32.0}>  <XSceneKicker/>  </Sprite>
    </>
  );
}

Object.assign(window, { XotionExplainer, XW, XH });
