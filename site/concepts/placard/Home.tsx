import { useCallback, useState } from 'react';
import { motion } from 'motion/react';
import { Tabs } from '@base-ui/react/tabs';
import { ArrowDown, Droplets, Wind, PersonStanding, Timer as TimerIcon, Send, Gavel, ArrowUp, BookOpen, Check } from 'lucide-react';
import { committees, conference, heroPhoto, schedule, stats, tba, resources, wellness as wellnessCopy, type Slot } from '@/data/conference';
import { useWellness, viewHref } from '@/shared/hooks';
import { useSmoothScroll } from '@/shared/scroll';
import { Deck } from './Deck';
import { Floor } from './Vote';
import { NAV_H, Raise, Wordmark, jumpTo, useStillCtx } from './ui';

export function Home() {
  useSmoothScroll(true, NAV_H);
  return (
    <main id="main">
      <Hero />
      <About />
      <Committees />
      <Schedule />
      <Wellness />
      <Tools />
      <Contact />
    </main>
  );
}

/* ------------------------------------------------------------------ hero */
function Hero() {
  return (
    <section className="hero" id="home" aria-labelledby="hero-title">
      <div className="hero__inner">
        <div className="hero__copy">
          <p className="kicker">{conference.kind}, {conference.city}</p>
          <h1 className="hero__title" id="hero-title">
            <span>DXB</span>
            <span>MUN</span>
          </h1>
          <p className="hero__year">{conference.year}</p>
          <p className="hero__lede">
            {conference.motto}. Hosted by {conference.host}.
          </p>
          <p className="hero__when">Dates and venue: {tba(conference.dates)}</p>
          <div className="hero__cta">
            <a className="btn btn--primary" href="#committees" onClick={jumpTo('committees')}>Explore committees</a>
            <a className="btn btn--ghost" href="#schedule" onClick={jumpTo('schedule')}>See the schedule</a>
          </div>
          <a className="teaser" href="#committees" onClick={jumpTo('committees')}>
            <span className="teaser__plates" aria-hidden="true">
              {committees.slice(0, 3).map((c) => <span key={c.abbr} className="teaser__plate">{c.abbr}</span>)}
            </span>
            <span className="teaser__text">{committees.length} committees, from {committees[0].abbr} to {committees[committees.length - 1].abbr}</span>
            <ArrowDown size={20} aria-hidden="true" className="teaser__arrow" />
          </a>
        </div>
        <figure className="hero__photo">
          <img src={heroPhoto.src} alt={heroPhoto.alt} width={heroPhoto.width} height={heroPhoto.height} fetchPriority="high" />
        </figure>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ about */
function About() {
  return (
    <section className="about" id="about" aria-labelledby="about-title">
      <div className="wrap about__grid">
        <div className="about__copy">
          <Raise className="h-xl" id="about-title">{conference.motto}</Raise>
          <p className="lede">
            {conference.edition} is a {conference.kind} conference in {conference.city}, hosted by {conference.host}.
          </p>
          <dl className="facts">
            <div><dt>Dates</dt><dd>{tba(conference.dates)}</dd></div>
            <div><dt>Venue</dt><dd>{tba(conference.venue)}</dd></div>
          </dl>
        </div>
        <ul className="stats">
          {stats.map((s) => (
            <li key={s.label} className="stat">
              <span className="stat__n">{s.value}</span>
              <span className="stat__l">{s.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ committees: deck + floor index */
function Committees() {
  const [current, setCurrent] = useState(0);
  const [jump, setJump] = useState<{ i: number; n: number } | null>(null);
  const onTop = useCallback((i: number) => setCurrent(i), []);
  const pick = useCallback((i: number) => setJump({ i, n: Date.now() }), []);
  return (
    <section className="committees" id="committees" aria-labelledby="committees-title">
      <div className="wrap">
        <div className="committees__head">
          <Raise className="h-xl" id="committees-title">Committees</Raise>
          <p className="lede">{committees.length} committees at {conference.edition}. Pick a nameplate to bring it to the top of the deck.</p>
        </div>
        <div className="committees__grid">
          <Deck jump={jump} onTop={onTop} />
          <Floor current={current} onPick={pick} />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ schedule */
const kindOf = (s: Slot) =>
  /Committee Session/.test(s.name) ? 'session'
  : /Ceremony/.test(s.name) ? 'ceremony'
  : /Break|Lunch|Socials/.test(s.name) ? 'pause'
  : 'admin';
const KIND_LABEL = { session: 'Committee session', ceremony: 'Ceremony', pause: 'Break, lunch or socials', admin: 'Registration, briefing, dispersal' };

function Schedule() {
  const still = useStillCtx();
  return (
    <section className="schedule" id="schedule" aria-labelledby="schedule-title">
      <div className="wrap">
        <div className="schedule__head">
          <Raise className="h-xl" id="schedule-title">Schedule</Raise>
          <ul className="legend" aria-label="Key">
            {(Object.keys(KIND_LABEL) as (keyof typeof KIND_LABEL)[]).map((k) => (
              <li key={k}><span className={`legend__dot kind-${k}`} aria-hidden="true" />{KIND_LABEL[k]}</li>
            ))}
          </ul>
        </div>
        <Tabs.Root defaultValue={1} className="days">
          <Tabs.List className="days__tabs" aria-label="Choose a day">
            {schedule.map((d) => (
              <Tabs.Tab key={d.day} value={d.day} className="days__tab">
                {d.label}
              </Tabs.Tab>
            ))}
          </Tabs.List>
          {schedule.map((d) => (
            <Tabs.Panel key={d.day} value={d.day} className="days__panel">
              <ol className="slots">
                {d.slots.map((s, i) => (
                  <motion.li
                    key={s.name + s.time}
                    className={`slotrow kind-${kindOf(s)}`}
                    initial={still ? false : { opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.035, duration: 0.3, ease: 'easeOut' }}
                  >
                    <span className="slotrow__time">{s.time}</span>
                    <span className="slotrow__name">{s.name}</span>
                    <span className="slotrow__dur">{s.duration}</span>
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

/* ------------------------------------------------------------------ wellness */
const WELL_ICON = { water: Droplets, stretch: PersonStanding, breathe: Wind } as const;
function Wellness() {
  const w = useWellness();
  return (
    <section className="wellness" id="wellness" aria-labelledby="wellness-title">
      <div className="wrap wellness__grid">
        <div className="wellness__copy">
          <p className="kicker">Delegate wellness</p>
          <Raise className="h-xl" id="wellness-title">{wellnessCopy.title}</Raise>
          <p className="lede">{wellnessCopy.intro}</p>
          <p className="wellness__status" aria-live="polite">
            {w.status}{w.done && ' All three done for today.'}
          </p>
          <p className="wellness__note">{w.note}</p>
        </div>
        <ul className="checks">
          {w.items.map((it) => {
            const Icon = WELL_ICON[it.id as keyof typeof WELL_ICON];
            const on = w.checked.includes(it.id);
            return (
              <li key={it.id}>
                <button type="button" className={'check' + (on ? ' is-on' : '')} aria-pressed={on} onClick={() => w.toggle(it.id)}>
                  <Icon size={30} strokeWidth={1.75} aria-hidden="true" />
                  <span className="check__label">{it.label}</span>
                  <span className="check__box" aria-hidden="true">{on && <Check size={18} strokeWidth={3} />}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ floor tools + resources */
function Tools() {
  const tools = [
    { href: viewHref('timer'), Icon: TimerIcon, title: 'Floor timer', body: 'A projector-sized countdown. Space starts and pauses, R resets.' },
    { href: viewHref('portal'), Icon: Send, title: 'Delegate portal', body: 'Write chits to other delegations. Your chair approves them first.' },
    { href: viewHref('chair'), Icon: Gavel, title: 'Chair portal', body: 'Approve or reject chits, read messages and keep the log.' },
  ];
  return (
    <section className="tools" id="resources" aria-labelledby="tools-title">
      <div className="wrap">
        <Raise className="h-xl" id="tools-title">Resources</Raise>
        <ul className="tools__grid">
          {tools.map(({ href, Icon, title, body }) => (
            <li key={title}>
              <a className="tool" href={href}>
                <Icon size={28} strokeWidth={1.75} aria-hidden="true" />
                <span className="tool__title">{title}</span>
                <span className="tool__body">{body}</span>
              </a>
            </li>
          ))}
          {resources.map((r) => (
            <li key={r.title}>
              {r.href ? (
                <a className="tool" href={r.href}>
                  <BookOpen size={28} strokeWidth={1.75} aria-hidden="true" />
                  <span className="tool__title">{r.title}</span>
                  <span className="tool__body">{r.blurb}</span>
                </a>
              ) : (
                <div className="tool tool--soon">
                  <BookOpen size={28} strokeWidth={1.75} aria-hidden="true" />
                  <span className="tool__title">{r.title}</span>
                  <span className="tool__body">{r.blurb}</span>
                  <span className="tool__soon">{tba(null, 'Coming soon')}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ contact + footer */
function Contact() {
  const rows = [
    { k: 'Email', v: conference.email, href: conference.email ? 'mailto:' + conference.email : null },
    { k: 'Instagram', v: conference.instagram, href: conference.instagram },
    { k: 'Registration', v: conference.registerUrl ? 'Register' : null, href: conference.registerUrl },
    { k: 'Dates', v: conference.dates, href: null },
    { k: 'Venue', v: conference.venue, href: null },
  ];
  return (
    <section className="contact" id="contact" aria-labelledby="contact-title">
      <div className="wrap contact__grid">
        <Raise className="h-xl" id="contact-title">Contact</Raise>
        <dl className="contact__list">
          {rows.map((r) => (
            <div key={r.k} className="contact__row">
              <dt>{r.k}</dt>
              <dd>{r.href && r.v ? <a href={r.href}>{r.v}</a> : <span className={r.v ? '' : 'is-tba'}>{tba(r.v)}</span>}</dd>
            </div>
          ))}
        </dl>
      </div>
      <footer className="wrap contact__foot">
        <Wordmark className="wordmark--giant" />
        <div className="contact__meta">
          <p>© {conference.year} {conference.name}. {conference.motto}.</p>
          <a className="btn btn--ghost btn--sm" href="#home" onClick={jumpTo('home')}><ArrowUp size={18} aria-hidden="true" /> Back to top</a>
        </div>
      </footer>
    </section>
  );
}
