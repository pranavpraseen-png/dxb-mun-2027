// The one object that carries the first two screens: a wireframe globe drawn in ink on paper (2D canvas, DPR ≤ 2).
// Live mode: fixed behind the hero and the flight runway; scroll turns the globe to Dubai and dives in (scrubbed),
// with mono call-outs on hairline leaders tracking the city (Terminal). It stops drawing once the runway is passed.
// Static mode (?still / reduced motion): the same drawing at a fixed progress, in normal flow.
import { useEffect, useRef } from 'react';
import { conference, tba } from '@/data/conference';
import { DUBAI, drawGlobe, fmtLat, fmtLon, lerp, project, seg, smooth, type Pose } from './geo';

/** Shared with the loader: the construction progress of the globe (0..1). */
export const stageState = { build: 1, loaderOn: false };

const MONO = '"Geist Mono Variable", ui-monospace, monospace';

type Slot = { cx: number; cy: number; r: number };

function poseAt(p: number, slot: Slot, w: number, h: number, t: number): Pose {
  const rot = smooth(seg(p, 0.04, 0.6));
  const zt = smooth(seg(p, 0.22, 0.9));
  const sway = 14 * Math.sin(t * 0.00016) * (1 - rot);
  const rMax = Math.max(w, h) * 3.4;
  return {
    lon: lerp(28 + sway, DUBAI.lon, rot),
    lat: lerp(16, DUBAI.lat, rot),
    cx: lerp(slot.cx, w / 2, rot),
    cy: lerp(slot.cy, h / 2, rot),
    r: slot.r * Math.pow(rMax / slot.r, zt),
  };
}

function sizeCanvas(c: HTMLCanvasElement, w: number, h: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const bw = Math.round(w * dpr), bh = Math.round(h * dpr);
  if (c.width !== bw || c.height !== bh) { c.width = bw; c.height = bh; }
  c.style.width = w + 'px';
  c.style.height = h + 'px';
  const ctx = c.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

function Callouts({ refs }: { refs: React.RefObject<(HTMLDivElement | null)[]> }) {
  const rows: [string, string, boolean?][] = [
    ['DUBAI', `${DUBAI.lat.toFixed(2)} N · ${DUBAI.lon.toFixed(2)} E`],
    ['HOST', conference.host.toUpperCase(), true],
    ['DATES', tba(conference.dates).toUpperCase()],
  ];
  return (
    <div className="callouts" aria-hidden="true">
      {rows.map(([k, v, host], i) => (
        <div key={k} className={'callout callout--' + i} ref={(el) => { refs.current[i] = el; }}>
          <svg className="callout-leader" width="1" height="1" overflow="visible"><line x1="0" y1="0" x2="0" y2="0" /></svg>
          <div className="callout-label">
            {host && <i className="callout-host" />}
            <b>{k}</b>
            <span>{v}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Leader offsets (dx, dy) per call-out, for desktop and phone. */
const LEADS: Record<'d' | 'm', [number, number][]> = {
  d: [[150, -120], [190, -40], [150, 60]],
  m: [[0, -236], [0, -196], [0, -156]], // phone: one stack at the left gutter; only the nearest label has a leader
};

export function Stage({ still }: { still: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const read = useRef<HTMLDivElement>(null);
  const calls = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const c = canvas.current!;
    let w = 0, h = 0, slot: Slot = { cx: 0, cy: 0, r: 100 }, end = 1;
    let ctx = c.getContext('2d')!;
    let raf = 0, running = false;

    const measure = () => {
      w = document.documentElement.clientWidth;
      h = window.innerHeight;
      ctx = sizeCanvas(c, w, still ? document.querySelector<HTMLElement>('.hero')?.offsetHeight ?? h : h);
      const s = document.querySelector<HTMLElement>('[data-globe-slot]');
      if (s) {
        const r = s.getBoundingClientRect();
        const top = still ? r.top - (document.querySelector<HTMLElement>('.hero')!.getBoundingClientRect().top) : r.top + window.scrollY;
        slot = { cx: r.left + r.width / 2, cy: top + r.height / 2, r: Math.max(60, Math.min(r.width, r.height) / 2 - 8) };
      }
      const f = document.getElementById('flight');
      end = f ? Math.max(1, f.offsetTop + f.offsetHeight - h) : h;
    };

    const frame = (t: number) => {
      const y = window.scrollY;
      const p = still ? 0 : Math.min(1, Math.max(0, y / end));
      const pose = poseAt(p, slot, w, still ? c.clientHeight : h, still ? 0 : t);
      drawGlobe(ctx, w, still ? c.clientHeight : h, pose, { build: stageState.build, mono: MONO, numbers: w >= 700 && pose.r < slot.r * 1.6 });
      if (still) return;

      // Call-outs track Dubai once the turn is under way; they reveal left to right on a clip (no fades).
      const [dx, dy, dz] = project(pose, DUBAI.lat, DUBAI.lon);
      const reveal = seg(p, 0.3, 0.46);
      const leads = LEADS[w < 700 ? 'm' : 'd'];
      calls.current.forEach((el, i) => {
        if (!el) return;
        const r = seg(reveal, i * 0.22, i * 0.22 + 0.56);
        const on = dz > 0.2 && r > 0;
        el.style.visibility = on ? 'visible' : 'hidden';
        if (!on) return;
        const phone = w < 700;
        const [lx0, ly] = leads[i];
        const lx = phone ? 16 - dx : lx0;
        // On phones the label sits at the left gutter and the leader meets its lower (or upper) edge.
        const ex = phone ? (i === 2 ? lx + 28 : 0) : lx;
        const ey = phone ? (i === 2 ? ly + 15 : 0) : ly;
        el.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
        const line = el.querySelector('line')!;
        line.setAttribute('x2', String(ex * r));
        line.setAttribute('y2', String(ey * r));
        const label = el.querySelector<HTMLElement>('.callout-label')!;
        label.style.transform = `translate3d(${lx}px, ${ly}px, 0)`;
        label.style.clipPath = `inset(0 ${(100 - seg(r, 0.4, 1) * 100).toFixed(1)}% 0 0)`;
      });
      if (read.current) {
        const on = p > 0.28;
        read.current.style.visibility = on ? 'visible' : 'hidden';
        if (on) read.current.textContent = `LAT ${fmtLat(pose.lat)}   LON ${fmtLon(pose.lon)}   ×${(pose.r / slot.r).toFixed(1).padStart(4, '0')}`;
      }
      wrap.current!.style.visibility = y > end + h * 0.25 ? 'hidden' : 'visible';
    };

    const loop = (t: number) => {
      frame(t);
      const active = stageState.loaderOn || window.scrollY < end + h * 0.25;
      if (active && !document.hidden) raf = requestAnimationFrame(loop);
      else running = false;
    };
    const kick = () => { if (!running && !still) { running = true; raf = requestAnimationFrame(loop); } };

    measure();
    if (still) frame(0); else kick();
    const onResize = () => { measure(); if (still) frame(0); else kick(); };
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', kick, { passive: true });
    document.addEventListener('visibilitychange', kick);
    document.fonts?.ready.then(onResize);
    // Layout settles after fonts and the fitted wordmark; measure again once.
    const t1 = setTimeout(onResize, 400);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', kick);
      document.removeEventListener('visibilitychange', kick);
    };
  }, [still]);

  return (
    <div ref={wrap} className={'stage' + (still ? ' stage--still' : '')} aria-hidden="true">
      <canvas ref={canvas} className="stage-canvas" />
      {!still && <Callouts refs={calls} />}
      {!still && <div ref={read} className="stage-read mono" />}
    </div>
  );
}

/** A static drawing of the landed state (still mode stands in for the flight runway with this). */
export function LandedGlobe() {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const draw = () => {
      const b = box.current!, c = canvas.current!;
      const w = b.clientWidth, h = b.clientHeight;
      const ctx = sizeCanvas(c, w, h);
      const r = Math.max(w, h) * 3.4;
      drawGlobe(ctx, w, h, { lon: DUBAI.lon, lat: DUBAI.lat, cx: w / 2, cy: h / 2, r }, { build: 1, mono: MONO, numbers: false });
    };
    draw();
    document.fonts?.ready.then(draw);
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, []);
  return (
    <div ref={box} className="landed" aria-hidden="true">
      <canvas ref={canvas} />
      <div className="landed-labels mono">
        <p><b>DUBAI</b> {DUBAI.lat.toFixed(2)} N · {DUBAI.lon.toFixed(2)} E</p>
        <p><i className="callout-host" /><b>HOST</b> {conference.host.toUpperCase()}</p>
        <p><b>DATES</b> {tba(conference.dates).toUpperCase()}</p>
      </div>
    </div>
  );
}
