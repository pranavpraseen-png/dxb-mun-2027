// DOODLE: the wordmark is a tiny chamber. The letters stand one after another like delegates rising for a
// vote, the U of "UN" lifts a blue placard, and the chair's gavel swings in and strikes the 27 to close it.
// Plays once ~1.2 s after the bar arrives, then on hover (mouse) or tap (touch); always back to the plain mark by 1.6 s.
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import './doodle.css';

const WORD = ['D', 'X', 'B', ' ', 'M', 'U', 'N'];
const PLACARD_AT = 5; // the U
const START_DELAY = 1.2;

const reduced = () =>
  document.documentElement.classList.contains('still') ||
  matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Builds the 1.6 s scene on the doodle's own elements. */
function scene(root: HTMLElement) {
  const q = gsap.utils.selector(root);
  const letters = q('.doodle-l');
  const yr = q('.doodle-yr-t');
  const gavel = q('.doodle-gavel');
  const cloth = q('.doodle-placard-in');
  const hits = q('.doodle-hit i');

  if (!gavel.length) return null;
  gsap.set(cloth, { yPercent: 102, autoAlpha: 1 });
  const tl = gsap.timeline({ paused: true });

  // 0.00 to 0.85 · the wave: a small crouch, a rise, a landing that overshoots the baseline by a pixel
  letters.forEach((l, i) => {
    const at = i * 0.06;
    tl.to(l, { y: 1, scaleY: 0.9, duration: 0.1, ease: 'power2.in' }, at)
      .to(l, { y: -6, scaleY: 1.05, duration: 0.17, ease: 'power3.out' }, at + 0.1)
      .to(l, { y: 0, scaleY: 1, duration: 0.42, ease: 'back.out(3.2)' }, at + 0.27);
  });

  // 0.34 to 1.30 · the placard rises out of the U as it stands, settles, and goes back down
  const u = 0.1 + (PLACARD_AT - 1) * 0.06;
  tl.fromTo(cloth, { yPercent: 102 }, { yPercent: 0, duration: 0.36, ease: 'back.out(2.2)' }, u)
    .to(cloth, { rotation: -4, duration: 0.14, ease: 'sine.inOut', yoyo: true, repeat: 1 }, u + 0.3)
    .to(cloth, { yPercent: 102, duration: 0.24, ease: 'power3.in' }, 1.06);

  // 0.45 to 1.55 · the gavel: swings in raised, winds back, strikes, rebounds, leaves
  tl.fromTo(gavel, { autoAlpha: 0, rotation: 78 }, { autoAlpha: 1, rotation: 38, duration: 0.24, ease: 'power2.out' }, 0.45)
    .to(gavel, { rotation: 50, duration: 0.16, ease: 'sine.inOut' }, 0.69)
    .to(gavel, { rotation: -6, duration: 0.11, ease: 'power4.in' }, 0.85)
    .to(gavel, { rotation: 14, duration: 0.14, ease: 'power2.out' }, 0.96)
    .to(gavel, { rotation: 0, duration: 0.12, ease: 'power2.in' }, 1.1)
    .to(gavel, { rotation: 62, autoAlpha: 0, duration: 0.26, ease: 'power2.in' }, 1.29);

  // the strikes land at 0.96 and 1.22: the 27 jolts, three orange ticks flick out once
  tl.to(yr, { y: 2, scaleY: 0.82, scaleX: 1.08, duration: 0.05, ease: 'power2.out' }, 0.96)
    .to(yr, { y: 0, scaleY: 1, scaleX: 1, duration: 0.4, ease: 'elastic.out(1.1, 0.35)' }, 1.01)
    .to(yr, { y: 1, scaleY: 0.92, duration: 0.04, ease: 'power2.out' }, 1.22)
    .to(yr, { y: 0, scaleY: 1, duration: 0.26, ease: 'back.out(3)' }, 1.26)
    .fromTo(hits, { scaleX: 0, autoAlpha: 1 }, { scaleX: 1, duration: 0.12, ease: 'power3.out', stagger: 0.015 }, 0.96)
    .to(hits, { autoAlpha: 0, duration: 0.18, ease: 'power1.in' }, 1.14);

  // a clean slate at the end, whatever was interrupted
  tl.set([...letters, ...yr], { clearProps: 'transform' }, 1.6)
    .set(cloth, { yPercent: 102, rotation: 0 }, 1.6)
    .set(gavel, { autoAlpha: 0, rotation: 0 }, 1.6)
    .set(hits, { autoAlpha: 0 }, 1.6);
  return tl;
}

export function Doodle({ visible }: { visible: boolean }) {
  const root = useRef<HTMLSpanElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ctx = gsap.context(() => { tl.current = scene(el); }, el);
    const play = () => {
      const t = tl.current;
      if (!t || reduced() || t.isActive()) return;
      t.restart();
    };
    // the link carries the triggers: hover with a mouse or pen, a tap on touch (the tap still follows the link)
    const link = el.closest('a') ?? el;
    const enter = (e: PointerEvent) => { if (e.pointerType !== 'touch') play(); };
    const down = (e: PointerEvent) => { if (e.pointerType === 'touch') play(); };
    link.addEventListener('pointerenter', enter as EventListener);
    link.addEventListener('pointerdown', down as EventListener);
    return () => {
      link.removeEventListener('pointerenter', enter as EventListener);
      link.removeEventListener('pointerdown', down as EventListener);
      ctx.revert();
      tl.current = null;
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const id = setTimeout(() => {
      const t = tl.current;
      if (t && !reduced() && !t.isActive()) t.restart();
    }, START_DELAY * 1000);
    return () => clearTimeout(id);
  }, [visible]);

  return (
    <span className="doodle" ref={root}>
      <b className="doodle-word">
        {WORD.map((c, i) =>
          c === ' ' ? <span key={i} className="doodle-gap"> </span> : (
            <span key={i} className="doodle-l">
              {i === PLACARD_AT && (
                <span className="doodle-placard" aria-hidden="true">
                  <span className="doodle-placard-in"><i className="doodle-cloth" /><i className="doodle-pole" /></span>
                </span>
              )}
              <span className="doodle-ch">{c}</span>
            </span>
          ),
        )}
      </b>
      <span className="doodle-yr">
        <span className="doodle-yr-t">27</span>
        <span className="doodle-hit" aria-hidden="true"><i /><i /><i /></span>
        <span className="doodle-gavel" aria-hidden="true">
          {/* strike pose: handle level, head upright; the pivot is the hand at the right end */}
          <svg viewBox="0 0 24 11" width="24" height="11">
            <path d="M8.5 5.5H23.5" stroke="currentColor" strokeWidth="1" fill="none" shapeRendering="crispEdges" />
            <rect x="3.5" y="0.5" width="5" height="10" fill="currentColor" stroke="currentColor" strokeWidth="1" shapeRendering="crispEdges" />
            <path d="M3 2.5H9M3 8.5H9" stroke="var(--ground, #03060C)" strokeWidth="1" fill="none" shapeRendering="crispEdges" />
          </svg>
        </span>
      </span>
    </span>
  );
}
