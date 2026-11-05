import { conference, heroPhoto, resources, schedule, tba } from '@/data/conference';
import { useEffect } from 'react';
import { useDayTabs, useWellness } from '@/shared/hooks';
import { scrollToSection, useSmoothScroll } from '@/shared/scroll';
import { NAV_H } from './util';
import { Resolution } from './Resolution';
import { Committees } from './Committees';

function AnnexHead({ no, id, title, note }: { no: string; id: string; title: string; note?: React.ReactNode }) {
  return (
    <>
      <div className="rule" data-rule aria-hidden="true" />
      <header className="grid12 annex-head">
        <p className="annex-no mono">{no}</p>
        <h2 className="annex-title" id={id}>{title}</h2>
        {note && <p className="annex-note">{note}</p>}
      </header>
    </>
  );
}

function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="wrap">
        <div className="doc-head">
          <div>
            <p className="doc-ed">{conference.edition}</p>
            <p className="doc-kind">{conference.kind}, {conference.city}</p>
          </div>
          <dl className="doc-distr mono">
            <div><dt>Distr.:</dt><dd>General</dd></div>
            <div><dt>Original:</dt><dd>English</dd></div>
          </dl>
        </div>
        <div className="rule-double" data-rule aria-hidden="true" />
        <dl className="doc-meta">
          <div><dt className="mono">Host</dt><dd>{conference.host}</dd></div>
          <div><dt className="mono">Committees</dt><dd>19, listed in Annex I</dd></div>
          <div><dt className="mono">Dates</dt><dd className={conference.dates ? '' : 'tba'}>{tba(conference.dates)}</dd></div>
          <div><dt className="mono">Venue</dt><dd className={conference.venue ? '' : 'tba'}>{tba(conference.venue)}</dd></div>
        </dl>

        <div className="grid12 hero-main">
          <p className="hero-sponsor mono">{conference.host}: draft resolution</p>
          <h1 className="hero-title" id="hero-title">
            <span className="sr-only">{conference.edition}: </span>
            <span className="line"><span style={{ '--i': 0 } as React.CSSProperties}>Diplomacy</span></span>
            <span className="line"><span style={{ '--i': 1 } as React.CSSProperties}>around us</span></span>
          </h1>
          <figure className="hero-fig">
            <img src={heroPhoto.src} alt={heroPhoto.alt} width={heroPhoto.width} height={heroPhoto.height} fetchPriority="high" />
            <figcaption><span className="mono">Fig. 1</span>{heroPhoto.alt}.</figcaption>
          </figure>
          <div className="hero-foot">
            <p className="hero-lede">
              A {conference.kind} conference in {conference.city}, hosted by {conference.host}. Nineteen committees
              meet over three days and six committee sessions.
            </p>
            <div className="hero-ctas">
              <a className="btn btn-ink" href="#committees">Explore committees</a>
              <a className="btn btn-line" href="#about">About the conference</a>
            </div>
            <p className="hero-cue mono">Scroll for the clauses, then all 19 committees</p>
          </div>
        </div>
      </div>
    </section>
  );
}

const kindOf = (name: string) =>
  /Committee Session/.test(name) ? 'session' : /Ceremony|Socials/.test(name) ? 'ceremony' : /Break|Lunch|Dispersal/.test(name) ? 'pause' : 'admin';

function Agenda() {
  const { day, setDay } = useDayTabs(1);
  return (
    <section className="sec" id="schedule" aria-labelledby="schedule-h">
      <div className="wrap">
        <AnnexHead
          no="Annex II"
          id="schedule-h"
          title="Schedule"
          note="The agenda for each of the three days. Committee sessions are marked in blue."
        />
        <div className="ag-tabs" role="tablist" aria-label="Day">
          {schedule.map((d) => (
            <button
              key={d.day}
              role="tab"
              id={`ag-tab-${d.day}`}
              aria-selected={day === d.day}
              aria-controls={`ag-day-${d.day}`}
              onClick={() => setDay(d.day)}
            >
              {d.label}
            </button>
          ))}
        </div>
        <div className="grid12 ag-days">
          {schedule.map((d) => (
            <div key={d.day} className={'ag-day' + (day === d.day ? ' is-current' : '')} id={`ag-day-${d.day}`}>
              <h3>{d.label}<span className="mono">{d.slots.length} items</span></h3>
              <ol>
                {d.slots.map((s) => (
                  <li key={s.time + s.name} className={`ag-row k-${kindOf(s.name)}`}>
                    <span className="ag-time">{s.time}</span>
                    <span className="ag-line">
                      <span className="ag-name">{s.name}</span>
                      <span className="ag-dots" aria-hidden="true" />
                      <span className="ag-dur"><span className="sr-only">, </span>{s.duration}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12.5l4.8 4.8L19.5 7" /></svg>
  );
}

function Instruments() {
  const rows = [
    { href: '#/timer', name: 'Floor timer', desc: 'Projector-ready speaking timer for the floor.' },
    { href: '#/portal', name: 'Delegate portal', desc: 'Write chits and read your inbox.' },
    { href: '#/chair', name: 'Chair portal', desc: 'Approve chits and keep the decision log.' },
  ];
  return (
    <div className="instr" id="resources">
      <h3>Resources and tools</h3>
      <ul className="instr-list">
        {rows.map((r) => (
          <li className="instr-row" key={r.href}>
            <a href={r.href}>
              <span className="instr-name">{r.name}</span>
              <span className="instr-desc">{r.desc}</span>
              <span className="instr-go">Open</span>
            </a>
          </li>
        ))}
        {resources.map((r) => (
          <li className="instr-row" key={r.title}>
            {r.href ? (
              <a href={r.href}>
                <span className="instr-name">{r.title}</span>
                <span className="instr-desc">{r.blurb}</span>
                <span className="instr-go">Open</span>
              </a>
            ) : (
              <div>
                <span className="instr-name">{r.title}</span>
                <span className="instr-desc">{r.blurb}</span>
                <span className="tba">{tba(r.href)}</span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Wellness() {
  const w = useWellness();
  return (
    <section className="sec" id="wellness" aria-labelledby="wellness-h">
      <div className="wrap">
        <AnnexHead no="Annex III" id="wellness-h" title="Quick reset" note="Between sessions, and the tools you will use during them." />
        <div className="grid12" style={{ marginTop: 'clamp(28px, 3.5vw, 52px)' }}>
          <div className="well">
            <p className="well-intro">{'Take a moment between sessions.'}</p>
            <ul className="well-list">
              {w.items.map((it) => {
                const on = w.checked.includes(it.id);
                return (
                  <li className="well-item" key={it.id}>
                    <label>
                      <input type="checkbox" checked={on} onChange={() => w.toggle(it.id)} />
                      <span className="box"><Check /></span>
                      <span className="well-label">{it.label}</span>
                      <span className="well-state mono">{on ? 'Done' : 'Not yet'}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <div className="well-foot">
              <p aria-live="polite">{w.status}</p>
              <p className="note">{w.note}</p>
            </div>
          </div>
          <Instruments />
        </div>
      </div>
    </section>
  );
}

function Closing() {
  const rows = [
    { k: 'Email', v: conference.email },
    { k: 'Instagram', v: conference.instagram },
    { k: 'Registration', v: conference.registerUrl },
    { k: 'Venue', v: conference.venue },
  ];
  return (
    <section className="sec close" id="contact" aria-labelledby="contact-h">
      <div className="wrap">
        <div className="rule" data-rule aria-hidden="true" />
        <div className="grid12" style={{ paddingTop: 18 }}>
          <p className="annex-no mono">Contact</p>
          <h2 className="done" id="contact-h">
            Done at {conference.city}, on <span className="blank">{tba(conference.dates).toLowerCase()}</span>.
          </h2>
          <dl className="contact-list">
            {rows.map((r) => (
              <div key={r.k}>
                <dt className="mono">{r.k}</dt>
                <dd className={r.v ? '' : 'tba'}>{tba(r.v)}</dd>
              </div>
            ))}
          </dl>
          <div className="signoff">
            <div className="sig-line" aria-hidden="true" />
            <p><b>{conference.host}</b>, host of {conference.edition}</p>
          </div>
        </div>
      </div>
      <div className="wrap">
        <div className="colophon" aria-hidden="true">
          <p className="colophon-mark">DXB MUN<span>.</span></p>
        </div>
        <footer className="foot">
          <p>© {conference.year} {conference.name}</p>
          <p>{conference.motto}</p>
          <a href="#/" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0 }); }}>Back to top</a>
        </footer>
      </div>
    </section>
  );
}

export function Home() {
  useSmoothScroll(true, NAV_H);
  // In-page anchors (hero buttons, margin notes) go through the shared scroll so jumps land below the nav.
  useEffect(() => {
    const on = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.('a[href^="#"]') as HTMLAnchorElement | null;
      const href = a?.getAttribute('href') || '';
      if (!a || href.startsWith('#/') || href.length < 2 || !document.getElementById(href.slice(1))) return;
      e.preventDefault();
      scrollToSection(href.slice(1), NAV_H);
    };
    document.addEventListener('click', on);
    return () => document.removeEventListener('click', on);
  }, []);
  return (
    <>
      <Hero />
      <Resolution />
      <Committees />
      <Agenda />
      <Wellness />
      <Closing />
    </>
  );
}
