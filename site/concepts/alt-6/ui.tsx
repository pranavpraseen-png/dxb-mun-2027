// Small pieces every cable uses: teletype print, redaction bars, stamps. All hard-edged; nothing fades or blurs.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { isStill } from '@/shared/hooks';
import { TBA } from './content';

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };
export const STILL = isStill();
/** The one UI curve (Lando Norris): a fast middle and a long settle. */
export const EASE = 'dispatch';
gsap.registerEase(EASE, (p: number) => bezier(0.65, 0.05, 0, 1, p));
export const NAV_H = 56;

function bezier(x1: number, y1: number, x2: number, y2: number, x: number) {
  // solve x(t) = x by Newton, return y(t)
  let t = x;
  for (let i = 0; i < 8; i++) {
    const cx = 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t * t * (1 - t) + t ** 3 - x;
    const d = 3 * x1 * (1 - t) ** 2 + 6 * (x2 - x1) * t * (1 - t) + 3 * (1 - x2) * t * t;
    if (Math.abs(d) < 1e-6) break;
    t = Math.min(1, Math.max(0, t - cx / d));
  }
  return 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t * t * (1 - t) + t ** 3;
}

/** Fires once when the element scrolls into view (or straight away in still mode). */
export function useOnView<T extends HTMLElement>(start = 'top 86%') {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(STILL);
  useEffect(() => {
    if (STILL || !ref.current) return;
    const st = ScrollTrigger.create({ trigger: ref.current, start, once: true, onEnter: () => setSeen(true) });
    return () => st.kill();
  }, [start]);
  return [ref, seen] as const;
}

/**
 * Teletype print: characters appear one at a time with a block cursor. The unprinted rest keeps its space with
 * `visibility: hidden` (not transparency), so nothing reflows. Screen readers get the whole text at once.
 */
export function Type({ text, run = true, cps = 140, delay = 0, className, cursor = true }: { text: string; run?: boolean; cps?: number; delay?: number; className?: string; cursor?: boolean }) {
  const [n, setN] = useState(STILL ? text.length : 0);
  useEffect(() => {
    if (STILL) { setN(text.length); return; }
    if (!run) { setN(0); return; }
    let raf = 0;
    const t0 = performance.now() + delay * 1000;
    setN(0);
    const tick = (now: number) => {
      const k = Math.max(0, Math.floor(((now - t0) / 1000) * cps));
      setN(Math.min(text.length, k));
      if (k < text.length) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, run, cps, delay]);
  const done = n >= text.length;
  return (
    <span className={'type' + (className ? ' ' + className : '')}>
      <span className="sr">{text}</span>
      <span aria-hidden="true">
        {text.slice(0, n)}
        {!done && cursor && run && <span className="type-cur">{text[n] === ' ' ? ' ' : text[n]}</span>}
        <span className="type-rest">{text.slice(n + (!done && cursor && run ? 1 : 0))}</span>
      </span>
    </span>
  );
}

/** A redaction bar over known text that slides off to the right when it scrolls into view. */
export function Bar({ children, delay = 0, className, start }: { children: ReactNode; delay?: number; className?: string; start?: string }) {
  const wrap = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    if (STILL || !bar.current || !wrap.current) return;
    const tw = gsap.to(bar.current, { xPercent: 101, duration: 0.75, ease: EASE, delay, paused: true });
    const st = ScrollTrigger.create({ trigger: wrap.current, start: start ?? 'top 88%', once: true, onEnter: () => tw.play() });
    return () => { st.kill(); tw.kill(); };
  }, [delay, start]);
  return (
    <span ref={wrap} className={'rd' + (className ? ' ' + className : '')}>
      {children}
      {!STILL && <span ref={bar} className="rd-bar" aria-hidden="true" />}
    </span>
  );
}

/** A fact: known values sit under a bar that slides off; unknown ones stay redacted and read "To be announced". */
export function Redact({ value, delay = 0, start }: { value: string | null | undefined; delay?: number; start?: string }) {
  if (value) return <Bar delay={delay} start={start}>{value}</Bar>;
  return (
    <span className="rd-tba">
      <span className="rd-stub" aria-hidden="true" />
      <span className="rd-tba-t">{TBA}</span>
    </span>
  );
}

export function Stamp({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={'stamp' + (className ? ' ' + className : '')}>{children}</span>;
}

/** Cable header line: CABLE 01 / 07 · FROM … · SUBJ …, printed when the cable arrives. */
export function CableHead({ n, subj, stamp }: { n: string; subj: string; stamp?: string }) {
  const [ref, seen] = useOnView<HTMLDivElement>('top 90%');
  const text = `CABLE ${n} / 07 · FROM: SECRETARIAT · TO: ALL DELEGATIONS · SUBJ: ${subj.toUpperCase()}`;
  return (
    <div className="cable-head" ref={ref}>
      <span className="ch-zc" aria-hidden="true">ZCZC</span>
      <Type text={text} run={seen} cps={160} className="ch-meta" />
      {stamp && <Stamp className="ch-stamp">{stamp}</Stamp>}
    </div>
  );
}

export function CableEnd({ n }: { n: string }) {
  return (
    <div className="cable-end" aria-hidden="true">
      <span>END CABLE {n}</span>
      <span>NNNN</span>
    </div>
  );
}
