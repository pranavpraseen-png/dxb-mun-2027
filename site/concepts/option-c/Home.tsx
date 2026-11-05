import { useCallback, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import clsx from 'clsx';
import { committees, conference, resources, schedule, stats, tba, type Slot } from '@/data/conference';
import { useDayTabs, useWellness } from '@/shared/hooks';
import { getLenis, useSmoothScroll } from '@/shared/scroll';
import { Opening } from './Opening';
import { useColourBlocks } from './motion';
import { Deck } from './Deck';
import { Floor } from './Floor';
import { DubaiClock, HostMark, Keyed, NAV_H, SevenSeg, Tba, Wordmark, useMedia } from './ui';
import { admin, chair, register, signIn } from './links';
// Library components (coss ui, read-only imports from the dashboard's copy; see LIBRARY.md).
import { Button } from '../../portal/ui/coss/button';
import { Badge } from '../../portal/ui/coss/badge';
import { Card } from '../../portal/ui/coss/card';
import { Checkbox } from '../../portal/ui/coss/checkbox';
import { Tabs, TabsList, TabsPanel, TabsTab } from '../../portal/ui/coss/tabs';

/** coss Badge themed as a quiet programme tag: Archivo caps 15px, muted text, a maroon hairline border (never a fill). */
const TAG = 'h-auto sm:h-auto px-2.5 py-1 font-sans text-[15px] sm:text-[15px] font-semibold uppercase tracking-[0.08em] text-g5 bg-transparent dark:bg-transparent border-g3';

/** Programme numeral beside a section title (presentation only, hidden from screen readers). */
const No = ({ n }: { n: string }) => <span className="sec-no" aria-hidden="true">{n}.</span>;

export function Home() {
  useSmoothScroll(true, NAV_H);
  useColourBlocks(); // this option's motion personality: colour-block section transitions
  return (
    <>
    <main id="main" tabIndex={-1}>
      <Opening />
      <Committees />
      <Schedule />
      <Desk />
      <Contact />
    </main>
    <Credits />
    </>
  );
}

/* ---------------------------------------------------------------- committees: deck + floor of nameplates */
function Committees() {
  const [current, setCurrent] = useState(0);
  const [jump, setJump] = useState<{ i: number; n: number } | null>(null);
  const onTop = useCallback((i: number) => setCurrent(i), []);
  const pick = useCallback((i: number) => setJump({ i, n: Date.now() }), []);
  return (
    <section id="committees" className="band band--cream" aria-labelledby="cm-title">
      <div className="sec cm">
      <div className="sec-head">
        <div className="sec-name"><No n="I" /><Keyed id="cm-title" className="sec-title">{committees.length} committees</Keyed></div>
        <p className="sec-dek">Flick the nameplate aside for the next one, or pick any plate on the floor.</p>
      </div>
      <div className="cm-grid">
        <Deck jump={jump} onTop={onTop} />
        <Floor current={current} onPick={pick} />
      </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- schedule: day tabs (coss ui Tabs) */
type Kind = 'session' | 'ceremony' | 'logistics' | 'break';
const kindOf = (name: string): Kind =>
  /Committee Session/.test(name) ? 'session'
    : /Ceremony/.test(name) ? 'ceremony'
      : /Break|Lunch|Socials|Dispersal/.test(name) ? 'break' : 'logistics';
const KIND_LABEL: Record<Kind, string> = { session: 'Committee session', ceremony: 'Ceremony', logistics: 'Registration, briefing', break: 'Breaks, socials, dispersal' };
const first = (d: { slots: Slot[] }) => d.slots[0].time.split('–')[0].trim();

function Schedule() {
  const { day, setDay } = useDayTabs(1);
  const wide = useMedia('(min-width: 1024px)');
  return (
    <section id="schedule" className="band band--deep" aria-labelledby="sch-title">
      <div className="sec sch">
      {/* Roving focus, arrow keys and the sliding UN-blue indicator come from the library (Base UI Tabs). */}
      <Tabs value={day} onValueChange={(v) => setDay(v as number)} orientation={wide ? 'vertical' : 'horizontal'} className="contents">
        <div className="sch-side">
          <div className="sec-name"><No n="II" /><Keyed id="sch-title" className="sec-title">Schedule</Keyed></div>
          <p className="sec-dek">{stats[1].value} days, {stats[2].value} committee sessions. Dates: {tba(conference.dates).toLowerCase()}.</p>
          <TabsList
            variant="underline"
            activateOnFocus
            aria-label="Day"
            className="sch-tabs w-full items-stretch gap-1.5 text-g5 data-[orientation=horizontal]:py-0 data-[orientation=vertical]:px-0 *:data-[slot=tabs-tab]:hover:bg-g1"
          >
            {schedule.map((b) => (
              <TabsTab
                key={b.day}
                value={b.day}
                className="h-auto min-h-14 grow-0 gap-0.5 rounded-[2px] border-g3 px-4 py-2 text-g5 hover:text-paper sm:h-auto data-[orientation=horizontal]:flex-1 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:items-start data-[orientation=vertical]:justify-between data-active:bg-g1 data-active:text-paper"
              >
                <span className="tab-k">{b.label}</span>
                <span className="tab-v">From {first(b)}</span>
              </TabsTab>
            ))}
          </TabsList>
          <ul className="legend" aria-label="Key">
            {(['session', 'ceremony', 'logistics', 'break'] as Kind[]).map((k) => (
              <li key={k}><span className={clsx('sw', `k-${k}`)} aria-hidden="true" />{KIND_LABEL[k]}</li>
            ))}
          </ul>
        </div>

        {schedule.map((d) => {
          const sessions = d.slots.filter((s) => kindOf(s.name) === 'session').length;
          return (
            <TabsPanel key={d.day} value={d.day} className="sch-panel">
              <p className="sch-sum"><strong>{d.label}</strong> · {d.slots.length} items · {sessions} committee {sessions === 1 ? 'session' : 'sessions'}</p>
              <ol className="sch-list">
                {d.slots.map((s) => {
                  const k = kindOf(s.name);
                  return (
                    <li key={s.name + s.time} className={clsx('sch-row', `is-${k}`)}>
                      <span className="sch-time">{s.time}</span>
                      <span className="sch-name"><span className={clsx('sw', `k-${k}`)} aria-hidden="true" />{s.name}</span>
                      <span className="sch-dur">{s.duration}</span>
                    </li>
                  );
                })}
              </ol>
            </TabsPanel>
          );
        })}
      </Tabs>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- wellness + resources: one asymmetric row */
function Desk() {
  const w = useWellness();
  return (
    <section className="band band--cream" aria-label="Wellness and resources">
      <div className="sec desk-row">
      <div id="wellness" className="col col--well">
        <div className="sec-name"><No n="III" /><Keyed as="h2" id="well-title" className="col-title">Quick reset</Keyed></div>
        <p className="col-dek">Take a moment between sessions.</p>
        <ul className="well-list">
          {w.items.map((it) => {
            const on = w.checked.includes(it.id);
            return (
              <li key={it.id}>
                <label className={clsx('well-row', on && 'is-on')}>
                  <Checkbox
                    checked={on}
                    onCheckedChange={() => w.toggle(it.id)}
                    className="size-8 rounded-[2px] border-g4 before:rounded-[1px] sm:size-8 *:rounded-[1px] [&_svg]:size-5"
                  />
                  <span className="well-label">{it.label}</span>
                </label>
              </li>
            );
          })}
        </ul>
        <p className="well-count" aria-live="polite">
          <Badge variant={w.done ? 'default' : 'outline'} size="lg" className="h-auto px-2.5 py-0.5 font-mono text-base font-normal sm:h-auto sm:text-base">
            {w.checked.length}/{w.items.length}
          </Badge>
          {w.status}
        </p>
        <p className="well-note">{w.note}</p>
      </div>

      <div id="resources" className="col col--res">
        <div className="sec-name"><No n="IV" /><Keyed as="h2" id="res-title" className="col-title">Resources</Keyed></div>
        <ul className="res-list">
          {resources.map((r) => (
            <li key={r.title} className="res-row">
              <div>
                <p className="res-name">{r.title}</p>
                <p className="res-blurb">{r.blurb}</p>
              </div>
              {r.href
                ? <Button variant="outline" size="sm" render={<a href={r.href} />}>Open</Button>
                : <Badge variant="outline" size="lg" className={TAG}>Link to be announced</Badge>}
            </li>
          ))}
        </ul>
        <div className="res-foot">
          <Card render={<a href="#/timer" />} className="promo flex-row rounded-[2px] border-g3 shadow-none before:hidden hover:border-foreground">
            <span className="promo-clock" aria-hidden="true"><SevenSeg text="01:00" /></span>
            <span className="promo-text">
              <span className="promo-title">Floor timer</span>
              <span className="promo-sub">Projector-sized. Space starts, R resets.</span>
            </span>
          </Card>
          <div className="tools-wrap">
            <div className="tools">
              <Button size="lg" render={<a href={register} />}>Register</Button>
              <Button size="lg" variant="outline" render={<a href={signIn} />}>Sign in</Button>
            </div>
            <p className="tools-note">Delegates, advisors and chairs use the delegate dashboard.</p>
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- contact: the IHS maroon band, above the host strip */
const contactRows: [string, string | null][] = [
  ['Email', conference.email],
  ['Instagram', conference.instagram],
  ['Venue', conference.venue],
  ['Dates', conference.dates],
];

function Contact() {
  return (
    <section id="contact" className="contact-band" aria-labelledby="contact-title">
      <div className="contact-in">
        <div className="contact-head">
          <div className="sec-name"><No n="V" /><Keyed as="h2" id="contact-title" className="col-title">Contact</Keyed></div>
          <p className="col-dek">Details go live here as soon as they are confirmed.</p>
        </div>
        <dl className="roll">
          {contactRows.map(([k, v]) => (
            <div key={k} className="roll-row">
              <dt>{k}</dt>
              <dd><Tba value={v} /></dd>
            </div>
          ))}
          <div className="roll-row">
            <dt>Registration</dt>
            <dd><a className="roll-link" href={conference.registerUrl ?? register}>Delegate dashboard</a></dd>
          </div>
          <div className="roll-row roll-row--host">
            <dt>Host</dt>
            <dd>{conference.host}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- footer strip */
function Credits() {
  return (
    <footer className="credits">
      <div className="host-strip">
        <div className="host-strip-in">
          <HostMark host={conference.host} city={conference.city} />
          <span className="host-links">
            <a className="host-link" href={chair}>Chair sign-in</a>
            <a className="host-link" href={admin}>Secretariat sign-in</a>
          </span>
        </div>
      </div>
      <div className="credits-end">
        <Wordmark />
        <p>{conference.motto}. © {conference.year} {conference.name}.</p>
        <DubaiClock />
        <Button
          variant="outline"
          render={<a href="#home" />}
          onClick={(e) => { e.preventDefault(); const l = getLenis(); if (l) l.scrollTo(0, { duration: 1.4 }); else window.scrollTo({ top: 0 }); }}
        >
          <ArrowUp aria-hidden="true" /> Back to top
        </Button>
      </div>
    </footer>
  );
}
