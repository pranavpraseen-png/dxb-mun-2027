// NAME: Box breathing pacer
// IDEA: A square traced by one moving point paces box breathing (in 4, hold 4, out 4, hold 4), with the phase in big type and the three daily checks beside it.
// WHY: Guided pacing lowers arousal between sessions; a visible, predictable path removes the effort of counting, so people actually take the minute.
// WILD: Pace the whole room: the chair starts a recess and every delegate's phone in the committee breathes on the same clock.
import { useEffect, useRef, useState } from 'react';
import { Toggle } from '@base-ui/react/toggle';
import { wellness } from '@/data/conference';
import { isStill, useWellness } from '@/shared/hooks';
import './wellness-b.css';

const still = isStill();
const SIDE = 4; // seconds per side
const ROUNDS = 4;
const PHASES = ['Breathe in', 'Hold', 'Breathe out', 'Hold'] as const;
// Corners in the 0–100 box, in travel order: up the left, across the top, down the right, back along the bottom.
const C = [[0, 100], [0, 0], [100, 0], [100, 100]] as const;
const pad2 = (n: number) => String(n).padStart(2, '0');

export function WellnessB({ id = 'wellness' }: { id?: string }) {
  const w = useWellness();
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState(0);
  const [count, setCount] = useState(SIDE);
  const [round, setRound] = useState(0);
  const [finished, setFinished] = useState(false);
  const dot = useRef<SVGRectElement>(null);
  const edge = useRef<SVGLineElement>(null);
  const toggleRef = useRef(w.toggle);
  toggleRef.current = w.toggle;
  const checkedRef = useRef(w.checked);
  checkedRef.current = w.checked;

  const place = (ph: number, f: number) => {
    const [x0, y0] = C[ph], [x1, y1] = C[(ph + 1) % 4];
    const x = x0 + (x1 - x0) * f, y = y0 + (y1 - y0) * f;
    dot.current?.setAttribute('x', String(x - 3.2));
    dot.current?.setAttribute('y', String(y - 3.2));
    const e = edge.current;
    if (e) { e.setAttribute('x1', String(x0)); e.setAttribute('y1', String(y0)); e.setAttribute('x2', String(x)); e.setAttribute('y2', String(y)); }
  };

  useEffect(() => {
    if (!running) return;
    const t0 = performance.now();
    let raf = 0, lastPh = -1, lastCount = -1;
    const tick = (now: number) => {
      const e = (now - t0) / 1000;
      const total = SIDE * 4 * ROUNDS;
      if (e >= total) {
        place(0, 0); setRunning(false); setFinished(true); setPhase(0); setCount(SIDE); setRound(ROUNDS);
        if (!checkedRef.current.includes('breathe')) toggleRef.current('breathe');
        return;
      }
      const ph = Math.floor(e / SIDE) % 4;
      // Still / reduced motion: the point steps once a second instead of gliding.
      const within = (e % SIDE) / SIDE;
      place(ph, still ? Math.floor(within * SIDE) / SIDE : within);
      const c = SIDE - Math.floor(e % SIDE);
      if (ph !== lastPh) { lastPh = ph; setPhase(ph); }
      if (c !== lastCount) { lastCount = c; setCount(c); setRound(Math.floor(e / (SIDE * 4)) + 1); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  useEffect(() => { place(0, 0); }, []);

  const start = () => { setFinished(false); setPhase(0); setCount(SIDE); setRound(1); setRunning(true); };
  const stop = () => { setRunning(false); setPhase(0); setCount(SIDE); setRound(0); place(0, 0); };

  return (
    <section id={id} className={'wellb' + (running ? ' is-running' : '')} aria-labelledby={id + '-h'}>
      <div className="wellb-wrap">
        <div className="wellb-copy">
          <p className="wellb-label"><span>05</span>Wellness</p>
          <h2 className="wellb-h" id={id + '-h'}>{wellness.title}.</h2>
          <p className="wellb-sub">{wellness.intro} One minute of box breathing.</p>

          <div className="wellb-checks" role="group" aria-label="Today's check-in">
            {w.items.map((it, i) => {
              const on = w.checked.includes(it.id);
              return (
                <Toggle key={it.id} className="wellb-check" pressed={on} onPressedChange={() => w.toggle(it.id)}>
                  <span className="wellb-check-n">{pad2(i + 1)}</span>
                  <span className="wellb-check-l">{it.label}</span>
                  <span className="wellb-check-s">{on ? 'Done' : 'Not yet'}</span>
                </Toggle>
              );
            })}
          </div>
          <p className="wellb-status" aria-live="polite"><span>{w.status}</span><span>{w.note}</span></p>
        </div>

        <div className="wellb-pacer">
          <div className="wellb-box">
            <svg className="wellb-svg" viewBox="0 0 100 100" aria-hidden="true">
              <rect x="0" y="0" width="100" height="100" className="wellb-sq" />
              <line ref={edge} className="wellb-edge" x1="0" y1="100" x2="0" y2="100" />
              <rect ref={dot} className="wellb-dot" width="6.4" height="6.4" x="-3.2" y="96.8" />
            </svg>
            <span className="wellb-side wellb-side--l" aria-hidden="true">In</span>
            <span className="wellb-side wellb-side--t" aria-hidden="true">Hold</span>
            <span className="wellb-side wellb-side--r" aria-hidden="true">Out</span>
            <span className="wellb-side wellb-side--b" aria-hidden="true">Hold</span>
            <div className="wellb-centre" aria-live="polite">
              <span className="wellb-word">{running ? PHASES[phase] : finished ? 'Done.' : 'Ready.'}</span>
              <span className="wellb-count" aria-hidden={!running}>
                {running ? count : finished ? `${ROUNDS} rounds` : `${SIDE} · ${SIDE} · ${SIDE} · ${SIDE}`}
              </span>
            </div>
          </div>
          <div className="wellb-ctl">
            <button type="button" className={'wellb-btn' + (running ? ' is-stop' : '')} onClick={running ? stop : start}>
              {running ? 'Stop' : finished ? 'Again' : 'Start'}
            </button>
            <span className="wellb-round">
              {running ? <>Round <b>{round}</b> of {ROUNDS}</> : finished ? 'Breathe is checked for today.' : `${ROUNDS} rounds · about a minute`}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
