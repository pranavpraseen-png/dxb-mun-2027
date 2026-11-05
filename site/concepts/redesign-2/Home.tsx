import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ArrowUp, ArrowUpRight } from 'lucide-react';
import clsx from 'clsx';
import { conference, resources, schedule, stats, tba, type Slot } from '@/data/conference';
import { useDayTabs, useStill, useWellness } from '@/shared/hooks';
import { getLenis, scrollToSection, useSmoothScroll } from '@/shared/scroll';
import { TitleSequence } from './TitleSequence';
import { Resolution } from './Resolution';
import { Nameplates } from './Nameplates';
import { Dek, DubaiClock, HostMark, Kicker, NAV_H, Reveal, Wordmark, itemRise, useMedia } from './ui';
import { JUMP_KEY } from './Masthead';
import { admin, register, signIn } from './links';
// Library components (coss ui, read-only imports from the dashboard's copy; see LIBRARY.md).
import { Button } from '../../portal/ui/coss/button';
import { Badge } from '../../portal/ui/coss/badge';
import { Card } from '../../portal/ui/coss/card';
import { Checkbox } from '../../portal/ui/coss/checkbox';
import { Tabs, TabsList, TabsPanel, TabsTab } from '../../portal/ui/coss/tabs';

export function Home() {
  useSmoothScroll(true, NAV_H);
  // Arriving from the timer view with a section picked in the index.
  useEffect(() => {
    let id: string | null = null;
    try { id = sessionStorage.getItem(JUMP_KEY); sessionStorage.removeItem(JUMP_KEY); } catch { /* ignore */ }
    if (id) setTimeout(() => scrollToSection(id!, NAV_H), 120);
  }, []);
  return (
    <>
      <main id="main" tabIndex={-1}>
        <TitleSequence />
        <Resolution />
        <Nameplates />
        <Proceedings />
        <Annex />
        <Colophon />
      </main>
      <Footer />
    </>
  );
}

/* ---------------------------------------------------------------- III. Order of proceedings */
type Kind = 'session' | 'ceremony' | 'logistics' | 'break';
const kindOf = (name: string): Kind =>
  /Committee Session/.test(name) ? 'session' : /Ceremony/.test(name) ? 'ceremony' : /Break|Lunch|Socials|Dispersal/.test(name) ? 'break' : 'logistics';
const KIND_LABEL: Record<Kind, string> = { session: 'Committee session', ceremony: 'Ceremony', logistics: 'Registration, briefing', break: 'Break, socials, dispersal' };
const startOf = (d: { slots: Slot[] }) => d.slots[0].time.split('–')[0].trim();

function DayList({ d }: { d: (typeof schedule)[number] }) {
  return (
    <Reveal as="ol" group className="day-list">
      {d.slots.map((s) => {
        const k = kindOf(s.name);
        return (
          <motion.li key={s.name + s.time} variants={itemRise} className={clsx('slot', `is-${k}`)}>
            <span className="slot-t">{s.time}</span>
            <span className="slot-name">{s.name}</span>
            <span className="slot-d">{s.duration}</span>
          </motion.li>
        );
      })}
    </Reveal>
  );
}
function DayHead({ d }: { d: (typeof schedule)[number] }) {
  return (
    <header className="day-head">
      <span className="day-k">Day</span>
      <span className="day-n">{d.day}</span>
      <span className="day-from">From {startOf(d)}</span>
    </header>
  );
}

function Proceedings() {
  const wide = useMedia('(min-width: 1024px)');
  const { day, setDay } = useDayTabs(1);
  return (
    <section id="schedule" className="sec proc" aria-labelledby="proc-title">
      <div className="sec-head">
        <Kicker id="schedule">Schedule</Kicker>
        <h2 id="proc-title" className="sec-title">Order of <em>proceedings</em></h2>
        <Dek className="sec-dek">{`${stats[1].value} days. ${stats[2].value} committee sessions. Dates: ${tba(conference.dates).toLowerCase()}.`}</Dek>
      </div>
      {wide ? (
        <div className="proc-days">
          {schedule.map((d) => (
            <article key={d.day} className="day" aria-label={d.label}>
              <DayHead d={d} />
              <DayList d={d} />
            </article>
          ))}
        </div>
      ) : (
        <Tabs value={day} onValueChange={(v) => setDay(v as number)} className="proc-tabs">
          <TabsList variant="underline" activateOnFocus aria-label="Day" className="w-full gap-0 py-0 text-[var(--dusk-muted)]">
            {schedule.map((d) => (
              <TabsTab key={d.day} value={d.day} className="h-auto min-h-14 flex-1 flex-col gap-0 rounded-[2px] py-2 text-[var(--dusk-muted)] data-active:text-[var(--dusk-ink)] sm:h-auto">
                <span className="tab-k">{d.label}</span>
                <span className="tab-v">From {startOf(d)}</span>
              </TabsTab>
            ))}
          </TabsList>
          {schedule.map((d) => (
            <TabsPanel key={d.day} value={d.day} className="proc-panel">
              <DayList d={d} />
            </TabsPanel>
          ))}
        </Tabs>
      )}
      <ul className="legend" aria-label="Key">
        {(['session', 'ceremony', 'logistics', 'break'] as Kind[]).map((k) => (
          <li key={k}><span className={clsx('sw', `k-${k}`)} aria-hidden="true" />{KIND_LABEL[k]}</li>
        ))}
      </ul>
    </section>
  );
}

/* ---------------------------------------------------------------- IV + V. Annex: wellness and resources */
function Annex() {
  const w = useWellness();
  return (
    <section className="sec annex" aria-label="Wellness and resources">
      <div id="wellness" className="annex-col annex-well">
        <Kicker id="wellness">Wellness</Kicker>
        <h2 className="sec-title">Quick <em>reset</em></h2>
        <Dek className="sec-dek">Take a moment between sessions.</Dek>
        <ul className="well-list">
          {w.items.map((it) => {
            const on = w.checked.includes(it.id);
            return (
              <li key={it.id}>
                <label className={clsx('well-row', on && 'is-on')}>
                  <Checkbox checked={on} onCheckedChange={() => w.toggle(it.id)}
                    className="size-8 rounded-[2px] border-[var(--dusk-line)] sm:size-8 before:rounded-[1px] *:rounded-[1px] [&_svg]:size-5" />
                  <span className="well-label">{it.label}.</span>
                </label>
              </li>
            );
          })}
        </ul>
        <p className="well-status" aria-live="polite">{w.status}</p>
        <p className="well-note">{w.note}</p>
      </div>

      <div id="resources" className="annex-col annex-res">
        <Kicker id="resources">Resources</Kicker>
        <h2 className="sec-title">Resources</h2>
        <ul className="res-list">
          {resources.map((r) => (
            <li key={r.title} className="res-row">
              <p className="res-name">{r.title}</p>
              <p className="res-blurb">{r.blurb}</p>
              {r.href
                ? <Button variant="outline" size="sm" render={<a href={r.href} />}>Open</Button>
                : <Badge variant="outline" size="lg" className="h-auto w-fit rounded-[2px] border-[var(--dusk-accent)] bg-transparent px-2.5 py-1 font-mono text-[14px] font-normal text-[var(--dusk-muted)] sm:h-auto sm:text-[14px] dark:bg-transparent">Link to be announced</Badge>}
            </li>
          ))}
        </ul>
        <Card render={<a href="#/timer" />} className="timer-card rounded-[2px] border-[var(--dusk-line)] bg-transparent shadow-none before:hidden">
          <span className="timer-card-n" aria-hidden="true">01:00</span>
          <span className="timer-card-t">Floor timer <ArrowUpRight aria-hidden="true" className="size-5" /></span>
          <span className="timer-card-s">Projector-sized. Space starts, R resets.</span>
        </Card>
        <div className="annex-cta">
          <Button className="h-12 rounded-[2px] px-6 text-[14px] font-semibold tracking-[0.14em] sm:h-12 sm:text-[14px]" render={<a href={signIn} />}>Sign in</Button>
          <p className="annex-note">Delegates, advisors and chairs use the delegate dashboard.</p>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- VI. Colophon: contact on the maroon panel */
const rows: [string, string | null][] = [
  ['Email', conference.email],
  ['Instagram', conference.instagram],
  ['Venue', conference.venue],
  ['Dates', conference.dates],
];

function Colophon() {
  const still = useStill();
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {
    if (still) return;
    gsap.fromTo('.colo-panel', { clipPath: 'inset(9% 6% 0% 6%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', ease: 'none',
      scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'top 30%', scrub: 1 },
    });
  }, { scope: root, dependencies: [still] });
  return (
    <section id="contact" ref={root} className="colo" aria-labelledby="colo-title">
      <div className="colo-panel">
        <div className="colo-head">
          <Kicker id="contact" className="kicker--maroon">Contact</Kicker>
          <h2 id="colo-title" className="colo-title">Contact</h2>
          <Dek className="colo-dek">Details go live here as soon as they are confirmed.</Dek>
        </div>
        <dl className="colo-roll">
          {rows.map(([k, v]) => (
            <div key={k} className="colo-row">
              <dt>{k}</dt>
              <dd>{v ?? <span className="tba">To be announced</span>}</dd>
            </div>
          ))}
          <div className="colo-row">
            <dt>Registration</dt>
            <dd><a className="colo-link" href={conference.registerUrl ?? register}>Delegate dashboard</a></dd>
          </div>
          <div className="colo-row">
            <dt>Host</dt>
            <dd>{conference.host}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- footer */
function Footer() {
  return (
    <footer className="foot">
      <HostMark host={conference.host} city={conference.city} />
      <div className="foot-row">
        <Wordmark />
        <p className="foot-motto"><em>{conference.motto}.</em> © {conference.year} {conference.name}.</p>
        <DubaiClock />
        <a className="foot-link" href={admin}>Secretariat sign-in</a>
        <Button variant="outline" className="h-11 rounded-[2px] px-4 text-[13px] font-semibold tracking-[0.14em] sm:text-[13px]" render={<a href="#home" />}
          onClick={(e) => { e.preventDefault(); const l = getLenis(); if (l) l.scrollTo(0, { duration: 1.6 }); else scrollTo({ top: 0 }); }}>
          <ArrowUp aria-hidden="true" /> Back to top
        </Button>
      </div>
    </footer>
  );
}
