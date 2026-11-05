import clsx from 'clsx';
import { conference, schedule, tba, type Slot } from '@/data/conference';
import { useDayTabs } from '@/shared/hooks';
import { Keyed } from './ui';

// Parse the live-site strings ("12:30 PM – 1:30 PM", "1 hour 30 minutes") into minutes since midnight.
const toMin = (s: string) => {
  const m = s.trim().match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return 0;
  let h = parseInt(m[1], 10) % 12;
  if (m[3].toUpperCase() === 'PM') h += 12;
  return h * 60 + parseInt(m[2], 10);
};
const durMin = (s: string) => {
  const h = s.match(/(\d+)\s*hour/); const m = s.match(/(\d+)\s*minute/);
  return (h ? +h[1] * 60 : 0) + (m ? +m[1] : 0);
};
type Kind = 'session' | 'ceremony' | 'logistics' | 'break' | 'out';
const kindOf = (name: string): Kind =>
  /Committee Session/.test(name) ? 'session'
    : /Ceremony/.test(name) ? 'ceremony'
      : /Dispersal/.test(name) ? 'out'
        : /Break|Lunch|Socials/.test(name) ? 'break' : 'logistics';
const KIND_LABEL: Record<Kind, string> = { session: 'Committee session', ceremony: 'Ceremony', logistics: 'Registration and briefing', break: 'Breaks and socials', out: 'Dispersal' };

const blocks = schedule.map((d) => ({
  ...d,
  items: d.slots.map((s: Slot) => {
    const [a, b] = s.time.split('–');
    const start = toMin(a);
    const end = b ? toMin(b) : start + durMin(s.duration);
    return { ...s, start, end, kind: kindOf(s.name) };
  }),
}));
const T0 = Math.min(...blocks.flatMap((d) => d.items.map((i) => i.start)));
const T1 = Math.max(...blocks.flatMap((d) => d.items.map((i) => i.end)));
const fmt = (m: number) => {
  const h = Math.floor(m / 60), mm = m % 60;
  return `${((h + 11) % 12) + 1}${mm ? ':' + String(mm).padStart(2, '0') : ''}`;
};
const ampm = (m: number) => (m >= 720 ? 'PM' : 'AM');

export function Guide() {
  const { day, setDay } = useDayTabs(1);
  const d = blocks.find((b) => b.day === day)!;

  return (
    <section id="schedule" className="sec guide" aria-labelledby="sch-title">
      <div className="sec-head">
        <Keyed id="sch-title" className="sec-title">Schedule</Keyed>
        <p className="sec-dek">Three days, six committee sessions. Dates: {tba(conference.dates)}.</p>
      </div>

      <div className="g-wrap">
        <div className="g-side">
          <div className="g-tabs" role="tablist" aria-label="Day">
            {blocks.map((b) => (
              <button
                key={b.day}
                type="button"
                role="tab"
                id={`g-tab-${b.day}`}
                aria-selected={day === b.day}
                aria-controls="g-panel"
                tabIndex={day === b.day ? 0 : -1}
                className={clsx('g-tab', day === b.day && 'is-on')}
                onClick={() => setDay(b.day)}
                onKeyDown={(e) => {
                  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
                  e.preventDefault();
                  const n = ((b.day - 1 + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + 3) % 3) + 1;
                  setDay(n);
                  document.getElementById(`g-tab-${n}`)?.focus();
                }}
              >
                <span className="g-tab-k">{b.label}</span>
                <span className="g-tab-v">{fmt(b.items[0].start)} {ampm(b.items[0].start)} to {fmt(b.items[b.items.length - 1].end)} {ampm(b.items[b.items.length - 1].end)}</span>
              </button>
            ))}
          </div>
          <ul className="g-legend" aria-label="Key">
            {(['session', 'ceremony', 'logistics', 'break'] as Kind[]).map((k) => (
              <li key={k}><span className={clsx('g-swatch', `k-${k}`)} aria-hidden="true" />{KIND_LABEL[k]}</li>
            ))}
          </ul>
        </div>

        <div id="g-panel" className="g-panel" role="tabpanel" aria-labelledby={`g-tab-${day}`}>
          <div className="g-strip" aria-hidden="true">
            {d.items.map((s) => (
              <span key={s.name + s.start} className={clsx('g-seg', `k-${s.kind}`)} style={{ left: `${((s.start - T0) / (T1 - T0)) * 100}%`, width: `${((s.end - s.start) / (T1 - T0)) * 100}%` }} />
            ))}
            {Array.from({ length: (T1 - T0) / 60 + 1 }, (_, i) => T0 + i * 60).filter((m) => m <= T1).map((m) => (
              <span key={m} className="g-hr" style={{ left: `${((m - T0) / (T1 - T0)) * 100}%` }}>{fmt(m)}</span>
            ))}
          </div>
          <ol className="g-list">
            {d.items.map((s) => (
              <li key={s.name + s.start} className={clsx('g-row', `k-${s.kind}`)}>
                <span className="g-time">{s.time}</span>
                <span className="g-name"><span className={clsx('g-swatch', `k-${s.kind}`)} aria-hidden="true" />{s.name}</span>
                <span className="g-dur">{s.duration}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
