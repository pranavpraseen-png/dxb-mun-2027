// Igloo's decode: random glyphs resolve into the real text, left to right. No blur, no fade.
// The real text holds the space (invisible ghost) so nothing around it jumps; screen readers get the real text.
import { useLayoutEffect, useRef } from 'react';

const UP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/_=+<>';
const LO = 'abcdefghijklmnopqrstuvwxyz0123456789/_=+';
const pick = (set: string) => set[Math.floor(Math.random() * set.length)];

type Props = { text: string; play?: boolean; delay?: number; dur?: number; className?: string };
export function Scramble({ text, play = true, delay = 0, dur = 0.7, className }: Props) {
  const live = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = live.current;
    if (!el) return;
    if (!play) { el.textContent = ''; return; }
    let raf = 0;
    const t0 = performance.now() + delay * 1000;
    const len = text.length;
    const frame = (t: number) => {
      const p = (t - t0) / (dur * 1000);
      if (p >= 1) { el.textContent = text; return; }
      let s = '';
      for (let i = 0; i < len; i++) {
        const ch = text[i];
        const at = (i / Math.max(1, len)) * 0.6; // this character starts scrambling here…
        if (ch === ' ' || ch === '\n') s += ch;
        else if (p > at + 0.4) s += ch; // …and settles 0.4 later
        else if (p > at) s += pick(ch === ch.toLowerCase() && ch !== ch.toUpperCase() ? LO : UP);
        else s += ' ';
      }
      el.textContent = s;
      raf = requestAnimationFrame(frame);
    };
    el.textContent = '';
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [text, play, delay, dur]);
  return (
    <span className={'scr' + (className ? ' ' + className : '')}>
      <span className="sr">{text}</span>
      <span className="scr-ghost" aria-hidden="true">{text}</span>
      <span className="scr-live" aria-hidden="true" ref={live} />
    </span>
  );
}
