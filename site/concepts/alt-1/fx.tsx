// Small shared helpers for Alt 1: scroll progress (GSAP ScrollTrigger, kept in sync with Lenis by src/shared/scroll),
// fitted edge-to-edge type, a counting number (NumberFlow) and the cursor disc (Outfit).
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import NumberFlow from '@number-flow/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/** Calls `cb(progress)` while the element scrolls from its top at the viewport top to its bottom at the viewport bottom. */
export function useProgress(ref: React.RefObject<HTMLElement | null>, cb: (p: number) => void, enabled = true) {
  const fn = useRef(cb);
  fn.current = cb;
  useEffect(() => {
    if (!enabled || !ref.current) return;
    const st = ScrollTrigger.create({
      trigger: ref.current,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (s) => fn.current(s.progress),
      onRefresh: (s) => fn.current(s.progress),
    });
    fn.current(st.progress);
    return () => st.kill();
  }, [ref, enabled]);
}

/** Sets a whole-pixel font size so one line of text runs exactly edge to edge of its parent. */
export function useFit(ref: React.RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      const parent = el.parentElement!;
      const avail = parent.clientWidth - parseFloat(getComputedStyle(parent).paddingLeft) - parseFloat(getComputedStyle(parent).paddingRight);
      el.style.fontSize = '100px';
      const w = el.scrollWidth;
      if (w > 0) el.style.fontSize = Math.floor((avail / w) * 100) + 'px';
    };
    fit();
    document.fonts?.ready.then(fit);
    const ro = new ResizeObserver(fit);
    ro.observe(el.parentElement!);
    return () => ro.disconnect();
  }, [ref]);
}

/** A number that counts up (NumberFlow) the first time it scrolls into view. */
export function Count({ to, digits = 1, still }: { to: number; digits?: number; still: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [v, setV] = useState(still ? to : 0);
  useEffect(() => {
    if (still) { setV(to); return; }
    const el = ref.current!;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(to); io.disconnect(); } }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, [to, still]);
  return (
    <span ref={ref} className="count">
      <NumberFlow value={v} format={{ minimumIntegerDigits: digits, useGrouping: false }} animated={!still} />
    </span>
  );
}

/** The cursor dot that grows into a labelled disc over anything with data-cursor (desktop pointers only). */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [fine] = useState(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  useEffect(() => {
    if (!fine) return;
    const move = (e: PointerEvent) => {
      if (dot.current) dot.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      const t = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-cursor]');
      setLabel(t ? t.dataset.cursor ?? null : null);
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, [fine]);
  if (!fine) return null;
  return (
    <div ref={dot} className={'cursor' + (label ? ' cursor--on' : '')} aria-hidden="true">
      <span className="cursor-disc"><span className="mono">{label}</span></span>
    </div>
  );
}
