import { useCallback, useRef, useState } from 'react';
import NumberFlow from '@number-flow/react';
import { motion } from 'motion/react';
import { Check, Mail, AtSign, FileText, ArrowUp, ArrowDown } from 'lucide-react';
import { conference, stats, tba, resources } from '@/data/conference';
import { useWellness } from '@/shared/hooks';
import Globe, { type Frame } from './Globe';
import Committees from './Committees';
import Schedule from './Schedule';
import { DubaiClock, Wordmark, jump } from './Chrome';
import { DUBAI, easeInOut, formatLat, formatLon, lerp, project, seg } from './geo';

/* --------------------------------------------------------------- the signature timeline */
// p runs 0 → 1 across the hero and the pinned About section. The globe makes one full turn
// and a bit (385°), tilts up to Dubai's latitude and zooms until Dubai sits under the reticle.
const SPIN = 385;
function heroPose(w: number, h: number) {
  const m = w < 768;
  return m
    ? { cx: w * 0.5, cy: h * 0.74, r: Math.min(w * 0.56, h * 0.3) }
    : { cx: w * 0.7, cy: h * 0.56, r: Math.min(h * 0.43, w * 0.29) };
}
function finalPose(w: number, h: number) {
  const m = w < 768;
  return m ? { cx: w * 0.5, cy: h * 0.3, r: h * 0.6 } : { cx: w * 0.66, cy: h * 0.5, r: Math.max(w, h) * 0.62 };
}
const scrollFrame = (raw: number, w: number, h: number, drift: number): Frame => {
  const p = Math.min(1, raw / 0.86); // the last stretch holds on Dubai before the page moves on
  const a = heroPose(w, h), b = finalPose(w, h);
  const move = easeInOut(seg(p, 0.02, 0.55));
  const zoom = easeInOut(seg(p, 0.3, 0.97));
  const spin = easeInOut(seg(p, 0.0, 0.9));
  const idle = 1 - seg(p, 0, 0.25);
  return {
    pose: {
      lon: DUBAI.lon - SPIN * (1 - spin) - (drift % 360) * idle,
      lat: lerp(14, DUBAI.lat, spin),
      cx: lerp(a.cx, b.cx, move),
      cy: lerp(a.cy, b.cy, move),
      r: a.r * Math.pow(b.r / a.r, zoom),
    },
    reticle: seg(p, 0.88, 0.97),
  };
};
const stillFrame = (_p: number, w: number, h: number): Frame => {
  const a = heroPose(w, h);
  return { pose: { lon: DUBAI.lon, lat: DUBAI.lat, ...a, r: a.r * (w < 768 ? 1 : 1.04) }, reticle: 1 };
};

/* --------------------------------------------------------------- page */
export default function Home({ still }: { still: boolean }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const [lit, setLit] = useState(still ? stats.length : 0);
  const litRef = useRef(lit);

  const onFrame = useCallback((p: number, f: Frame, w: number, h: number) => {
    const el = hudRef.current;
    if (el) {
      const z = f.pose.r / heroPose(w, h).r;
      el.querySelector('[data-k=lat]')!.textContent = formatLat(f.pose.lat);
      el.querySelector('[data-k=lon]')!.textContent = formatLon(f.pose.lon);
      el.querySelector('[data-k=zoom]')!.textContent = z.toFixed(2) + '×';
      (el.querySelector('[data-k=bar]') as HTMLElement).style.transform = `scaleX(${p.toFixed(4)})`;
      // Only show live coordinates once the approach has begun, so the hero never reads as a wrong location.
      el.querySelectorAll<HTMLElement>('[data-live]').forEach((n) => { n.style.opacity = String(seg(p, 0.12, 0.22)); });
    }
    const tag = tagRef.current;
    if (tag) {
      const [x, y, z] = project(f.pose, DUBAI.lat, DUBAI.lon);
      tag.style.transform = `translate(${(x + 34).toFixed(1)}px, ${(y + 30).toFixed(1)}px)`;
      tag.style.opacity = String(z > 0 ? f.reticle : 0);
    }
    const n = [0.42, 0.52, 0.62, 0.72].filter((t) => p >= t).length;
    if (n !== litRef.current) { litRef.current = n; setLit(n); }
  }, []);

  return (
    <main id="main">
      <div ref={trackRef} className={'sky' + (still ? ' is-still' : '')}>
        <div className="sky-layer">
          <div className="sky-sticky">
          <Globe mode={still ? 'still' : 'scroll'} trackRef={trackRef} frameAt={still ? stillFrame : scrollFrame} onFrame={onFrame} className="sky-globe" />
          <div ref={tagRef} className="sky-tag mono" aria-hidden="true" style={{ opacity: 0 }}>
            <span className="acc">Dubai</span>
            <span>{formatLat(DUBAI.lat)}</span>
            <span>{formatLon(DUBAI.lon)}</span>
            <DubaiClock label={false} />
          </div>
          <div ref={hudRef} className="hud mono" aria-hidden="true">
            <span className="hud-k">target</span><span className="acc">Dubai</span>
            <span className="hud-k" data-live>lat</span><span data-live data-k="lat">{formatLat(DUBAI.lat)}</span>
            <span className="hud-k" data-live>lon</span><span data-live data-k="lon">{formatLon(DUBAI.lon)}</span>
            <span className="hud-k" data-live>zoom</span><span data-live data-k="zoom">1.00×</span>
            <span className="hud-bar"><i data-k="bar" /></span>
          </div>
          </div>
        </div>

        {/* ------------------------------------------------ hero */}
        <section id="home" className="hero" aria-labelledby="hero-h">
          <div className="hero-in">
            <p className="mono hero-kicker">
              <span>{conference.edition}</span>
              <span className="dim">{formatLat(DUBAI.lat)}, {formatLon(DUBAI.lon)}</span>
            </p>
            <h1 id="hero-h" className="hero-h">Diplomacy<br />around us</h1>
            <p className="hero-p">
              A {conference.kind} conference in {conference.city}, hosted by {conference.host}. {stats[0].value} committees across {stats[1].value} days.
            </p>
            <div className="hero-cta">
              <a href="#committees" onClick={jump('committees')} className="btn btn-primary">Explore committees</a>
              <a href="#schedule" onClick={jump('schedule')} className="btn btn-ghost">See the schedule</a>
            </div>
            <p className="mono hero-cue"><ArrowDown size={15} aria-hidden="true" />Scroll to fly in to Dubai, then browse all {stats[0].value} committees</p>
          </div>
          <dl className="spec">
            <div><dt>Edition</dt><dd>{conference.edition}</dd></div>
            <div><dt>Host</dt><dd>{conference.host}</dd></div>
            <div><dt>Dates</dt><dd className="tba">{tba(conference.dates)}</dd></div>
            <div><dt>Venue</dt><dd className="tba">{tba(conference.venue)}</dd></div>
          </dl>
        </section>

        {/* ------------------------------------------------ about: pinned while the globe homes in */}
        <section id="about" className="about" aria-labelledby="about-h">
          <div className="about-pin">
            <div className="about-card">
              <a href="#about" className="mono anchor">#about</a>
              <h2 id="about-h" className="h2">Hosted by {conference.host}, in {conference.city}.</h2>
              <p className="lede">
                {conference.edition} is a {conference.kind} conference with {stats[0].value} committees and {stats[2].value} committee sessions over {stats[1].value} days. Dates and venue are to be announced.
              </p>
              <dl className="stats">
                {stats.map((s, i) => (
                  <div key={s.label} className={'stat' + (i < lit ? ' is-on' : '')}>
                    <dt className="mono">{s.label}</dt>
                    <dd>
                      <NumberFlow
                        value={i < lit ? s.value : 0}
                        format={{ useGrouping: false, minimumIntegerDigits: s.value > 99 ? 4 : 2 }}
                        animated={!still}
                        transformTiming={{ duration: 900, easing: 'cubic-bezier(.2,.7,.1,1)' }}
                        spinTiming={{ duration: 900, easing: 'cubic-bezier(.2,.7,.1,1)' }}
                        aria-hidden="true"
                      />
                      <span className="sr-only">{s.value}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>
      </div>

      {/* ------------------------------------------------ committees */}
      <section id="committees" className="sec" aria-labelledby="cm-h">
        <Committees
          still={still}
          head={
            <SectionHead id="committees" title="Nineteen committees" titleId="cm-h" still={still} small>
              Select a node, use the arrow keys or swipe to read each committee’s full name.
            </SectionHead>
          }
        />
      </section>

      {/* ------------------------------------------------ schedule */}
      <section id="schedule" className="sec sec-side" aria-labelledby="sc-h">
        <SectionHead id="schedule" title="Three days, to scale" titleId="sc-h" still={still} small>
          Every slot is drawn on the same 09:00 to 19:30 axis, so you can see the shape of each day.
        </SectionHead>
        <Schedule still={still} />
      </section>

      {/* ------------------------------------------------ wellness, resources, contact */}
      <section className="sec sec-split" aria-label="Wellness, resources and contact">
        <div id="wellness" className="split-col">
          <SectionHead id="wellness" title="Quick reset" titleId="wl-h" still={still} small>
            Take a moment between sessions.
          </SectionHead>
          <Wellness />
        </div>
        <div id="resources" className="split-col">
          <SectionHead id="resources" title="Resources" titleId="rs-h" still={still} small>
            Guides for the committee room.
          </SectionHead>
          <ul className="res">
            {resources.map((r) => (
              <li key={r.title} className="res-row">
                <FileText size={18} aria-hidden="true" className="res-ic" />
                <div>
                  <h3 className="res-t">{r.title}</h3>
                  <p className="res-b">{r.blurb}</p>
                </div>
                {r.href
                  ? <a href={r.href} className="btn btn-ghost">Open</a>
                  : <span className="mono tba res-s">Link to be announced</span>}
              </li>
            ))}
          </ul>
        </div>
        <div id="contact" className="split-col">
          <SectionHead id="contact" title="Contact" titleId="ct-h" still={still} small>
            Registration, email and Instagram will be published here.
          </SectionHead>
          <dl className="contact">
            <div><dt><Mail size={16} aria-hidden="true" />Email</dt><dd className="tba">{conference.email ? <a href={'mailto:' + conference.email}>{conference.email}</a> : tba(null)}</dd></div>
            <div><dt><AtSign size={16} aria-hidden="true" />Instagram</dt><dd className="tba">{tba(conference.instagram)}</dd></div>
            <div><dt><Check size={16} aria-hidden="true" />Registration</dt><dd className="tba">{conference.registerUrl ? <a href={conference.registerUrl}>Register</a> : tba(null)}</dd></div>
          </dl>
        </div>
      </section>

      <footer className="foot">
        <div className="foot-in">
          <Wordmark />
          <span className="mono dim">{conference.motto}</span>
          <span className="mono dim">{formatLat(DUBAI.lat)}, {formatLon(DUBAI.lon)}</span>
          <DubaiClock />
          <span className="mono dim">© {conference.year} {conference.name}</span>
          <a href="#home" onClick={jump('home')} className="btn btn-ghost btn-sm"><ArrowUp size={16} aria-hidden="true" />Back to top</a>
        </div>
      </footer>
    </main>
  );
}

function SectionHead({ id, title, titleId, children, still, small }: { id: string; title: string; titleId: string; children: React.ReactNode; still: boolean; small?: boolean }) {
  return (
    <motion.header
      className={'sh' + (small ? ' sh-s' : '')}
      initial={still ? false : 'off'}
      whileInView="on"
      viewport={{ once: true, margin: '0px 0px -15% 0px' }}
    >
      <motion.span className="sh-rule" aria-hidden="true" variants={{ off: { scaleX: 0 }, on: { scaleX: 1 } }} transition={{ duration: 0.7, ease: [0.2, 0.7, 0.1, 1] }} />
      <a href={'#' + id} className="mono anchor">#{id}</a>
      <motion.h2 id={titleId} className="h2" variants={{ off: { opacity: 0, x: -12 }, on: { opacity: 1, x: 0 } }} transition={{ duration: 0.65, ease: [0.2, 0.7, 0.1, 1], delay: 0.08 }}>
        {title}
      </motion.h2>
      <p className="sh-p">{children}</p>
    </motion.header>
  );
}

function Wellness() {
  const w = useWellness();
  return (
    <div className="wl">
      <div className="wl-meter" aria-hidden="true">
        {w.items.map((it) => <i key={it.id} className={w.checked.includes(it.id) ? 'is-on' : ''} />)}
      </div>
      <ul className="wl-list">
        {w.items.map((it) => {
          const on = w.checked.includes(it.id);
          return (
            <li key={it.id}>
              <button type="button" role="checkbox" aria-checked={on} className={'wl-item' + (on ? ' is-on' : '')} onClick={() => w.toggle(it.id)}>
                <span className="wl-box" aria-hidden="true">{on && <Check size={14} strokeWidth={3} />}</span>
                <span className="wl-l">{it.label}</span>
                <span className="mono dim wl-s">{on ? 'Done' : 'Not yet'}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mono wl-status" aria-live="polite">{w.status}</p>
      <p className="mono dim wl-note">{w.note}</p>
    </div>
  );
}
