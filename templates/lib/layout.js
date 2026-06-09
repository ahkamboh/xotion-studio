// layout.js — Anchor + FitDisplay primitives.
//
// Solves the recurring HyperFrames template bug class:
//   .scene .layer { position:absolute; inset:0 }
// combined with inline style="bottom:Npx" or style="left:Npx; right:Npx;
// top:Mpx". Because inset:0 pins all four sides, an inline override only
// re-anchors ONE edge — the opposite edge still hangs off 0. That's why
// captions intended to sit at the bottom end up at the top: the box stretches
// top:0 → bottom:N and text falls from the top.
//
// Anchor()    — pins content to exactly one edge (top OR bottom OR left OR
//               right) without leaking the opposite-edge default.
// FitDisplay() — auto-shrinks headlines that would otherwise overflow the
//               safe area at large font sizes.
//
// Both return HTML strings — call from the build() phase of a template.
// fitAllDisplays() is run once after document.fonts.ready to perform the
// scale measurement.
//
// Drop-in usage in any HyperFrames template:
//   <script src="layout.js"></script>
//   ...build(): m.innerHTML += Anchor({where:'bottom', offset:200}, '<div class="caption">...</div>');
//   ...build(): m.innerHTML += FitDisplay({text:'Hook fast.', size:200, top:760, color:'#fff'});
//   ...after build: fitAllDisplays();

(function (g) {
  'use strict';

  // Tiny CSS-object → inline style string, with px defaulting for numerics.
  function cssOf(o) {
    const out = [];
    for (const k in o) {
      if (o[k] == null) continue;
      const prop = k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
      let v = o[k];
      if (typeof v === 'number' && !/(opacity|z-index|flex|order|line-height|scale)/.test(prop)) {
        v = v + 'px';
      }
      out.push(prop + ':' + v);
    }
    return out.join(';');
  }
  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Anchor a child to ONE edge of the canvas. The trick: never set the
  // opposite-edge property, so the layer collapses to its natural content
  // size and stays anchored to the chosen edge.
  //
  // where: 'top' | 'bottom' | 'left' | 'right'
  // offset: number (px from that edge)
  // left, right: optional explicit horizontal anchors (default both 64)
  // top, bottom: optional explicit vertical anchors when where is 'left'/'right'
  // align: 'start' | 'center' | 'end'  (cross-axis alignment of content)
  // childrenHtml: an HTML string
  function Anchor(opts, childrenHtml) {
    const where = opts.where;
    if (!['top', 'bottom', 'left', 'right'].includes(where)) {
      throw new Error(`Anchor: where must be one of top|bottom|left|right; got ${where}`);
    }
    const offset = opts.offset == null ? 0 : opts.offset;
    const isVertical = where === 'top' || where === 'bottom';

    const style = {
      position: 'absolute',
      display: 'flex',
      flexDirection: 'column',
    };

    // Horizontal anchors — default both 64 for vertical anchors so caption
    // boxes stretch left↔right cleanly.
    if (isVertical) {
      style.left = opts.left != null ? opts.left : 64;
      style.right = opts.right != null ? opts.right : 64;
    } else {
      style.top = opts.top != null ? opts.top : 64;
      style.bottom = opts.bottom != null ? opts.bottom : 64;
    }

    // The anchored edge.
    style[where] = offset;

    // Cross-axis alignment for the inner content.
    const align = opts.align || (where === 'bottom' ? 'end' : where === 'right' ? 'end' : 'start');
    const alignMap = { start: 'flex-start', center: 'center', end: 'flex-end' };
    if (isVertical) {
      style.alignItems = alignMap[align] || 'flex-start';
    } else {
      style.justifyContent = alignMap[align] || 'flex-start';
    }

    const cls = opts.className ? ' ' + opts.className : '';
    return `<div class="anchor anchor-${where}${cls}" style="${cssOf(style)}">${childrenHtml}</div>`;
  }

  // FitDisplay — emits a centered headline that JS measures + scales after
  // fonts.ready, so it never overflows the safe area. Drop in instead of
  // a hand-rolled <div style="font-size:200px">...
  //
  // text: string
  // size: number (px) — desired font size
  // top: number (px) — top anchor (use Anchor() if you want bottom)
  // max: number (px) — max visible width before auto-fit kicks in (default 900)
  // italic: bool
  // weight: number (default 900)
  // color: css color
  // family: css font-family (default Fraunces/Archivo Black depending on theme)
  // letterSpacing: css value (default '-0.02em')
  function FitDisplay(opts) {
    const text = opts.text;
    const size = +opts.size || 100;
    const top = +opts.top || 0;
    const max = +opts.max || 900;
    const italic = !!opts.italic;
    const weight = opts.weight || 900;
    const color = opts.color || '#000';
    const family = opts.family || '"Fraunces", "Archivo Black", Georgia, serif';
    const ls = opts.letterSpacing || '-0.02em';
    const innerStyle = cssOf({
      display: 'inline-block',
      fontFamily: family,
      fontWeight: weight,
      fontStyle: italic ? 'italic' : 'normal',
      fontSize: size,
      lineHeight: 0.92,
      letterSpacing: ls,
      color: color,
      whiteSpace: 'nowrap',
    });
    const wrapperStyle = cssOf({
      position: 'absolute',
      top: top,
      left: '50%',
      transform: 'translateX(-50%)',
      textAlign: 'center',
    });
    return (
      `<div class="fit-display" data-max="${max}" style="${wrapperStyle}">` +
      `<span style="${innerStyle}">${esc(text)}</span>` +
      `</div>`
    );
  }

  // Run after fonts.ready — walks every .fit-display and shrinks if needed.
  // Idempotent: call multiple times safely. Returns the count of nodes that
  // were actually shrunk (useful for tests).
  async function fitAllDisplays(root) {
    if (typeof document === 'undefined') return 0;
    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch (_) {}
    }
    const scope = root || document;
    const nodes = scope.querySelectorAll('.fit-display');
    let shrunk = 0;
    nodes.forEach((el) => {
      const max = +el.dataset.max || 900;
      const span = el.firstElementChild;
      if (!span) return;
      // reset any previous scale so we re-measure natural width
      span.style.transform = '';
      const w = span.getBoundingClientRect().width;
      if (w > max) {
        const s = max / w;
        span.style.transform = `scale(${s.toFixed(4)})`;
        span.style.transformOrigin = 'center top';
        shrunk++;
      }
    });
    return shrunk;
  }

  // Hook for HyperFrames: register fitAllDisplays on the master timeline
  // (and on the seek path) so scaling happens after every navigation. Safe
  // to call multiple times.
  function autoWireFit() {
    if (typeof window === 'undefined') return;
    const run = () => fitAllDisplays();
    // 1) run once after first paint
    if (document.readyState === 'complete') run();
    else window.addEventListener('load', run, { once: true });
    // 2) re-run whenever the master timeline is seeked (HyperFrames seeks per
    //    frame; one measurement at fonts.ready is enough — but a re-run on the
    //    very first seek catches any layout shift from late asset loads).
    let armed = true;
    const seekHook = () => { if (!armed) return; armed = false; run(); };
    setTimeout(() => {
      const tl = window.__timeline || (window.__timelines && window.__timelines.main);
      if (tl && typeof tl.eventCallback === 'function') {
        const prev = tl.eventCallback('onUpdate');
        tl.eventCallback('onUpdate', function () {
          seekHook();
          if (typeof prev === 'function') prev.apply(this, arguments);
        });
      }
    }, 0);
  }

  g.Anchor = Anchor;
  g.FitDisplay = FitDisplay;
  g.fitAllDisplays = fitAllDisplays;
  g.autoWireFit = autoWireFit;

  // Auto-wire when the script is included in a HyperFrames page (presence of
  // window.__timeline indicates we're running inside one). Safe in test envs.
  if (typeof window !== 'undefined') autoWireFit();
})(typeof window !== 'undefined' ? window : globalThis);
