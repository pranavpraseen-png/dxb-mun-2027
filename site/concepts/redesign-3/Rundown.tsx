// CH 03, Schedule as a TV run sheet: day tabs (Cult UI DirectionAwareTabs) over a rundown table with a kind key.
import clsx from 'clsx';
import { conference, schedule, stats, tba, type Slot } from '@/data/conference';
import { Slate } from './ui';
import { DirectionAwareTabs } from './lib/direction-aware-tabs';

type Kind = 'session' | 'ceremony' | 'logistics' | 'break';
const kindOf = (name: string): Kind =>
  /Committee Session/.test(name) ? 'session'
    : /Ceremony/.test(name) ? 'ceremony'
      : /Break|Lunch|Socials|Dispersal/.test(name) ? 'break' : 'logistics';
const KIND: Record<Kind, string> = { session: 'Committee session', ceremony: 'Ceremony', logistics: 'Registration, briefing', break: 'Break, socials, dispersal' };
const from = (s: Slot[]) => s[0].time.split('–')[0].trim();

function Sheet({ day }: { day: (typeof schedule)[number] }) {
  return (
    <ol className="rd" aria-label={`${day.label} rundown`}>
      <li className="rd-row rd-row--head" aria-hidden="true">
        <span>#</span><span>Time</span><span>Item</span><span className="rd-dur">Duration</span>
      </li>
      {day.slots.map((s, i) => {
        const k = kindOf(s.name);
        return (
          <li key={s.name + s.time} className={clsx('rd-row', `is-${k}`)} style={{ ['--i' as string]: i }}>
            <span className="rd-n">{String(i + 1).padStart(2, '0')}</span>
            <span className="rd-time">{s.time}</span>
            <span className="rd-item"><i className={clsx('kb', `k-${k}`)} aria-hidden="true" />{s.name}</span>
            <span className="rd-dur">{s.duration}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function Rundown({ still }: { still: boolean }) {
  return (
    <section id="schedule" className="sec rdn" aria-labelledby="schedule-title">
      <Slate id="schedule" title="Rundown" dek={<>{stats[1].value} days · {stats[2].value} committee sessions · Dates: {tba(conference.dates).toLowerCase()}</>} tone="maroon" />
      <div className="rdn-body">
        <DirectionAwareTabs
          label="Day"
          still={still}
          listClassName="rdn-tabs"
          tabs={schedule.map((d) => ({ id: d.day, label: d.label, sub: `From ${from(d.slots)}`, content: <Sheet day={d} /> }))}
        />
        <ul className="rdn-key" aria-label="Key">
          {(Object.keys(KIND) as Kind[]).map((k) => (
            <li key={k}><i className={clsx('kb', `k-${k}`)} aria-hidden="true" />{KIND[k]}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
