import { Tabs } from '@base-ui/react/tabs';
import { schedule, type Slot } from '@/data/conference';
import { useDayTabs } from '@/shared/hooks';

// Turn "12:30 PM – 1:30 PM" and "1 hour 30 minutes" into minutes after midnight, so every slot
// can be drawn to scale on one hour axis (09:00 to 19:30) shared by all three days.
const toMin = (t: string) => {
  const m = t.trim().match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return 0;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === 'PM') h += 12;
  return h * 60 + Number(m[2]);
};
const durMin = (d: string) => {
  const h = d.match(/(\d+)\s*hour/); const m = d.match(/(\d+)\s*minute/);
  return (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
};
const span = (s: Slot) => {
  const [a, b] = s.time.split('–');
  const start = toMin(a);
  const end = b ? toMin(b) : start + durMin(s.duration);
  return { start, end };
};
const AXIS_START = 9 * 60, AXIS_END = 19 * 60 + 30;
const pct = (m: number) => ((m - AXIS_START) / (AXIS_END - AXIS_START)) * 100;
const HOURS = Array.from({ length: 11 }, (_, i) => 9 + i);
const kind = (name: string) => (/Committee Session/.test(name) ? 'session' : /Break|Lunch|Dispersal|Socials/.test(name) ? 'rest' : 'event');

export default function Schedule({ still }: { still: boolean }) {
  const { day, setDay } = useDayTabs(1);
  return (
    <Tabs.Root value={day} onValueChange={(v) => setDay(Number(v))} className={'sc' + (still ? ' is-still' : '')}>
      <div className="sc-head">
        <Tabs.List className="sc-tabs" aria-label="Conference day">
          {schedule.map((d) => (
            <Tabs.Tab key={d.day} value={d.day} className="sc-tab">
              <span>{d.label}</span>
              <span className="mono sc-tab-n">{(() => { const n = d.slots.filter((s) => kind(s.name) === 'session').length; return `${n} session${n === 1 ? '' : 's'}`; })()}</span>
            </Tabs.Tab>
          ))}
        </Tabs.List>
        <p className="mono dim sc-note">Dates to be announced. Times are local to Dubai.</p>
      </div>

      {schedule.map((d) => (
        <Tabs.Panel key={d.day} value={d.day} className="sc-panel">
          <div className="sc-axis" aria-hidden="true">
            <span className="sc-axis-pad" />
            <div className="sc-axis-track">
              {HOURS.map((h) => (
                <span key={h} className="sc-hour" style={{ left: pct(h * 60) + '%' }}>{String(h).padStart(2, '0')}</span>
              ))}
            </div>
          </div>
          <ol className="sc-rows">
            {d.slots.map((s, i) => {
              const { start, end } = span(s);
              return (
                <li key={i} className={'sc-row k-' + kind(s.name)} style={{ ['--i' as string]: i }}>
                  <span className="mono sc-time">{s.time}</span>
                  <span className="sc-name">{s.name}</span>
                  <span className="mono dim sc-dur">{s.duration}</span>
                  <span className="sc-track" aria-hidden="true">
                    {HOURS.map((h) => <i key={h} className="sc-tick" style={{ left: pct(h * 60) + '%' }} />)}
                    <b className="sc-bar" style={{ left: pct(start) + '%', width: Math.max(0.8, pct(end) - pct(start)) + '%' }} />
                  </span>
                </li>
              );
            })}
          </ol>
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  );
}
