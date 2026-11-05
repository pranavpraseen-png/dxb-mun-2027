import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, ChevronUp, Shuffle } from 'lucide-react';
import clsx from 'clsx';
import { committees } from '@/data/conference';
import { useStill } from '@/shared/hooks';
import { Keyed } from './ui';

const N = committees.length;
const pad = (n: number) => String(n).padStart(2, '0');


export function Channels() {
  const still = useStill();
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const [typed, setTyped] = useState('');
  const typedTimer = useRef<number | undefined>(undefined);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const c = committees[idx];

  const go = useCallback((next: number, d = 1) => {
    setDir(d);
    setIdx(((next % N) + N) % N);
  }, []);
  const up = useCallback(() => go(idx + 1, 1), [go, idx]);
  const down = useCallback(() => go(idx - 1, -1), [go, idx]);

  // Type a channel number like on a remote: "1", then "2" within a moment, tunes to channel 12.
  const typeDigit = (d: string) => {
    window.clearTimeout(typedTimer.current);
    const buf = (typed + d).slice(-2);
    const n = parseInt(buf, 10);
    const commit = (v: number) => { if (v >= 1 && v <= N) go(v - 1, v - 1 >= idx ? 1 : -1); setTyped(''); };
    if (buf.length === 2 || n * 10 > N) commit(n);
    else { setTyped(buf); typedTimer.current = window.setTimeout(() => commit(n), 900); }
  };
  useEffect(() => () => window.clearTimeout(typedTimer.current), []);

  const onKey = (e: React.KeyboardEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest('input, textarea')) return;
    if (['ArrowUp', 'ArrowRight', 'PageUp'].includes(e.key)) { e.preventDefault(); up(); }
    else if (['ArrowDown', 'ArrowLeft', 'PageDown'].includes(e.key)) { e.preventDefault(); down(); }
    else if (e.key === 'Home') { e.preventDefault(); go(0, -1); }
    else if (e.key === 'End') { e.preventDefault(); go(N - 1, 1); }
    else if (/^[0-9]$/.test(e.key)) { e.preventDefault(); typeDigit(e.key); }
  };

  const surprise = () => {
    let n = idx;
    while (n === idx) n = Math.floor(Math.random() * N);
    go(n, n > idx ? 1 : -1);
  };

  const t = still ? { duration: 0 } : undefined;

  return (
    <section id="committees" className="sec channels" aria-labelledby="ch-title" onKeyDown={onKey}>
      <div className="sec-head">
        <Keyed id="ch-title" className="sec-title">Committees</Keyed>
        <p className="sec-dek">
          {N} committees, one per channel. Change channel with the buttons, the arrow keys, a swipe, or by typing a number.
        </p>
      </div>

      <div className="ch-layout">
        <div
          className="ch-screen"
          tabIndex={0}
          role="group"
          aria-roledescription="channel viewer"
          aria-label={`Channel ${idx + 1} of ${N}: ${c.abbr}, ${c.name}. Use arrow keys to change channel.`}
          onPointerDown={(e) => { swipe.current = { x: e.clientX, y: e.clientY }; }}
          onPointerUp={(e) => {
            const s = swipe.current; swipe.current = null;
            if (!s) return;
            const dx = e.clientX - s.x, dy = e.clientY - s.y;
            if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) (dx < 0 ? up : down)();
          }}
        >
          <svg className="ch-testcard" viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <circle cx="120" cy="45" r="34" />
            <circle cx="120" cy="45" r="22" />
            <line x1="80" y1="45" x2="160" y2="45" />
            <line x1="120" y1="0" x2="120" y2="90" />
          </svg>

          <div className="ch-osd" aria-hidden="true">
            <span className="ch-osd-k">CH</span>
            <span className="ch-osd-n">{typed ? typed.padEnd(2, '_') : pad(idx + 1)}</span>
          </div>
          <p className="ch-of" aria-hidden="true">{pad(idx + 1)} / {N}</p>

          <AnimatePresence initial={false} mode="popLayout" custom={dir}>
            <motion.div
              key={idx}
              className="ch-program"
              initial={{ scaleY: 0.012, opacity: 1 }}
              animate={{ scaleY: 1, opacity: 1, transition: t ?? { duration: 0.32, ease: [0.3, 0.7, 0.2, 1] } }}
              exit={{ scaleY: 0.012, opacity: 0, transition: t ?? { duration: 0.16, ease: 'easeIn' } }}
            >
              <p className="ch-abbr" style={{ ['--len' as string]: Math.max(c.abbr.length, 3) }} aria-hidden="true">{c.abbr}</p>
              <div className="ch-l3">
                <span className="ch-l3-tag">{c.abbr}</span>
                <h3 className="ch-l3-name">{c.name}</h3>
              </div>
            </motion.div>
          </AnimatePresence>

        </div>

        <div className="ch-remote" aria-label="Channel controls" role="group">
          <button type="button" className="rm-btn" onClick={up} aria-label="Next channel">
            <ChevronUp size={26} aria-hidden="true" />
            <span>CH +</span>
          </button>
          <div className="rm-read" aria-hidden="true">
            <span>{pad(idx + 1)}</span>
          </div>
          <button type="button" className="rm-btn" onClick={down} aria-label="Previous channel">
            <ChevronDown size={26} aria-hidden="true" />
            <span>CH −</span>
          </button>
          <button type="button" className="rm-btn rm-btn--wide" onClick={surprise}>
            <Shuffle size={20} aria-hidden="true" />
            <span>Random</span>
          </button>
        </div>

        <nav className="ch-guide" aria-label="All committees">
          <ul>
            {committees.map((k, i) => (
              <li key={k.abbr}>
                <button
                  type="button"
                  className={clsx('ch-item', i === idx && 'is-on')}
                  aria-current={i === idx ? 'true' : undefined}
                  aria-label={`Channel ${i + 1}: ${k.abbr}, ${k.name}`}
                  title={k.name}
                  onClick={() => go(i, i >= idx ? 1 : -1)}
                >
                  <span className="ch-item-n">{pad(i + 1)}</span>
                  <span className="ch-item-a">{k.abbr}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <p className="sr-only" aria-live="polite">{`Channel ${idx + 1} of ${N}: ${c.abbr}, ${c.name}`}</p>
    </section>
  );
}
