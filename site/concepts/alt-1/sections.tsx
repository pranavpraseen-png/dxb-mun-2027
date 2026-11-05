// Alt 1 · Terminal Paper: the homepage sections 1–8 (BLUEPRINT section 3). Facts come only from src/data/conference.ts.
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Checkbox } from '@base-ui/react/checkbox';
import NumberFlow from '@number-flow/react';
import { committees, conference, resources, schedule, stats, tba, type Slot } from '@/data/conference';
import { useWellness } from '@/shared/hooks';
import { getLenis } from '@/shared/scroll';
import { Count, useFit, useProgress } from './fx';
import { DUBAI, seg } from './geo';
import { LandedGlobe } from './Stage';
import { admin, chair, register, signIn } from './links';

const Kicker = ({ no, children }: { no: string; children: React.ReactNode }) => (
  <p className="kicker mono"><span>§ {no}</span><span>{children}</span></p>
);

/* ================================================================ 1. hero */
export function Hero() {
  const word = useRef<HTMLSpanElement>(null);
  useFit(word);
  return (
    <section className="hero" id="home" aria-labelledby="hero-title">
      {/* The hero's hairline grid. The loader copies these exact rects and draws them in. */}
      <i className="ln ln-h ln-meta" data-line />
      <i className="ln ln-v ln-left" data-line />
      <i className="ln ln-v ln-right" data-line />
      <div className="hero-meta mono">
        <span>{conference.kind} · {conference.city}</span>
        <span className="hide-s">Hosted by {conference.host}</span>
        <span className="hide-s">Dates · {tba(conference.dates)}</span>
      </div>
      <div className="hero-slot" data-globe-slot />
      <div className="hero-row mono">
        <i className="ln ln-h ln-row" data-line />
        <span>{DUBAI.lat.toFixed(2)}° N {DUBAI.lon.toFixed(2)}° E</span>
        <em className="hero-accent">{conference.motto}.</em>
        <span className="hero-scroll">Scroll <span aria-hidden="true">↓</span></span>
      </div>
      <h1 className="hero-word" id="hero-title">
        <span className="hero-word-mask"><span ref={word} className="hero-word-text">{conference.name}</span></span>
        <span className="sr"> {conference.year}</span>
      </h1>
    </section>
  );
}

/* ================================================================ 2. the flight to Dubai (runway for the fixed stage) */
export function Flight({ still }: { still: boolean }) {
  return (
    <section className={'flight' + (still ? ' flight--still' : '')} id="flight" aria-label="The flight to Dubai">
      <p className="sr">Dubai, {DUBAI.lat.toFixed(2)} N, {DUBAI.lon.toFixed(2)} E. Hosted by {conference.host}. Dates {tba(conference.dates)}.</p>
      {still && <LandedGlobe />}
    </section>
  );
}

/* ================================================================ 3. the resolution: one clause per screen */
type Clause = { verb: string; rest: string };
const CLAUSES: Clause[] = [
  { verb: 'Hosted by', rest: `${conference.host}, ${conference.city}.` },
  { verb: 'Convenes', rest: `${stats[0].value} committees.` },
  { verb: 'Meets for', rest: `${stats[1].value} days and ${stats[2].value} committee sessions.` },
  { verb: 'Guided by', rest: `“${conference.motto}.”` },
  { verb: 'Notes that', rest: `dates and venue are ${tba(null).toLowerCase()}.` },
];

function ClauseText({ c }: { c: Clause }) {
  // Words stay whole; every character is its own span so the ink fills letter by letter (Terminal).
  const words = [...c.verb.split(' ').map((w) => ({ w, v: true })), ...c.rest.split(' ').map((w) => ({ w, v: false }))];
  return (
    <>
      {words.map((x, i) => (
        <Fragment key={i}>
          <span className={'w' + (x.v ? ' w--verb' : '')}>
            {[...x.w].map((ch, j) => <span key={j} className="ch">{ch}</span>)}
          </span>
          {i < words.length - 1 ? ' ' : ''}
        </Fragment>
      ))}
    </>
  );
}

export function Clauses({ still }: { still: boolean }) {
  const sec = useRef<HTMLElement>(null);
  const [cur, setCur] = useState(0);
  const head = useRef<HTMLSpanElement>(null);
  const chars = useRef<HTMLElement[][]>([]);
  const last = useRef<number[]>([]);
  useProgress(sec, (p) => {
    const n = CLAUSES.length;
    const k = Math.min(n - 1, Math.floor(p * n * 0.999));
    setCur(k);
    if (head.current) head.current.style.transform = `scaleX(${p.toFixed(4)})`;
    CLAUSES.forEach((_, i) => {
      const list = chars.current[i] ?? (chars.current[i] = [...(sec.current?.querySelectorAll<HTMLElement>(`[data-clause="${i}"] .ch`) ?? [])]);
      const f = i < k ? 1 : i > k ? 0 : seg(p * n - i, 0.02, 0.72);
      const on = Math.round(list.length * f);
      if (last.current[i] === on) return;
      last.current[i] = on;
      list.forEach((el, j) => el.classList.toggle('on', j < on));
    });
  }, !still);

  return (
    <section ref={sec} className={'clauses' + (still ? ' clauses--still' : '')} id="about" aria-labelledby="about-title" style={{ ['--n' as string]: CLAUSES.length }}>
      <div className="clauses-pin">
        <div className="sec-head">
          <Kicker no="01">About · The resolution</Kicker>
          <h2 className="sr" id="about-title">About DXB MUN 2027</h2>
        </div>
        <ol className="clause-list">
          {CLAUSES.map((c, i) => (
            <li key={i} data-clause={i} className={'clause' + (still ? ' is-on' : i === cur ? ' is-on' : i < cur ? ' is-past' : '')} aria-current={!still && i === cur ? 'step' : undefined}>
              <span className="clause-no mono">{String(i + 1).padStart(2, '0')}</span>
              <p className="clause-text"><ClauseText c={c} /></p>
            </li>
          ))}
        </ol>
        {!still && (
          <div className="clause-rule" aria-hidden="true">
            <span className="clause-rule-line"><span ref={head} className="clause-rule-fill" /></span>
            <span className="clause-rule-ticks">{CLAUSES.map((_, i) => <i key={i} className={i <= cur ? 'on' : ''} />)}</span>
            <span className="clause-rule-label mono">
              Clause <NumberFlow value={cur + 1} format={{ minimumIntegerDigits: 2 }} /> / {String(CLAUSES.length).padStart(2, '0')}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

/* ================================================================ 4. committees: the grid becomes the nameplates */
const COLS_D = 5;
const ROWS_D = 4;

export function Committees({ still }: { still: boolean }) {
  const sec = useRef<HTMLElement>(null);
  const wall = useRef<HTMLDivElement>(null);
  const vlines = useRef<(HTMLElement | null)[]>([]);
  const hlines = useRef<(HTMLElement | null)[]>([]);
  const tiles = useRef<(HTMLElement | null)[]>([]);
  // Desktop-sized screens pin the wall and scrub the move; small screens flood each tile as it enters.
  const [pinned] = useState(() => !still && window.innerWidth >= 960 && window.innerHeight >= 680);

  useProgress(sec, (p) => {
    const box = wall.current;
    if (!box) return;
    const w = box.clientWidth, h = box.clientHeight;
    // 1. The hairlines start bunched around one centre cell (Dropbox) and slide out to the column/row edges.
    const lp = seg(p, 0.0, 0.34);
    vlines.current.forEach((el, i) => {
      if (!el) return;
      const end = ((i + 1) / COLS_D) * w;
      const startX = w / 2 + (i - 1.5) * 0.07 * w;
      el.style.transform = `translate3d(${(startX + (end - startX) * lp).toFixed(1)}px, 0, 0)`;
    });
    hlines.current.forEach((el, i) => {
      if (!el) return;
      const end = ((i + 1) / ROWS_D) * h;
      const startY = h / 2 + (i - 1) * 0.12 * h;
      el.style.transform = `translate3d(0, ${(startY + (end - startY) * lp).toFixed(1)}px, 0)`;
    });
    // 2. Cells flood in from their nearest edge, the centre first, and lock into nameplates.
    tiles.current.forEach((el, i) => {
      if (!el) return;
      const col = i % COLS_D, row = Math.floor(i / COLS_D);
      const d = Math.hypot(col - 2, (row - 1.5) * 1.3) / 3.3;
      const t = seg(p, 0.22 + d * 0.32, 0.42 + d * 0.32);
      el.style.setProperty('--f', t.toFixed(3));
      el.classList.toggle('is-set', t >= 0.98);
    });
  }, pinned);

  useEffect(() => {
    if (pinned || still) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('seen'); io.unobserve(e.target); } }), { threshold: 0.35 });
    tiles.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [pinned, still]);

  return (
    <section
      ref={sec}
      className={'committees' + (pinned ? ' committees--pin' : '') + (still ? ' committees--still' : '')}
      id="committees"
      aria-labelledby="com-title"
    >
      <div className="com-pin">
        <div className="sec-head sec-head--split">
          <Kicker no="02">Committees</Kicker>
          <h2 className="sec-title" id="com-title">
            <Count to={committees.length} still={still} /> committees, <em className="serif">one</em> nameplate each.
          </h2>
        </div>
        <div ref={wall} className="wall" data-cursor="Pick">
          {pinned && Array.from({ length: COLS_D - 1 }, (_, i) => <i key={'v' + i} ref={(el) => { vlines.current[i] = el; }} className="wall-v" />)}
          {pinned && Array.from({ length: ROWS_D - 1 }, (_, i) => <i key={'h' + i} ref={(el) => { hlines.current[i] = el; }} className="wall-h" />)}
          {committees.map((c, i) => (
            <a
              key={c.abbr}
              ref={(el) => { tiles.current[i] = el; }}
              className={'plate' + (pinned ? '' : ' is-set')}
              href={register}
              data-dir={i % 4}
              aria-label={`${c.name} (${c.abbr}). Pick it as one of three ranked choices at sign-up.`}
            >
              <span className="plate-fill">
                <span className="plate-top mono"><span>{String(i + 1).padStart(2, '0')}</span><span>/ {committees.length}</span></span>
                <span className="plate-code">{c.abbr}</span>
                <span className="plate-name">{c.name}</span>
              </span>
            </a>
          ))}
          <a ref={(el) => { tiles.current[committees.length] = el; }} className={'plate plate--cta' + (pinned ? '' : ' is-set')} href={register} data-dir={3}>
            <span className="plate-fill">
              <span className="plate-top mono"><span>20</span><span>Sign-up</span></span>
              <span className="plate-code">Pick three</span>
              <span className="plate-name">Rank three committees when you sign up <span aria-hidden="true">→</span></span>
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}

/* ================================================================ 5. schedule: a ruler with a playhead */
const toMin = (s: string) => {
  const m = s.trim().match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return 0;
  let h = parseInt(m[1], 10) % 12;
  if (m[3].toUpperCase() === 'PM') h += 12;
  return h * 60 + parseInt(m[2], 10);
};
const durMin = (s: string) => {
  const h = s.match(/(\d+)\s*hour/);
  const m = s.match(/(\d+)\s*minute/);
  return (h ? parseInt(h[1], 10) * 60 : 0) + (m ? parseInt(m[1], 10) : 0);
};
type TSlot = Slot & { a: number; b: number };
const hourLabel = (m: number) => { const h = Math.floor(m / 60); return `${((h + 11) % 12) + 1} ${h < 12 ? 'AM' : 'PM'}`; };

export function Schedule({ still }: { still: boolean }) {
  const days = useMemo(() => schedule.map((d) => {
    const slots: TSlot[] = d.slots.map((s) => {
      const [x, y] = s.time.split('–');
      const a = toMin(x);
      const b = y ? toMin(y) : a + durMin(s.duration);
      return { ...s, a, b };
    });
    return { ...d, slots, a: slots[0].a, b: slots[slots.length - 1].b };
  }), []);
  const total = days.reduce((t, d) => t + (d.b - d.a), 0);
  const sec = useRef<HTMLElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState({ d: 0, s: 0 });
  const [pinned] = useState(() => !still && window.innerHeight >= 640);

  useProgress(sec, (p) => {
    const q = seg(p, 0.06, 0.94);
    let m = q * total;
    let d = 0;
    while (d < days.length - 1 && m > days[d].b - days[d].a) { m -= days[d].b - days[d].a; d++; }
    const abs = days[d].a + m;
    let s = days[d].slots.findIndex((x) => abs >= x.a && abs < x.b);
    if (s < 0) s = days[d].slots.length - 1;
    setAt((o) => (o.d === d && o.s === s ? o : { d, s }));
    if (head.current) { head.current.style.setProperty('--x', String(q)); head.current.classList.toggle('flip', q > 0.55); }
  }, pinned);

  const cur = days[at.d].slots[at.s];
  let acc = 0;
  return (
    <section ref={sec} className={'schedule' + (pinned ? ' schedule--pin' : '') + (still ? ' schedule--still' : '')} id="schedule" aria-labelledby="sch-title">
      <div className="sch-pin">
        <div className="sec-head sec-head--split">
          <Kicker no="03">Schedule</Kicker>
          <h2 className="sec-title" id="sch-title">
            <Count to={stats[1].value} still={still} /> days. <Count to={stats[2].value} still={still} /> committee <em className="serif">sessions</em>.
          </h2>
        </div>

        <div className="ruler" aria-hidden="true">
          <div className="ruler-track">
            {days.map((d) => {
              const left = acc / total;
              const width = (d.b - d.a) / total;
              acc += d.b - d.a;
              const hours: number[] = [];
              for (let h = Math.ceil(d.a / 60) * 60; h <= d.b; h += 60) if ((h - d.a) / (d.b - d.a) < 0.93) hours.push(h);
              return (
                <div key={d.day} className={'ruler-day' + (d.day - 1 === at.d && pinned ? ' is-on' : '')} style={{ left: `${left * 100}%`, width: `calc(${width * 100}% - 12px)` }}>
                  <span className="ruler-day-label mono">{d.label}</span>
                  {hours.map((h) => (
                    <span key={h} className="tick tick--h" style={{ left: `${((h - d.a) / (d.b - d.a)) * 100}%` }}>
                      <span className="tick-label mono">{hourLabel(h)}</span>
                    </span>
                  ))}
                  {d.slots.map((s) => <span key={s.name + s.a} className="tick tick--s" style={{ left: `${((s.a - d.a) / (d.b - d.a)) * 100}%` }} />)}
                </div>
              );
            })}
            {pinned && (
              <div ref={head} className="playhead">
                <span className="playhead-tag mono">{cur.name} · {cur.time}</span>
              </div>
            )}
          </div>
        </div>

        <div className="sch-days">
          {days.map((d, di) => (
            <div key={d.day} className={'sch-day' + (pinned && di !== at.d ? ' is-off' : '')}>
              <h3 className="sch-day-title mono">{d.label}</h3>
              <ol className="sch-slots">
                {d.slots.map((s, si) => (
                  <li key={s.name + s.a} className={'sch-slot' + (pinned && di === at.d && si === at.s ? ' is-now' : '')}>
                    <span className="mono">{s.time}</span>
                    <span>{s.name}</span>
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

/* ================================================================ 6. register: the delegate pass */
function Barcode() {
  // Decorative bars from the characters of the edition name (no data is encoded).
  const bars = [...'DXBMUN2027DIPLOMACYAROUNDUSINDIANHIGHSCHOOLDUBAI'].flatMap((ch) => { const c = ch.charCodeAt(0); return [1 + (c % 3), 1 + ((c >> 2) % 3)]; });
  return (
    <svg className="barcode" viewBox={`0 0 ${bars.reduce((a, b) => a + b * 2, 0)} 40`} preserveAspectRatio="none" aria-hidden="true">
      {(() => { let x = 0; return bars.map((b, i) => { const r = i % 2 === 0 ? <rect key={i} x={x} y={0} width={b} height={40} /> : null; x += b * 2; return r; }); })()}
    </svg>
  );
}

export function Register({ still }: { still: boolean }) {
  const fields: [string, React.ReactNode][] = [
    ['Edition', conference.edition],
    ['Host', conference.host],
    ['City', conference.city],
    ['Dates', tba(conference.dates)],
    ['Venue', tba(conference.venue)],
    ['Committees', <Count key="c" to={committees.length} still={still} />],
  ];
  return (
    <section className="register" id="register" aria-labelledby="reg-title">
      <div className="sec-head sec-head--split">
        <Kicker no="04">Register</Kicker>
        <h2 className="sec-title" id="reg-title">Your <em className="serif">delegate</em> pass.</h2>
      </div>
      <div className="pass">
        <div className="pass-main">
          <p className="pass-top mono"><span>{conference.edition}</span><span>Delegate pass</span></p>
          <p className="pass-name"><span className="mono">Delegate</span><span className="pass-blank" /></p>
          <dl className="pass-fields">
            {fields.map(([k, v]) => (
              <div key={k}><dt className="mono">{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
          <Barcode />
        </div>
        <div className="pass-stub">
          <p className="mono pass-stub-top">Admit one · {conference.kind}</p>
          <a className="pass-cta" href={conference.registerUrl ?? register}>Register <span aria-hidden="true">→</span></a>
          <p className="pass-note">Sign in, then fill the short sign-up form.</p>
          <a className="pass-alt mono" href={signIn}>Already registered? Sign in</a>
        </div>
      </div>
    </section>
  );
}

/* ================================================================ 7. wellness, resources, contact: index rows */
function WellnessCell() {
  const w = useWellness();
  return (
    <div className="well">
      <ul className="well-list">
        {w.items.map((it) => {
          const on = w.checked.includes(it.id);
          return (
            <li key={it.id}>
              <label className="well-item">
                <Checkbox.Root className="box" checked={on} onCheckedChange={() => w.toggle(it.id)}>
                  <Checkbox.Indicator className="box-tick">✓</Checkbox.Indicator>
                </Checkbox.Root>
                <span>{it.label}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <p className="mono well-status" aria-live="polite">{w.status} {w.note}</p>
    </div>
  );
}

export function IndexRows() {
  const contact: [string, string | null][] = [
    ['Email', conference.email],
    ['Instagram', conference.instagram],
    ['Venue', conference.venue],
    ['Dates', conference.dates],
  ];
  return (
    <section className="index" aria-label="Wellness, resources and contact">
      <div className="sec-head sec-head--split">
        <Kicker no="05–07">Wellness · Resources · Contact</Kicker>
      </div>
      <div className="rows">
        <article className="row" id="wellness" aria-labelledby="row-well">
          <span className="row-no mono">01</span>
          <h2 className="row-title" id="row-well">Wellness</h2>
          <p className="row-lede">Quick reset. <span>Take a moment between sessions.</span></p>
          <WellnessCell />
        </article>
        <article className="row" id="resources" aria-labelledby="row-res">
          <span className="row-no mono">02</span>
          <h2 className="row-title" id="row-res">Resources</h2>
          {resources.map((r) => (
            <p key={r.title} className="row-lede">{r.title}. <span>{r.blurb}</span></p>
          ))}
          <p className="row-tba mono">{resources[0].href ? <a href={resources[0].href}>Open</a> : tba(resources[0].href)}</p>
        </article>
        <article className="row" id="contact" aria-labelledby="row-con">
          <span className="row-no mono">03</span>
          <h2 className="row-title" id="row-con">Contact</h2>
          <p className="row-lede">Details go live here <span>as soon as they are confirmed.</span></p>
          <dl className="row-dl">
            {contact.map(([k, v]) => (
              <div key={k}><dt className="mono">{k}</dt><dd>{tba(v)}</dd></div>
            ))}
          </dl>
        </article>
      </div>
    </section>
  );
}

/* ================================================================ 8. footer */
export function Footer() {
  const word = useRef<HTMLSpanElement>(null);
  useFit(word);
  const top = (e: React.MouseEvent) => {
    e.preventDefault();
    const l = getLenis();
    if (l) l.scrollTo(0, { duration: 1.4 }); else window.scrollTo({ top: 0 });
  };
  return (
    <footer className="foot">
      <div className="foot-word"><span ref={word} className="foot-word-text">{conference.edition}</span></div>
      <div className="foot-host">
        <p className="foot-host-main"><span className="mono">Hosted by</span> {conference.host} · {conference.city}</p>
        <p className="foot-host-links mono">
          <a href={admin}>Secretariat sign-in</a>
          <a href={chair}>Chair sign-in</a>
          <a href="#home" onClick={top}>Back to top ↑</a>
        </p>
      </div>
      <p className="foot-fine mono"><span>{conference.motto}. © {conference.year} {conference.name}.</span><span>Alt 1 · Terminal Paper</span></p>
    </footer>
  );
}
