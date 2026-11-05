import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import NumberFlow from '@number-flow/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { committees } from '@/data/conference';

// Three orbits: 5 + 7 + 7 = 19 nodes, in the live site's order.
const RINGS = [
  { from: 0, count: 5, radius: 0.2 },
  { from: 5, count: 7, radius: 0.32 },
  { from: 12, count: 7, radius: 0.445 },
] as const;
const ringOf = (i: number) => RINGS.findIndex((r) => i >= r.from && i < r.from + r.count);
const slotAngle = (i: number) => {
  const r = RINGS[ringOf(i)];
  const offset = ringOf(i) * 17; // stagger the rings so labels don't stack on one spoke
  return -90 + offset + ((i - r.from) * 360) / r.count;
};

export default function Committees({ still, head }: { still: boolean; head?: ReactNode }) {
  const [sel, setSel] = useState(0);
  const [listOpen, setListOpen] = useState(false);
  // Accumulated rotation per ring, so a ring always turns the short way round.
  const [rot, setRot] = useState<number[]>(() => RINGS.map((_, k) => (k === 0 ? -(slotAngle(0) + 90) : 0)));
  const orbitRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null);

  const select = useCallback((i: number, focus = false) => {
    const n = (i + committees.length) % committees.length;
    const k = ringOf(n);
    setRot((prev) => {
      const next = [...prev];
      const target = -(slotAngle(n) + 90); // bring the node to 12 o'clock
      let d = (target - prev[k]) % 360;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      next[k] = prev[k] + d;
      return next;
    });
    setSel(n);
    if (focus) requestAnimationFrame(() => nodeRefs.current[n]?.focus({ preventScroll: true }));
  }, []);

  const onKey = (e: KeyboardEvent) => {
    const map: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (e.key in map) { e.preventDefault(); select(sel + map[e.key], true); }
    else if (e.key === 'Home') { e.preventDefault(); select(0, true); }
    else if (e.key === 'End') { e.preventDefault(); select(committees.length - 1, true); }
  };

  // Touch: a horizontal swipe on the orbit steps to the next or previous committee.
  const onDown = (e: PointerEvent) => { if (e.pointerType !== 'mouse') swipe.current = { x: e.clientX, y: e.clientY, id: e.pointerId }; };
  const onUp = (e: PointerEvent) => {
    const s = swipe.current; swipe.current = null;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.4) select(sel + (dx < 0 ? 1 : -1));
  };

  const c = committees[sel];
  const k = ringOf(sel);

  return (
    <div className={'cm' + (still ? ' is-still' : '')}>
      <div className="cm-orbit-wrap">
        <div
          ref={orbitRef}
          className="cm-orbit"
          role="radiogroup"
          aria-label="Committees"
          onKeyDown={onKey}
          onPointerDown={onDown}
          onPointerUp={onUp}
          onPointerCancel={() => (swipe.current = null)}
        >
          <svg className="cm-rings" viewBox="-100 -100 200 200" aria-hidden="true">
            {Array.from({ length: 72 }, (_, t) => {
              const a = (t * 5 * Math.PI) / 180;
              const major = t % 6 === 0;
              const r1 = 49.2, r2 = major ? 47.2 : 48.2;
              return <line key={t} x1={Math.cos(a) * r1 * 2} y1={Math.sin(a) * r1 * 2} x2={Math.cos(a) * r2 * 2} y2={Math.sin(a) * r2 * 2} className={major ? 'tk tk-major' : 'tk'} />;
            })}
            {RINGS.map((r, i) => (
              <circle key={i} r={r.radius * 200} className={'ring' + (i === k ? ' ring-on' : '')} />
            ))}
            <line x1="0" y1="0" x2="0" y2={-RINGS[k].radius * 200} className="spoke" />
            <circle r="15" className="hub" />
          </svg>

          <div className="cm-hub" aria-hidden="true">
            <span className="cm-hub-n">
              <NumberFlow value={sel + 1} format={{ minimumIntegerDigits: 2 }} animated={!still} />
            </span>
            <span className="cm-hub-of">of 19</span>
          </div>

          {RINGS.map((r, ri) => (
            <div key={ri} className="cm-ring" style={{ transform: `rotate(${rot[ri]}deg)` }}>
              {committees.slice(r.from, r.from + r.count).map((cm, j) => {
                const i = r.from + j;
                const a = slotAngle(i);
                const on = i === sel;
                return (
                  <div
                    key={cm.abbr}
                    className="cm-slot"
                    style={{ transform: `rotate(${a}deg) translateX(calc(${r.radius} * 100cqi))` }}
                  >
                    <button
                      ref={(el) => { nodeRefs.current[i] = el; }}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-label={`${cm.abbr}: ${cm.name}`}
                      tabIndex={on ? 0 : -1}
                      className={'cm-node' + (on ? ' is-on' : '')}
                      style={{ transform: `rotate(${-a - rot[ri]}deg)` }}
                      onClick={() => select(i)}
                    >
                      <span className="cm-dot" />
                      <span className="cm-abbr">{cm.abbr}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="cm-panel">
        {head}
        <div className="cm-readout">
          <span className="mono dim">Committee</span>
          <span className="mono dim">
            <NumberFlow value={sel + 1} format={{ minimumIntegerDigits: 2 }} animated={!still} /> / 19
          </span>
        </div>
        <div className="cm-title" aria-live="polite">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={c.abbr}
              initial={still ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.24, ease: [0.2, 0.7, 0.1, 1] }}
            >
              <p className="cm-big">{c.abbr}</p>
              <h3 className="cm-name">{c.name}</h3>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="cm-step">
          <button type="button" className="btn btn-ghost btn-icon" onClick={() => select(sel - 1)} aria-label="Previous committee">
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <button type="button" className="btn btn-ghost btn-icon" onClick={() => select(sel + 1)} aria-label="Next committee">
            <ChevronRight size={18} aria-hidden="true" />
          </button>
          <span className="mono dim cm-hint">Arrow keys, tap or swipe</span>
        </div>

        <div className="cm-index">
          <button type="button" className="mono cm-index-b" aria-expanded={listOpen} aria-controls="cm-list" onClick={() => setListOpen((o) => !o)}>
            <span aria-hidden="true" className="cm-index-i">{listOpen ? '−' : '+'}</span>
            {listOpen ? 'Hide the list' : 'All 19 committees'}
          </button>
          <ol id="cm-list" className="cm-list" hidden={!listOpen}>
            {committees.map((cm, i) => (
              <li key={cm.abbr}>
                <button type="button" className={'cm-row' + (i === sel ? ' is-on' : '')} onClick={() => select(i)} aria-pressed={i === sel}>
                  <span className="mono cm-row-a">{cm.abbr}</span>
                  <span className="cm-row-n">{cm.name}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
