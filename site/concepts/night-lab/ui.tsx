// Small shared pieces: the edge-to-edge word, the scroll helper, media hooks.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { getLenis } from '@/shared/scroll';
import { deskStore } from './store';
import { still } from './motion';

export const NAV_H = 56;

/** Jump to a section through Lenis (one easing, 1.1 s). Desk rows open when you jump to them. */
export function go(id: string) {
  if (id === 'wellness' || id === 'resources' || id === 'contact') deskStore.set([id]);
  if (id === 'top') {
    const l = getLenis();
    if (l) l.scrollTo(0, { duration: 1.1 }); else window.scrollTo({ top: 0, behavior: still ? 'auto' : 'smooth' });
    return;
  }
  const el = document.getElementById(id);
  if (!el) return;
  const l = getLenis();
  const top = el.getBoundingClientRect().top + window.scrollY - NAV_H;
  if (l) l.scrollTo(top, { duration: 1.1, easing: (t) => cubic(t) });
  else window.scrollTo({ top, behavior: still ? 'auto' : 'smooth' });
}
// cubic-bezier(0.65,0.05,0,1) solved numerically, for Lenis' easing option.
function cubic(x: number) {
  const ax = 0.65, ay = 0.05, bx = 0, by = 1;
  let t = x;
  for (let i = 0; i < 8; i++) {
    const cx = 3 * ax * t * (1 - t) ** 2 + 3 * bx * t * t * (1 - t) + t ** 3 - x;
    const dx = 3 * ax * (1 - t) ** 2 + 6 * (bx - ax) * t * (1 - t) + 3 * (1 - bx) * t * t;
    if (Math.abs(dx) < 1e-6) break;
    t = Math.min(1, Math.max(0, t - cx / dx));
  }
  return 3 * ay * t * (1 - t) ** 2 + 3 * by * t * t * (1 - t) + t ** 3;
}

export function useMedia(q: string) {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [q]);
  return m;
}

/**
 * One word set edge to edge (Outfit's full-width wordmark). The font size is measured, then rounded DOWN
 * to a whole pixel so the type stays crisp.
 */
export function FitWord({ children, className, as: Tag = 'p', inset = 0, id }: { children: ReactNode; className?: string; as?: 'p' | 'h1' | 'h2' | 'div'; inset?: number; id?: string }) {
  const box = useRef<HTMLElement>(null);
  const word = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const b = box.current, w = word.current;
    if (!b || !w) return;
    const fit = () => {
      // optical sizing makes width non-linear in size, so converge on it, then step down to a whole pixel that fits
      const cs = getComputedStyle(b);
      const avail = b.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - inset;
      let size = 100;
      for (let i = 0; i < 4; i++) {
        w.style.fontSize = size + 'px';
        const width = w.getBoundingClientRect().width;
        if (!(width > 0)) return;
        const next = Math.floor((size * avail) / width);
        if (next === size) break;
        size = next;
      }
      w.style.fontSize = size + 'px';
      while (size > 8 && w.getBoundingClientRect().width > avail) w.style.fontSize = --size + 'px';
    };
    fit();
    document.fonts?.ready.then(fit);
    // fonts can finish after `ready` resolves (they load on first use): refit when any face lands
    document.fonts?.addEventListener('loadingdone', fit);
    const ro = new ResizeObserver(fit);
    ro.observe(b);
    return () => { ro.disconnect(); document.fonts?.removeEventListener('loadingdone', fit); };
  }, [inset]);
  return (
    <Tag ref={box as never} className={'fit ' + (className ?? '')} id={id}>
      <span ref={word} className="fit-w">{children}</span>
    </Tag>
  );
}

/** Split a string into per-character spans inside a mask (for letters rising behind a line, Outfit). */
export function Chars({ text, className }: { text: string; className?: string }) {
  return (
    <span className={'chars ' + (className ?? '')}>
      <span className="sr">{text}</span>
      {[...text].map((c, i) => (
        <span key={i} className="ch-m" aria-hidden="true"><span className="ch">{c === ' ' ? ' ' : c}</span></span>
      ))}
    </span>
  );
}
