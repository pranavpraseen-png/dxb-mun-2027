import { useEffect, useRef, type ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import NumberFlow from '@number-flow/react';
import { ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { committees, conference, resources, schedule, stats, tba } from '@/data/conference';
import { useFloorTimer, useWellness } from '@/shared/hooks';
import { useSmoothScroll } from '@/shared/scroll';
import { flyTo } from './nav';
import { useDriver } from './driver';
import { LAST, STOPS, measureStops, pickPlate, rig, setUI, useUI } from './store';
import { DubaiClock, Tba, Wordmark } from './ui';
import { admin, chair, register, signIn } from './links';
import { DUSK } from './theme';
// Library components (see LIBRARY.md)
import SplitFlapText from './ui/split-flap-text';
import { TextEffect } from './ui/text-effect';
import { Magnetic } from './ui/magnetic';
import { Marquee } from './ui/marquee';
import { RollingText } from './ui/rolling-text';
import { Button } from '../../portal/ui/coss/button';
import { Badge } from '../../portal/ui/coss/badge';
import { Checkbox } from '../../portal/ui/coss/checkbox';
import { Tabs, TabsList, TabsPanel, TabsTab } from '../../portal/ui/coss/tabs';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const first = committees[0], last = committees[committees.length - 1];
const two = (n: number) => String(n).padStart(2, '0');

/* ------------------------------------------------------------------ one resolution clause */
type ClauseT = { n?: number; verb: string; fact: string; note?: string; host?: boolean };
function Clause({ c, play }: { c: ClauseT; play: boolean }) {
  return (
    <li className={clsx('clause', c.host && 'clause--host', c.n ? 'clause--op' : 'clause--pre')}>
      <span className="cl-no" aria-hidden="true">{c.n ? `${c.n}.` : ''}</span>
      <p className="cl-main">
        <em className="cl-verb">{c.verb}</em>{' '}
        <TextEffect key={play ? 'on' : 'off'} as="strong" per="word" preset="slide" speedReveal={1.1} className="cl-fact">{c.fact}</TextEffect>
      </p>
      {c.note && <p className="cl-note">{c.note}</p>}
    </li>
  );
}

/** The overlay that keys on at a camera stop. Opacity and lift come from the camera (`--p`, written by the rig). */
function Panel({ i, className, children }: { i: number; className?: string; children: ReactNode }) {
  return (
    <div className={clsx('panel', className)} data-panel={i}>
      <p className="panel-kicker"><span className="panel-no">{two(i + 1)}</span><span className="panel-cam">Cam · {STOPS[i].cam}</span></p>
      {children}
    </div>
  );
}

function Stop({ i, still, children, anchor }: { i: number; still: boolean; children: ReactNode; anchor?: string }) {
  const posters = useUI((u) => u.posters);
  const s = STOPS[i];
  return (
    <section
      id={'stop-' + s.id}
      className={clsx('stop', `stop--${s.id}`)}
      style={{ ['--dwell' as string]: s.dwell, ['--travel' as string]: s.travel }}
      aria-label={s.label}
    >
      {anchor && <span id={anchor} className="anchor" aria-hidden="true" />}
      {still && posters[i] && <img className="poster" src={posters[i]} alt="" aria-hidden="true" />}
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ 0: the on-air slate */
function Timecode() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (rig.still) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = () => {
      const ms = performance.now() - t0;
      const f = Math.floor((ms / 40) % 25), s = Math.floor(ms / 1000);
      if (ref.current) ref.current.textContent = `${two(Math.floor(s / 3600))}:${two(Math.floor(s / 60) % 60)}:${two(s % 60)}:${two(f)}`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <span ref={ref} className="tc">00:00:00:00</span>;
}

function Slate({ narrow }: { narrow: boolean }) {
  const fields: [string, ReactNode][] = [
    ['Programme', conference.edition],
    ['Host', conference.host],
    ['Committees', String(stats[0].value)],
    ['Dates', <Tba key="d" value={conference.dates} />],
    ['Venue', <Tba key="v" value={conference.venue} />],
  ];
  return (
    <div className="slate" data-slate>
      <div className="slate-card">
        <div className="slate-top">
          <span className="slate-air"><i aria-hidden="true" />On air</span>
          <span className="slate-what">Broadcast opening</span>
          <Timecode />
        </div>
        <h1 className="slate-title">
          <SplitFlapText
            text={conference.edition.toUpperCase()}
            padTo={conference.edition.length}
            fontSize={narrow ? 'clamp(28px, calc(28px + (100vw - 390px) * 12 / 1050), 40px)' : 'clamp(44px, calc(44px + (100vw - 390px) * 52 / 1050), 96px)'}
            gap={narrow ? 3 : 6}
            tileRadius={2}
            tileColor={DUSK.raised}
            textColor={DUSK.ink}
            flipDuration={0.09}
            stagger={0.05}
            flipsPerChar={rig.still ? 0 : 7}
            loop={false}
            intro={!rig.still}
            depth={0.7}
            className="slate-board"
          />
        </h1>
        <p className="slate-kind">{conference.kind} <span aria-hidden="true">·</span> {conference.city}</p>
        <dl className="slate-fields">
          {fields.map(([k, v]) => (
            <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
        <div className="slate-cta">
          <Magnetic intensity={0.25} range={120}>
            <Button size="xl" render={<a href="#committees" onClick={(e) => { e.preventDefault(); flyTo(3, 'committees'); }} />}>Explore committees</Button>
          </Magnetic>
          <Button size="xl" variant="outline" render={<a href={register} />}>Register</Button>
          <DubaiClock />
        </div>
      </div>
      <p className="slate-cue" aria-hidden="true"><span>Scroll to roll camera</span><i /></p>
    </div>
  );
}

/* ------------------------------------------------------------------ 3: committees */
function Committees({ play }: { play: boolean }) {
  const picked = useUI((u) => u.picked);
  const c = committees[picked];
  const stop = useUI((u) => u.stop);
  useEffect(() => {
    if (stop !== 3) return;
    const on = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea, [role=tablist]')) return;
      if (e.key === 'ArrowRight') pickPlate(picked + 1);
      if (e.key === 'ArrowLeft') pickPlate(picked - 1);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [stop, picked]);
  return (
    <Panel i={3} className="panel--committees">
      <ol className="clauses">
        <Clause play={play} c={{ n: 2, verb: 'Convenes', fact: `${committees.length} committees`, note: `From ${first.abbr} to ${last.abbr}. Drag a nameplate, or tap one.` }} />
      </ol>
      <div className="cm-foot">
      <div className="lt" aria-live="polite">
        <p className="lt-count"><NumberFlow value={picked + 1} format={{ minimumIntegerDigits: 2 }} /> <span>/ {committees.length}</span></p>
        <div className="lt-text">
          <p className="lt-abbr">{c.abbr}</p>
          <p className="lt-name">{c.name}</p>
        </div>
        <div className="lt-btns">
          <Button variant="outline" size="icon" aria-label="Previous committee" onClick={() => pickPlate(picked - 1)}><ChevronLeft aria-hidden="true" /></Button>
          <Button variant="outline" size="icon" aria-label="Next committee" onClick={() => pickPlate(picked + 1)}><ChevronRight aria-hidden="true" /></Button>
        </div>
      </div>
      <ul className="roll" aria-label="All committees">
        {committees.map((k, j) => (
          <li key={k.abbr}>
            <button type="button" className={clsx('roll-b', j === picked && 'is-on')} aria-pressed={j === picked} aria-label={`${k.abbr}, ${k.name}`} onClick={() => pickPlate(j)}>{k.abbr}</button>
          </li>
        ))}
      </ul>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ 4: schedule */
const isSession = (n: string) => /Committee Session/.test(n);
function Schedule({ play }: { play: boolean }) {
  const day = useUI((u) => u.day);
  return (
    <Panel i={4} className="panel--schedule">
      <ol className="clauses">
        <Clause play={play} c={{ n: 3, verb: 'Meets for', fact: `${stats[1].value} days · ${stats[2].value} sessions`, note: `Dates: ${tba(conference.dates).toLowerCase()}.` }} />
      </ol>
      <Tabs value={day} onValueChange={(v) => setUI({ day: v as number })} className="sch">
        <TabsList variant="underline" aria-label="Day" className="sch-tabs w-full justify-start gap-1 text-muted-foreground">
          {schedule.map((d) => (
            <TabsTab key={d.day} value={d.day} className="sch-tab h-auto min-h-11 flex-1 rounded-[2px] px-3 py-1.5 text-muted-foreground hover:text-foreground data-active:bg-raised data-active:text-foreground sm:h-auto">
              {d.label}
            </TabsTab>
          ))}
        </TabsList>
        {schedule.map((d) => (
          <TabsPanel key={d.day} value={d.day} className="sch-panel">
            <ol className="sch-list">
              {d.slots.map((s) => (
                <li key={s.name + s.time} className={clsx('sch-row', isSession(s.name) && 'is-session')}>
                  <span className="sch-time">{s.time}</span>
                  <span className="sch-name">{s.name}</span>
                </li>
              ))}
            </ol>
          </TabsPanel>
        ))}
      </Tabs>
    </Panel>
  );
}

/* ------------------------------------------------------------------ 5: the dais (timer, quick reset, resources) */
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
function Desk({ play }: { play: boolean }) {
  const t = useFloorTimer(60);
  const w = useWellness();
  useEffect(() => {
    setUI({ timer: t.display, timerState: t.finished ? 'done' : t.running ? 'running' : t.left < t.total ? 'paused' : 'ready' });
  }, [t.display, t.finished, t.running, t.left, t.total]);
  return (
    <Panel i={5} className="panel--desk">
      <ol className="clauses">
        <Clause play={play} c={{ n: 4, verb: 'Provides', fact: 'The floor timer', note: 'Start it here. The clock on the dais follows.' }} />
      </ol>
      <div className="timer" role="group" aria-label="Floor timer">
        <p className={clsx('timer-read', t.finished && 'is-done')} aria-live="polite" aria-atomic="true">
          <span className="timer-digits">{t.display}</span>
          <span className="timer-state">{t.state}</span>
        </p>
        <div className="timer-btns">
          <Button size="lg" onClick={t.toggle}>{t.running ? 'Pause' : 'Start'}</Button>
          <Button size="lg" variant="outline" onClick={t.reset}>Reset</Button>
        </div>
        <div className="timer-presets" role="group" aria-label="Duration">
          {t.presets.map((s) => (
            <Button key={s} size="sm" variant="outline" aria-pressed={t.total === s} className={clsx('preset', t.total === s && 'is-on')} disabled={t.running} onClick={() => t.setTotal(s)}>{mmss(s)}</Button>
          ))}
        </div>
      </div>
      <div className="desk-row">
        <div id="wellness" className="well">
          <p className="desk-h">Quick reset</p>
          <ul className="well-list">
            {w.items.map((it) => {
              const on = w.checked.includes(it.id);
              return (
                <li key={it.id}>
                  <label className={clsx('well-row', on && 'is-on')}>
                    <Checkbox checked={on} onCheckedChange={() => w.toggle(it.id)} className="size-6 rounded-[2px] sm:size-6 [&_svg]:size-4" />
                    <span>{it.label}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          <p className="well-note" aria-live="polite">{w.status}</p>
        </div>
        <div id="resources" className="res">
          <p className="desk-h">Resources</p>
          {resources.map((r) => (
            <div key={r.title} className="res-row">
              <p className="res-name">{r.title}</p>
              {r.href
                ? <Button variant="outline" size="sm" render={<a href={r.href} />}>Open</Button>
                : <Badge variant="outline" size="lg" className="res-tag h-auto px-2 py-0.5 font-mono text-[13px] font-normal sm:h-auto">Link to be announced</Badge>}
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ 6: contact */
const contactRows: [string, string | null][] = [
  ['Email', conference.email],
  ['Instagram', conference.instagram],
  ['Venue', conference.venue],
  ['Dates', conference.dates],
];
function Contact({ play }: { play: boolean }) {
  return (
    <Panel i={6} className="panel--contact">
      <ol className="clauses">
        <Clause play={play} c={{ n: 5, verb: 'Invites you to', fact: 'Register', note: 'Delegates, advisors and chairs use the delegate dashboard.' }} />
      </ol>
      <div className="contact-cta">
        <Magnetic intensity={0.25} range={120}>
          <Button size="xl" render={<a href={register} />}>Register</Button>
        </Magnetic>
        <Button size="xl" variant="outline" render={<a href={signIn} />}>Sign in</Button>
      </div>
      <dl className="croll">
        {contactRows.map(([k, v]) => (
          <div key={k} className="croll-row"><dt>{k}</dt><dd><Tba value={v} /></dd></div>
        ))}
        <div className="croll-row croll-row--host"><dt>Host</dt><dd>{conference.host}</dd></div>
      </dl>
    </Panel>
  );
}

/* ------------------------------------------------------------------ chrome: HUD, flight map, ticker, footer */
function Hud() {
  const stop = useUI((u) => u.stop);
  return (
    <div className="hud" aria-hidden="true">
      <RollingText key={stop} className="hud-cam" text={`CAM ${two(stop + 1)} · ${STOPS[stop].cam.toUpperCase()}`} transition={{ duration: 0.35, delay: 0.025, ease: 'easeOut' }} />
      <span id="hud-xyz" className="hud-xyz" />
    </div>
  );
}

/** The Dubai tag: Space.tsx pins it to the projected point on the globe every frame. */
function WhereTag() {
  return (
    <div id="where" className="where" aria-hidden="true">
      <div className="where-in">
        <span className="where-k">{conference.city}</span>
        <DubaiClock label={false} />
        <span className="where-c">25.2048° N · 55.2708° E</span>
      </div>
    </div>
  );
}

function FlightMap() {
  const stop = useUI((u) => u.stop);
  return (
    <nav className="flight" aria-label="Camera stops">
      <div className="flight-track">
        <span className="flight-line" aria-hidden="true" />
        <span id="flight-dot" className="flight-dot" aria-hidden="true"><i /></span>
        <ol>
          {STOPS.map((s, i) => (
            <li key={s.id} style={{ top: `${(i / LAST) * 100}%` }}>
              <button type="button" className={clsx('flight-b', i === stop && 'is-on')} onClick={() => flyTo(i)} aria-current={i === stop ? 'step' : undefined}>
                <span className="flight-tick" aria-hidden="true" />
                <span className="flight-l">{two(i + 1)} {s.label}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}

const tickerItems = [
  conference.motto,
  `${stats[0].value} committees`,
  `${stats[1].value} days`,
  `${stats[2].value} committee sessions`,
  `Hosted by ${conference.host}`,
  `Dates: ${tba(conference.dates)}`,
  `Venue: ${tba(conference.venue)}`,
  ...committees.map((c) => c.abbr),
];
function Ticker() {
  return (
    <div className="ticker" role="region" aria-label="Conference ticker">
      <span className="ticker-tag">{conference.edition}</span>
      <Marquee className="ticker-run [--duration:90s] [--gap:0px] p-0" repeat={2}>
        {tickerItems.map((t, i) => <span key={i} className="ticker-i"><i aria-hidden="true" />{t}</span>)}
      </Marquee>
    </div>
  );
}

function Footer() {
  return (
    <footer className="foot">
      <div className="host">
        <p className="host-mark"><span className="host-pip" aria-hidden="true" /><span className="host-k">Hosted by</span> {conference.host}, {conference.city}</p>
        <p className="host-links"><a href={admin}>Secretariat sign-in</a><a href={chair}>Chair sign-in</a></p>
      </div>
      <div className="foot-end">
        <Wordmark />
        <p>{conference.motto}. © {conference.year} {conference.name}.</p>
        <DubaiClock />
        <Button variant="outline" onClick={() => flyTo(0)}><ArrowUp aria-hidden="true" /> Back to the opening</Button>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ the page */
export function Home({ still, narrow }: { still: boolean; narrow: boolean }) {
  useSmoothScroll(!still, 0);
  useDriver(!still);
  const stop = useUI((u) => u.stop);
  const play = (i: number) => still || stop === i;
  const root = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const onRefresh = () => measureStops();
    ScrollTrigger.addEventListener('refresh', onRefresh);
    measureStops();
    if (!still) {
      // the slate snaps shut to a line, then the line runs out, while the camera starts to roll
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: '#stop-home', start: 'top top', end: () => '+=' + Math.round(window.innerHeight * 0.55), scrub: 0.6, invalidateOnRefresh: true },
      });
      tl.to('.slate-cue', { opacity: 0, duration: 0.15 }, 0)
        .fromTo('.slate-card', { clipPath: 'inset(0% 0% 0% 0%)' }, { clipPath: 'inset(49.6% 0% 49.6% 0%)', duration: 0.55, ease: 'power2.in' }, 0.05)
        .to('.slate-card', { scaleX: 0, duration: 0.3, ease: 'power2.in' }, 0.62)
        .set('.slate', { autoAlpha: 0 }, 0.98);
    }
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    const t = window.setTimeout(() => ScrollTrigger.refresh(), 600);
    return () => { ScrollTrigger.removeEventListener('refresh', onRefresh); clearTimeout(t); };
  }, { scope: root, dependencies: [still] });

  return (
    <div ref={root}>
      <main id="main" tabIndex={-1}>
        <Stop i={0} still={still} anchor="home"><Slate narrow={narrow} /></Stop>
        <Stop i={1} still={still} anchor="about">
          <Panel i={1} className="panel--about">
            <p className="panel-h">Draft resolution · {conference.edition}</p>
            <ol className="clauses">
              <Clause play={play(1)} c={{ verb: 'Hosted by', fact: conference.host, note: `In ${conference.city}.`, host: true }} />
              <Clause play={play(1)} c={{ verb: 'Guided by', fact: conference.motto, note: 'The motto of the conference.' }} />
            </ol>
          </Panel>
        </Stop>
        <Stop i={2} still={still}>
          <Panel i={2} className="panel--dubai">
            <ol className="clauses">
              <Clause play={play(2)} c={{ n: 1, verb: 'Convenes in', fact: conference.city, note: `Dates and venue: ${tba(conference.dates).toLowerCase()}.` }} />
            </ol>
          </Panel>
        </Stop>
        <Stop i={3} still={still} anchor="committees"><Committees play={play(3)} /></Stop>
        <Stop i={4} still={still} anchor="schedule"><Schedule play={play(4)} /></Stop>
        <Stop i={5} still={still} anchor="timer"><Desk play={play(5)} /></Stop>
        <Stop i={6} still={still} anchor="contact"><Contact play={play(6)} /></Stop>
      </main>
      <Footer />
      {!still && <WhereTag />}
      {!still && <Hud />}
      {!still && <FlightMap />}
      <Ticker />
    </div>
  );
}
