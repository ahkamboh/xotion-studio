// scenes.jsx
// Scene components for the 15s "real cost of scaling AI" video.

const W = 1080;
const H = 1920;

// Palette
const C = {
  bg: '#f4f0e6',         // warm cream paper
  bgDark: '#0e0d0c',     // deep ink
  ink: '#0e0d0c',        // primary text
  inkDim: '#6b6458',     // dim text on cream
  cream: '#f4f0e6',      // text on dark
  accent: '#e0451f',     // arrest-red accent
  accent2: '#1a3a2e',    // deep money green
  rule: 'rgba(14,13,12,0.18)',
};

const SERIF = '"Fraunces", "Times New Roman", serif';
const SANS = '"Inter Tight", "Inter", system-ui, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';

// ─── Background paper / grain ───────────────────────────────────────────────
function Paper({ dark = false }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: dark ? C.bgDark : C.bg,
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        opacity: dark ? 0.10 : 0.06,
        backgroundImage:
          'radial-gradient(circle at 12% 18%, rgba(0,0,0,0.5) 0, transparent 60%),' +
          'radial-gradient(circle at 88% 82%, rgba(0,0,0,0.5) 0, transparent 55%)',
        mixBlendMode: 'multiply',
      }}/>
      <div style={{
        position: 'absolute', inset: 0,
        opacity: 0.05,
        backgroundImage:
          'repeating-linear-gradient(0deg, rgba(0,0,0,0.5) 0 1px, transparent 1px 3px)',
        mixBlendMode: dark ? 'screen' : 'multiply',
      }}/>
    </div>
  );
}

// ─── Top chrome: small label and frame number ───────────────────────────────
function Chrome({ stepLabel, total = '06', current = '01', dark = false }) {
  const time = useTime();
  const fade = Easing.easeOutCubic(clamp(time / 0.5, 0, 1));
  const color = dark ? C.cream : C.ink;
  return (
    <div style={{
      position: 'absolute', inset: 0, opacity: fade,
      fontFamily: MONO, color,
    }}>
      {/* top-left mark */}
      <div style={{
        position: 'absolute', top: 64, left: 64,
        display: 'flex', alignItems: 'center', gap: 14,
        fontSize: 22, letterSpacing: '0.18em', textTransform: 'uppercase',
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" style={{ display: 'block', flex: '0 0 auto' }}><rect width="24" height="24" rx="6" fill={C.accent}/><path d="M9.5 7 L18 12 L9.5 17 Z" fill={C.cream}/></svg>
        <div style={{ fontWeight: 600 }}>FIELD&nbsp;NOTES</div>
        <div style={{ opacity: 0.5 }}>/ &nbsp;ISSUE 014</div>
      </div>

      {/* top-right step */}
      <div style={{
        position: 'absolute', top: 64, right: 64,
        fontSize: 22, letterSpacing: '0.18em', textTransform: 'uppercase',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ opacity: 0.55 }}>{stepLabel}</span>
        <span style={{ opacity: 0.55 }}>·</span>
        <span style={{ fontWeight: 600 }}>{current}</span>
        <span style={{ opacity: 0.55 }}>/ {total}</span>
      </div>

      {/* bottom rule */}
      <div style={{
        position: 'absolute', left: 64, right: 64, bottom: 80,
        height: 1, background: dark ? 'rgba(244,240,230,0.25)' : C.rule,
      }}/>
      <div style={{
        position: 'absolute', left: 64, right: 64, bottom: 36,
        display: 'flex', justifyContent: 'space-between',
        fontSize: 20, letterSpacing: '0.16em', textTransform: 'uppercase',
        opacity: 0.55,
      }}>
        <span>The real cost of scale</span>
        <span>2026</span>
      </div>
    </div>
  );
}

// ─── Scene 1 — Title hook ───────────────────────────────────────────────────
function SceneTitle() {
  const { localTime } = useSprite();
  // Letter-by-letter for the bold line
  const line1 = 'The real';
  const line2 = 'cost of scaling';
  const line3 = 'an AI product.';

  const Letter = ({ ch, delay }) => {
    const t = clamp((localTime - delay) / 0.35, 0, 1);
    const e = Easing.easeOutBack(t);
    return (
      <span style={{
        display: 'inline-block',
        opacity: t,
        transform: `translateY(${(1 - e) * 40}px)`,
        willChange: 'transform, opacity',
      }}>{ch === ' ' ? '\u00A0' : ch}</span>
    );
  };

  const Line = ({ text, startDelay, size, weight = 700, color = C.ink, italic = false, font = SERIF }) => {
    const chars = text.split('');
    return (
      <div style={{
        fontFamily: font, fontWeight: weight, fontSize: size,
        lineHeight: 0.95, letterSpacing: '-0.03em',
        color, fontStyle: italic ? 'italic' : 'normal',
      }}>
        {chars.map((ch, i) => (
          <Letter key={i} ch={ch} delay={startDelay + i * 0.025} />
        ))}
      </div>
    );
  };

  // kicker fade
  const kT = clamp(localTime / 0.4, 0, 1);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Paper />
      <Chrome stepLabel="OPENING" current="01" />

      {/* big eyebrow */}
      <div style={{
        position: 'absolute', left: 64, top: 380,
        fontFamily: MONO, fontSize: 26, letterSpacing: '0.2em',
        textTransform: 'uppercase', color: C.accent, fontWeight: 600,
        opacity: kT,
        transform: `translateX(${(1 - kT) * -24}px)`,
      }}>
        ▸ A study in burn rates
      </div>

      <div style={{
        position: 'absolute', left: 64, top: 470, right: 64,
      }}>
        <Line text={line1} startDelay={0.10} size={180} italic />
        <Line text={line2} startDelay={0.40} size={180} />
        <Line text={line3} startDelay={0.85} size={180} color={C.accent} italic />
      </div>

      {/* lower question */}
      <div style={{
        position: 'absolute', left: 64, right: 64, bottom: 220,
        fontFamily: SANS, fontWeight: 500, fontSize: 42,
        color: C.inkDim, letterSpacing: '-0.01em', lineHeight: 1.25,
        opacity: clamp((localTime - 1.4) / 0.5, 0, 1),
      }}>
        Three numbers from the last quarter
        that changed how we ship.
      </div>
    </div>
  );
}

// ─── Stat card frame ────────────────────────────────────────────────────────
// reusable layout for scenes 2–4
function StatLayout({ index, label, sub, dark = false, children, stepLabel }) {
  const { localTime } = useSprite();
  const eyebrowT = Easing.easeOutCubic(clamp(localTime / 0.4, 0, 1));
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Paper dark={dark} />
      <Chrome stepLabel={stepLabel} current={index} dark={dark} />

      <div style={{
        position: 'absolute', left: 64, top: 250, right: 64,
        opacity: eyebrowT,
        transform: `translateY(${(1 - eyebrowT) * 16}px)`,
      }}>
        <div style={{
          fontFamily: MONO, fontSize: 26, letterSpacing: '0.2em',
          textTransform: 'uppercase', color: C.accent, fontWeight: 600,
        }}>
          ▸ {sub}
        </div>
        <div style={{
          fontFamily: SERIF, fontWeight: 800, fontSize: 200,
          color: dark ? C.cream : C.ink,
          letterSpacing: '-0.045em', lineHeight: 0.9,
          marginTop: 22,
        }}>
          {label}
        </div>
      </div>

      {children}
    </div>
  );
}

// Animated counting number
function CountUp({ from, to, duration, prefix = '', suffix = '', style, decimals = 0 }) {
  const { localTime } = useSprite();
  const t = Easing.easeOutCubic(clamp(localTime / duration, 0, 1));
  const v = from + (to - from) * t;
  const txt = decimals
    ? v.toFixed(decimals)
    : Math.round(v).toLocaleString();
  return <span style={style}>{prefix}{txt}{suffix}</span>;
}

// ─── Scene 2 — Grok Build $300 ──────────────────────────────────────────────
function SceneGrok() {
  const { localTime } = useSprite();
  const tagT = Easing.easeOutBack(clamp((localTime - 0.4) / 0.6, 0, 1));
  const stampT = clamp((localTime - 1.4) / 0.5, 0, 1);
  return (
    <StatLayout
      index="02" stepLabel="DATA · 01 OF 03"
      sub="x · 2026 launch costs"
      label={<>GROK<br/>BUILD.</>}
    >
      {/* huge price tag */}
      <div style={{
        position: 'absolute', left: 0, right: 0,
        top: 950,
        display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 14,
        opacity: tagT,
        transform: `translateY(${(1 - tagT) * 60}px) rotate(${(1 - tagT) * -3}deg)`,
        transformOrigin: 'center bottom',
      }}>
        <div style={{
          fontFamily: SERIF, fontWeight: 800, fontSize: 140,
          color: C.ink, lineHeight: 1, letterSpacing: '-0.04em',
          alignSelf: 'flex-start', marginTop: 60,
        }}>$</div>
        <div style={{
          fontFamily: SERIF, fontWeight: 900, fontSize: 440,
          color: C.ink, lineHeight: 0.85, letterSpacing: '-0.06em',
          fontVariantNumeric: 'tabular-nums',
        }}>
          <CountUp from={0} to={300} duration={1.2} />
        </div>
        <div style={{
          fontFamily: SERIF, fontWeight: 900, fontSize: 200,
          color: C.ink, lineHeight: 0.85, letterSpacing: '-0.04em',
          alignSelf: 'flex-end', marginBottom: 0,
        }}>M</div>
      </div>

      {/* USD label under the figure */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 1480,
        textAlign: 'center',
        fontFamily: MONO, fontSize: 26, fontWeight: 700,
        color: C.inkDim, letterSpacing: '0.32em',
        opacity: clamp((localTime - 1.0) / 0.4, 0, 1),
      }}>
        — &nbsp;USD &nbsp;—
      </div>

      {/* stamp */}
      <div style={{
        position: 'absolute', right: 90, top: 900,
        opacity: stampT,
        transform: `rotate(-8deg) scale(${0.8 + 0.2 * Easing.easeOutBack(stampT)})`,
        border: `4px solid ${C.accent}`,
        color: C.accent,
        fontFamily: MONO, fontSize: 26, fontWeight: 700,
        letterSpacing: '0.18em', padding: '14px 22px',
        textTransform: 'uppercase',
      }}>
        per&nbsp;quarter
      </div>

      {/* footnote */}
      <div style={{
        position: 'absolute', left: 64, right: 64, bottom: 200,
        fontFamily: SANS, fontWeight: 500, fontSize: 42,
        color: C.inkDim, letterSpacing: '-0.01em', lineHeight: 1.25,
        opacity: clamp((localTime - 1.5) / 0.5, 0, 1),
      }}>
        compute, talent, &amp; the long tail
        <span style={{ color: C.ink, fontWeight: 700 }}> of demos that never shipped.</span>
      </div>
    </StatLayout>
  );
}

// ─── Scene 3 — Cursor $1000× ────────────────────────────────────────────────
function SceneCursor() {
  const { localTime } = useSprite();
  const numT = clamp((localTime - 0.3) / 1.5, 0, 1);
  // multiplier ticks up fast
  const v = Math.round(1000 * Easing.easeOutQuart(numT));
  const xPulse = 1 + 0.06 * Math.sin(localTime * 6) * Math.max(0, 1 - (localTime - 1.5));
  return (
    <StatLayout
      index="03" stepLabel="DATA · 02 OF 03"
      sub="y · token spend, vs. last year"
      label={<>CURSOR<br/>OPS.</>}
      dark
    >
      {/* big multiplier — sized to fit 1080 canvas with margins */}
      <div style={{
        position: 'absolute', left: 0, right: 0,
        top: 1020,
        display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8,
      }}>
        <div style={{
          fontFamily: SERIF, fontWeight: 900, fontSize: 340,
          color: C.cream, lineHeight: 0.85, letterSpacing: '-0.05em',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {v.toLocaleString()}
        </div>
        <div style={{
          fontFamily: SERIF, fontStyle: 'italic',
          fontWeight: 800, fontSize: 300,
          color: C.accent, lineHeight: 0.85, letterSpacing: '-0.06em',
          transform: `scale(${xPulse})`, transformOrigin: 'left bottom',
        }}>×</div>
      </div>

      {/* caption under the figure */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 1430,
        textAlign: 'center',
        fontFamily: SANS, fontWeight: 500, fontSize: 38,
        color: 'rgba(244,240,230,0.65)',
        letterSpacing: '-0.01em', lineHeight: 1.2,
        opacity: clamp((localTime - 1.0) / 0.5, 0, 1),
      }}>
        tokens billed,&nbsp; <span style={{ color: C.cream, fontWeight: 700 }}>2025 → 2026</span>
      </div>

      {/* growth bar */}
      <div style={{
        position: 'absolute', left: 64, right: 64, top: 1620, height: 64,
      }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: '100%',
          border: `2px solid ${C.cream}`, opacity: 0.25,
        }}/>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${Easing.easeOutCubic(clamp(localTime / 1.6, 0, 1)) * 100}%`,
          background: C.accent,
        }}/>
        <div style={{
          position: 'absolute', left: 20, top: '50%',
          transform: 'translateY(-50%)',
          fontFamily: MONO, fontSize: 22, fontWeight: 700,
          color: C.cream, letterSpacing: '0.16em',
        }}>
          TOKEN BURN&nbsp;·&nbsp;YOY
        </div>
      </div>
    </StatLayout>
  );
}

// ─── Scene 4 — AIbridge cut 55% ─────────────────────────────────────────────
function SceneAibridge() {
  const { localTime } = useSprite();
  const cutT = Easing.easeInOutCubic(clamp((localTime - 0.5) / 1.4, 0, 1));
  const labelT = clamp((localTime - 1.6) / 0.4, 0, 1);

  return (
    <StatLayout
      index="04" stepLabel="DATA · 03 OF 03"
      sub="z · feature surface, q2 → q3"
      label={<>AIBRIDGE<br/>CUT.</>}
    >
      {/* bars */}
      <div style={{
        position: 'absolute', left: 64, right: 64, top: 1010, height: 540,
        display: 'flex', alignItems: 'flex-end', gap: 36,
      }}>
        {/* before */}
        <div style={{
          flex: 1, height: '100%',
          background: C.ink,
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', left: 24, top: 24,
            fontFamily: MONO, fontSize: 22, fontWeight: 700,
            color: C.cream, letterSpacing: '0.16em',
          }}>BEFORE</div>
          <div style={{
            position: 'absolute', left: 24, bottom: 24,
            fontFamily: SERIF, fontWeight: 900, fontSize: 88,
            color: C.cream, lineHeight: 1, letterSpacing: '-0.04em',
          }}>112<span style={{ fontFamily: MONO, fontSize: 22, marginLeft: 8 }}>features</span></div>
        </div>
        {/* after, shrinks */}
        <div style={{
          flex: 1,
          height: `${100 - 55 * cutT}%`,
          background: C.accent,
          position: 'relative',
          transition: 'none',
        }}>
          <div style={{
            position: 'absolute', left: 24, top: 24,
            fontFamily: MONO, fontSize: 22, fontWeight: 700,
            color: C.cream, letterSpacing: '0.16em',
          }}>AFTER</div>
          <div style={{
            position: 'absolute', left: 24, bottom: 24,
            fontFamily: SERIF, fontWeight: 900, fontSize: 88,
            color: C.cream, lineHeight: 1, letterSpacing: '-0.04em',
            opacity: labelT,
          }}>
            <CountUp from={112} to={50} duration={1.4} />
            <span style={{ fontFamily: MONO, fontSize: 22, marginLeft: 8 }}>features</span>
          </div>
        </div>
      </div>

      {/* −55% slap label */}
      <div style={{
        position: 'absolute', right: 100, top: 1610,
        fontFamily: SERIF, fontWeight: 900, fontStyle: 'italic',
        fontSize: 200, color: C.accent,
        letterSpacing: '-0.05em', lineHeight: 0.9,
        opacity: labelT,
        transform: `translateX(${(1 - labelT) * 40}px) rotate(${(1 - labelT) * 8}deg)`,
        transformOrigin: 'right center',
      }}>
        −55%
      </div>
      <div style={{
        position: 'absolute', left: 64, top: 1620,
        fontFamily: SANS, fontWeight: 500, fontSize: 38,
        color: C.inkDim, letterSpacing: '-0.01em', lineHeight: 1.2,
        opacity: labelT,
        maxWidth: 540,
      }}>
        Surface area, knocked back<br/>to what users actually use.
      </div>
    </StatLayout>
  );
}

// ─── Scene 5 — Stacked summary ──────────────────────────────────────────────
function SceneStack() {
  const { localTime } = useSprite();
  const rows = [
    { name: 'GROK BUILD',  value: '$300M', tag: 'Per quarter' },
    { name: 'CURSOR OPS',  value: '1,000×', tag: 'Token burn' },
    { name: 'AIBRIDGE',    value: '−55%',  tag: 'Feature cut' },
  ];

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Paper />
      <Chrome stepLabel="SYNTHESIS" current="05" />

      <div style={{
        position: 'absolute', left: 64, right: 64, top: 380,
        fontFamily: MONO, fontSize: 26, letterSpacing: '0.2em',
        textTransform: 'uppercase', color: C.accent, fontWeight: 600,
        opacity: clamp(localTime / 0.4, 0, 1),
      }}>
        ▸ The pattern
      </div>

      <div style={{
        position: 'absolute', left: 64, right: 64, top: 460,
        fontFamily: SERIF, fontWeight: 800, fontSize: 130,
        color: C.ink, letterSpacing: '-0.04em', lineHeight: 0.95,
        opacity: clamp((localTime - 0.1) / 0.4, 0, 1),
      }}>
        Three teams. <span style={{ fontStyle: 'italic', color: C.accent }}>One lesson.</span>
      </div>

      {/* table */}
      <div style={{
        position: 'absolute', left: 64, right: 64, top: 880,
      }}>
        {rows.map((r, i) => {
          const t = clamp((localTime - 0.4 - i * 0.18) / 0.45, 0, 1);
          const e = Easing.easeOutCubic(t);
          return (
            <div key={r.name} style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              alignItems: 'baseline',
              padding: '28px 0',
              borderBottom: `1px solid ${C.rule}`,
              opacity: t,
              transform: `translateX(${(1 - e) * -40}px)`,
            }}>
              <div>
                <div style={{
                  fontFamily: MONO, fontSize: 22,
                  letterSpacing: '0.18em', color: C.inkDim,
                  textTransform: 'uppercase',
                }}>{String(i + 1).padStart(2, '0')} · {r.tag}</div>
                <div style={{
                  fontFamily: SERIF, fontWeight: 800, fontSize: 110,
                  color: C.ink, letterSpacing: '-0.04em', lineHeight: 1,
                  marginTop: 10,
                }}>{r.name}</div>
              </div>
              <div style={{
                fontFamily: SERIF, fontWeight: 900, fontStyle: 'italic',
                fontSize: 160, color: C.accent,
                letterSpacing: '-0.05em', lineHeight: 1,
              }}>
                {r.value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Scene 6 — Takeaway ─────────────────────────────────────────────────────
function SceneTakeaway() {
  const { localTime } = useSprite();
  const fewerT  = Easing.easeOutBack(clamp((localTime - 0.2) / 0.7, 0, 1));
  const deeperT = Easing.easeOutBack(clamp((localTime - 1.0) / 0.7, 0, 1));
  const lineT   = clamp((localTime - 0.0) / 0.5, 0, 1);
  const tailT   = clamp((localTime - 2.0) / 0.6, 0, 1);

  // subtle parallax drift
  const drift = (localTime - 1.5) * 4;

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Paper dark />
      <Chrome stepLabel="TAKEAWAY" current="06" dark />

      {/* huge centered serif */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 540,
        textAlign: 'center',
        fontFamily: SERIF, fontWeight: 800, fontSize: 220,
        color: C.cream, letterSpacing: '-0.05em', lineHeight: 0.95,
      }}>
        {/* Pick fewer. */}
        <div style={{
          opacity: clamp(fewerT, 0, 1),
          transform: `translateY(${(1 - fewerT) * 40}px) translateX(${-drift}px)`,
        }}>
          Pick{' '}
          <span style={{ fontStyle: 'italic', color: C.accent }}>fewer.</span>
        </div>
        {/* Use deeper. */}
        <div style={{
          marginTop: 30,
          opacity: clamp(deeperT, 0, 1),
          transform: `translateY(${(1 - deeperT) * 40}px) translateX(${drift}px)`,
        }}>
          Use <span style={{ fontStyle: 'italic', color: C.accent }}>deeper.</span>
        </div>
      </div>

      {/* big rule */}
      <div style={{
        position: 'absolute', left: 120, right: 120, top: 1180,
        height: 2, background: C.accent,
        transformOrigin: 'left',
        transform: `scaleX(${Easing.easeOutCubic(lineT)})`,
        opacity: 0.7,
      }}/>

      {/* closing body */}
      <div style={{
        position: 'absolute', left: 120, right: 120, top: 1240,
        fontFamily: SANS, fontWeight: 500, fontSize: 44,
        color: 'rgba(244,240,230,0.75)',
        letterSpacing: '-0.01em', lineHeight: 1.35,
        textAlign: 'center',
        opacity: tailT,
        transform: `translateY(${(1 - tailT) * 24}px)`,
      }}>
        The teams burning <em style={{ color: C.cream, fontStyle: 'italic' }}>$300M</em>{' '}
        and <em style={{ color: C.cream, fontStyle: 'italic' }}>1,000×</em>{' '}
        learned it the hard way.<br/>The team that <em style={{ color: C.cream, fontStyle: 'italic' }}>cut 55%</em>{' '}
        learned it first.
      </div>

      {/* sign-off */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 240,
        textAlign: 'center',
        fontFamily: MONO, fontSize: 24, letterSpacing: '0.24em',
        textTransform: 'uppercase', color: C.accent, fontWeight: 700,
        opacity: clamp((localTime - 2.4) / 0.6, 0, 1),
      }}>
        Field&nbsp;Notes · 014
      </div>
    </div>
  );
}

// ─── Root composition ───────────────────────────────────────────────────────
function Video() {
  const time = useTime();
  const sec = Math.floor(time);

  // expose timestamp via root attr (for comment context)
  React.useEffect(() => {
    const el = document.querySelector('[data-screen-label]');
    if (el) el.setAttribute('data-screen-label', `t=${sec}s`);
  }, [sec]);

  return (
    <>
      <Sprite start={0.0}  end={3.0}>   <SceneTitle/>     </Sprite>
      <Sprite start={3.0}  end={6.5}>   <SceneGrok/>      </Sprite>
      <Sprite start={6.5}  end={10.0}>  <SceneCursor/>    </Sprite>
      <Sprite start={10.0} end={13.5}>  <SceneAibridge/>  </Sprite>
      <Sprite start={13.5} end={16.0}>  <SceneStack/>     </Sprite>
      <Sprite start={16.0} end={22.0}>  <SceneTakeaway/>  </Sprite>
    </>
  );
}

Object.assign(window, { Video, W, H });
