// CH 01, About: the tracking map. A pinned (CSS sticky) stage: the Three.js globe searches, then locks onto Dubai with a
// coordinate HUD, while six plain-words steps (Opal-style) key on one clause each as a lower-third headline card.
import { useEffect, useRef, useState } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import NumberFlow from '@number-flow/react';
import { ArrowRight } from 'lucide-react';
import clsx from 'clsx';
import { conference } from '@/data/conference';
import { getLenis } from '@/shared/scroll';
import { DUBAI, easeInOut, formatLat, formatLon, lerp, seg, steps, type Step } from './data';
import { DubaiClock, useMedia } from './ui';
import { wipeTo } from './Wipe';
import type { FrameInfo, Pose, TrackerGlobe } from './TrackerGlobe';
// Library: Animate UI RollingText (flip letters) for each headline card. See LIBRARY.md.
import { RollingText } from './lib/rolling-text';

const N = steps.length;
const STEP_VH = 28; // scroll per step, in viewport heights

/* Camera keyframes over the pin's progress: search → lock → hold → pull back for "How big?" → re-lock → tight. */
type K = [number, Pose];
const D = DUBAI;
const KEYS: K[] = [
  [0.0, { lon: D.lon - 210, lat: 4, dist: 6.2 }],
  [0.13, { lon: D.lon, lat: D.lat, dist: 3.4 }],
  [0.3, { lon: D.lon, lat: D.lat, dist: 3.05 }],
  [0.47, { lon: D.lon, lat: D.lat, dist: 2.85 }],
  [0.58, { lon: D.lon - 24, lat: 16, dist: 5.6 }],
  [0.66, { lon: D.lon - 24, lat: 16, dist: 5.6 }],
  [0.78, { lon: D.lon, lat: D.lat, dist: 3.1 }],
  [1.0, { lon: D.lon, lat: D.lat, dist: 2.5 }],
];
function poseAt(p: number, drift: number): Pose {
  let i = 0;
  while (i < KEYS.length - 2 && p > KEYS[i + 1][0]) i++;
  const [a, A] = KEYS[i], [b, B] = KEYS[i + 1];
  const t = easeInOut(seg(p, a, b));
  const search = 1 - seg(p, 0, 0.13); // idle turn only while searching
  return { lon: lerp(A.lon, B.lon, t) - drift * search, lat: lerp(A.lat, B.lat, t), dist: lerp(A.dist, B.dist, t) };
}
const LOCKED: Pose = { lon: D.lon, lat: D.lat, dist: 3.3 };

export function Tracker({ still }: { still: boolean }) {
  const track = useRef<HTMLElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const hud = useRef<HTMLDivElement>(null);
  const ret = useRef<HTMLDivElement>(null);
  const prog = useRef(0);
  const [step, setStep] = useState(0);
  const [locked, setLocked] = useState(still);
  const [gl, setGl] = useState<'webgl' | 'none' | 'pending'>('pending');
  const wide = useMedia('(min-width: 1024px)');

  /* scroll progress → step */
  useEffect(() => {
    if (still || !track.current) return;
    const st = ScrollTrigger.create({
      trigger: track.current,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        prog.current = self.progress;
        setStep(Math.min(N - 1, Math.floor(self.progress * N * 0.999)));
      },
    });
    return () => st.kill();
  }, [still]);

  /* the globe (lazy: three.js loads only when the tracker is near) */
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let globe: TrackerGlobe | null = null;
    let dead = false;
    const t0 = performance.now();
    let wasLocked = still;
    const onFrame = (f: FrameInfo) => {
      const h = hud.current;
      if (h) {
        h.querySelector('[data-k=lat]')!.textContent = formatLat(f.pose.lat);
        h.querySelector('[data-k=lon]')!.textContent = formatLon(f.pose.lon);
        h.querySelector('[data-k=rng]')!.textContent = (6.2 / f.pose.dist).toFixed(2) + '×';
        (h.querySelector('[data-k=bar]') as HTMLElement).style.transform = `scaleX(${prog.current.toFixed(4)})`;
      }
      const isLocked = Math.abs(f.pose.lon - D.lon) < 1.5 && Math.abs(f.pose.lat - D.lat) < 1.5;
      if (isLocked !== wasLocked) { wasLocked = isLocked; setLocked(isLocked); }
      const st = h?.querySelector<HTMLElement>('[data-k=status]');
      if (st) st.textContent = isLocked ? 'Locked' : prog.current < 0.15 ? 'Searching' : 'Wide shot';
      const r = ret.current;
      if (r) {
        r.style.transform = `translate3d(${f.x.toFixed(1)}px, ${f.y.toFixed(1)}px, 0)`;
        r.style.opacity = f.facing ? '1' : '0';
      }
    };
    const start = () => {
      import('./TrackerGlobe').then(({ TrackerGlobe, hasWebGL }) => {
        if (dead) return;
        if (!hasWebGL()) { setGl('none'); return; }
        try {
          globe = new TrackerGlobe(el, () => (still ? LOCKED : poseAt(prog.current, ((performance.now() - t0) / 1000) * 9)), onFrame, still, () => setGl('none'));
          setGl('webgl');
        } catch { setGl('none'); }
      });
    };
    // Start the globe a screen before it scrolls in.
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); start(); } }, { rootMargin: '100% 0px' });
    io.observe(el);
    return () => { dead = true; io.disconnect(); globe?.destroy(); };
  }, [still]);

  const toStep = (i: number) => {
    const el = track.current;
    if (!el || still) return;
    const range = el.offsetHeight - innerHeight;
    const y = el.offsetTop + range * ((i + 0.5) / N);
    const l = getLenis();
    if (l) l.scrollTo(y, { duration: 1.1 }); else scrollTo({ top: y, behavior: 'smooth' });
  };

  const s = steps[step];

  return (
    <section
      ref={track}
      id="about"
      className={clsx('trk', still && 'is-still')}
      style={still ? undefined : { height: `calc(100svh + ${N * STEP_VH}vh)` }}
      aria-labelledby="about-title"
    >
      <div className="trk-stage" style={still ? undefined : { top: 0 }}>
        <div className="trk-map">
          <div ref={host} className="trk-host" data-renderer={gl} />
          {gl === 'none' && <p className="trk-nogl">Tracking map: {conference.city}, {formatLat(D.lat)} · {formatLon(D.lon)}</p>}
          {/* HUD: brackets, crosshair, readouts */}
          <span className="hud-corners" aria-hidden="true"><i /><i /><i /><i /></span>
          <span className="hud-cross" aria-hidden="true" />
          <div ref={hud} className="hud" aria-hidden="true">
            <p className="hud-title"><span className="k">CH 01</span> Tracking</p>
            <dl>
              <div><dt>Lat</dt><dd data-k="lat">{formatLat(still ? D.lat : 4)}</dd></div>
              <div><dt>Lon</dt><dd data-k="lon">{formatLon(still ? D.lon : D.lon - 210)}</dd></div>
              <div><dt>Range</dt><dd data-k="rng">{still ? (6.2 / LOCKED.dist).toFixed(2) : '1.00'}×</dd></div>
              <div><dt>Status</dt><dd data-k="status" className={clsx('hud-status', locked && 'is-locked')}>{still ? 'Locked' : 'Searching'}</dd></div>
            </dl>
            <span className="hud-bar"><i data-k="bar" /></span>
          </div>
          <div ref={ret} className={clsx('ret', locked && 'is-locked')} aria-hidden="true">
            <span className="ret-box"><i /><i /><i /><i /></span>
            <span className="ret-tag">
              <b>{conference.city}</b>
              <DubaiClock label={false} />
            </span>
          </div>
        </div>

        <div className="trk-copy">
          <header className="trk-head">
            <p className="trk-kicker"><span className="k">CH 01</span> About · in plain words</p>
            <h2 id="about-title" className="trk-h">{conference.edition}, step by step</h2>
          </header>

          {still ? (
            <ol className="trk-all">
              {steps.map((st, i) => <li key={i}><Card s={st} i={i} still /></li>)}
            </ol>
          ) : (
            <>
              <div className="trk-card-slot" aria-live="polite">
                <Card key={step} s={s} i={step} still={false} />
              </div>
              <div className="trk-steps" aria-label="Steps">
                <span className="trk-count" aria-hidden="true">
                  <NumberFlow value={step + 1} format={{ minimumIntegerDigits: 2 }} /> <span className="trk-of">/ {String(N).padStart(2, '0')}</span>
                </span>
                <ol className="trk-list">
                  {steps.map((st, i) => (
                    <li key={i}>
                      <button type="button" className={clsx('trk-li', i === step && 'is-on', i < step && 'is-done')} onClick={() => toStep(i)} aria-current={i === step ? 'step' : undefined}>
                        <span className="trk-li-n">{String(i + 1).padStart(2, '0')}</span>
                        <span className="trk-li-q">{st.q}</span>
                        {wide && <span className="trk-li-f">{st.verb} {st.fact}</span>}
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function Card({ s, i, still }: { s: Step; i: number; still: boolean }) {
  return (
    <article className={clsx('card', s.host && 'card--host', s.tba && 'card--tba', s.motto && 'card--motto')}>
      <p className="card-q"><span className="card-n">{String(i + 1).padStart(2, '0')}</span>{s.q}</p>
      <p className="card-verb">{s.verb}</p>
      <p className="card-fact"><RollingText text={s.fact} still={still} /></p>
      <p className="card-note">
        {s.note}
      </p>
      {s.link && (
        <a className="card-link" href={`#${s.link}`} onClick={(e) => { e.preventDefault(); wipeTo(s.link!); }}>
          {s.link === 'committees' ? 'Explore committees' : 'Open the rundown'} <ArrowRight aria-hidden="true" />
        </a>
      )}
    </article>
  );
}

