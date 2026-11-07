// Alt 4 · The Floor: everything below the hero. One ground, one type setting, a strict 12-column grid.
// Each section: a mono label column on the left (index + name), a small Archivo title, then the content.
// Motion: a short clip + 10px rise on enter (GSAP ScrollTrigger). Nothing moves under ?still or reduced motion.
// Version A of each section. Each one is self-contained (own <section>, own reveal, layout from its own width via
// container queries) so a design board can swap it for a B or C version.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Tabs } from '@base-ui/react/tabs';
import { Accordion } from '@base-ui/react/accordion';
import { Checkbox } from '@base-ui/react/checkbox';
import { Field } from '@base-ui/react/field';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { committees, conference, resources, schedule, stats, tba, wellness, type Slot } from '@/data/conference';
import { isStill, useWellness } from '@/shared/hooks';
import { emit } from './bus';
import { admin, chair, portal, register, signIn } from './links';
import { Arrow, HostMark } from './Nav';

gsap.registerPlugin(ScrollTrigger);
const still = isStill();
const pad2 = (n: number) => String(n).padStart(2, '0');

/** True while the element is at most `max` px wide (the section's own width, not the window's). */
function useNarrow(ref: React.RefObject<HTMLElement | null>, max = 860) {
  const [narrow, setNarrow] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const on = () => setNarrow(el.clientWidth <= max);
    on();
    const ro = new ResizeObserver(on);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, max]);
  return narrow;
}

/** Reveal every [data-reveal] block inside `root` once, as it enters: a clip from the top edge and a 10px rise. */
function useReveal(root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (still || !root.current) return;
    const ctx = gsap.context(() => {
      const els = Array.from(root.current!.querySelectorAll<HTMLElement>('[data-reveal]'));
      gsap.set(els, { clipPath: 'inset(0% 0% 100% 0%)', y: 10 });
      const show = (batch: Element[]) =>
        gsap.to(batch, { clipPath: 'inset(0% 0% 0% 0%)', y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.06, overwrite: true, clearProps: 'clipPath,transform' });
      ScrollTrigger.batch(els, { start: 'top 90%', once: true, onEnter: show, onLeave: show, onEnterBack: show });
    }, root);
    const fonts = document.fonts?.ready.then(() => ScrollTrigger.refresh());
    void fonts;
    return () => ctx.revert();
  }, [root]);
}

/* ------------------------------------------------------------------ section shell */
function Sec({ id, n, label, title, sub, className, secRef, children }: {
  id: string; n: number; label: string; title: ReactNode; sub?: ReactNode; className?: string;
  secRef?: React.RefObject<HTMLElement | null>; children: ReactNode;
}) {
  const own = useRef<HTMLElement>(null);
  const ref = secRef ?? own;
  useReveal(ref);
  return (
    <section id={id} ref={ref} className={'f-sec ' + (className ?? '')} aria-labelledby={id + '-h'}>
      <div className="f-wrap f-grid">
        <p className="f-label f-sec-label" data-reveal><span>{pad2(n)}</span>{label}</p>
        <div className="f-sec-head" data-reveal>
          <h2 className="f-h2" id={id + '-h'}>{title}</h2>
          {sub && <p className="f-sub">{sub}</p>}
        </div>
        <div className="f-sec-body">{children}</div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ 01 about */
export function AboutA({ id = 'about' }: { id?: string }) {
  const facts = stats.slice(0, 3);
  const rows: [string, ReactNode][] = [
    ['Host', <><HostMark short /> {conference.host}</>],
    ['City', conference.city],
    ['Edition', String(conference.year)],
  ];
  return (
    <Sec id={id} n={1} label="About" title={<>{conference.motto}.</>}
      sub={<>A {conference.kind} in {conference.city}, hosted by {conference.host}.</>}>
      <ul className="f-facts" data-reveal>
        {facts.map((s, i) => (
          <li key={s.label}>
            <b className={i === 0 ? 'is-signal' : undefined}>{s.value}</b>
            <span className="f-label">{s.label}</span>
          </li>
        ))}
      </ul>
      <dl className="f-facts f-facts--dl" data-reveal>
        {rows.map(([k, v]) => (
          <div key={k}><dt className="f-label">{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>
    </Sec>
  );
}

/* ------------------------------------------------------------------ 02 committees */
export function CommitteesA({ id = 'committees' }: { id?: string }) {
  const sec = useRef<HTMLElement>(null);
  const phone = useNarrow(sec);
  const [idx, setIdx] = useState(0);
  const n = committees.length;
  return (
    <Sec id={id} secRef={sec} n={2} label="Committees" title={<>{n} committees.</>} sub="One floor each. Agendas to be announced.">
      <div data-reveal>
      {phone ? (
        <Accordion.Root className="f-acc">
          {committees.map((c, i) => (
            <Accordion.Item key={c.abbr} value={c.abbr} className="f-acc-item">
              <Accordion.Header className="f-acc-h">
                <Accordion.Trigger className="f-acc-t">
                  <span className="f-cm-n">{pad2(i + 1)}</span>
                  <span className="f-acc-abbr">{c.abbr}</span>
                  <i className="f-plus" aria-hidden="true" />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel className="f-acc-p">
                <div className="f-acc-in">
                  <p className="f-acc-name">{c.name}</p>
                  <p className="f-label">Agenda: {tba(null)}</p>
                </div>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      ) : (
        <Tabs.Root className="f-cm" orientation="vertical" value={idx} onValueChange={(v) => setIdx(Number(v))}>
          <Tabs.List className="f-cm-list" activateOnFocus aria-label="The 19 committees">
            {committees.map((c, i) => (
              <Tabs.Tab key={c.abbr} value={i} className="f-cm-tab" aria-label={`${c.abbr}, ${c.name}`}>
                <span className="f-cm-n">{pad2(i + 1)}</span>{c.abbr}
              </Tabs.Tab>
            ))}
          </Tabs.List>
          {committees.map((c, i) => (
            <Tabs.Panel key={c.abbr} value={i} className="f-cm-pane">
              <p className="f-label f-cm-count"><span>{pad2(i + 1)}</span> / {n}</p>
              <p className="f-cm-abbr" aria-hidden="true">{c.abbr}</p>
              <h3 className="f-cm-name">{c.name}</h3>
              <dl className="f-cm-dl">
                <div><dt className="f-label">Agenda</dt><dd>{tba(null)}</dd></div>
              </dl>
            </Tabs.Panel>
          ))}
        </Tabs.Root>
      )}
      </div>
    </Sec>
  );
}

/* ------------------------------------------------------------------ 03 schedule */
/** "1 hour 30 minutes" → 90. Only used to size the ruler rows; the text shown is the data's own. */
const minutes = (d: string) => {
  const h = /(\d+)\s*hour/.exec(d), m = /(\d+)\s*minute/.exec(d);
  return (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
};
const isSession = (s: Slot) => /^Committee Session/.test(s.name);

export function ScheduleA({ id = 'schedule' }: { id?: string }) {
  const sessions = stats[2].value;
  return (
    <Sec id={id} n={3} label="Schedule" title={<>{schedule.length} days. {sessions} sessions.</>}
      sub={<>Dates {tba(conference.dates).toLowerCase()}.</>}>
      <Tabs.Root className="f-sch" defaultValue={1} data-reveal>
        <Tabs.List className="f-days" aria-label="Pick a day">
          {schedule.map((d) => (
            <Tabs.Tab key={d.day} value={d.day} className="f-day">
              <span className="f-day-n">{pad2(d.day)}</span>{d.label}
            </Tabs.Tab>
          ))}
          <Tabs.Indicator className="f-day-ind" />
        </Tabs.List>
        {schedule.map((d) => (
          <Tabs.Panel key={d.day} value={d.day} className="f-ruler-wrap">
            <ol className="f-ruler" aria-label={d.label}>
              {d.slots.map((s, i) => {
                const [from, to] = s.time.split(' – ');
                const on = isSession(s);
                return (
                  <li key={s.name + i} className={on ? 'is-session' : undefined}
                    style={{ '--m': minutes(s.duration) } as React.CSSProperties}>
                    <span className="f-r-time"><b>{from}</b>{to && <span>to {to}</span>}</span>
                    <span className="f-r-axis" aria-hidden="true">{on && <i />}</span>
                    <span className="f-r-name">{s.name}</span>
                    <span className="f-r-dur">{s.duration}</span>
                  </li>
                );
              })}
            </ol>
          </Tabs.Panel>
        ))}
      </Tabs.Root>
      <p className="f-key f-label" data-reveal><i aria-hidden="true" /> Committee session</p>
    </Sec>
  );
}

/* ------------------------------------------------------------------ 04 register */
/** Fit one line of text to its box: start from the box's own size and shrink until it fits. */
function useFit(text: string) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      const box = el.parentElement!;
      const max = Math.min(box.clientWidth * 0.12, box.clientHeight * 0.34);
      el.style.fontSize = max + 'px';
      const avail = box.clientWidth * 0.86;
      if (el.scrollWidth > avail) el.style.fontSize = (max * avail) / el.scrollWidth + 'px';
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el.parentElement!);
    return () => ro.disconnect();
  }, [text]);
  return ref;
}

export function RegisterA({ id = 'register' }: { id?: string }) {
  const [name, setName] = useState('');
  const shown = name.trim();
  const fit = useFit(shown || 'Your name');
  return (
    <Sec id={id} n={4} label="Register" title="Take the floor." sub="Type your name. Then claim your seat." className="f-reg">
      <div className="f-reg-grid">
        <div className="f-reg-form" data-reveal>
          <Field.Root className="f-field">
            <Field.Label className="f-label">Your name</Field.Label>
            <Field.Control className="f-input" value={name} maxLength={40} autoComplete="name" spellCheck={false}
              placeholder="Your name" onChange={(e) => setName(e.target.value)} />
          </Field.Root>
          <div className="f-ctas">
            <a className="f-btn f-btn--un" href={register} onClick={() => emit('tap')}>Register <Arrow /></a>
            <a className="f-btn f-btn--line" href={signIn}>Sign in</a>
          </div>
          <dl className="f-reg-facts">
            <div><dt className="f-label">Dates</dt><dd>{tba(conference.dates)}</dd></div>
            <div><dt className="f-label">Venue</dt><dd>{tba(conference.venue)}</dd></div>
          </dl>
        </div>
        <figure className="f-plate-wrap" data-reveal aria-label="Your nameplate preview">
          <div className="f-plate" aria-live="polite">
            <span className={'f-plate-name' + (shown ? '' : ' is-empty')} ref={fit}>{shown || 'Your name'}</span>
            <span className="f-plate-ed">{conference.edition}</span>
          </div>
          <figcaption className="f-label">Your placard</figcaption>
        </figure>
      </div>
    </Sec>
  );
}

/* ------------------------------------------------------------------ 05 wellness */
export function WellnessA({ id = 'wellness' }: { id?: string }) {
  const w = useWellness();
  return (
    <Sec id={id} n={5} label="Wellness" title={<>{wellness.title}.</>} sub={wellness.intro} className="f-sec--short">
      <ul className="f-check" data-reveal>
        {w.items.map((it, i) => {
          const on = w.checked.includes(it.id);
          return (
            <li key={it.id}>
              <label className={'f-check-row' + (on ? ' is-on' : '')}>
                <Checkbox.Root className="f-box" checked={on} onCheckedChange={() => w.toggle(it.id)}>
                  <Checkbox.Indicator className="f-box-i">
                    <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" /></svg>
                  </Checkbox.Indicator>
                </Checkbox.Root>
                <span className="f-check-l">{it.label}</span>
                <span className="f-label f-check-n">{on ? 'Done' : pad2(i + 1)}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <p className="f-status f-label" aria-live="polite" data-reveal>
        <span>{w.status}</span><span>{w.note}</span>
      </p>
    </Sec>
  );
}

/* ------------------------------------------------------------------ 06 resources */
function Resources({ id }: { id: string }) {
  return (
    <Sec id={id} n={6} label="Resources" title="Resources." sub="Papers and procedure for delegates." className="f-sec--short">
      <div className="f-table" role="table" aria-label="Resources" data-reveal>
        <div className="f-tr f-th f-label" role="row">
          <span role="columnheader">No.</span><span role="columnheader">Document</span><span role="columnheader">Status</span>
        </div>
        {resources.map((r, i) => (
          <div className="f-tr" role="row" key={r.title}>
            <span className="f-label" role="cell">{pad2(i + 1)}</span>
            <span role="cell" className="f-td-doc"><b>{r.title}</b><span>{r.blurb}</span></span>
            <span role="cell" className="f-td-st">
              {r.href ? <a className="f-link" href={r.href}>Open <Arrow /></a> : <span className="f-label">{tba(r.href)}</span>}
            </span>
          </div>
        ))}
      </div>
    </Sec>
  );
}

/* ------------------------------------------------------------------ 07 contact */
function Contact({ id }: { id: string }) {
  const rows: [string, ReactNode][] = [
    ['Email', tba(conference.email)],
    ['Instagram', tba(conference.instagram)],
    ['Host', <><HostMark short /> {conference.host}</>],
    ['City', conference.city],
  ];
  return (
    <Sec id={id} n={7} label="Contact" title="Contact." sub={<>Hosted by {conference.host}, {conference.city}.</>} className="f-sec--short">
      <dl className="f-contact" data-reveal>
        {rows.map(([k, v]) => <div key={k}><dt className="f-label">{k}</dt><dd>{v}</dd></div>)}
      </dl>
    </Sec>
  );
}

function Footer() {
  return (
    <footer className="f-foot">
      <div className="f-wrap f-foot-in">
        <span className="f-label">© {conference.edition} · {conference.kind} · {conference.city}</span>
        <nav className="f-foot-links f-label" aria-label="Staff">
          <a href={portal}>Portal</a>
          <a href={chair}>Chair</a>
          <a href={admin}>Admin</a>
        </nav>
      </div>
    </footer>
  );
}

/** Resources + Contact + the footer, as one swappable block. Resources keeps id "resources" (or `<id>-resources`). */
export function ContactA({ id = 'contact' }: { id?: string }) {
  return (
    <>
      <Resources id={id === 'contact' ? 'resources' : id + '-resources'} />
      <Contact id={id} />
      <Footer />
    </>
  );
}

export function Sections() {
  return (
    <div className="f-sections">
      <AboutA />
      <CommitteesA />
      <ScheduleA />
      <RegisterA />
      <WellnessA />
      <ContactA />
    </div>
  );
}
