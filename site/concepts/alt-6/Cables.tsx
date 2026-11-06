// The seven cables on the tractor-feed paper. Facts come from the shared data; unknowns stay redacted.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CABLES, committees, facts, resources, schedule, statLines } from './content';
import { Bar, CableEnd, CableHead, Redact, Stamp, Type, useOnView } from './ui';
import { useWellness } from '@/shared/hooks';
import { register, signIn, portal, chair, admin } from './links';

const cable = (id: string) => CABLES.find((c) => c.id === id)!;

function Cable({ id, stamp, children, h }: { id: string; stamp?: string; children: ReactNode; h: string[] }) {
  const c = cable(id);
  return (
    <section id={c.id} className={'cable cable-' + c.id} aria-labelledby={c.id + '-h'}>
      <CableHead n={c.n} subj={c.subj} stamp={stamp} />
      <h2 className="cable-h" id={c.id + '-h'}>
        {h.map((line, i) => (
          <span className="ch-line" key={i}><Bar delay={i * 0.1} start="top 82%">{line}</Bar></span>
        ))}
      </h2>
      {children}
      <CableEnd n={c.n} />
    </section>
  );
}

function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="row">
      <dt>{k}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ 01 About */
function About() {
  return (
    <Cable id="about" h={['Diplomacy', 'around us.']} stamp="OPEN">
      <div className="about-grid">
        <dl className="rows">
          <Row k="EVENT"><Redact value={facts.edition} /></Row>
          <Row k="KIND"><Redact value={facts.kind} delay={0.05} /></Row>
          <Row k="CITY"><Redact value={facts.city} delay={0.1} /></Row>
          <Row k="HOST"><span className="host-mark" aria-hidden="true">IHS</span><Redact value={facts.host} delay={0.15} /></Row>
          <Row k="DATES"><Redact value={facts.dates} /></Row>
          <Row k="VENUE"><Redact value={facts.venue} /></Row>
        </dl>
        <dl className="tally" aria-label="In numbers">
          {statLines.map((s, i) => (
            <div key={s.label} className="tally-row">
              <dt>{s.label}</dt>
              <dd><Bar delay={0.1 + i * 0.12}>{s.value}</Bar></dd>
            </div>
          ))}
        </dl>
      </div>
    </Cable>
  );
}

/* ------------------------------------------------------------------ 02 Committees: dossier index */
function Committees() {
  const [cur, setCur] = useState(0);
  const [opened, setOpened] = useState(0); // bumps on every open so the print reruns
  const [ref, seen] = useOnView<HTMLDivElement>('top 80%');
  const list = useRef<HTMLOListElement>(null);
  const c = committees[cur];
  const open = (i: number) => { setCur(i); setOpened((o) => o + 1); };
  const onKey = (e: React.KeyboardEvent) => {
    const d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (cur + d + committees.length) % committees.length;
    open(n);
    list.current?.querySelectorAll('button')[n]?.focus();
  };
  const file = `FILE ${String(cur + 1).padStart(2, '0')} / ${committees.length}`;
  const run = seen && opened >= 0;
  return (
    <Cable id="committees" h={['Nineteen files.', 'Open one.']}>
      <div className="dossier" ref={ref}>
        <ol className="files" ref={list} onKeyDown={onKey} aria-label="Committee files">
          {committees.map((m, i) => (
            <li key={m.abbr}>
              <button type="button" className={'file' + (i === cur ? ' is-open' : '')} aria-pressed={i === cur} onClick={() => open(i)}>
                <span className="f-n">{String(i + 1).padStart(2, '0')}</span>
                <span className="f-a">{m.abbr}</span>
              </button>
            </li>
          ))}
        </ol>
        <article className="open-file" aria-live="polite" key={opened}>
          <div className="of-top">
            <span>{file}</span>
            <span>CLASS: OPEN</span>
          </div>
          <h3 className="of-abbr"><Type text={c.abbr} run={run} cps={40} cursor={false} /></h3>
          <dl className="rows of-rows">
            <Row k="CODE"><Type text={c.abbr} run={run} cps={120} delay={0.1} /></Row>
            <Row k="NAME"><Type text={c.name} run={run} cps={150} delay={0.18} /></Row>
            <Row k="AGENDA"><Redact value={null} /></Row>
            <Row k="CHAIRS"><Redact value={null} /></Row>
          </dl>
          <p className="of-foot">Arrow keys move between files</p>
        </article>
      </div>
    </Cable>
  );
}

/* ------------------------------------------------------------------ 03 Schedule */
function Schedule() {
  const [day, setDay] = useState(1);
  const [ref, seen] = useOnView<HTMLDivElement>('top 80%');
  const d = schedule.find((s) => s.day === day)!;
  return (
    <Cable id="schedule" h={['Three days.', 'Six sessions.']}>
      <div className="sched" ref={ref}>
        <div className="days" role="tablist" aria-label="Day">
          {schedule.map((s) => (
            <button key={s.day} type="button" role="tab" aria-selected={s.day === day} className={'day' + (s.day === day ? ' is-on' : '')} onClick={() => setDay(s.day)}>
              {s.label.toUpperCase()}
            </button>
          ))}
          <span className="days-date">DATE <Redact value={null} /></span>
        </div>
        <ol className="log" key={day} role="tabpanel" aria-label={d.label}>
          {d.slots.map((s, i) => (
            <li key={s.name + s.time} className={/Committee Session/.test(s.name) ? 'is-session' : /Ceremony/.test(s.name) ? 'is-cer' : ''}>
              <span className="lg-t"><Type text={s.time} run={seen} delay={i * 0.06} cps={180} cursor={false} /></span>
              <span className="lg-n"><Type text={s.name.toUpperCase()} run={seen} delay={i * 0.06 + 0.05} cps={150} /></span>
              <span className="lg-d">{s.duration}</span>
            </li>
          ))}
        </ol>
      </div>
    </Cable>
  );
}

/* ------------------------------------------------------------------ 04 Register: credentials */
function Register() {
  return (
    <Cable id="register" h={['Request', 'credentials.']} stamp="ACTION">
      <div className="reg">
        <div className="reg-copy">
          <dl className="rows">
            <Row k="WHO">Delegates, advisors and chairs</Row>
            <Row k="HOW">Through the delegate dashboard</Row>
            <Row k="OPENS"><Redact value={facts.registerUrl ? 'Open' : null} /></Row>
          </dl>
          <div className="reg-cta">
            <a className="btn btn-ink" href={register}>Register</a>
            <a className="btn btn-line-ink" href={signIn}>Sign in</a>
          </div>
        </div>
        <div className="pass" aria-label="Delegate credential">
          <div className="pass-host"><span>HOST</span><span>{facts.host.toUpperCase()}</span></div>
          <div className="pass-top"><span>{facts.edition.toUpperCase()}</span><span>{facts.city.toUpperCase()}</span></div>
          <p className="pass-big">DELEGATE</p>
          <dl className="pass-rows">
            <div><dt>NAME</dt><dd /></div>
            <div><dt>DELEGATION</dt><dd /></div>
            <div><dt>COMMITTEE</dt><dd /></div>
            <div><dt>DATES</dt><dd className="pass-tba">To be announced</dd></div>
          </dl>
          <div className="pass-foot">
            <span className="pass-dither" aria-hidden="true" />
            <Stamp className="stamp-ink">PRIORITY: IMMEDIATE</Stamp>
          </div>
        </div>
      </div>
    </Cable>
  );
}

/* ------------------------------------------------------------------ 05 Wellness */
function Wellness() {
  const w = useWellness();
  return (
    <Cable id="wellness" h={['Quick reset.']}>
      <div className="well">
        <p className="lede">Take a moment between sessions.</p>
        <ul className="checks">
          {w.items.map((it) => {
            const on = w.checked.includes(it.id);
            return (
              <li key={it.id}>
                <button type="button" role="checkbox" aria-checked={on} className={'check' + (on ? ' is-on' : '')} onClick={() => w.toggle(it.id)}>
                  <span className="ck-box" aria-hidden="true">[{on ? 'X' : ' '}]</span>
                  <span className="ck-t">{it.label.toUpperCase()}</span>
                  {on && <Stamp className="ck-stamp">DONE</Stamp>}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="well-status" aria-live="polite">{w.status} <span>{w.note}</span></p>
      </div>
    </Cable>
  );
}

/* ------------------------------------------------------------------ 06 Resources */
function Resources() {
  return (
    <Cable id="resources" h={['Annexes.']}>
      <ol className="annex">
        {resources.map((r, i) => (
          <li key={r.title}>
            <span className="ax-k">ANNEX {String.fromCharCode(65 + i)}</span>
            <span className="ax-t">{r.title}</span>
            <span className="ax-b">{r.blurb}</span>
            <span className="ax-l">{r.href ? <a href={r.href}>Open</a> : <Redact value={null} />}</span>
          </li>
        ))}
      </ol>
    </Cable>
  );
}

/* ------------------------------------------------------------------ 07 Contact */
function Contact() {
  return (
    <Cable id="contact" h={['Reply to', 'the secretariat.']}>
      <dl className="rows contact-rows">
        <Row k="EMAIL"><Redact value={facts.email} /></Row>
        <Row k="INSTAGRAM"><Redact value={facts.instagram} /></Row>
        <Row k="HOST"><span className="host-mark" aria-hidden="true">IHS</span><Redact value={facts.host} /></Row>
        <Row k="CITY"><Redact value={facts.city} delay={0.05} /></Row>
      </dl>
    </Cable>
  );
}

export function Cables() {
  return (
    <>
      <About />
      <Committees />
      <Schedule />
      <Register />
      <Wellness />
      <Resources />
      <Contact />
    </>
  );
}

export function EndOfTransmission() {
  const [ref, seen] = useOnView<HTMLDivElement>('top 92%');
  return (
    <footer className="eot" ref={ref}>
      <p className="eot-big" aria-label="End of transmission">NNNN</p>
      <p className="eot-l"><Type text="END OF TRANSMISSION · DXB MUN 2027 · DUBAI" run={seen} cps={90} /></p>
      <ul className="eot-links">
        <li><a href={portal}>Delegate dashboard</a></li>
        <li><a href={chair}>Chair</a></li>
        <li><a href={admin}>Secretariat</a></li>
      </ul>
    </footer>
  );
}

/** Watches which cable is under the middle of the screen. */
export function useActiveCable(enabled: boolean) {
  const [active, setActive] = useState<(typeof CABLES)[number]['id'] | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const els = CABLES.map((c) => document.getElementById(c.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setActive(e.target.id as (typeof CABLES)[number]['id']);
    }, { rootMargin: '-50% 0px -50% 0px' });
    els.forEach((el) => io.observe(el));
    const top = () => { if (scrollY < innerHeight * 0.5) setActive(null); };
    addEventListener('scroll', top, { passive: true });
    return () => { io.disconnect(); removeEventListener('scroll', top); };
  }, [enabled]);
  return active;
}
