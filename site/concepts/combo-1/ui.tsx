// Small hero pieces copied from Alt 6 · Dispatch: teletype print, the stamp and the redacted "To be announced" chip.
import { useEffect, useState, type ReactNode } from 'react';
import { isStill } from '@/shared/hooks';
import { TBA } from './content';

export const STILL = isStill();

/**
 * Teletype print: characters appear one at a time with a block cursor. The unprinted rest keeps its space with
 * `visibility: hidden` (not transparency), so nothing reflows. Screen readers get the whole text at once.
 */
export function Type({ text, run = true, cps = 140, delay = 0, className }: { text: string; run?: boolean; cps?: number; delay?: number; className?: string }) {
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
  const cur = !done && run;
  return (
    <span className={'type' + (className ? ' ' + className : '')}>
      <span className="sr">{text}</span>
      <span aria-hidden="true">
        {text.slice(0, n)}
        {cur && <span className="type-cur">{text[n] === ' ' ? ' ' : text[n]}</span>}
        <span className="type-rest">{text.slice(n + (cur ? 1 : 0))}</span>
      </span>
    </span>
  );
}

/** A fact that is not known yet: a short redaction stub and "To be announced". Used sparingly. */
export function Redacted({ label = TBA }: { label?: string }) {
  return (
    <span className="rd-tba">
      <span className="rd-stub" aria-hidden="true" />
      <span className="rd-tba-t">{label}</span>
    </span>
  );
}

export function Stamp({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={'stamp' + (className ? ' ' + className : '')}>{children}</span>;
}
