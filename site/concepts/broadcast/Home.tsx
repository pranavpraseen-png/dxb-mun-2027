import NumberFlow from '@number-flow/react';
import { Check } from 'lucide-react';
import clsx from 'clsx';
import { conference, resources, stats, wellness } from '@/data/conference';
import { useStill, useWellness } from '@/shared/hooks';
import { getLenis, useSmoothScroll } from '@/shared/scroll';
import { Intro } from './Intro';
import { Channels } from './Channels';
import { Guide } from './Guide';
import { Keyed, NAV_H, SevenSeg, Tba, useInView, Wordmark } from './ui';

export function Home() {
  useSmoothScroll(true, NAV_H);
  return (
    <main id="main" tabIndex={-1}>
      <Intro />
      <Scoreboard />
      <Channels />
      <Guide />
      <Breaks />
      <Credits />
    </main>
  );
}

/* ---------------------------------------------------------------- about + scoreboard */
function Scoreboard() {
  const still = useStill();
  const [ref, seen] = useInView<HTMLDivElement>(0.35);
  return (
    <section id="about" className="sec about" aria-labelledby="about-title">
      <div className="about-copy">
        <Keyed id="about-title" className="about-motto">{conference.motto}</Keyed>
        <p className="about-lede">
          {conference.edition} is a {conference.kind} conference in {conference.city}, hosted by {conference.host}.
        </p>
      </div>

      <div ref={ref} className={clsx('board', seen && 'is-in')}>
        <div className="board-head">
          <span className="board-tag">At a glance</span>
          <span className="board-title">{conference.edition}</span>
        </div>
        <dl className="board-cells">
          {stats.map((s, i) => (
            <div key={s.label} className={clsx('board-cell', i === 0 && 'is-key')}>
              <dt>{s.label}</dt>
              <dd>
                <NumberFlow
                  value={seen ? s.value : 0}
                  format={{ useGrouping: false }}
                  animated={!still}
                  transformTiming={{ duration: 1100 + i * 180, easing: 'cubic-bezier(.2,.8,.2,1)' }}
                  spinTiming={{ duration: 1100 + i * 180, easing: 'cubic-bezier(.2,.8,.2,1)' }}
                  className="board-num"
                />
              </dd>
            </div>
          ))}
        </dl>
        <dl className="board-facts">
          <div><dt>Host</dt><dd>{conference.host}</dd></div>
          <div><dt>City</dt><dd>{conference.city}</dd></div>
          <div><dt>Dates</dt><dd><Tba value={conference.dates} /></dd></div>
          <div><dt>Venue</dt><dd><Tba value={conference.venue} /></dd></div>
        </dl>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- wellness, timer, resources */
function Breaks() {
  const w = useWellness();
  return (
    <section id="wellness" className="sec breaks" aria-labelledby="well-title">
      <div className="well">
        <div className="sec-head sec-head--tight">
          <Keyed id="well-title" className="sec-title">{wellness.title}</Keyed>
          <p className="sec-dek">{wellness.intro}</p>
        </div>
        <ul className="well-list">
          {w.items.map((it) => {
            const on = w.checked.includes(it.id);
            return (
              <li key={it.id}>
                <button type="button" className={clsx('well-btn', on && 'is-on')} aria-pressed={on} onClick={() => w.toggle(it.id)}>
                  <span className="well-box" aria-hidden="true">{on && <Check size={28} strokeWidth={3} />}</span>
                  <span className="well-label">{it.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="well-status">
          <p className="well-count" aria-live="polite">
            <span className={clsx('well-pill', w.done && 'is-done')}>{w.checked.length}/{w.items.length}</span>
            {w.status}
          </p>
          <p className="well-note">{w.note}</p>
        </div>
      </div>

      <aside className="promo" aria-labelledby="promo-title">
        <a className="promo-clock" href="#/timer" aria-label="Open the floor timer">
          <SevenSeg text="01:00" />
        </a>
        <h3 id="promo-title" className="promo-title">Floor timer</h3>
        <p className="promo-text">A projector-sized speaking clock. Space starts and pauses, R resets.</p>
        <a className="btn btn--lime" href="#/timer">Open the timer</a>
      </aside>

      <div id="resources" className="res" aria-labelledby="res-title">
        <h3 id="res-title" className="res-title">Resources</h3>
        <ul>
          {resources.map((r) => (
            <li key={r.title} className="res-row">
              <div>
                <p className="res-name">{r.title}</p>
                <p className="res-blurb">{r.blurb}</p>
              </div>
              {r.href ? <a className="btn" href={r.href}>Open</a> : <span className="res-tba">Link to be announced</span>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- contact / credits */
function Credits() {
  const rows: [string, string | null][] = [
    ['Email', conference.email],
    ['Instagram', conference.instagram],
    ['Registration', conference.registerUrl],
    ['Venue', conference.venue],
    ['Dates', conference.dates],
  ];
  return (
    <footer id="contact" className="credits" aria-labelledby="contact-title">
      <div className="sec credits-in">
        <div className="sec-head sec-head--tight">
          <Keyed id="contact-title" className="sec-title">Contact</Keyed>
          <p className="sec-dek">Details go live here as soon as they are confirmed.</p>
        </div>
        <dl className="roll">
          {rows.map(([k, v]) => (
            <div key={k} className="roll-row">
              <dt>{k}</dt>
              <dd><Tba value={v} /></dd>
            </div>
          ))}
          <div className="roll-row">
            <dt>Host</dt>
            <dd>{conference.host}</dd>
          </div>
        </dl>
        <nav className="credits-links" aria-label="Tools">
          <a href="#/timer">Floor timer</a>
          <a href="#/portal">Delegate portal</a>
          <a href="#/chair">Chair portal</a>
          <a href="#home" onClick={(e) => { e.preventDefault(); const l = getLenis(); if (l) l.scrollTo(0, { duration: 1.4 }); else window.scrollTo({ top: 0 }); }}>Back to top</a>
        </nav>
      </div>
      <div className="credits-end">
        <Wordmark size="lg" />
        <p>© {conference.year} {conference.name}. {conference.motto}.</p>
      </div>
    </footer>
  );
}
