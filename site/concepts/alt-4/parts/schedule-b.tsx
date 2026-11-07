// NAME: One clock
// IDEA: All three days as three tracks on one shared clock axis, so the days line up and compare at a glance; a time cursor follows the pointer across all three and reads out what is on each day at that moment.
// WHY: Comparison needs alignment (pre-attentive: position on a common scale is the most accurately read visual channel); seeing all 3 days at once removes the tab-switch memory load, and orange sessions pop out first.
// WILD: Your day, not the day: pick your committee and the tracks fade to only your sessions, with the gaps between them labelled as free time to plan lunch or a chit.
import { useEffect, useMemo, useRef, useState } from 'react';
import { conference, schedule, tba, type Slot } from '@/data/conference';
import './schedule-b.css';

/** "12:30 PM" → minutes after midnight. */
const clock = (t: string) => {
  const m = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(t);
  if (!m) return 0;
  const h = (Number(m[1]) % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0);
  return h * 60 + Number(m[2]);
};
/** "1 hour 30 minutes" → 90. */
const mins = (d: string) => {
  const h = /(\d+)\s*hour/.exec(d), m = /(\d+)\s*minute/.exec(d);
  return (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
};
const fmt = (m: number) => {
  const h = Math.floor(m / 60), mm = m % 60;
  return `${((h + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};
const hourLabel = (h: number) => `${((h + 11) % 12) + 1} ${h >= 12 ? 'PM' : 'AM'}`;
const isSession = (s: Slot) => /^Committee Session/.test(s.name);
const isPause = (s: Slot) => /^(Break|Lunch)$/.test(s.name);

type Block = Slot & { a: number; b: number; day: number; k: string };
const days = schedule.map((d) => ({
  ...d,
  blocks: d.slots.map((s, i) => { const a = clock(s.time.split(' – ')[0]); return { ...s, a, b: a + mins(s.duration), day: d.day, k: `${d.day}-${i}` }; }) as Block[],
}));
const all = days.flatMap((d) => d.blocks);
const T0 = Math.floor(Math.min(...all.map((b) => b.a)) / 60) * 60;
const T1 = Math.ceil(Math.max(...all.map((b) => b.b)) / 60) * 60;
const SPAN = T1 - T0;
const hours = Array.from({ length: SPAN / 60 + 1 }, (_, i) => T0 / 60 + i);
const at = (d: (typeof days)[number], t: number) => d.blocks.find((b) => t >= b.a && t < b.b);
// The cursor starts at the first moment when the most days are in committee session (worked out from the data).
const START = (() => {
  let best = T0, n = -1;
  for (let t = T0; t < T1; t += 5) {
    const c = days.filter((d) => { const b = at(d, t); return b && isSession(b); }).length;
    if (c > n) { n = c; best = t; }
  }
  return best;
})();

function useVertical() {
  const q = '(max-width: 860px)';
  const [v, setV] = useState(() => matchMedia(q).matches);
  useEffect(() => { const mq = matchMedia(q); const on = () => setV(mq.matches); mq.addEventListener('change', on); return () => mq.removeEventListener('change', on); }, []);
  return v;
}

export function ScheduleB({ id }: { id?: string }) {
  const sid = id ?? 'schedule';
  const vertical = useVertical();
  const area = useRef<HTMLDivElement>(null);
  const [t, setT] = useState(START);
  const [pin, setPin] = useState<string | null>(null); // the block under the pointer or focus
  const [size, setSize] = useState(1200);

  useEffect(() => {
    const el = area.current; if (!el) return;
    const ro = new ResizeObserver(() => setSize(vertical ? el.clientHeight : el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [vertical]);

  const pxPerMin = size / SPAN;
  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    const r = area.current!.getBoundingClientRect();
    const f = vertical ? (e.clientY - r.top) / r.height : (e.clientX - r.left) / r.width;
    setT(Math.max(T0, Math.min(T1 - 5, Math.round((T0 + f * SPAN) / 5) * 5)));
  };
  const onKey = (e: React.KeyboardEvent) => {
    const next = { ArrowRight: 15, ArrowDown: 15, ArrowLeft: -15, ArrowUp: -15 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    setPin(null);
    setT((v) => Math.max(T0, Math.min(T1 - 5, v + next)));
  };

  const now = useMemo(() => days.map((d) => at(d, t)), [t]);
  const pos = (t - T0) / SPAN;

  return (
    <section id={sid} className="scheduleb" aria-labelledby={sid + '-h'}>
      <div className="scheduleb-wrap">
        <p className="scheduleb-label"><span>03</span>Schedule</p>
        <div className="scheduleb-head">
          <h2 className="scheduleb-h" id={sid + '-h'}>{days.length} days, one clock.</h2>
          <p className="scheduleb-sub">Every slot on the same time axis. Dates {tba(conference.dates).toLowerCase()}.</p>
        </div>

        <div className="scheduleb-chart" style={{ '--n': days.length, '--span': SPAN } as React.CSSProperties}>
          {/* hour scale */}
          <div className="scheduleb-scale" aria-hidden="true">
            {hours.map((h) => (
              <span key={h} className="scheduleb-hour" style={{ '--a': (h * 60 - T0) / SPAN } as React.CSSProperties}>{hourLabel(h)}</span>
            ))}
          </div>
          {/* the tracks */}
          <div ref={area} className="scheduleb-area" tabIndex={0} aria-label="Time cursor. Use the arrow keys to move it 15 minutes."
            onPointerMove={onMove} onPointerLeave={() => setPin(null)} onKeyDown={onKey}>
            {hours.map((h) => <i key={h} className="scheduleb-grid" style={{ '--a': (h * 60 - T0) / SPAN } as React.CSSProperties} />)}
            {days.map((d, i) => (
              <div key={d.day} className="scheduleb-row" style={{ '--i': i } as React.CSSProperties}>
              <p className="scheduleb-day" aria-hidden="true"><b>{d.label}</b><span>{d.slots.length} slots</span></p>
              <ol className="scheduleb-track" aria-label={d.label}>
                {d.blocks.map((b) => {
                  const len = b.b - b.a;
                  const px = len * pxPerMin;
                  // Full name when it fits the block (on phones it may wrap onto a second line); otherwise a short form of the same name.
                  const longest = Math.max(...b.name.split(' ').map((w) => w.length));
                  const fits = vertical ? px >= 44 || b.name.length <= 12 : longest * 6.8 <= px - 16;
                  const short = b.name.replace(/^Committee Session (\d)$/, 'S$1').replace(/^ROP Briefing$/, 'ROP')
                    .replace(/^Registration$/, 'Reg.').replace(/^Dispersal$/, 'Disp.');
                  const live = now[i] === b;
                  return (
                    <li key={b.k} className={'scheduleb-slot' + (isSession(b) ? ' is-session' : '') + (isPause(b) ? ' is-pause' : '') + (live ? ' is-live' : '') + (pin === b.k ? ' is-pin' : '')}
                      style={{ '--a': (b.a - T0) / SPAN, '--b': len / SPAN } as React.CSSProperties}>
                      <button type="button" className="scheduleb-btn" aria-label={`${d.label}, ${b.time}, ${b.name}, ${b.duration}`}
                        onPointerEnter={() => setPin(b.k)} onFocus={() => { setPin(b.k); setT(b.a); }} onClick={() => { setPin(b.k); setT(b.a); }}>
                        <span className="scheduleb-name">{fits ? b.name : short}</span>
                        {!vertical && len >= 60 && <span className="scheduleb-time">{fmt(b.a)}</span>}
                      </button>
                    </li>
                  );
                })}
              </ol>
              </div>
            ))}
            <div className="scheduleb-cursor" style={{ '--a': pos } as React.CSSProperties} aria-hidden="true">
              <span className="scheduleb-tag">{fmt(t)}</span>
            </div>
          </div>
        </div>

        {/* what is on at the cursor, day by day */}
        <div className="scheduleb-read" aria-live="polite">
          <p className="scheduleb-read-t"><span>At</span><b>{fmt(t)}</b></p>
          {days.map((d, i) => {
            const b = now[i];
            return (
              <div key={d.day} className={'scheduleb-cell' + (b && isSession(b) ? ' is-session' : '')}>
                <p className="scheduleb-cell-d">{d.label}</p>
                {b ? (
                  <>
                    <p className="scheduleb-cell-n">{b.name}</p>
                    <p className="scheduleb-cell-m">{b.time}<span>{b.duration}</span></p>
                  </>
                ) : (
                  <p className="scheduleb-cell-n is-none">Nothing scheduled</p>
                )}
              </div>
            );
          })}
        </div>
        <p className="scheduleb-key" aria-hidden="true"><i className="is-session" />Committee session<i className="is-pause" />Break or lunch<i />Everything else</p>
      </div>
    </section>
  );
}
