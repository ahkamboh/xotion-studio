// habits-scenes.jsx — "5 Habits That Change Your Life" · vertical 1080×1920 · 15s.
// Dark/cream/electric-green palette. Bold Archivo Black headlines that SLAM in
// letter-by-letter, big count-up numbers, gentle idle float, hard cuts.

const BW = 1080, BH = 1920;
const E = window.Easing;
const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

const BLACK = '"Archivo Black", system-ui, sans-serif';
const SANS  = '"Archivo", system-ui, sans-serif';
const C = {
  bg:     '#111111',
  ink:    '#f4f0e6', // cream
  inkDim: 'rgba(244,240,230,0.6)',
  accent: '#21b24b', // electric green — used ONLY for highlight word + CTA
};

// ── Auto-fit headline: measures its natural width and scales down if it
// would otherwise exceed `max`. Centering happens via translateX(-50%) on
// the parent, so scale doesn't change horizontal centering.
function useFit(ref, deps, max = 900) {
  const [fit, setFit] = React.useState(1);
  React.useLayoutEffect(() => {
    let on = true;
    const measure = () => {
      const el = ref.current;
      if (!el || !on) return;
      const w = el.offsetWidth;
      setFit(w > max ? max / w : 1);
    };
    measure();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => requestAnimationFrame(measure));
    }
    return () => { on = false; };
  }, deps); // eslint-disable-line
  return fit;
}

// ── Gentle idle float — applied AFTER an element has finished its entrance.
// Amplitude is small (±4px) so it reads as "alive" without distracting.
const idleFloat = (localTime, delay = 0, amp = 4, speed = 1.8, phase = 0) => {
  if (localTime <= delay) return 0;
  return Math.sin((localTime - delay) * speed + phase) * amp;
};

// ── SLAM headline with per-letter stagger (25ms per char, easeOutBack).
// Renders as `inline-block` letters in a nowrap container, then scales the
// whole thing to fit the safe width. `parts` is [{t, c?, highlight?}].
function Slam({
  parts,
  size = 200,
  top,
  delay = 0,
  localTime,
  max = 900,
  stagger = 0.025,    // 25ms per letter
  charDur = 0.32,     // each letter's slam time
  align = 'center',
  trackingEm = -0.04,
}) {
  const ref = React.useRef(null);
  const fit = useFit(ref, [size, parts.map(p => p.t).join('|')], max);

  // Build a flat list of letters with their global index for staggering.
  let idx = 0;
  const letters = parts.flatMap((p, pi) => {
    const arr = [];
    for (const ch of p.t) {
      arr.push({ ch, pi, color: p.c || C.ink, highlight: p.highlight, idx: idx++ });
    }
    return arr;
  });
  const total = idx;

  // Group-level fade so the whole word "exits" cleanly if the scene cuts mid-anim.
  const groupOpacity = 1;

  // After last letter lands, idle float kicks in for the whole headline.
  const lastLetterEnd = delay + (total - 1) * stagger + charDur;
  const ty = idleFloat(localTime, lastLetterEnd, 4, 1.4);

  const centered = align === 'center';
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: centered ? '50%' : 64,
        transform: `translateX(${centered ? '-50%' : '0'}) translateY(${ty}px)`,
        opacity: groupOpacity,
        pointerEvents: 'none',
      }}
    >
      <div
        ref={ref}
        style={{
          display: 'inline-block',
          width: 'max-content',
          fontFamily: BLACK,
          fontSize: size,
          lineHeight: 0.86,
          letterSpacing: `${trackingEm}em`,
          whiteSpace: 'nowrap',
          textTransform: 'uppercase',
          transform: `scale(${fit})`,
          transformOrigin: centered ? 'center top' : 'left top',
        }}
      >
        {letters.map((L, i) => {
          const lt = (localTime - delay) - L.idx * stagger;
          const t = E.easeOutBack(cl(lt / charDur));
          const op = cl(lt / (charDur * 0.5));
          const y = (1 - t) * 64;
          const sc = 0.7 + 0.3 * t;
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                color: L.color,
                opacity: op,
                transform: `translateY(${y}px) scale(${sc})`,
                transformOrigin: 'center bottom',
                willChange: 'transform, opacity',
                whiteSpace: 'pre', // preserve spaces between parts
              }}
            >
              {L.ch === ' ' ? ' ' : L.ch}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ── Small label / subline ───────────────────────────────────────────────
function Kick({
  text,
  top,
  delay = 0,
  localTime,
  color = C.inkDim,
  size = 30,
  align = 'center',
  tracking = '0.22em',
  weight = 700,
}) {
  const t = cl((localTime - delay) / 0.45);
  const eased = E.easeOutCubic(t);
  const ty = (1 - eased) * 18;
  const idle = idleFloat(localTime, delay + 0.45, 2, 1.3, 1);
  const centered = align === 'center';
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: centered ? '50%' : 64,
        transform: `translateX(${centered ? '-50%' : '0'}) translateY(${ty + idle}px)`,
        opacity: eased,
        fontFamily: SANS,
        fontWeight: weight,
        fontSize: size,
        color,
        letterSpacing: tracking,
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </div>
  );
}

// ── Big count-up number (01 → 05). Pads to 2 digits. Cream by default —
// the accent green is reserved for the highlight word and the CTA scene.
function CountNumber({
  top = 220,
  delay = 0,
  localTime,
  to = 1,
  duration = 0.9,
  color = C.ink,
  size = 240,
  align = 'center',
}) {
  const t = cl((localTime - delay) / duration);
  const eased = E.easeOutCubic(t);
  const n = Math.max(0, Math.round(eased * to));
  const label = String(n).padStart(2, '0');
  // Subtle pop on each integer change.
  const idle = idleFloat(localTime, delay + duration, 2, 1.6);
  const centered = align === 'center';
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: centered ? '50%' : 64,
        transform: `translateX(${centered ? '-50%' : '0'}) translateY(${idle}px)`,
        fontFamily: BLACK,
        fontSize: size,
        lineHeight: 0.85,
        color,
        letterSpacing: '-0.04em',
        opacity: cl((localTime - delay) / 0.25),
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {label}
    </div>
  );
}

// ── Accent rule under the number — wipes in from left.
function Rule({
  x = '50%', y, w = 120, h = 10, delay = 0, localTime, color = C.accent,
  centerX = true,
}) {
  const t = E.easeOutCubic(cl((localTime - delay) / 0.5));
  return (
    <div
      style={{
        position: 'absolute',
        top: y,
        left: x,
        width: w,
        height: h,
        background: color,
        borderRadius: 99,
        transform: `translateX(${centerX ? '-50%' : '0'}) scaleX(${t})`,
        transformOrigin: 'left center',
      }}
    />
  );
}

// ── Re-usable "habit card" — number, rule, big headline, label, progress dots.
function HabitCard({ n, total = 5, label, headline, accentIdx = -1, localTime }) {
  return (
    <>
      <Kick text={`HABIT ${String(n).padStart(2, '0')} / ${String(total).padStart(2, '0')}`}
            top={280} delay={0.05} localTime={localTime} />
      <CountNumber to={n} delay={0.15} localTime={localTime} top={360} size={420} />
      <Rule y={830} w={140} delay={0.55} localTime={localTime} />
      <Slam
        parts={
          accentIdx < 0
            ? [{ t: headline }]
            : headline.split(' ').map((w, i, arr) => ({
                t: w + (i < arr.length - 1 ? ' ' : ''),
                c: i === accentIdx ? C.accent : C.ink,
              }))
        }
        size={260}
        top={970}
        delay={0.45}
        localTime={localTime}
      />
      <Kick text={label} top={1340} delay={1.05} localTime={localTime}
            size={30} color={C.inkDim} tracking="0.3em" />
      <ProgressDots n={n} total={total} top={1700} delay={0.85} localTime={localTime} />
    </>
  );
}

// 5 dots across the bottom — filled dots = completed habits, current dot pulses.
function ProgressDots({ n, total = 5, top, delay = 0, localTime }) {
  const t = E.easeOutCubic(cl((localTime - delay) / 0.5));
  const pulse = 1 + 0.18 * Math.sin(localTime * 5);
  return (
    <div style={{
      position: 'absolute', top, left: '50%',
      transform: `translateX(-50%)`,
      display: 'flex', gap: 22,
      opacity: t,
    }}>
      {Array.from({ length: total }, (_, i) => {
        const k = i + 1;
        const isCurrent = k === n;
        const isDone = k < n;
        const isCurrentScale = isCurrent ? pulse : 1;
        return (
          <div key={i} style={{
            width: isCurrent ? 56 : 16, height: 16, borderRadius: 99,
            background: isDone || isCurrent ? C.accent : 'rgba(244,240,230,0.22)',
            transform: `scaleY(${isCurrentScale})`,
            transition: 'none',
          }} />
        );
      })}
    </div>
  );
}

// ── Soft accent dot pattern (texture, not decoration). Subtle.
function DotField() {
  const dots = [];
  for (let y = 80; y < BH - 80; y += 120) {
    for (let x = 80; x < BW - 80; x += 120) {
      dots.push(
        <div key={`${x}-${y}`} style={{
          position: 'absolute', left: x, top: y, width: 3, height: 3,
          background: 'rgba(244,240,230,0.06)', borderRadius: 99,
        }} />,
      );
    }
  }
  return <>{dots}</>;
}

// ── SCENES ──────────────────────────────────────────────────────────────

// Scene 1 — TITLE
function S1() {
  const { localTime: t } = useSprite();
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <DotField />
      <Kick text="A 15-SECOND GUIDE" top={420} delay={0.05} localTime={t} />
      <Slam parts={[{ t: '5' }]} size={780} top={520}
            delay={0.2} localTime={t} stagger={0} charDur={0.5} max={900} />
      <Slam parts={[{ t: 'HABITS' }]} size={280} top={1170}
            delay={0.55} localTime={t} />
      <Slam parts={[{ t: 'THAT CHANGE' }]} size={120} top={1410}
            delay={0.95} localTime={t} />
      <Slam
        parts={[
          { t: 'YOUR ' },
          { t: 'LIFE', c: C.accent },
        ]}
        size={170}
        top={1540}
        delay={1.15}
        localTime={t}
      />
      <Rule y={1740} w={180} delay={1.6} localTime={t} />
    </div>
  );
}

// Scene 2 — 01 WAKE EARLY
function S2() {
  const { localTime: t } = useSprite();
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <HabitCard n={1} label="START · BEFORE THE WORLD WAKES" headline="WAKE EARLY"
                 accentIdx={0} localTime={t} />
    </div>
  );
}

// Scene 3 — 02 MOVE DAILY
function S3() {
  const { localTime: t } = useSprite();
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <HabitCard n={2} label="ENERGY · 20 MINUTES IS ENOUGH" headline="MOVE DAILY"
                 accentIdx={0} localTime={t} />
    </div>
  );
}

// Scene 4 — 03 READ MORE
function S4() {
  const { localTime: t } = useSprite();
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <HabitCard n={3} label="MIND · 20 PAGES A DAY · 30 BOOKS A YEAR" headline="READ MORE"
                 accentIdx={1} localTime={t} />
    </div>
  );
}

// Scene 5 — 04 SLEEP DEEP → 05 SHOW UP  (two beats in one ~2.5s scene)
function S5() {
  const { localTime: t } = useSprite();
  const SECOND_AT = 1.25; // hard cut to "05 SHOW UP" at +1.25s
  const showSecond = t >= SECOND_AT;
  // Slide the second beat's localTime origin so its anims fire from 0.
  const t2 = t - SECOND_AT;

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {!showSecond && (
        <HabitCard n={4} label="RECOVERY · 7–9 HOURS, NO SCREENS"
                   headline="SLEEP DEEP" accentIdx={1} localTime={t} />
      )}
      {showSecond && (
        <HabitCard n={5} label="DISCIPLINE · CONSISTENCY BEATS INTENSITY"
                   headline="SHOW UP" accentIdx={1} localTime={t2} />
      )}
    </div>
  );
}

// Scene 6 — CTA  "START TODAY."
function S6() {
  const { localTime: t } = useSprite();
  // Background tint subtly washes to accent for the close.
  const wash = E.easeOutCubic(cl((t - 0.05) / 0.6));
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* Accent wipe from bottom — feels like a curtain. */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        height: `${wash * 100}%`,
        background: C.accent,
      }} />
      <Kick text="YOUR MOVE" top={520} delay={0.05} localTime={t}
            color={wash > 0.5 ? '#0a0a0a' : C.inkDim} />
      <Slam
        parts={[
          { t: 'START' },
        ]}
        size={420}
        top={680}
        delay={0.2}
        localTime={t}
        max={900}
      />
      <Slam
        parts={[
          { t: 'TODAY.' },
        ]}
        size={420}
        top={1080}
        delay={0.4}
        localTime={t}
        max={900}
      />
      <div style={{
        position: 'absolute', top: 1500, left: 0, right: 0, textAlign: 'center',
        fontFamily: SANS, fontWeight: 800, fontSize: 38,
        color: wash > 0.5 ? '#0a0a0a' : C.ink,
        letterSpacing: '0.4em', textTransform: 'uppercase',
        opacity: cl((t - 0.8) / 0.5),
      }}>
        ONE HABIT · ONE DAY
      </div>
      <div style={{
        position: 'absolute', top: 1620, left: 0, right: 0, textAlign: 'center',
        fontFamily: BLACK, fontSize: 60, color: '#0a0a0a',
        letterSpacing: '-0.02em',
        opacity: cl((t - 1.05) / 0.5),
      }}>
        DO. NOT. WAIT.
      </div>
    </div>
  );
}

// ── Composition — 6 scenes, hard cuts, 15s total ──────────────────────
function HabitsVideo() {
  return (
    <>
      <Sprite start={0.0}  end={2.5}>  <S1 /> </Sprite>
      <Sprite start={2.5}  end={5.0}>  <S2 /> </Sprite>
      <Sprite start={5.0}  end={7.5}>  <S3 /> </Sprite>
      <Sprite start={7.5}  end={10.0}> <S4 /> </Sprite>
      <Sprite start={10.0} end={12.5}> <S5 /> </Sprite>
      <Sprite start={12.5} end={15.0}> <S6 /> </Sprite>
    </>
  );
}

Object.assign(window, { HabitsVideo, BW, BH });
