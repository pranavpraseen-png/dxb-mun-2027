// CH 00, the cold open: a standby slate counts down 3-2-1, the colour blocks split ("going live"), and the control room
// appears: the PGM monitor (cursor-reactive photo + lower-third h1), three PVW monitors and the ticker.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import NumberFlow from '@number-flow/react';
import { ArrowRight } from 'lucide-react';
import { committees, conference, heroPhoto, stats, tba } from '@/data/conference';
import { DUBAI, formatLat, formatLon, tickerItems } from './data';
import { DubaiClock } from './ui';
import { wipeTo } from './Wipe';
import { register, signIn } from './links';
// Library components (see LIBRARY.md).
import { Marquee } from './lib/marquee';
import { NumberTicker } from './lib/number-ticker';
import { Magnetic } from './lib/magnetic';
import { Button } from '../../portal/ui/coss/button';

type Phase = 'slate' | 'cut' | 'live';
const SEEN = 'oa-slate-seen';
const seenSlate = () => { try { return sessionStorage.getItem(SEEN) === '1'; } catch { return false; } };

/** Broadcast timecode HH:MM:SS:FF (25 fps) since the page opened. Decoration, not a fact. */
const tc = (ms: number) => {
  const f = Math.floor(ms / 40);
  const ff = f % 25, s = Math.floor(f / 25);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}:${p(ff)}`;
};

export function ColdOpen({ still }: { still: boolean }) {
  const [phase, setPhase] = useState<Phase>(() => (still || seenSlate() ? 'live' : 'slate'));
  const [count, setCount] = useState(3);
  const [onAir, setOnAir] = useState(still);
  const root = useRef<HTMLElement>(null);
  const pgm = useRef<HTMLDivElement>(null);
  const t0 = useRef(performance.now());

  const goLive = useCallback(() => {
    setPhase((p) => (p === 'slate' ? 'cut' : p));
    try { sessionStorage.setItem(SEEN, '1'); } catch { /* private mode */ }
  }, []);

  /* ---- the countdown, skippable by any scroll, key or tap */
  useEffect(() => {
    if (phase !== 'slate') return;
    const id = window.setInterval(() => setCount((c) => c - 1), 850);
    const skip = () => goLive();
    addEventListener('wheel', skip, { passive: true, once: true });
    addEventListener('touchmove', skip, { passive: true, once: true });
    addEventListener('keydown', skip, { once: true });
    return () => {
      clearInterval(id);
      removeEventListener('wheel', skip);
      removeEventListener('touchmove', skip);
      removeEventListener('keydown', skip);
    };
  }, [phase, goLive]);
  useEffect(() => { if (count <= 0) goLive(); }, [count, goLive]);

  /* ---- the control room keys on once: after the cut, or straight away when the slate was already seen */
  const keyed = useRef(false);
  useLayoutEffect(() => {
    const el = root.current;
    if (!el || still || keyed.current || phase === 'slate') return;
    keyed.current = true;
    const q = gsap.utils.selector(el);
    const at = phase === 'cut' ? 0.35 : 0.05;
    const tl = gsap.timeline({ delay: at });
    tl.fromTo(q('[data-mon]'), { clipPath: 'inset(50% 0% 50% 0%)', opacity: 0.4 }, { clipPath: 'inset(0% 0% 0% 0%)', opacity: 1, duration: 0.7, stagger: 0.09, ease: 'power4.out' }, 0)
      .fromTo(q('.pgm-photo-in'), { scale: 1.22 }, { scale: 1, duration: 1.6, ease: 'power2.out' }, 0)
      .fromTo(q('.lt-row'), { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.55, stagger: 0.1, ease: 'power3.out' }, 0.45)
      .fromTo(q('.ticker'), { yPercent: 100 }, { yPercent: 0, duration: 0.5, ease: 'power3.out' }, 0.6);
    if (phase === 'live') setOnAir(true);
  }, [phase, still]);

  /* ---- the cut: the slate's colour blocks split away (WEIMA), the tally lights, the slate unmounts */
  useEffect(() => {
    const el = root.current;
    if (!el || phase !== 'cut') return;
    if (still) { setPhase('live'); return; }
    const q = gsap.utils.selector(el);
    const tl = gsap.timeline({ defaults: { ease: 'power3.inOut' }, onComplete: () => setPhase('live') });
    tl.to(q('.slate0-core'), { opacity: 0, scale: 0.96, duration: 0.25, ease: 'power2.in' }, 0)
      .to(q('.slate0-col'), { yPercent: (i: number) => (i % 2 ? 101 : -101), duration: 0.7, stagger: 0.06 }, 0.12)
      .add(() => setOnAir(true), 0.2);
    return () => { tl.kill(); };
  }, [phase, still]);

  /* ---- cursor-reactive PGM (Lando-style): the photo parallaxes, a framing box trails the pointer, the timecode runs */
  useEffect(() => {
    const mon = pgm.current;
    if (!mon) return;
    const photo = mon.querySelector<HTMLElement>('.pgm-photo')!;
    const frame = mon.querySelector<HTMLElement>('.pgm-frame')!;
    const rx = mon.querySelector<HTMLElement>('[data-k=x]')!;
    const ry = mon.querySelector<HTMLElement>('[data-k=y]')!;
    const tcs = root.current!.querySelectorAll<HTMLElement>('[data-k=tc]');
    let tx = 0.62, ty = 0.4, x = tx, y = ty, raf = 0, vis = true, last = '';
    const paint = () => {
      const r = mon.getBoundingClientRect();
      photo.style.transform = `translate3d(${((0.5 - x) * 22).toFixed(2)}px, ${((0.5 - y) * 14).toFixed(2)}px, 0)`;
      const fw = frame.offsetWidth, fh = frame.offsetHeight;
      frame.style.transform = `translate3d(${(x * r.width - fw / 2).toFixed(1)}px, ${(y * r.height - fh / 2).toFixed(1)}px, 0)`;
      rx.textContent = x.toFixed(3);
      ry.textContent = y.toFixed(3);
    };
    if (still) { paint(); tcs.forEach((n) => (n.textContent = tc(0))); return; }
    const loop = () => {
      raf = 0;
      x += (tx - x) * 0.09;
      y += (ty - y) * 0.09;
      paint();
      const t = tc(performance.now() - t0.current);
      if (t !== last) { last = t; tcs.forEach((n) => (n.textContent = t)); }
      if (vis) raf = requestAnimationFrame(loop);
    };
    const move = (e: PointerEvent) => {
      const r = mon.getBoundingClientRect();
      tx = Math.min(0.9, Math.max(0.1, (e.clientX - r.left) / r.width));
      ty = Math.min(0.85, Math.max(0.12, (e.clientY - r.top) / r.height));
    };
    const leave = () => { tx = 0.62; ty = 0.4; };
    mon.addEventListener('pointermove', move);
    mon.addEventListener('pointerdown', move);
    mon.addEventListener('pointerleave', leave);
    const io = new IntersectionObserver(([e]) => { vis = e.isIntersecting; if (vis && !raf) raf = requestAnimationFrame(loop); });
    io.observe(root.current!);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      mon.removeEventListener('pointermove', move);
      mon.removeEventListener('pointerdown', move);
      mon.removeEventListener('pointerleave', leave);
    };
  }, [still]);

  const explore = (e: React.MouseEvent) => { e.preventDefault(); wipeTo('committees'); };

  return (
    <section ref={root} id="home" className="cold" data-phase={phase} data-onair={onAir || undefined} aria-labelledby="oa-h1">
      <div className="room">
        {/* PGM: the program monitor */}
        <div ref={pgm} className="mon mon--pgm" data-mon>
          <div className="mon-bar">
            <span className="mon-tag mon-tag--pgm">PGM</span>
            <span className="mon-src">CAM 1 · Stage</span>
            <span className="mon-tc"><span className="k">TC</span> <span data-k="tc">00:00:00:00</span></span>
          </div>
          <div className="pgm-view">
            <span className="pgm-photo"><img className="pgm-photo-in" src={heroPhoto.src} width={heroPhoto.width} height={heroPhoto.height} alt={heroPhoto.alt} fetchPriority="high" /></span>
            <span className="pgm-safe" aria-hidden="true" />
            <span className="pgm-frame" aria-hidden="true">
              <i /><i /><i /><i />
              <span className="pgm-frame-r">X <b data-k="x">0.620</b> · Y <b data-k="y">0.400</b></span>
            </span>

            <div className="lt">
              <p className="lt-row lt-tag"><span className="lt-dot" aria-hidden="true" />{conference.city} · {conference.year}</p>
              <h1 id="oa-h1" className="lt-row lt-h1"><span>DXB MUN</span> <span className="lt-yr">{conference.year}</span></h1>
              <p className="lt-row lt-strap">{conference.kind} · Hosted by {conference.host}</p>
              <p className="lt-row lt-meta"><span className="k">Dates</span> {tba(conference.dates)} <span className="k">Venue</span> {tba(conference.venue)}</p>
            </div>
          </div>
        </div>

        {/* PVW 1: tracking readout */}
        <a className="mon mon--trk" data-mon href="#about" onClick={(e) => { e.preventDefault(); wipeTo('about'); }} aria-label={`Tracking: ${conference.city}. Go to About.`}>
          <div className="mon-bar"><span className="mon-tag">PVW 1</span><span className="mon-src">Tracking</span></div>
          <div className="trk-mini" aria-hidden="true">
            <svg viewBox="0 0 100 100" className="radar">
              <circle cx="50" cy="50" r="46" /><circle cx="50" cy="50" r="30" /><circle cx="50" cy="50" r="14" />
              <path d="M50 2V98M2 50H98" />
              <g className="radar-sweep"><path d="M50 50L50 4A46 46 0 0 1 82.5 17.5Z" /></g>
              <circle className="radar-pip" cx="61" cy="40" r="2.6" />
            </svg>
            <dl className="trk-read">
              <div><dt>Target</dt><dd className="acc">{conference.city}</dd></div>
              <div><dt>Lat</dt><dd>{formatLat(DUBAI.lat)}</dd></div>
              <div><dt>Lon</dt><dd>{formatLon(DUBAI.lon)}</dd></div>
              <div><dt>Local</dt><dd><DubaiClock label={false} /></dd></div>
            </dl>
          </div>
        </a>

        {/* PVW 2: data readout */}
        <div className="mon mon--data" data-mon>
          <div className="mon-bar"><span className="mon-tag">PVW 2</span><span className="mon-src">Data</span></div>
          <dl className="data-read">
            {[stats[0], stats[1], stats[2]].map((s, i) => (
              <div key={s.label}>
                <dd><NumberTicker value={s.value} start={onAir} delay={0.25 + i * 0.12} still={still} /></dd>
                <dt>{s.label}</dt>
              </div>
            ))}
          </dl>
          <p className="data-tba"><span className="k">Dates</span> <span className="tba"><i aria-hidden="true" />{tba(conference.dates)}</span></p>
        </div>

        {/* AUX: the one main action */}
        <div className="mon mon--aux" data-mon>
          <div className="mon-bar"><span className="mon-tag">AUX</span><span className="mon-src">Delegates</span></div>
          <div className="aux-body">
            <Magnetic strength={0.25} range={110} disabled={still} className="aux-mag">
              <Button size="xl" className="aux-cta" render={<a href={register} />}>Register</Button>
            </Magnetic>
            <Button size="lg" variant="outline" className="aux-sec" render={<a href={signIn} />}>Sign in</Button>
            <a className="aux-link" href="#committees" onClick={explore}>Explore {committees.length} committees <ArrowRight aria-hidden="true" /></a>
          </div>
        </div>
      </div>

      <Marquee className="ticker [--duration:70s] [--gap:0px] p-0" pauseOnHover repeat={2} role="region" aria-label="Conference ticker">
        {tickerItems.map((t, i) => (
          <span key={i} className="ticker-item"><i aria-hidden="true" />{t}</span>
        ))}
      </Marquee>

      {phase !== 'live' && (
        <div className="slate0" role="presentation" onClick={goLive}>
          <span className="slate0-col" /><span className="slate0-col" /><span className="slate0-col" /><span className="slate0-col" />
          <div className="slate0-core">
            <p className="slate0-k slate0-k--tl"><span>Programme</span>{conference.edition}</p>
            <p className="slate0-k slate0-k--tr"><span>Source</span>{conference.host} · {conference.city}</p>
            <p className="slate0-k slate0-k--bl"><span>Date</span>{tba(conference.dates)}</p>
            <p className="slate0-k slate0-k--br"><span>TC</span><b data-k="tc">00:00:00:00</b></p>
            <div className="slate0-ring" aria-hidden="true">
              <svg viewBox="0 0 200 200">
                <circle className="ring-bg" cx="100" cy="100" r="92" />
                <circle className="ring-fg" cx="100" cy="100" r="92" />
                {Array.from({ length: 60 }, (_, i) => (
                  <line key={i} x1="100" y1="4" x2="100" y2={i % 5 ? 10 : 16} transform={`rotate(${i * 6} 100 100)`} />
                ))}
              </svg>
              <span className="slate0-n"><NumberFlow value={Math.max(0, count)} /></span>
            </div>
            <p className="slate0-status"><span className="slate0-lamp" aria-hidden="true" />Standby</p>
            <button type="button" className="slate0-skip" onClick={goLive}>Skip to programme</button>
          </div>
        </div>
      )}
    </section>
  );
}
