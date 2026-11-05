import { Tabs } from '@base-ui/react/tabs';
import type { CSSProperties } from 'react';
import clsx from 'clsx';
import { schedule, type Slot } from '@/data/conference';
import { useDayTabs } from '@/shared/hooks';

// Parse "1 hour 30 minutes" into minutes, so the day ribbon can be drawn to scale from the real data.
const minutes = (d: string) => {
  const h = /(\d+)\s*hour/.exec(d);
  const m = /(\d+)\s*minute/.exec(d);
  return (h ? +h[1] * 60 : 0) + (m ? +m[1] : 0);
};
type Kind = 'session' | 'ceremony' | 'pause' | 'admin';
const kindOf = (s: Slot): Kind =>
  /Committee Session/.test(s.name) ? 'session' : /Ceremony|Socials|Briefing/.test(s.name) ? 'ceremony' : /Break|Lunch/.test(s.name) ? 'pause' : 'admin';
const startOf = (s: Slot) => s.time.split('–')[0].trim();

export function Schedule({ still }: { still: boolean }) {
  const { day, setDay } = useDayTabs(1);

  return (
    <section id="schedule" className="sched" aria-labelledby="sched-h">
      <Tabs.Root value={day} onValueChange={(v) => setDay(Number(v))} className="wrap sched-root">
        <div className="sched-head">
          <h2 id="sched-h" className="h2">Schedule</h2>
          <Tabs.List className="sched-tabs" aria-label="Conference days">
            {schedule.map((d) => (
              <Tabs.Tab key={d.day} value={d.day} className="sched-tab">
                {d.label}
              </Tabs.Tab>
            ))}
            <Tabs.Indicator className={clsx('sched-ind', still && 'is-still')} />
          </Tabs.List>
        </div>

        {schedule.map((d) => {
          const sessions = d.slots.filter((s) => kindOf(s) === 'session').length;
          return (
            <Tabs.Panel key={d.day} value={d.day} className="sched-panel" keepMounted={false}>
              <div className="sched-day" aria-hidden="true">
                <span className="sched-day-k">Day</span>
                <span className="sched-day-n">{d.day}</span>
              </div>
              <div className="sched-body">
                <p className="sched-meta">
                  {startOf(d.slots[0])} to {startOf(d.slots[d.slots.length - 1])}
                  <span className="sched-meta-s">{sessions} committee {sessions === 1 ? 'session' : 'sessions'}</span>
                </p>
                <div className="ribbon" aria-hidden="true">
                  {d.slots.map((s, i) => (
                    <span
                      key={i}
                      className={clsx('rib', 'rib--' + kindOf(s))}
                      style={{ flexGrow: minutes(s.duration), flexBasis: 0 }}
                      title={`${s.name}, ${s.duration}`}
                    />
                  ))}
                </div>
                <div className="ribbon-legend" aria-hidden="true">
                  <span><i className="rib--session" />Committee sessions</span>
                  <span><i className="rib--ceremony" />Ceremonies, briefing and socials</span>
                  <span><i className="rib--pause" />Breaks and lunch</span>
                  <span><i className="rib--admin" />Registration and dispersal</span>
                </div>
                <ol className="agenda">
                  {d.slots.map((s, i) => (
                    <li key={i} className={clsx('ag', 'ag--' + kindOf(s))} style={{ '--i': i } as CSSProperties}>
                      <span className="ag-time">{s.time}</span>
                      <span className="ag-name">{s.name}</span>
                      <span className="ag-dur">{s.duration}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </Tabs.Panel>
          );
        })}
      </Tabs.Root>
    </section>
  );
}
