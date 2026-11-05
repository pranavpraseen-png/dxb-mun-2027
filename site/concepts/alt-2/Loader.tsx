import { useEffect, useRef, useState } from 'react';
import NumberFlow from '@number-flow/react';
import { drawGlobe, fitCanvas, getHeroFootTop, getHeroPose, onHeroPose } from './globe';
import { EASE, T_BIG, gsap } from './motion';

/*
  0 · Loader (BLUEPRINT section 3.0), about 3 s, once per visit, skipped by any key, tap or wheel.
  It is an ink "printing plate" over the cream page. On the plate, in cream:
    - hairlines draw in from the edges at the exact places the page grid has its lines (Dropbox);
    - numbered points appear, spokes join them to Dubai, then the limb, graticule and land lattice build
      the globe (Igloo, Oryzo), at the exact pose the hero keeps;
    - a mono counter runs 000 → 100 bottom-left (Outfit);
    - "DXB MUN 2027" resolves by scramble in the middle (Igloo).
  At 100 the plate splits into a top bar and a bottom bar that leave by the edges (Lando). The globe "stays":
  the same drawing is already on the page beneath, now ink on cream. The wordmark flies to the nav as the logo (Getty).
*/
const CREAM = '#EDE4DD', INK = '#111112';

export function Loader({ onReveal, onDone }: { onReveal: () => void; onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const cTop = useRef<HTMLCanvasElement>(null);
  const cBot = useRef<HTMLCanvasElement>(null);
  const word = useRef<HTMLSpanElement>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const el = root.current!;
    const st = { build: 0, count: 0 };
    let lastCount = -1;
    const draw = () => {
      const pose = getHeroPose();
      if (!pose) return;
      el.style.setProperty('--cx', pose.cx + 'px');
      el.style.setProperty('--cy', pose.cy + 'px');
      el.style.setProperty('--fy', getHeroFootTop() + 'px');
      for (const c of [cTop.current, cBot.current]) {
        if (!c) continue;
        const { ctx, w, h } = fitCanvas(c);
        drawGlobe(ctx, w, h, pose, { ink: CREAM, ground: INK }, st.build);
      }
    };
    const off = onHeroPose(draw);
    (window as unknown as { __alt2Loader?: { start: number } }).__alt2Loader = { start: performance.now() };

    const q = gsap.utils.selector(el);
    const tl = gsap.timeline({ onComplete: () => onDone() });
    tl.fromTo(q('.ld-line'), { scale: 0 }, { scale: 1, duration: 0.9, ease: EASE, stagger: 0.07 }, 0.05);
    tl.to(st, { build: 1, duration: 2.05, ease: 'power1.inOut', onUpdate: draw }, 0.15);
    tl.to(st, {
      count: 100, duration: 2.3, ease: 'power1.inOut',
      onUpdate: () => {
        // step the counter like Outfit's (063 … 090 … 099): a handful of rolls, not 100 re-renders
        const v = st.count >= 100 ? 100 : Math.floor(st.count / 7) * 7;
        if (v !== lastCount) { lastCount = v; setCount(v); }
      },
    }, 0);
    tl.to(word.current, { duration: 1.5, scrambleText: { text: 'DXB MUN 2027', chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', speed: 0.5, revealDelay: 0.35 } }, 0.2);
    tl.fromTo(q('.ld-label'), { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.75, ease: EASE, stagger: 0.1 }, 0.3);
    tl.addLabel('split', 2.45);
    tl.call(() => { el.classList.add('is-split'); onReveal(); }, [], 'split');
    tl.to(q('.ld-plate--top'), { yPercent: -50, duration: T_BIG, ease: EASE }, 'split');
    tl.to(q('.ld-plate--bot'), { yPercent: 50, duration: T_BIG, ease: EASE }, 'split');
    // the wordmark flies to the nav logo
    tl.add(() => {
      const w = word.current, logo = document.getElementById('nav-logo');
      if (!w || !logo) return;
      const a = w.getBoundingClientRect(), b = logo.getBoundingClientRect();
      const k = parseFloat(getComputedStyle(logo).fontSize) / parseFloat(getComputedStyle(w).fontSize);
      gsap.set(w, { transformOrigin: '0% 0%' });
      gsap.to(w, { x: b.left - a.left, y: b.top - a.top, scale: k, duration: 0.95, ease: EASE });
      gsap.to(w, { color: INK, duration: 0.25, ease: 'none' });
    }, 'split');
    tl.to({}, { duration: 0.05 }, 'split+=1.15');

    // any key, tap or wheel skips straight to the split
    const skip = () => { if (tl.time() < tl.labels.split) tl.seek('split'); };
    const opts = { passive: true } as AddEventListenerOptions;
    window.addEventListener('keydown', skip);
    window.addEventListener('pointerdown', skip, opts);
    window.addEventListener('wheel', skip, opts);
    window.addEventListener('touchstart', skip, opts);
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => {
      tl.kill(); off();
      window.removeEventListener('keydown', skip);
      window.removeEventListener('pointerdown', skip);
      window.removeEventListener('wheel', skip);
      window.removeEventListener('touchstart', skip);
      window.removeEventListener('resize', onResize);
    };
  }, [onDone, onReveal]);

  const lines = (
    <>
      <i className="ld-line ld-line--nav" />
      <i className="ld-line ld-line--h" />
      <i className="ld-line ld-line--v" />
      <i className="ld-line ld-line--foot" />
    </>
  );

  return (
    <div ref={root} className="loader" aria-hidden="true">
      <div className="ld-plate ld-plate--top">
        <canvas ref={cTop} className="ld-canvas" />
        {lines}
        <span className="ld-label ld-label--tl">Model United Nations</span>
        <span className="ld-label ld-label--tr">Dubai · 25.20° N 55.27° E</span>
      </div>
      <div className="ld-plate ld-plate--bot">
        <canvas ref={cBot} className="ld-canvas" />
        {lines}
        <span className="ld-count">
          <NumberFlow value={count} format={{ minimumIntegerDigits: 3, useGrouping: false }} spinTiming={{ duration: 260, easing: 'cubic-bezier(0.65,0.05,0,1)' }} />
        </span>
        <span className="ld-label ld-label--br">Press any key to skip</span>
      </div>
      <span className="ld-word"><i className="ld-word-bg" /><span ref={word}>&nbsp;</span></span>
    </div>
  );
}
