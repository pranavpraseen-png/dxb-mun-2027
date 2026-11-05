// The opening (about 3 s, once per visit, skippable with any key, tap or wheel). Nothing here waits:
// a mono counter counts 000 → 100 (Outfit), the hero's own hairlines draw in from the edges (Dropbox), numbered points
// connect into the wireframe globe (Igloo, Oryzo) and "DXB MUN 2027" resolves by scramble (Igloo).
// At 100 the paper splits into a top and a bottom bar (Lando); the globe stays as the hero object and the wordmark
// flies to the top-left as the logo (Getty). The lines are exact copies of the hero's lines, so the swap is invisible.
import { useEffect, useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { getLenis } from '@/shared/scroll';
import { ease } from './geo';
import { stageState } from './Stage';

gsap.registerPlugin(ScrambleTextPlugin);

const KEY = 'alt1.opened';
export const shouldOpen = () => {
  try { return sessionStorage.getItem(KEY) !== '1'; } catch { return true; }
};

type Line = { x: number; y: number; w: number; h: number; horiz: boolean; i: number };

export function Loader({ onDone }: { onDone: () => void }) {
  const lines = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLDivElement>(null);
  const bot = useRef<HTMLDivElement>(null);
  const word = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const count = useRef<HTMLSpanElement>(null);

  // Before paint: lock the page at the top and raise the globe above the paper bars.
  useLayoutEffect(() => {
    history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    stageState.build = 0;
    stageState.loaderOn = true;
    document.documentElement.classList.add('is-loading');
    return () => {
      stageState.build = 1;
      stageState.loaderOn = false;
      document.documentElement.classList.remove('is-loading');
    };
  }, []);

  useEffect(() => {
    let tl: gsap.core.Timeline | null = null;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      try { sessionStorage.setItem(KEY, '1'); } catch { /* private mode: the opening simply plays again */ }
      getLenis()?.start();
      onDone();
    };

    const start = () => {
      getLenis()?.stop();
      // Copy every hairline of the hero, in place, so the drawn lines BECOME the page grid.
      const src = [...document.querySelectorAll<HTMLElement>('[data-line]')];
      const box = lines.current!;
      box.replaceChildren();
      const made: Line[] = src.map((el, i) => {
        const r = el.getBoundingClientRect();
        return { x: r.left, y: r.top, w: r.width, h: r.height, horiz: r.width > r.height, i };
      });
      const els = made.map((l) => {
        const d = document.createElement('i');
        d.className = 'ld-line';
        Object.assign(d.style, { left: l.x + 'px', top: l.y + 'px', width: Math.max(1, l.w) + 'px', height: Math.max(1, l.h) + 'px' });
        box.append(d);
        gsap.set(d, l.horiz
          ? { scaleX: 0, transformOrigin: l.i % 2 ? '100% 50%' : '0% 50%' }
          : { scaleY: 0, transformOrigin: l.i % 2 ? '50% 100%' : '50% 0%' });
        return d;
      });

      const st = { b: 0, n: 0 };
      const pad = (v: number) => String(Math.round(v)).padStart(3, '0');
      tl = gsap.timeline({ onComplete: finish });
      tl.to(st, { n: 100, duration: 2.6, ease: 'power1.inOut', onUpdate: () => { if (count.current) count.current.textContent = pad(st.n); } }, 0);
      tl.to(st, { b: 1, duration: 2.5, ease: 'none', onUpdate: () => { stageState.build = st.b; } }, 0);
      tl.to(els, { scaleX: 1, scaleY: 1, duration: 1.1, ease, stagger: 0.07 }, 0.1);
      tl.to(text.current, {
        duration: 1.5,
        scrambleText: { text: 'DXB MUN 2027', chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', revealDelay: 0.45, speed: 0.55 },
      }, 0.5);
      tl.addLabel('split', 2.65);
      tl.call(() => document.documentElement.classList.add('is-in'), [], 'split');
      tl.to(top.current, { yPercent: -100, duration: 0.75, ease }, 'split');
      tl.to(bot.current, { yPercent: 100, duration: 0.75, ease }, 'split');
      // FLIP the scrambled wordmark onto the logo in the bar.
      tl.add(() => {
        const logo = document.querySelector<HTMLElement>('.nav-logo-text');
        const t = text.current;
        if (!logo || !t) return;
        const a = t.getBoundingClientRect(), b = logo.getBoundingClientRect();
        const s = parseFloat(getComputedStyle(logo).fontSize) / parseFloat(getComputedStyle(t).fontSize);
        word.current!.classList.add('ld-word--fly');
        gsap.to(t, {
          x: b.left - a.left, y: b.top + b.height / 2 - (a.top + a.height / 2), scale: s,
          transformOrigin: '0% 50%', duration: 0.75, ease,
        });
      }, 'split');
      tl.to({}, { duration: 0.8 }, 'split');
    };

    // Start once the fonts are in (so the copied lines sit exactly on the laid-out hero), but never wait long.
    let started = false;
    const go = () => { if (!started) { started = true; start(); } };
    document.fonts?.ready.then(go);
    const fallback = setTimeout(go, 700);

    const skip = (e: Event) => {
      if (!tl) return;
      if (e.type === 'keydown' && (e as KeyboardEvent).key === 'Tab') return;
      if (tl.time() < 2.65) tl.seek(2.65);
    };
    const opts = { passive: true } as const;
    window.addEventListener('keydown', skip);
    window.addEventListener('pointerdown', skip, opts);
    window.addEventListener('wheel', skip, opts);
    window.addEventListener('touchstart', skip, opts);
    return () => {
      clearTimeout(fallback);
      tl?.kill();
      window.removeEventListener('keydown', skip);
      window.removeEventListener('pointerdown', skip);
      window.removeEventListener('wheel', skip);
      window.removeEventListener('touchstart', skip);
    };
  }, [onDone]);

  return (
    <div className="loader" aria-hidden="true">
      <div ref={top} className="ld-panel ld-panel--top" />
      <div ref={bot} className="ld-panel ld-panel--bot">
        <div className="ld-count">
          <span className="ld-count-label mono">Convening · DXB MUN 2027</span>
          <span ref={count} className="ld-count-num mono">000</span>
        </div>
        <span className="ld-skip mono">Press any key to skip</span>
      </div>
      <div ref={lines} className="ld-lines" />
      <div ref={word} className="ld-word"><span ref={text} className="ld-word-text" /></div>
    </div>
  );
}
