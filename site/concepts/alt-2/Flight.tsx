import { useEffect, useLayoutEffect, useRef } from 'react';
import { conference, stats, tba } from '@/data/conference';
import { DUBAI, HERO_VIEW, drawGlobe, easeInOut, fitCanvas, lerp, project, seg, setHeroPose, type Pose } from './globe';
import { EASE, NAV_H, T_BIG, T_UI, gsap, ScrollTrigger } from './motion';
import { FitWord } from './FitWord';

/*
  1 · Hero and 2 · the flight to Dubai (BLUEPRINT 3.1–3.2), one pinned stage.
  Hero: the wireframe globe centred on registration crosshairs, mono labels at the crosshair ends (Igloo),
  "DXB MUN" edge to edge under it (Outfit), a 5 px maroon rule and a 4-column caption row.
  Scrolling: the wordmark block slides away under its mask, the globe turns to Dubai and the camera dives in,
  then mono call-outs with hairline leaders lock onto the city (Terminal). Lines stay on top the whole way.
*/
const INK = '#111112', CREAM = '#EDE4DD';
const fmt = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(2)}° ${v >= 0 ? pos : neg}`;

type Mode = 'scrub' | 'hero' | 'landed';

function Stage({ mode, revealed }: { mode: Mode; revealed: boolean }) {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const foot = useRef<HTMLDivElement>(null);
  const callouts = useRef<HTMLDivElement>(null);
  const zoom = useRef<HTMLSpanElement>(null);
  const centre = useRef<HTMLSpanElement>(null);

  // draw + layout loop
  useEffect(() => {
    const st = stage.current!, cv = canvas.current!, ft = foot.current!;
    let prog = mode === 'landed' ? 1 : 0;
    let drift = 0;
    let lastOn = false;

    const poseAt = (p: number): Pose => {
      const w = st.clientWidth, h = st.clientHeight;
      const footTop = mode === 'landed' ? h : ft.offsetTop;
      const avail = footTop - NAV_H;
      const r0 = Math.min(w * 0.42, avail * 0.44);
      const cy0 = NAV_H + avail / 2;
      const a = easeInOut(seg(p, 0, 0.28));
      const rot = easeInOut(seg(p, 0.08, 0.7));
      const z = easeInOut(seg(p, 0.22, 0.95));
      const r1 = Math.min(w, h - NAV_H) * 0.4;
      return {
        cx: w / 2,
        cy: lerp(cy0, NAV_H + (h - NAV_H) / 2, a),
        r: lerp(r0, r1, a) * Math.pow(16, z),
        lon: lerp(HERO_VIEW.lon + drift, DUBAI.lon, rot),
        lat: lerp(HERO_VIEW.lat, DUBAI.lat, rot),
      };
    };

    const render = () => {
      const { ctx, w, h } = fitCanvas(cv);
      const pose = poseAt(prog);
      drawGlobe(ctx, w, h, pose, { ink: INK, ground: CREAM }, 1);
      st.style.setProperty('--cx', pose.cx + 'px');
      st.style.setProperty('--cy', pose.cy + 'px');
      if (mode !== 'landed') {
        const footTop = ft.offsetTop;
        st.style.setProperty('--fy', footTop + 'px');
        if (mode === 'scrub' || mode === 'hero') {
          const a = easeInOut(seg(prog, 0, 0.28));
          ft.style.transform = a > 0 ? `translate3d(0, ${(a * (ft.offsetHeight + 24)).toFixed(1)}px, 0)` : '';
          st.style.setProperty('--foot-a', String(a));
        }
        if (prog === 0 && mode !== 'scrub') setHeroPose(poseAt(0), footTop);
        if (mode === 'scrub' && prog === 0 && drift === 0) setHeroPose(pose, footTop);
      }
      // call-outs ride the Dubai reticle
      const [x, y, zz] = project(pose, DUBAI.lat, DUBAI.lon);
      const co = callouts.current;
      if (co) {
        co.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        const on = zz > 0 && prog > 0.6;
        if (on !== lastOn) { co.classList.toggle('on', on); lastOn = on; }
      }
      if (zoom.current) zoom.current.textContent = `×${(pose.r / poseAt(0).r).toFixed(1).padStart(4, '0')}`;
      if (centre.current) centre.current.textContent = prog > 0.04 ? `${fmt(pose.lat, 'N', 'S')} ${fmt(pose.lon, 'E', 'W')}` : `${conference.city} · 25.20° N 55.27° E`;
      st.classList.toggle('is-flying', prog > 0.04);
    };

    render();
    const ro = new ResizeObserver(render);
    ro.observe(st);
    document.fonts?.ready.then(render);

    if (mode !== 'scrub') return () => ro.disconnect();

    // scroll-scrubbed progress, smoothed a little behind the scroll
    const proxy = { p: 0 };
    const tween = gsap.to(proxy, {
      p: 1, ease: 'none',
      scrollTrigger: { trigger: st.parentElement!, start: 'top top', end: 'bottom bottom', scrub: 0.7 },
      onUpdate: () => { prog = proxy.p; render(); },
    });

    // a slow idle sway while the hero is at rest (paused off screen and in background tabs)
    let raf = 0, t0 = 0;
    const idle = (t: number) => {
      raf = requestAnimationFrame(idle);
      if (!document.body.classList.contains('is-revealed') || prog > 0.001 || document.hidden) { t0 = t; return; }
      if (!t0) t0 = t;
      drift = 10 * Math.sin(((t - t0) / 1000) * 0.18);
      render();
    };
    raf = requestAnimationFrame(idle);
    return () => { ro.disconnect(); tween.scrollTrigger?.kill(); tween.kill(); cancelAnimationFrame(raf); };
  }, [mode]);

  // hero intro: wordmark letters rise from the mask line, the rule draws, the caption row slices in
  useLayoutEffect(() => {
    if (mode !== 'scrub' || !revealed) return;
    const q = gsap.utils.selector(stage.current);
    const tl = gsap.timeline({ delay: 0.25 });
    tl.fromTo(q('.hero-word .ch'), { yPercent: 104 }, { yPercent: 0, duration: T_BIG, ease: EASE, stagger: 0.045 }, 0)
      .fromTo(q('.hero-rule'), { scaleX: 0 }, { scaleX: 1, duration: T_BIG, ease: EASE }, 0.2)
      .fromTo(q('.cap'), { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: T_UI, ease: EASE, stagger: 0.07, clearProps: 'clipPath' }, 0.45)
      .fromTo(q('.xl'), { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: T_UI, ease: EASE, stagger: 0.1, clearProps: 'clipPath' }, 0.5);
    return () => { tl.kill(); };
  }, [mode, revealed]);

  useEffect(() => { if (mode === 'scrub') ScrollTrigger.refresh(); }, [mode]);

  return (
    <div ref={stage} className={'stage stage--' + mode}>
      <canvas ref={canvas} className="globe" aria-hidden="true" />
      <i className="xh xh--h" aria-hidden="true" />
      <i className="xh xh--v" aria-hidden="true" />
      <span className="xl xl--l" aria-hidden="true"><span ref={centre}>25.20° N 55.27° E</span></span>
      <span className="xl xl--r" aria-hidden="true">
        <span className="xl-scroll">Scroll ↓</span>
        <span className="xl-zoom">Zoom <span ref={zoom}>×01.0</span></span>
      </span>

      <div ref={callouts} className={'callouts' + (mode === 'landed' ? ' on' : '')} aria-hidden={mode === 'scrub' ? true : undefined}>
        <span className="co co--a"><i /><b>{conference.city} · 25.20° N 55.27° E</b></span>
        <span className="co co--b"><i /><b>Host · {conference.host}</b></span>
        <span className="co co--c"><i /><b>{stats[0].value} committees · {stats[1].value} days</b></span>
      </div>

      {mode !== 'landed' && (
        <div ref={foot} className="hero-foot">
          <h1 className="hero-word">
            <FitWord text={conference.name} label={`${conference.edition}: ${conference.kind} in ${conference.city}`} />
          </h1>
          <i className="hero-rule" aria-hidden="true" />
          <div className="caps">
            <p className="cap"><span className="k">Edition</span><span>{conference.edition} · {conference.kind}</span></p>
            <p className="cap cap--accent"><span className="k">Motto</span><span>{conference.motto}.</span></p>
            <p className="cap"><span className="k">Host</span><span>{conference.host}, {conference.city}</span></p>
            <p className="cap cap--r"><span className="k">Dates</span><span>{tba(conference.dates)}</span></p>
          </div>
        </div>
      )}
      {mode === 'landed' && (
        <p className="landed-k"><span className="k">Landed</span> {conference.city} · hosted by {conference.host}</p>
      )}
    </div>
  );
}

export function Flight({ still, revealed }: { still: boolean; revealed: boolean }) {
  if (still) {
    return (
      <section id="home" className="flight flight--still" aria-label="DXB MUN 2027">
        <Stage mode="hero" revealed />
        <Stage mode="landed" revealed />
      </section>
    );
  }
  return (
    <section id="home" className="flight" aria-label="DXB MUN 2027">
      <Stage mode="scrub" revealed={revealed} />
    </section>
  );
}
