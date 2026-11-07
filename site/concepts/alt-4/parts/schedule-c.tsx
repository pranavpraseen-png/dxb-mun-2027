// NAME: Now boarding
// IDEA: The schedule as an airport departures board: one split-flap line per slot, and picking a day makes the whole board clatter over to that day's programme, with committee sessions in orange.
// WHY: Everyone already knows how to read a departures board (zero learning cost, recognition over recall); the flip is a clear, short signal that the content changed, and it settles in about a second.
// WILD: Run the board live on the day: the current slot reads BOARDING, the next one flips to GATE OPEN ten minutes before, and each committee room gets its own gate number.
import { useEffect, useRef, useState } from 'react';
import { Tabs } from '@base-ui/react/tabs';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { conference, schedule, tba, type Slot } from '@/data/conference';
import { isStill } from '@/shared/hooks';
import './schedule-c.css';

gsap.registerPlugin(ScrollTrigger);

const W = { time: 8, event: 19, until: 8, dur: 6 } as const;
const ROWS = Math.max(...schedule.map((d) => d.slots.length));
const STEP = 46; // ms per flap
const POOL = 'ABCDEFGHIJKLMNOPRSTUVWXYZ0123456789';
const pad2 = (n: number) => String(n).padStart(2, '0');

const isSession = (s: Slot) => /^Committee Session/.test(s.name);
/** "1 hour 30 minutes" → "1H 30M": the data's own duration, in board shorthand. */
const short = (d: string) => {
  const h = /(\d+)\s*hour/.exec(d), m = /(\d+)\s*minute/.exec(d);
  return [h ? `${h[1]}H` : '', m ? `${m[1]}M` : ''].filter(Boolean).join(' ');
};
const fit = (s: string, n: number, right = false) => (right ? s.padStart(n) : s.padEnd(n)).slice(0, n).toUpperCase();
const lines = (day: number) => {
  const d = schedule.find((x) => x.day === day)!;
  return Array.from({ length: ROWS }, (_, r) => {
    const s = d.slots[r];
    if (!s) return { time: '', event: '', until: '', dur: '', session: false };
    const [from, to = ''] = s.time.split(' – ');
    return { time: fit(from, W.time, true), event: fit(s.name, W.event), until: fit(to, W.until, true), dur: fit(short(s.duration), W.dur, true), session: isSession(s) };
  });
};

/** One flap. A change of `ch` passes through a few letters (fewer when the gap is small) and lands. Same char: no flip. */
function Cell({ ch, delay, seed, instant }: { ch: string; delay: number; seed: number; instant: boolean }) {
  const target = ch || ' ';
  const [st, setSt] = useState(() => ({ cur: instant ? target : ' ', prev: ' ', step: 0 }));
  const cur = useRef(st.cur);
  const gen = useRef(0);
  useEffect(() => {
    if (instant) { cur.current = target; setSt({ cur: target, prev: target, step: 0 }); return; }
    if (cur.current === target) return;
    gen.current += 1;
    const n = target === ' ' ? 1 : 1 + ((seed + gen.current) % 3);
    const seq = Array.from({ length: n - 1 }, (_, i) => POOL[(seed * 13 + gen.current * 7 + i * 5) % POOL.length]).concat(target);
    const timers = seq.map((c, i) => window.setTimeout(() => {
      setSt((s) => ({ cur: c, prev: s.cur, step: s.step + 1 }));
      cur.current = c;
    }, delay + i * STEP));
    return () => timers.forEach(clearTimeout);
  }, [target, delay, seed, instant]);
  const { cur: c, prev, step } = st;
  return (
    <span className="schedulec-cell">
      <span className="schedulec-h schedulec-t"><span>{c}</span></span>
      <span className="schedulec-h schedulec-b"><span>{step ? prev : c}</span></span>
      {step > 0 && (
        <>
          <span key={'f' + step} className="schedulec-h schedulec-t schedulec-fall"><span>{prev}</span></span>
          <span key={'l' + step} className="schedulec-h schedulec-b schedulec-land"><span>{c}</span></span>
        </>
      )}
    </span>
  );
}

function Field({ text, n, row, col, on, instant, cls }: { text: string; n: number; row: number; col: number; on: boolean; instant: boolean; cls: string }) {
  return (
    <span className={'schedulec-f ' + cls} style={{ '--k': n } as React.CSSProperties}>
      {Array.from({ length: n }, (_, i) => (
        <Cell key={i} ch={on ? text[i] ?? ' ' : ' '} delay={row * 70 + (col + i) * 9} seed={row * 41 + col + i} instant={instant} />
      ))}
    </span>
  );
}

export function ScheduleC({ id }: { id?: string }) {
  const sid = id ?? 'schedule';
  const still = isStill();
  const [day, setDay] = useState(1);
  const [on, setOn] = useState(still);
  const board = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (still || !board.current) return;
    // Scroll only starts the first flip (once); the board then changes only when a day is picked.
    const st = ScrollTrigger.create({ trigger: board.current, start: 'top 80%', once: true, onEnter: () => setOn(true) });
    return () => st.kill();
  }, [still]);

  const rows = lines(day);
  const d = schedule.find((x) => x.day === day)!;
  return (
    <section id={sid} className="schedulec" aria-labelledby={sid + '-h'}>
      <div className="schedulec-wrap">
        <p className="schedulec-label"><span>03</span>Schedule</p>
        <div className="schedulec-head">
          <h2 className="schedulec-h2" id={sid + '-h'}>Now boarding.</h2>
          <p className="schedulec-sub">Pick a day. Dates {tba(conference.dates).toLowerCase()}.</p>
        </div>

        <Tabs.Root className="schedulec-tabs" value={day} onValueChange={(v) => { setDay(Number(v)); setOn(true); }}>
          <Tabs.List className="schedulec-days" aria-label="Pick a day">
            {schedule.map((x) => (
              <Tabs.Tab key={x.day} value={x.day} className="schedulec-day">
                <span>{pad2(x.day)}</span>{x.label}
              </Tabs.Tab>
            ))}
          </Tabs.List>

          <Tabs.Panel value={day} className="schedulec-panel" keepMounted>
            <div className="schedulec-board" ref={board}>
              <div className="schedulec-bar" aria-hidden="true">
                <b>Departures</b>
                <span>{conference.edition} · {d.label} · {d.slots.length} slots</span>
              </div>
              <div className="schedulec-cols" aria-hidden="true">
                <span className="schedulec-f is-time" style={{ '--k': W.time } as React.CSSProperties}>Time</span>
                <span className="schedulec-f is-event" style={{ '--k': W.event } as React.CSSProperties}>Event</span>
                <span className="schedulec-f is-until" style={{ '--k': W.until } as React.CSSProperties}>Until</span>
                <span className="schedulec-f is-dur" style={{ '--k': W.dur } as React.CSSProperties}>Length</span>
              </div>
              <ol className="schedulec-rows" aria-hidden="true">
                {rows.map((r, i) => (
                  <li key={i} className={'schedulec-row' + (r.session ? ' is-session' : '') + (r.time ? '' : ' is-empty')}>
                    <i className="schedulec-mark" />
                    <Field text={r.time} n={W.time} row={i} col={0} on={on} instant={still} cls="is-time" />
                    <Field text={r.event} n={W.event} row={i} col={W.time} on={on} instant={still} cls="is-event" />
                    <Field text={r.until} n={W.until} row={i} col={W.time + W.event} on={on} instant={still} cls="is-until" />
                    <Field text={r.dur} n={W.dur} row={i} col={W.time + W.event + W.until} on={on} instant={still} cls="is-dur" />
                  </li>
                ))}
              </ol>
              <table className="schedulec-sr">
                <caption>{d.label}</caption>
                <thead><tr><th>Time</th><th>Event</th><th>Duration</th></tr></thead>
                <tbody>{d.slots.map((s) => <tr key={s.name + s.time}><td>{s.time}</td><td>{s.name}</td><td>{s.duration}</td></tr>)}</tbody>
              </table>
            </div>
          </Tabs.Panel>
        </Tabs.Root>
        <p className="schedulec-key" aria-hidden="true"><i />Committee session</p>
      </div>
    </section>
  );
}
