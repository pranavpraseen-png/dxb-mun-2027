// Everything drawn in HTML over the stage: the loader, the four corners (Igloo), the scene captions,
// the labels pinned to 3D points, and the phone menu. Text always arrives by scramble, never by blur.
import { Fragment, useEffect, useRef, useState } from 'react';
import { Scramble } from './Scramble';
import { keepOut, register, type Align } from './labels';
import { coordsRef, skipIntro } from './Stage';
import { CLAUSES, DUBAI_LABEL, FACT_ROWS, N, SCENES, committees, conference, pad2, schedule, stats } from './content';
import { PLEXUS } from './layout';
import { PHASE_AT, flight, get, goTo, introT, set, useStore } from './store';
import { register as registerUrl, signIn } from './links';

const DONE = PHASE_AT.length - 1;
/** Seconds after a flight starts before the new scene's text decodes (the camera is most of the way there). */
const useInDelay = () => { useStore((s) => s.scene); return flight.busy ? flight.dur * 0.62 : 0; };

/* ------------------------------------------------------------------ loader */
const ASCII = '-=+*/\\_|#:';
function Loader() {
  const phase = useStore((s) => s.phase);
  const bar = useRef<HTMLSpanElement>(null);
  const num = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const k = Math.max(0, Math.min(1, introT() / PHASE_AT[1]));
      if (bar.current) bar.current.textContent = Array.from({ length: 14 }, () => ASCII[Math.floor(Math.random() * ASCII.length)]).join('');
      if (num.current) num.current.textContent = String(Math.round(k * 100)).padStart(3, '0');
      if (get().phase < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  if (phase >= DONE) return null;
  return (
    <div className="loader" aria-live="polite">
      {phase < 1 && (
        <div className="loader-mid">
          <span className="loader-bar" ref={bar} aria-hidden="true" />
          <span className="loader-num"><span ref={num}>000</span> / 100</span>
          <span className="sr">Loading DXB MUN 2027</span>
        </div>
      )}
      <button type="button" className="loader-skip mono" onClick={skipIntro}>Skip intro · any key</button>
    </div>
  );
}

/* ------------------------------------------------------------------ corners */
function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <a className="logo" href="#globe" onClick={(e) => { e.preventDefault(); goTo(0); onClick?.(); }} aria-label="DXB MUN 2027, back to the globe">
      <span className="logo-mark" aria-hidden="true"><i /></span>
      <span className="logo-word">DXB MUN <b>2027</b></span>
    </a>
  );
}

function Corners() {
  const scene = useStore((s) => s.scene);
  const phase = useStore((s) => s.phase);
  const on = phase >= 3;
  const delay = useInDelay();
  return (
    <div className={'corners' + (on ? ' is-on' : '')}>
      <header className="c-tl" ref={keepOut('c-tl')}>
        <Logo />
        <p className="mono c-sub"><Scramble text="// Hosted by Indian High School" play={on} delay={0.15} /></p>
      </header>

      <nav className="c-tr" aria-label="Sections" ref={keepOut('c-tr')}>
        <p className="mono c-head"><Scramble text="////// Index" play={on} delay={0.1} /></p>
        <ol className="index">
          {SCENES.map((s, i) => (
            <li key={s.id}>
              <a
                href={'#' + s.id}
                className={'index-a' + (i === scene ? ' is-cur' : '')}
                aria-current={i === scene ? 'true' : undefined}
                onClick={(e) => { e.preventDefault(); goTo(i); }}
              >
                <span className="index-n">{pad2(i + 1)}</span>
                <Scramble text={s.name} play={on} delay={0.2 + i * 0.05} />
              </a>
            </li>
          ))}
        </ol>
        <a className="btn btn--accent c-reg" href={registerUrl}>Register <span aria-hidden="true">→</span></a>
        <div className="c-phone">
          <a className="pill pill--accent" href={registerUrl}>Register</a>
          <button type="button" className="pill" aria-expanded="false" aria-controls="menu" onClick={() => set({ menu: true })}>
            <span className="pill-dot" aria-hidden="true" /> Menu
          </button>
        </div>
      </nav>

      <div className="c-bl mono" ref={keepOut('c-bl')}>
        <p className="c-hint">{scene === 0 ? <Scramble text="Scroll or swipe to fly in." play={on} delay={0.3} /> : <Scramble key={scene} text={DUBAI_LABEL} play={on} delay={delay} />}</p>
        <p className="c-coords" ref={(el) => { coordsRef.el = el; }} aria-hidden="true">CAM</p>
      </div>

      <div className="c-br mono" ref={keepOut('c-br')}>
        <p className="c-count" aria-live="polite">
          <span className="sr">Scene </span>
          <b><Scramble key={scene} text={pad2(scene + 1)} play={on} delay={delay * 0.5} /></b> / {pad2(N)}
          <span className="c-name"> · {SCENES[scene].name}</span>
        </p>
        <div className="c-ticks" aria-hidden="true">
          {SCENES.map((s, i) => <i key={s.id} className={i <= scene ? 'is-on' : ''} />)}
        </div>
        <div className="c-step">
          <button type="button" className="sq" onClick={() => goTo(scene - 1)} disabled={scene === 0} aria-label="Previous scene">↑</button>
          <button type="button" className="sq" onClick={() => goTo(scene + 1)} disabled={scene === N - 1} aria-label="Next scene">↓</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ captions, one per scene */
/** A heading with exactly one serif italic accent word. */
function Head({ pre, em, post = '.', d, as: As = 'h2', big }: { pre: string; em: string; post?: string; d: number; as?: 'h1' | 'h2'; big?: boolean }) {
  return (
    <As className={'cap-h' + (big ? ' cap-h--big' : '')}>
      {pre && <><Scramble text={pre.trimEnd()} delay={d} />{' '}</>}
      <em><Scramble text={em} delay={d + 0.12} /></em>
      {post && <Scramble text={post} delay={d + 0.2} />}
    </As>
  );
}
function Kicker({ n, text, d }: { n: number; text: string; d: number }) {
  return <p className="mono cap-k"><span className="cap-n">{pad2(n + 1)}</span> <Scramble text={'// ' + text} delay={d} /></p>;
}
function Rows({ rows, d }: { rows: readonly (readonly [string, string])[]; d: number }) {
  return (
    <dl className="rows">
      {rows.map(([k, v], i) => (
        <div key={k} className="row">
          <dt className="mono"><Scramble text={k} delay={d + 0.05 * i} /></dt>
          <dd className={v === 'To be announced' ? 'is-tba' : ''}><Scramble text={v} delay={d + 0.08 + 0.05 * i} /></dd>
        </div>
      ))}
    </dl>
  );
}

function CapGlobe({ d }: { d: number }) {
  return (
    <div className="cap cap--hero">
      <p className="mono cap-k"><Scramble text={`${conference.kind} · ${conference.city} · ${conference.year}`} delay={d} /></p>
      <h1 className="hero-h"><Scramble text={conference.edition} delay={d + 0.05} dur={0.9} /></h1>
      <p className="hero-line"><em><Scramble text="Diplomacy" delay={d + 0.3} /></em> <Scramble text="around us." delay={d + 0.4} /></p>
    </div>
  );
}
function CapDubai({ d }: { d: number }) {
  return (
    <div className="cap">
      <Kicker n={1} text="The city" d={d} />
      <Head pre="Hosted in " em={conference.city} d={d + 0.05} />
      <Rows rows={FACT_ROWS.dubai} d={d + 0.2} />
    </div>
  );
}
function CapResolution({ d }: { d: number }) {
  return (
    <div className="cap">
      <Kicker n={2} text={`Draft resolution · ${conference.edition}`} d={d} />
      <Head pre="The " em="resolution" d={d + 0.05} />
      <p className="cap-p"><Scramble text={`A ${conference.kind} in ${conference.city}.`} delay={d + 0.25} /></p>
      <p className="mono cap-meta"><Scramble text={`${CLAUSES.length} clauses · one per panel`} delay={d + 0.35} /></p>
    </div>
  );
}
function CapCommittees({ d }: { d: number }) {
  const i = useStore((s) => s.committee);
  const c = committees[i];
  const n = committees.length;
  return (
    <div className="cap">
      <Kicker n={3} text="Committees" d={d} />
      <Head pre={`${stats[0].value} `} em="committees" d={d + 0.05} />
      <div className="cmt" aria-live="polite">
        <p className="mono cmt-n">{pad2(i + 1)} / {n}</p>
        <p className="cmt-abbr"><Scramble key={c.abbr} text={c.abbr} dur={0.45} /></p>
        <p className="cmt-name"><Scramble key={c.name} text={c.name} dur={0.55} /></p>
      </div>
      <div className="cmt-step">
        <button type="button" className="sq" aria-label="Previous committee" onClick={() => set({ committee: (i - 1 + n) % n })}>←</button>
        <button type="button" className="sq" aria-label="Next committee" onClick={() => set({ committee: (i + 1) % n })}>→</button>
        <span className="mono cmt-hint">Point at a nameplate</span>
      </div>
    </div>
  );
}
function CapSchedule({ d }: { d: number }) {
  const day = useStore((s) => s.day);
  return (
    <div className="cap cap--sched">
      <Kicker n={4} text="Schedule" d={d} />
      <Head pre={`${stats[1].value} `} em="days" d={d + 0.05} />
      <p className="mono cap-meta"><Scramble text={`${stats[2].value} committee sessions · dates to be announced`} delay={d + 0.2} /></p>
      <div className="tabs" role="tablist" aria-label="Day">
        {schedule.map((s, i) => (
          <button key={s.day} type="button" role="tab" aria-selected={i === day} className={'tab' + (i === day ? ' is-cur' : '')} onClick={() => set({ day: i })}>
            {s.label}
          </button>
        ))}
      </div>
      <ol className="slots" role="tabpanel" aria-label={schedule[day].label}>
        {schedule[day].slots.map((s, j) => (
          <li key={day + '-' + j} className={'slot' + (s.name.startsWith('Committee Session') ? ' is-session' : '')}>
            <span className="mono slot-n">{pad2(j + 1)}</span>
            <span className="mono slot-t"><Scramble text={s.time} delay={0.03 * j} dur={0.4} /></span>
            <span className="slot-name"><Scramble text={s.name} delay={0.03 * j + 0.05} dur={0.45} /></span>
          </li>
        ))}
      </ol>
    </div>
  );
}
function CapRegister({ d }: { d: number }) {
  return (
    <div className="cap">
      <Kicker n={5} text="Register" d={d} />
      <Head pre="Register as a " em="delegate" d={d + 0.05} />
      <Rows rows={FACT_ROWS.register} d={d + 0.2} />
      <div className="cap-cta">
        <a className="btn btn--accent" href={registerUrl}>Register <span aria-hidden="true">→</span></a>
        <a className="btn" href={signIn}>Sign in</a>
      </div>
      <p className="host"><span className="host-mark" aria-hidden="true" /><span className="mono">Hosted by {conference.host} · {conference.city}</span></p>
    </div>
  );
}
const CAPS = [CapGlobe, CapDubai, CapResolution, CapCommittees, CapSchedule, CapRegister];

function Captions() {
  const scene = useStore((s) => s.scene);
  const phase = useStore((s) => s.phase);
  const d = useInDelay();
  if (phase < 3) return null;
  const Cap = CAPS[scene];
  return (
    <main
      id="main"
      className={'caps caps--' + SCENES[scene].id}
      key={scene}
      aria-label={SCENES[scene].name}
      ref={(el) => keepOut('cap')((el?.firstElementChild as HTMLElement | null) ?? null)}
    >
      <Cap d={d} />
    </main>
  );
}

/* ------------------------------------------------------------------ labels pinned to 3D points */
function Lab({ id, align, on, className = '', children, delay = 0 }: { id: string; align: Align; on: boolean; className?: string; children: React.ReactNode; delay?: number }) {
  return (
    <div className={'lab lab--' + align + (on ? ' is-on' : '') + (className ? ' ' + className : '')} ref={register(id, align)} style={{ '--ld': `${delay}s` } as React.CSSProperties}>
      {children}
    </div>
  );
}
function Labels() {
  const scene = useStore((s) => s.scene);
  const phase = useStore((s) => s.phase);
  const committee = useStore((s) => s.committee);
  const day = useStore((s) => s.day);
  const d = useInDelay();
  const at = (i: number) => scene === i && phase >= 3;
  return (
    <div className="labs" style={{ '--in': `${d}s` } as React.CSSProperties}>
      {PLEXUS.labels.map(({ i, n }, k) => (
        <Lab key={'px' + i} id={`px-${i}`} align="r" on={scene === 0 && phase >= 1} className="lab--px" delay={k * 0.05}>{n}</Lab>
      ))}
      <Lab id="dxb-pin" align="r" on={at(0)} className="lab--pin"><Scramble text="DXB" play={at(0)} delay={0.4} /></Lab>

      <Lab id="dxb-city" align="b" on={at(1)}><span className="tag tag--accent">01</span><Scramble text={`${conference.city} · ${DUBAI_LABEL}`} play={at(1)} delay={d} /></Lab>
      <Lab id="dxb-host" align="l" on={at(1)}><span className="tag tag--gold">02</span><Scramble text={`Host · ${conference.host}`} play={at(1)} delay={d + 0.1} /></Lab>
      <Lab id="dxb-venue" align="b" on={at(1)}><span className="tag">03</span><Scramble text={`Venue · ${conference.venue ?? 'To be announced'}`} play={at(1)} delay={d + 0.2} /></Lab>

      {CLAUSES.map((c, i) => (
        <Lab key={'cl' + i} id={`clause-${i}`} align="c" on={at(2)} className={'lab--clause' + (c.host ? ' is-host' : '')}>
          <span className="mono clause-k">{pad2(i + 1)} · <Scramble text={c.verb} play={at(2)} delay={d + i * 0.08} /></span>
          <span className="clause-f"><Scramble text={c.fact} play={at(2)} delay={d + 0.1 + i * 0.08} /></span>
        </Lab>
      ))}

      {committees.map((c, i) => (
        <Lab key={'pl' + i} id={`plate-${i}`} align="b" on={at(3)} className={'lab--plate' + (i === committee ? ' is-cur' : '')}>
          <button
            type="button"
            tabIndex={at(3) ? 0 : -1}
            aria-label={`${c.abbr}: ${c.name}`}
            onPointerEnter={() => set({ committee: i })}
            onFocus={() => set({ committee: i })}
            onClick={() => set({ committee: i })}
          >
            <span className="plate-n">{pad2(i + 1)}</span> <Scramble text={c.abbr} play={at(3)} delay={d + i * 0.025} dur={0.45} />
          </button>
        </Lab>
      ))}

      {Array.from({ length: 11 }, (_, k) => 9 + k).map((h) => (
        <Lab key={'h' + h} id={`hour-${h}`} align="c" on={at(4)} className={'lab--hour' + (h % 2 ? ' is-odd' : '')}>{pad2(h)}:00</Lab>
      ))}
      {schedule.map((s, i) => (
        <Lab key={'d' + i} id={`day-${i}`} align="l" on={at(4)} className={'lab--day' + (i === day ? ' is-cur' : '')}>
          <button type="button" tabIndex={at(4) ? 0 : -1} onClick={() => set({ day: i })}>{s.label}</button>
        </Lab>
      ))}
      {schedule.map((s, di) => s.slots.map((_, j) => (
        <Lab key={`s${di}-${j}`} id={`slot-${di}-${j}`} align="b" on={at(4) && di === day} className="lab--slot">{pad2(j + 1)}</Lab>
      )))}

      <Lab id="pass-main" align="tl" on={at(5)} className="lab--pass">
        <span className="mono pass-k"><Scramble text="Delegate pass" play={at(5)} delay={d} /></span>
        <span className="pass-h"><Scramble text={conference.edition} play={at(5)} delay={d + 0.08} /></span>
        <span className="mono pass-r"><Scramble text={`Dates · ${conference.dates ?? 'To be announced'}`} play={at(5)} delay={d + 0.16} /></span>
        <span className="mono pass-r"><Scramble text={`Venue · ${conference.venue ?? 'To be announced'}`} play={at(5)} delay={d + 0.22} /></span>
      </Lab>
      <Lab id="pass-stub" align="c" on={at(5)} className="lab--stub">
        <a href={registerUrl} tabIndex={at(5) ? 0 : -1}><Scramble text="Register" play={at(5)} delay={d + 0.3} /> <span aria-hidden="true">→</span></a>
      </Lab>
    </div>
  );
}

/* ------------------------------------------------------------------ the full-screen menu (phone; also reachable by keyboard) */
function Menu() {
  const open = useStore((s) => s.menu);
  const scene = useStore((s) => s.scene);
  const first = useRef<HTMLButtonElement>(null);
  const [shown, setShown] = useState(open);
  useEffect(() => {
    if (open) { setShown(true); requestAnimationFrame(() => first.current?.focus()); }
    else { const t = setTimeout(() => setShown(false), 750); return () => clearTimeout(t); }
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') set({ menu: false }); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  if (!shown && !open) return null;
  return (
    <div id="menu" className={'menu' + (open ? ' is-open' : '')} role="dialog" aria-modal="true" aria-label="Menu">
      <div className="menu-top">
        <Logo onClick={() => set({ menu: false })} />
        <button type="button" className="pill pill--ink" ref={first} onClick={() => set({ menu: false })}><span className="pill-dot" aria-hidden="true" /> Close</button>
      </div>
      <ol className="menu-list">
        {SCENES.map((s, i) => (
          <li key={s.id}>
            <a href={'#' + s.id} className={'menu-a' + (i === scene ? ' is-cur' : '')} aria-current={i === scene ? 'true' : undefined} onClick={(e) => { e.preventDefault(); goTo(i); }}>
              <span className="mono menu-n">{pad2(i + 1)}</span>
              <span className="menu-t">{open ? <Scramble text={s.name} delay={0.25 + i * 0.05} dur={0.5} /> : s.name}</span>
            </a>
          </li>
        ))}
      </ol>
      <div className="menu-foot">
        <div className="cap-cta">
          <a className="btn btn--accent" href={registerUrl}>Register <span aria-hidden="true">→</span></a>
          <a className="btn" href={signIn}>Sign in</a>
        </div>
        <p className="host"><span className="host-mark" aria-hidden="true" /><span className="mono">Hosted by {conference.host} · {conference.city}</span></p>
        <a className="mono menu-text" href="?still">Text-only version</a>
      </div>
    </div>
  );
}

export function Chrome() {
  return (
    <Fragment>
      <a className="skip" href="?still">Skip to the text-only version</a>
      <Labels />
      <Captions />
      <Corners />
      <Loader />
      <Menu />
    </Fragment>
  );
}
