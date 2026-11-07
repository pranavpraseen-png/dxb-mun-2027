// Dashboard ambient ("Tide"): the sign-in backdrop's kinetic type, slowed right down for the rooms people work in.
// Owner, 2026-11-07: "similar but more simpler, more relaxed on the eyes, in the dashboard, in a way you won't notice
// but it adds a lot".
//
// One line of DXB MUN sits at the foot of the work area, fitted to its width, half sunk below the bottom edge.
// A single slow swell of width and weight drifts through the letters (one pass every 48 s), like breathing.
// It arrives once, the way the loader does but quietly: thin letters open up over three seconds.
// Faint on purpose: paper at 5 to 7 % on the ground colour, the crest a touch warmer. No cursor, no flash, no blur.
// Cheap on purpose: 24 frames a second at most, nothing while the tab is hidden, still under reduced motion.
// Behind the content (z -1 inside the shell's isolated body), so cards, header and tab bar stay solid on top.
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import '@fontsource-variable/anybody/wdth.css';
import { charWidth, onReady, start, textWidth } from '../../concepts/combo-1/kinetic';
import './backdrop.css';

const WORD = 'DXB MUN';
const TRACK = -0.01;
const PAPER = [242, 239, 232];
const WARM = [255, 120, 40];
const FPS = 24;
const still = () => {
  try { return matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('still'); }
  catch { return false; }
};
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/**
 * Preview switch until the owner says it goes live: ?calm=1 shows it, ?calm=0 hides it.
 * AMBIENT_LIVE flips the default for everyone.
 */
const AMBIENT_LIVE = false;
export function ambientOn(): boolean {
  try {
    const v = new URLSearchParams(location.search).get('calm');
    if (v === '1') return true;
    if (v === '0') return false;
  } catch { /* no URL */ }
  return AMBIENT_LIVE;
}

export function Ambient() {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    const host = el?.parentElement;
    if (!el || !host) return;
    start();
    const row = el.querySelector<HTMLElement>('.amb-row')!;
    const spans = Array.from(row.querySelectorAll<HTMLElement>('.bd-c'));
    const chars = WORD.split('');
    const n = chars.length;
    const s = { open: 0, alpha: 0, t0: performance.now() };
    let F = 1, width = 1;
    let raf = 0, last = 0, alive = true;

    // Fit the line to the work area (the shell body, not the sidebar).
    const measure = () => {
      const r = host.getBoundingClientRect();
      width = r.width;
      F = width / textWidth(WORD, 100, 400, TRACK);
      el.style.left = `${r.left}px`;
      el.style.width = `${r.width}px`;
      row.style.fontSize = `${F.toFixed(2)}px`;
    };

    const paint = (now: number) => {
      const t = (now - s.t0) / 1000;
      const targetEm = width / F;
      let em = 0;
      for (let i = 0; i < n; i++) {
        // One swell travelling left to right, one pass every 48 s.
        const phase = Math.PI * 2 * (t / 48 - i / n);
        const wave = Math.sin(phase);
        const w = 50 + s.open * (50 + 32 * wave);
        const g = 160 + s.open * (240 + 170 * Math.sin(phase - 0.6));
        em += charWidth(chars[i], w, g) + TRACK;
        const crest = smooth(0.4, 1, wave);
        const o = 0.22 * crest;
        const c = PAPER.map((p, j) => Math.round(p + (WARM[j] - p) * o));
        const a = (0.048 + 0.026 * crest) * s.alpha;
        const sp = spans[i];
        sp.style.fontVariationSettings = `"wdth" ${w.toFixed(1)}, "wght" ${g.toFixed(0)}`;
        sp.style.color = `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(4)})`;
      }
      row.style.transform = `scaleX(${(targetEm / em).toFixed(4)})`;
    };

    const loop = (now: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(loop);
      if (document.hidden || now - last < 1000 / FPS) return;
      last = now;
      paint(now);
    };

    const ro = new ResizeObserver(() => onReady(() => { measure(); paint(performance.now()); }));
    onReady(() => {
      if (!alive) return;
      measure();
      row.style.visibility = 'visible';
      ro.observe(host);
      if (still()) { s.open = 1; s.alpha = 1; s.t0 = performance.now() - 12000; paint(performance.now()); return; }
      gsap.to(s, { alpha: 1, duration: 2.4, ease: 'sine.out', delay: 0.4 });
      gsap.to(s, { open: 1, duration: 3.2, ease: 'expo.out', delay: 0.5 });
      raf = requestAnimationFrame(loop);
    });
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      gsap.killTweensOf(s);
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={box} className="amb" aria-hidden="true">
      <div className="bd-row amb-row">
        {WORD.split('').map((c, i) => <span key={i} className="bd-c">{c === ' ' ? ' ' : c}</span>)}
      </div>
    </div>
  );
}
