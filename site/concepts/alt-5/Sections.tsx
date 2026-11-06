// The eight blocks of the page: the opening and Motions 01–07.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { committees, conference, resources, schedule, stats, tba, wellness } from '@/data/conference';
import { isStill, useWellness } from '@/shared/hooks';
import { MOTIONS, jumpTo, type Motion } from './floor';
import { KLine } from './KLine';
import { getVelocity } from './kinetic';
import { HostMark } from './Nav';
import { admin, chair, register, signIn } from './links';

const still = isStill();
const M = (id: string) => MOTIONS.find((m) => m.id === id)!;

export function usePhone() {
  const q = '(max-width: 719px)';
  const [p, setP] = useState(() => matchMedia(q).matches);
  useEffect(() => {
    const mq = matchMedia(q);
    const on = () => setP(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return p;
}

function useInView<T extends Element>(margin = '-12% 0px') {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(still);
  useEffect(() => {
    if (still || !ref.current) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { rootMargin: margin });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [margin]);
  return [ref, seen] as const;
}

const Arrow = () => (
  <svg className="arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h16M13 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" /></svg>
);

/* ------------------------------------------------------------------ section shell + colour stairs */
const STAIR_ORDER = [3, 0, 6, 1, 5, 7, 2, 4];

function Sec({ m, className, children }: { m: Motion; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const idx = MOTIONS.indexOf(m);
  useLayoutEffect(() => {
    if (still || idx === 0) return;
    const cols = Array.from(ref.current!.querySelectorAll<HTMLElement>('.stairs i'));
    const sorted = STAIR_ORDER.map((i) => cols[i]).filter(Boolean);
    const ctx = gsap.context(() => {
      gsap.fromTo(sorted, { scaleY: 0 }, {
        scaleY: 1, ease: 'none', stagger: 0.09,
        scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'top 40%', scrub: true },
      });
    });
    return () => ctx.revert();
  }, [idx]);
  return (
    <section id={m.id} ref={ref} className={`sec g-${m.ground} ${className ?? ''}`} style={{ zIndex: idx + 1 }} aria-label={`Motion ${m.n}: ${m.label}`}>
      {idx > 0 && <div className="stairs" aria-hidden="true">{STAIR_ORDER.map((_, i) => <i key={i} />)}</div>}
      {children}
    </section>
  );
}

function Head({ m, title }: { m: Motion; title?: string }) {
  const [ref, seen] = useInView<HTMLDivElement>();
  return (
    <div className="head" ref={ref}>
      <div className="head-rule mono">
        <span>Motion {m.n} <i>/ 07</i></span>
        <span className="head-motion"><span className="head-label">{m.label} · </span>{m.motion}</span>
      </div>
      <KLine as="h2" text={title ?? m.label.toUpperCase()} label={m.label} className="head-k" stretchFrom={0.3} play={seen}
        opts={{ mode: 'fit', weight: 820, bMax: 132 }} />
    </div>
  );
}

/* ------------------------------------------------------------------ 00 opening */
export function Hero({ revealed }: { revealed: boolean }) {
  const phone = usePhone();
  const o = { breathe: 1, weight: 820 };
  return (
    <Sec m={M('home')} className="hero">
      <div className="hero-kick mono">
        <span>Motion 00 · To open the floor</span>
        <span className="hk-mid">{conference.kind} · {conference.city}</span>
        <span className="hk-host"><HostMark /> Hosted by {conference.host}</span>
      </div>
      {phone ? (
        <>
          <KLine as="h1" text="DXB" label={conference.edition} className="h-a" opts={o} stretchFrom={0.45} play={revealed} />
          <KLine text="MUN" className="h-a" opts={o} stretchFrom={0.5} play={revealed} />
          <KLine text="2027" className="h-b" opts={{ ...o, weight: 900 }} stretchFrom={0.55} play={revealed} />
          <KLine as="p" text="DIPLOMACY" label={conference.motto} className="h-c" opts={{ weight: 600, breathe: 0.6 }} stretchFrom={0.4} play={revealed} />
          <KLine text="AROUND US" className="h-c" opts={{ weight: 600, breathe: 0.6 }} stretchFrom={0.45} play={revealed} />
        </>
      ) : (
        <>
          <KLine as="h1" text="DXB MUN" label={conference.edition} className="h-a" opts={o} stretchFrom={0.45} play={revealed} />
          <div className="hero-mid">
            <HeroFacts />
            <KLine text="2027" className="h-b" opts={{ ...o, weight: 900 }} stretchFrom={0.5} play={revealed} />
          </div>
          <KLine as="p" text="DIPLOMACY AROUND US" label={conference.motto} className="h-c" opts={{ weight: 600, breathe: 0.6 }} stretchFrom={0.4} play={revealed} />
        </>
      )}
      <div className="hero-foot">
        {phone && <HeroFacts />}
        <a className="btn btn--signal" href={register}>Register <Arrow /></a>
        <a className="mono hero-down" href="#about" onClick={(e) => { e.preventDefault(); e.stopPropagation(); jumpTo('about'); }}>Move to Motion 01 <Arrow /></a>
      </div>
    </Sec>
  );
}

function HeroFacts() {
  return (
    <dl className="hero-facts mono">
      <div><dt>Dates</dt><dd>{tba(conference.dates)}</dd></div>
      <div><dt>Venue</dt><dd>{tba(conference.venue)}</dd></div>
      <div><dt>Committees</dt><dd>{stats[0].value}</dd></div>
      <div><dt>Days</dt><dd>{stats[1].value}</dd></div>
    </dl>
  );
}

/* ------------------------------------------------------------------ 01 about */
export function About() {
  const phone = usePhone();
  const [ref, seen] = useInView<HTMLDivElement>();
  const pairs: [string, string][] = [[String(stats[0].value), 'COMMITTEES'], [String(stats[1].value), 'DAYS'], [String(stats[2].value), 'SESSIONS']];
  const rows: [string, ReactNode][] = [
    ['Hosted by', <><HostMark /> {conference.host}</>],
    ['Guided by', <>“{conference.motto}”</>],
    ['Convenes in', conference.city],
    ['Dates', tba(conference.dates)],
    ['Venue', tba(conference.venue)],
  ];
  return (
    <Sec m={M('about')} className="about">
      <Head m={M('about')} />
      <div ref={ref} className={phone ? 'ab-lines' : undefined}>
        {phone
          ? pairs.map(([n, w], i) => (
            <KLine key={w} className="ab-k" label={`${n} ${w.toLowerCase()}`} stretchFrom={0.35} play={seen} opts={{ weight: 700, maxSize: 96 }}
              parts={[{ key: 'n' + i, text: n, active: true }, { key: 'w' + i, text: w }]} />
          ))
          : (
            <KLine className="ab-k" label={`${stats[0].value} committees, ${stats[1].value} days, ${stats[2].value} committee sessions`}
              stretchFrom={0.35} play={seen} opts={{ weight: 700 }}
              parts={pairs.flatMap(([n, w], i) => [{ key: 'n' + i, text: n, active: true }, { key: 'w' + i, text: w }])} />
          )}
      </div>
      <dl className="clauses">
        {rows.map(([k, v], i) => (
          <div key={k}>
            <dt className="mono"><b>{String(i + 1).padStart(2, '0')}</b> {k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </Sec>
  );
}

/* ------------------------------------------------------------------ 02 committees */
export function Committees() {
  const phone = usePhone();
  const [idx, setIdx] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  const holdUntil = useRef(0);
  const c = committees[idx];
  const n = committees.length;

  useEffect(() => {
    if (still) return;
    let x = 0, speed = 0, dir = 1, mw = 100;
    const tick = (_t: number, dtMs: number) => {
      const el = track.current;
      if (!el) return;
      const dt = Math.min(0.1, dtMs / 1000);
      const v = getVelocity();
      if (Math.abs(v) > 0.6) dir = v > 0 ? 1 : -1;
      const hold = paused.current || performance.now() < holdUntil.current;
      const want = hold ? 0 : (64 + Math.min(900, Math.abs(v) * 30)) * dir;
      speed += (want - speed) * Math.min(1, dt * (hold ? 9 : 4));
      const half = el.scrollWidth / 2;
      x -= speed * dt;
      if (half > 0) { while (x <= -half) x += half; while (x > 0) x -= half; }
      el.style.transform = `translate3d(${Math.round(x)}px,0,0)`;
      const vn = Math.min(1, Math.abs(v) / 30);
      const nw = 100 - 48 * vn;
      if (Math.abs(nw - mw) > 0.4) { mw = nw; el.style.setProperty('--mw', mw.toFixed(1)); }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  const pick = (i: number) => setIdx(((i % n) + n) % n);
  const copies = still ? [0] : [0, 1];
  const maxSize = Math.round(Math.min(innerHeight * (phone ? 0.16 : 0.27), phone ? 120 : 250));

  return (
    <Sec m={M('committees')} className="cmt">
      <Head m={M('committees')} />
      <div className="cm-marquee" onMouseLeave={() => { paused.current = false; }}>
        <div className="cm-track" ref={track}>
          {copies.map((k) => (
            <div className="cm-set" key={k} aria-hidden={k === 1 ? 'true' : undefined}>
              {committees.map((x, i) => (
                <button key={x.abbr} type="button" tabIndex={k === 1 ? -1 : 0}
                  className={'cm-item' + (i === idx ? ' is-on' : '')}
                  aria-label={`${x.abbr}: ${x.name}`} aria-controls="cm-focus"
                  onMouseEnter={() => { paused.current = true; pick(i); }}
                  onFocus={() => { paused.current = true; pick(i); }}
                  onBlur={() => { paused.current = false; }}
                  onClick={() => { pick(i); holdUntil.current = performance.now() + 3500; }}>
                  {x.abbr}<i aria-hidden="true" />
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="cm-focus" id="cm-focus" aria-live="polite">
        <KLine text={c.abbr} label={`${c.abbr}: ${c.name}`} className="cm-k" stretchFrom={0.22}
          opts={{ weight: 900, maxSize, wave: 0.6 }}><span aria-hidden="true" style={{ height: Math.round(maxSize * 0.8) }} /></KLine>
        <div className="cm-meta">
          <span className="mono cm-n">{String(idx + 1).padStart(2, '0')} / {n}</span>
          <p className="cm-name">{c.name}</p>
          <span className="mono cm-agenda">Agenda: {tba(null)}</span>
        </div>
      </div>
      <div className="cm-pick" role="group" aria-label="Browse the 19 committees">
        <button type="button" className="cm-step" onClick={() => pick(idx - 1)} aria-label="Previous committee"><Arrow /></button>
        <div className="cm-nums">
          {committees.map((x, i) => (
            <button key={x.abbr} type="button" className={'cm-num mono' + (i === idx ? ' is-on' : '')} onClick={() => pick(i)}
              aria-label={x.abbr} aria-pressed={i === idx}>{String(i + 1).padStart(2, '0')}</button>
          ))}
        </div>
        <button type="button" className="cm-step cm-next" onClick={() => pick(idx + 1)} aria-label="Next committee"><Arrow /></button>
      </div>
    </Sec>
  );
}

/* ------------------------------------------------------------------ 03 schedule */
export function Schedule() {
  const [day, setDay] = useState(1);
  const d = schedule.find((x) => x.day === day)!;
  return (
    <Sec m={M('schedule')} className="sched">
      <Head m={M('schedule')} />
      <KLine className="sc-k" label="Pick a day" opts={{ weight: 700, wave: 0.6 }}
        parts={schedule.map((x) => ({
          key: 'd' + x.day, text: x.label.toUpperCase(), active: x.day === day,
          onClick: () => setDay(x.day), current: x.day === day, controls: 'slots', label: x.label,
        }))} />
      <ol className="slots" id="slots" key={day} aria-label={d.label}>
        {d.slots.map((s, i) => (
          <li key={s.name + i} style={{ '--i': i } as React.CSSProperties}>
            <span className="mono s-t">{s.time}</span>
            <b className="s-n">{s.name}</b>
            <span className="mono s-d">{s.duration}</span>
          </li>
        ))}
      </ol>
    </Sec>
  );
}

/* ------------------------------------------------------------------ 04 register */
export function Register() {
  return (
    <Sec m={M('register')} className="reg">
      <Head m={M('register')} title="TAKE THE FLOOR" />
      <div className="rg-row">
        <a className="rg-btn rg-btn--signal" href={register}>
          <span className="mono">Delegates · new here</span>
          <KLine text="REGISTER" opts={{ weight: 880, wave: 0.5 }} className="rg-k" />
          <Arrow />
        </a>
        <a className="rg-btn rg-btn--paper" href={signIn}>
          <span className="mono">Delegates, advisors and chairs</span>
          <KLine text="SIGN IN" opts={{ weight: 880, wave: 0.5 }} className="rg-k" />
          <Arrow />
        </a>
      </div>
      <dl className="rg-facts mono">
        <div><dt>Dates</dt><dd>{tba(conference.dates)}</dd></div>
        <div><dt>Venue</dt><dd>{tba(conference.venue)}</dd></div>
        <div><dt>City</dt><dd>{conference.city}</dd></div>
      </dl>
    </Sec>
  );
}

/* ------------------------------------------------------------------ 05 wellness */
export function Wellness() {
  const phone = usePhone();
  const w = useWellness();
  return (
    <Sec m={M('wellness')} className="well">
      <Head m={M('wellness')} title={wellness.title.toUpperCase()} />
      <p className="lede">{wellness.intro} Tap each one when done.</p>
      {(phone ? w.items.map((it) => [it]) : [w.items]).map((group, gi) => (
        <KLine key={gi} className="wl-k" label="Wellness check-in" opts={{ weight: 700, wave: 0.6, maxSize: phone ? 110 : 0 }}
          parts={group.map((it) => ({
            key: it.id, text: it.label.toUpperCase(), active: w.checked.includes(it.id),
            pressed: w.checked.includes(it.id), onClick: () => w.toggle(it.id), label: it.label,
          }))} />
      ))}
      <p className="wl-status mono"><b>{w.status}</b> {w.note}</p>
    </Sec>
  );
}

/* ------------------------------------------------------------------ 06 resources */
export function Resources() {
  return (
    <Sec m={M('resources')} className="res">
      <Head m={M('resources')} />
      <ul className="res-list">
        {resources.map((r, i) => (
          <li key={r.title}>
            <span className="mono">{String(i + 1).padStart(2, '0')}</span>
            <b>{r.title}</b>
            <span className="res-blurb">{r.blurb}</span>
            {r.href ? <a className="btn btn--signal" href={r.href}>Open <Arrow /></a> : <span className="mono res-tba"><i />{tba(r.href)}</span>}
          </li>
        ))}
      </ul>
    </Sec>
  );
}

/* ------------------------------------------------------------------ 07 contact + footer */
export function Contact() {
  const [ref, seen] = useInView<HTMLDivElement>('0px');
  return (
    <Sec m={M('contact')} className="contact">
      <Head m={M('contact')} />
      <dl className="ct-rows">
        <div><dt className="mono">Email</dt><dd>{tba(conference.email)}</dd></div>
        <div><dt className="mono">Instagram</dt><dd>{tba(conference.instagram)}</dd></div>
        <div><dt className="mono">Host</dt><dd>{conference.host}, {conference.city}</dd></div>
      </dl>
      <footer className="foot" ref={ref}>
        <KLine text="DXB MUN 2027" label={conference.edition} className="foot-k" stretchFrom={0.3} play={seen} opts={{ weight: 860 }} />
        <div className="foot-row mono">
          <span>{conference.kind} · {conference.city} · Hosted by {conference.host}</span>
          <span className="foot-links">
            <a href={admin}>Secretariat</a>
            <a href={chair}>Chair</a>
            <a href="?still">Calm version</a>
          </span>
        </div>
      </footer>
    </Sec>
  );
}
