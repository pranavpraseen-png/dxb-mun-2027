import { Tabs } from '@base-ui/react/tabs';
import { motion } from 'motion/react';
import { conference, schedule, tba } from '@/data/conference';
import { useDayTabs } from '@/shared/hooks';
import { Star } from './ornament';

const kind = (name: string) =>
  /Ceremony/.test(name) ? 'ceremony' : /Committee Session/.test(name) ? 'session' : /Break|Lunch|Socials/.test(name) ? 'pause' : 'admin';

const words = ['one', 'two', 'three'];

export function Schedule({ still }: { still: boolean }) {
  const { day, setDay } = useDayTabs(1);

  return (
    <section id="schedule" className="sch" aria-labelledby="sch-h">
      <div className="wrap sch-grid">
        <div className="sch-side">
          <h2 id="sch-h" className="h2">Schedule</h2>
          <p className="sch-note">
            Three days, six committee sessions. Dates: <strong className="is-tba">{tba(conference.dates)}</strong>.
          </p>
          <div className="sch-day" aria-hidden="true">
            <span className="sch-day-k">Day</span>
            <span className="sch-day-n">{words[day - 1]}</span>
          </div>
          <ul className="sch-key" aria-label="Key">
            <li><Star size={12} className="orn k-cer" />Ceremony</li>
            <li><span className="k-dot k-ses" />Committee session</li>
            <li><span className="k-dot k-pau" />Break, lunch or socials</li>
          </ul>
        </div>

        <Tabs.Root className="sch-tabs" value={day} onValueChange={(v) => setDay(Number(v))}>
          <Tabs.List className="sch-list" aria-label="Conference days">
            {schedule.map((d) => (
              <Tabs.Tab key={d.day} value={d.day} className="sch-tab">
                <span className="sch-tab-l">{d.label}</span>
                <span className="sch-tab-s">{d.slots[0].time.split(' – ')[0]} start</span>
              </Tabs.Tab>
            ))}
            <Tabs.Indicator className="sch-ind" />
          </Tabs.List>

          {schedule.map((d) => (
            <Tabs.Panel key={d.day} value={d.day} className="sch-panel">
              <ol className="slots">
                {d.slots.map((s, i) => (
                  <motion.li
                    key={s.time + s.name}
                    className={'slot slot-' + kind(s.name)}
                    initial={still ? false : { opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: i * 0.05, ease: [0.2, 0.7, 0.2, 1] }}
                  >
                    <span className="slot-time">{s.time}</span>
                    <span className="slot-name">
                      {kind(s.name) === 'ceremony' && <Star size={14} className="orn" />}
                      {s.name}
                    </span>
                    <span className="slot-dur">{s.duration}</span>
                  </motion.li>
                ))}
              </ol>
            </Tabs.Panel>
          ))}
        </Tabs.Root>
      </div>
    </section>
  );
}
