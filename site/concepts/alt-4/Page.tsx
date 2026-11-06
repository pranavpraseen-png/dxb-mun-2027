// The page over the hall: a fixed top nav, the opening's gauge, eight sections (each one a camera station) and the
// phone menu. In still mode (reduced motion, ?still, no WebGL) the same sections show static SVG drawings instead.
import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { committees, conference, resources, schedule, stats, tba } from '@/data/conference';
import { useWellness } from '@/shared/hooks';
import { brand } from '@/shared/brand';
import { scrollToSection, useSmoothScroll } from '@/shared/scroll';
import { blocks, CLOCK, BOARD, ROWS, rake, seats, TAKE_SEAT, A0 } from './layout';
import { pin } from './labels';
import { Dial, Plan } from './Plan';
import { cam, introT, setUi, skipIntro, T, ui, useUi } from './store';
import * as links from './links';

const NAV = [
  { id: 'about', label: 'About' },
  { id: 'committees', label: 'Committees' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'register', label: 'Register' },
  { id: 'wellness', label: 'Wellness' },
  { id: 'resources', label: 'Resources' },
  { id: 'contact', label: 'Contact' },
] as const;
const IDS = ['home', ...NAV.map((n) => n.id)];
const NAMES = ['Hall', ...NAV.map((n) => n.label)];
const two = (n: number) => String(n).padStart(2, '0');
const go = (id: string) => (e: React.MouseEvent) => { e.preventDefault(); setUi({ menu: false }); scrollToSection(id, 0); history.replaceState(null, '', '#' + id); };

/* ------------------------------------------------------------------ small parts */
const Host = () => <span className="host"><span className="host-mark" aria-hidden="true">IHS</span>{conference.host}</span>;
const Kicker = ({ n, children }: { n: number; children: ReactNode }) => <p className="kicker"><span className="fig">{two(n)}</span><span className="kicker-rule" aria-hidden="true" />{children}</p>;
const Wordmark = ({ small }: { small?: boolean }) => brand.logoSrc
  ? <img className={small ? 'logo logo-s' : 'logo'} src={brand.logoSrc} alt={brand.logoAlt} />
  : <span className={small ? 'wm wm-s' : 'wm'}>{brand.wordmark}<span className="wm-y">{conference.year}</span></span>;

/* ------------------------------------------------------------------ nav */
function Nav({ still }: { still: boolean }) {
  const section = useUi((u) => u.section);
  const menu = useUi((u) => u.menu);
  return (
    <header className="nav" data-ko>
      <a className="nav-brand" href="#home" onClick={go('home')} aria-label="DXB MUN 2027, back to the top"><Wordmark small /></a>
      <nav className="nav-links" aria-label="Sections">
        {NAV.map((n, i) => (
          <a key={n.id} href={'#' + n.id} onClick={go(n.id)} className={section === i + 1 ? 'is-on' : undefined} aria-current={section === i + 1 ? 'true' : undefined}>
            <span className="fig">{two(i + 1)}</span>{n.label}
          </a>
        ))}
      </nav>
      <div className="nav-end">
        <a className="btn btn-line" href={links.signIn}>Sign in</a>
        <button className="nav-menu" type="button" aria-expanded={menu} aria-controls="menu" onClick={() => setUi({ menu: !menu })}>
          {menu ? 'Close' : 'Menu'}<span className="nav-menu-bars" aria-hidden="true"><i /><i /></span>
        </button>
      </div>
      {!still && <Station />}
    </header>
  );
}

/** The thin station gauge under the nav: where the camera is in the hall. */
function Station() {
  const bar = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => { if (bar.current) bar.current.style.transform = `scaleX(${(cam.s / 7).toFixed(4)})`; raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <span className="nav-gauge" aria-hidden="true"><span ref={bar} /></span>;
}

function Menu() {
  const open = useUi((u) => u.menu);
  const section = useUi((u) => u.section);
  const el = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const m = el.current;
    if (!m) return;
    gsap.killTweensOf(m);
    if (open) {
      m.hidden = false;
      gsap.fromTo(m, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.55, ease: 'expo.out' });
      gsap.fromTo(m.querySelectorAll('li'), { yPercent: 60 }, { yPercent: 0, duration: 0.5, stagger: 0.035, ease: 'expo.out' });
      (m.querySelector('a') as HTMLElement | null)?.focus({ preventScroll: true });
    } else if (!m.hidden) {
      gsap.to(m, { clipPath: 'inset(0 0 100% 0)', duration: 0.35, ease: 'expo.in', onComplete: () => { m.hidden = true; } });
    }
  }, [open]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && ui.menu) setUi({ menu: false }); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  return (
    <div id="menu" className="menu" ref={el} hidden role="dialog" aria-modal="true" aria-label="Menu">
      <ol className="menu-list">
        {NAV.map((n, i) => (
          <li key={n.id}>
            <a href={'#' + n.id} onClick={go(n.id)} className={section === i + 1 ? 'is-on' : undefined} aria-current={section === i + 1 ? 'true' : undefined}>
              <span className="fig">{two(i + 1)}</span>{n.label}
            </a>
          </li>
        ))}
      </ol>
      <div className="menu-foot">
        <a className="btn btn-un" href={links.register}>Register</a>
        <a className="btn btn-line" href={links.signIn}>Sign in</a>
        <p className="menu-host">{conference.edition} · <Host /></p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ the opening's gauge */
const RISE = seats.map((s) => T.fill + s.order * 0.27 + 0.42).sort((a, b) => a - b);
function Loader() {
  const phase = useUi((u) => u.phase);
  const pct = useRef<HTMLSpanElement>(null);
  const tier = useRef<HTMLSpanElement>(null);
  const ticks = useRef<HTMLSpanElement>(null);
  const step = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const t = introT();
      let n = 0;
      while (n < RISE.length && RISE[n] <= t) n++;
      const p = Number.isFinite(t) ? Math.round((n / RISE.length) * 100) : 0;
      const rowsDone = Number.isFinite(t) ? ROWS.filter((_, r) => seats.every((s) => s.row !== r || T.fill + s.order * 0.27 + 0.42 <= t)).length : 0;
      if (pct.current) pct.current.textContent = String(p).padStart(3, '0');
      if (tier.current) tier.current.textContent = String(Math.min(7, rowsDone + (t > T.fill ? 1 : 0)));
      if (step.current) step.current.textContent = t < T.fill ? 'Drawing the floor plan' : t < T.podium ? 'Seating the hall' : 'Opening the session';
      ticks.current?.querySelectorAll('i').forEach((el, i) => el.classList.toggle('is-on', i < rowsDone));
      if (t < T.done || !Number.isFinite(t)) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  if (phase >= 3) return null;
  return (
    <div className="loader" data-ko>
      <div className="loader-row">
        <p className="loader-step mono"><span ref={step}>Drawing the floor plan</span></p>
        <p className="loader-tier mono">Tier <span className="fig" ref={tier}>0</span> / <span className="fig">7</span></p>
      </div>
      <span className="loader-ticks" ref={ticks} aria-hidden="true">{ROWS.map((_, i) => <i key={i} />)}</span>
      <p className="loader-pct fig" aria-hidden="true"><span ref={pct}>000</span></p>
      <button type="button" className="loader-skip mono" onClick={skipIntro}>Skip intro</button>
    </div>
  );
}

/* ------------------------------------------------------------------ labels pinned in the hall */
function Pins() {
  const block = useUi((u) => u.block);
  const day = useUi((u) => u.day);
  const slot = useUi((u) => u.slot);
  const sl = schedule[day].slots[slot];
  const ts = seats[TAKE_SEAT];
  const D = Math.PI / 180;
  return (
    <div className="pins">
      <span className="pin" ref={pin('rostrum', [0, 1.45, 1.55], 'b', [0])}>Rostrum</span>
      <span className="pin" ref={pin('clock', [CLOCK.x, CLOCK.y - CLOCK.r - 0.3, CLOCK.z], 'c', [0])}>Dais clock</span>
      <span className="pin" ref={pin('board', [BOARD.x, BOARD.y - BOARD.h / 2 - 0.3, BOARD.z], 'c', [0])}>Speakers’ list</span>
      <span className="pin pin-slot" ref={pin('slot', [CLOCK.x, CLOCK.y - CLOCK.r * 0.42, CLOCK.z], 'c', [3])}>{sl.name} · {sl.duration}</span>
      {ROWS.map((r, i) => (
        <span key={i} className="pin" ref={pin('row' + i, [r.r * Math.sin(A0 - 5 * D), rake(r.r) + 0.2, r.r * Math.cos(A0 - 5 * D)], 'c', [1, 5])}>Row <span className="fig">{two(i + 1)}</span></span>
      ))}
      {blocks.map((b, i) => (
        <button key={i} type="button" tabIndex={-1} className={'pin pin-block' + (i === block ? ' is-on' : '')} ref={pin('blk' + i, [b.cx, b.cy, b.cz], 'c', [2])} onClick={() => setUi({ block: i })} onPointerEnter={() => setUi({ block: i })}>
          {b.abbr}
        </button>
      ))}
      {Array.from({ length: 12 }, (_, i) => {
        const a = ((i + 1) / 12) * Math.PI * 2;
        return <span key={i} className="pin pin-num fig" ref={pin('h' + i, [CLOCK.x + Math.sin(a) * CLOCK.r * 1.2, CLOCK.y + Math.cos(a) * CLOCK.r * 1.2, CLOCK.z], 'c', [3])}>{i + 1}</span>;
      })}
      <span className="pin pin-take" ref={pin('take', [ts.x, ts.y + 1.25, ts.z], 'b', [4])}>Your seat · Row <span className="fig">{two(ts.row + 1)}</span></span>
      {[-60, -30, 0, 30, 60].map((deg) => (
        <span key={deg} className="pin pin-num fig" ref={pin('deg' + deg, [15.7 * Math.sin(deg * D), rake(13.4) + 0.05, 15.7 * Math.cos(deg * D)], 'c', [2, 7])}>{deg < 0 ? '−' + -deg : deg}°</span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ sections */
function Section({ i, children, figure, className = '' }: { i: number; children: ReactNode; figure?: ReactNode; className?: string }) {
  return (
    <section id={IDS[i]} className={'sec ' + className} aria-labelledby={IDS[i] + '-h'} data-station={i}>
      <div className="panel" data-ko>{children}</div>
      {figure && <div className="figure">{figure}</div>}
    </section>
  );
}

function Hero({ still }: { still: boolean }) {
  return (
    <section id="home" className="sec hero" aria-labelledby="home-h" data-station={0}>
      {still && <div className="figure hero-fig"><Plan label="Floor plan of the hall: seven curved tiers of seats facing the podium" /></div>}
      <div className="slab" data-ko>
        <div className="slab-top mono">
          <p>{conference.kind} · {conference.city}</p>
          <p className="slab-host">Hosted by <Host /></p>
        </div>
        <h1 id="home-h" className="hero-h"><span className="reveal">DXB MUN <span className="fig">{conference.year}</span></span></h1>
        <div className="slab-foot">
          <p className="slab-motto reveal">{conference.motto}.</p>
          <dl className="slab-facts reveal">
            <div><dt className="mono">Dates</dt><dd>{tba(conference.dates)}</dd></div>
            <div><dt className="mono">Committees</dt><dd className="fig">{stats[0].value}</dd></div>
            <div><dt className="mono">Days</dt><dd className="fig">{stats[1].value}</dd></div>
          </dl>
          <a className="btn btn-un reveal" href="#register" onClick={go('register')}>Take your seat <span aria-hidden="true">→</span></a>
        </div>
      </div>
    </section>
  );
}

function About() {
  return (
    <Section i={1}>
      <Kicker n={1}>About</Kicker>
      <h2 id="about-h" className="h2">An assembly in {conference.city}.</h2>
      <dl className="rows">
        <div><dt className="mono">Host</dt><dd><Host /></dd></div>
        <div><dt className="mono">Motto</dt><dd>{conference.motto}</dd></div>
        <div><dt className="mono">City</dt><dd>{conference.city}</dd></div>
        <div><dt className="mono">Dates</dt><dd>{tba(conference.dates)}</dd></div>
        <div><dt className="mono">Venue</dt><dd>{tba(conference.venue)}</dd></div>
      </dl>
      <ul className="figs">
        {stats.slice(0, 3).map((s) => <li key={s.label}><b className="fig">{s.value}</b><span className="mono">{s.label}</span></li>)}
      </ul>
    </Section>
  );
}

function Committees({ still }: { still: boolean }) {
  const block = useUi((u) => u.block);
  const c = committees[block];
  const step = (d: number) => setUi({ block: (block + d + committees.length) % committees.length });
  return (
    <Section i={2} className="sec-cmt" figure={still ? <Plan block={block} label={`Floor plan with the ${c.abbr} block lit`} /> : undefined}>
      <Kicker n={2}>Committees</Kicker>
      <h2 id="committees-h" className="h2"><span className="fig">{committees.length}</span> committees in session.</h2>
      <div className="keys" role="listbox" aria-label="Committees" aria-activedescendant={'cmt-' + block}>
        {committees.map((k, i) => (
          <button key={k.abbr} id={'cmt-' + i} type="button" role="option" aria-selected={i === block} className={'key' + (i === block ? ' is-on' : '')}
            onClick={() => setUi({ block: i })} onPointerEnter={(e) => { if (e.pointerType === 'mouse') setUi({ block: i }); }} onFocus={() => setUi({ block: i })}>
            {k.abbr}
          </button>
        ))}
      </div>
      <div className="cmt" aria-live="polite">
        <p className="cmt-meta mono">Block <span className="fig">{two(block + 1)}</span> / <span className="fig">{committees.length}</span></p>
        <p className="cmt-abbr">{c.abbr}</p>
        <p className="cmt-name">{c.name}</p>
        <p className="cmt-agenda"><span className="mono">Agenda</span> {tba(null)}</p>
        <div className="cmt-step">
          <button type="button" className="btn btn-line btn-sq" onClick={() => step(-1)} aria-label="Previous committee">←</button>
          <button type="button" className="btn btn-line btn-sq" onClick={() => step(1)} aria-label="Next committee">→</button>
          {!still && <span className="cmt-hint mono">Point at a block in the hall</span>}
        </div>
      </div>
    </Section>
  );
}

function Schedule({ still }: { still: boolean }) {
  const day = useUi((u) => u.day);
  const slot = useUi((u) => u.slot);
  const d = schedule[day];
  return (
    <Section i={3} className="sec-sch" figure={still ? <Dial day={day} slot={slot} label={`${d.label}: ${d.slots[slot].name}, ${d.slots[slot].time}`} /> : undefined}>
      <Kicker n={3}>Schedule</Kicker>
      <h2 id="schedule-h" className="h2">Three days on the dais clock.</h2>
      <div className="tabs" role="tablist" aria-label="Day">
        {schedule.map((s, i) => (
          <button key={s.day} type="button" role="tab" aria-selected={i === day} className={'tab' + (i === day ? ' is-on' : '')} onClick={() => setUi({ day: i, slot: 0 })}>
            {s.label}
          </button>
        ))}
        <span className="tabs-date mono">Dates · {tba(conference.dates)}</span>
      </div>
      <ol className="slots" role="tabpanel" aria-label={d.label}>
        {d.slots.map((s, i) => (
          <li key={s.name + i}>
            <button type="button" className={'slot' + (i === slot ? ' is-on' : '')} aria-pressed={i === slot}
              onClick={() => setUi({ slot: i })} onPointerEnter={(e) => { if (e.pointerType === 'mouse') setUi({ slot: i }); }} onFocus={() => setUi({ slot: i })}>
              <span className="slot-t fig">{s.time}</span>
              <span className="slot-n">{s.name}</span>
              <span className="slot-d">{s.duration}</span>
            </button>
          </li>
        ))}
      </ol>
    </Section>
  );
}

function Register({ still }: { still: boolean }) {
  return (
    <Section i={4} className="sec-reg" figure={still ? <Plan take label="Floor plan with one seat lit orange: your seat" /> : undefined}>
      <Kicker n={4}>Register</Kicker>
      <h2 id="register-h" className="h2 h2-xl">Take your seat.</h2>
      <p className="lead">Delegates register and sign in through the delegate portal.</p>
      <dl className="rows">
        <div><dt className="mono">Dates</dt><dd>{tba(conference.dates)}</dd></div>
        <div><dt className="mono">Venue</dt><dd>{tba(conference.venue)}</dd></div>
      </dl>
      <div className="actions">
        <a className="btn btn-take" href={links.register}>Register</a>
        <a className="btn btn-line" href={links.signIn}>Sign in</a>
      </div>
    </Section>
  );
}

function Wellness() {
  const w = useWellness();
  return (
    <Section i={5}>
      <Kicker n={5}>Wellness</Kicker>
      <h2 id="wellness-h" className="h2">Quick reset.</h2>
      <p className="lead">Take a moment between sessions.</p>
      <ul className="checks">
        {w.items.map((it) => {
          const on = w.checked.includes(it.id);
          return (
            <li key={it.id}>
              <button type="button" role="checkbox" aria-checked={on} className={'check' + (on ? ' is-on' : '')} onClick={() => w.toggle(it.id)}>
                <span className="check-box" aria-hidden="true">{on ? '✓' : ''}</span>{it.label}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="note mono" aria-live="polite">{w.status} {w.note}</p>
    </Section>
  );
}

function Resources() {
  return (
    <Section i={6}>
      <Kicker n={6}>Resources</Kicker>
      <h2 id="resources-h" className="h2">Read before you speak.</h2>
      <ul className="res">
        {resources.map((r) => (
          <li key={r.title}>
            <p className="res-t">{r.title}</p>
            <p className="res-b">{r.blurb}</p>
            {r.href ? <a className="btn btn-line" href={r.href}>Open</a> : <p className="res-s mono">{tba(r.href)}</p>}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Contact({ still }: { still: boolean }) {
  return (
    <Section i={7} className="sec-contact">
      <Kicker n={7}>Contact</Kicker>
      <h2 id="contact-h" className="h2">Write to the secretariat.</h2>
      <dl className="rows">
        <div><dt className="mono">Email</dt><dd>{tba(conference.email)}</dd></div>
        <div><dt className="mono">Instagram</dt><dd>{tba(conference.instagram)}</dd></div>
        <div><dt className="mono">Host</dt><dd><Host /></dd></div>
        <div><dt className="mono">City</dt><dd>{conference.city}</dd></div>
      </dl>
      <footer className="foot mono">
        <p>{conference.edition} · {conference.kind}</p>
        <p><a href={links.signIn}>Sign in</a> · {still ? <a href="./">Full version</a> : <a href="?still">Calm version</a>}</p>
      </footer>
    </Section>
  );
}

/* ------------------------------------------------------------------ the page and its clocks */
export function Page({ still }: { still: boolean }) {
  const phase = useUi((u) => u.phase);
  useSmoothScroll(!still && phase >= 4, 0);

  // Opening phases from the clock (the GL page only; the calm page starts done).
  useEffect(() => {
    if (still) { setUi({ phase: 4 }); return; }
    document.documentElement.classList.add('is-intro');
    let raf = 0;
    const tick = () => {
      const t = introT();
      const p = !Number.isFinite(t) || t < T.fill ? 0 : t < T.podium ? 1 : t < T.hero ? 2 : t < T.done ? 3 : 4;
      setUi({ phase: p as 0 | 1 | 2 | 3 | 4 });
      if (p < 4) raf = requestAnimationFrame(tick);
      else {
        document.documentElement.classList.remove('is-intro');
        const id = location.hash.slice(1);
        if (IDS.includes(id) && id !== 'home') requestAnimationFrame(() => scrollToSection(id, 0));
      }
    };
    raf = requestAnimationFrame(tick);
    const skip = () => { if (ui.phase < 3) skipIntro(); };
    window.addEventListener('wheel', skip, { passive: true });
    window.addEventListener('keydown', skip);
    window.addEventListener('touchstart', skip, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener('wheel', skip); window.removeEventListener('keydown', skip); window.removeEventListener('touchstart', skip); };
  }, [still]);

  // Scroll → camera station (continuous) and the active section.
  useEffect(() => {
    let tops: number[] = [];
    const measure = () => { tops = IDS.map((id) => (document.getElementById(id)?.offsetTop ?? 0)); };
    const onScroll = () => {
      const y = window.scrollY, H = window.innerHeight;
      const max = document.documentElement.scrollHeight - H;
      let s = 0;
      for (let i = 0; i < tops.length - 1; i++) {
        const a = tops[i], b = Math.min(tops[i + 1], max);
        if (y >= b) s = i + 1;
        else if (y >= a) { s = i + (b > a ? (y - a) / (b - a) : 0); break; }
      }
      cam.s = Math.min(tops.length - 1, s);
      let active = 0;
      tops.forEach((t, i) => { if (y + H * 0.45 >= t) active = i; });
      if (y >= max - 2) active = tops.length - 1;
      setUi({ section: active });
    };
    measure(); onScroll();
    const ro = new ResizeObserver(() => { measure(); onScroll(); });
    ro.observe(document.body);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', measure); };
  }, []);

  const hud = useUi((u) => u.section);

  return (
    <>
      <a className="skip" href="?still">Skip to the text-only version</a>
      <Nav still={still} />
      <Menu />
      {!still && <Loader />}
      {!still && <Pins />}
      <main className="main">
        <Hero still={still} />
        <About />
        <Committees still={still} />
        <Schedule still={still} />
        <Register still={still} />
        <Wellness />
        <Resources />
        <Contact still={still} />
      </main>
      {!still && (
        <p className="hud mono" aria-live="polite" data-ko>
          <span className="fig">{two(hud)}</span> / <span className="fig">07</span> · {NAMES[hud]}
        </p>
      )}
    </>
  );
}
