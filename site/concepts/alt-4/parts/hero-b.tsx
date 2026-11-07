// NAME: Low sun
// IDEA: The cursor is the Dubai sun: every letter of DXB MUN 2027 casts a hard, real-time shadow that fans out and swings as you move (idle, the sun crosses the sky by itself); on entry the floor lights come on bank by bank.
// WHY: Direct manipulation with an instant, physical cause-and-effect (move a little, the whole wordmark answers) invites play and dwell time; the letters never move, so the headline stays readable the whole time.
// WILD: Put the real sun there: compute the sun's azimuth and altitude over Dubai for the visitor's clock, so at 4 pm the shadows are long and point east, and at night the floor is dark.
import { useEffect, useRef } from 'react';
import { conference, tba } from '@/data/conference';
import { isStill } from '@/shared/hooks';
import { register } from '../links';
import { emit } from '../bus';
import './hero-b.css';

/* ------------------------------------------------------------------ glyph outlines */
type Pt = { x: number; y: number };
// Marching squares, oriented (inside on the right), on a 1 css-px grid; loops chained, then simplified.
// Corner bits: tl 8, tr 4, br 2, bl 1. Edge midpoints: T, R, B, L.
const E = { T: [0.5, 0], R: [1, 0.5], B: [0.5, 1], L: [0, 0.5] } as const;
type Ek = keyof typeof E;
const CASES: Record<number, [Ek, Ek][]> = {
  1: [['L', 'B']], 2: [['B', 'R']], 3: [['L', 'R']], 4: [['R', 'T']], 5: [['L', 'B'], ['R', 'T']], 6: [['B', 'T']],
  7: [['L', 'T']], 8: [['T', 'L']], 9: [['T', 'B']], 10: [['T', 'L'], ['B', 'R']], 11: [['T', 'R']], 12: [['R', 'L']],
  13: [['R', 'B']], 14: [['B', 'L']],
};
function traceLoops(alpha: (x: number, y: number) => boolean, w: number, h: number): Pt[][] {
  const next = new Map<number, number>();
  const pts: Pt[] = [];
  const key = (x: number, y: number) => Math.round(x * 2) * 100003 + Math.round(y * 2);
  const index = new Map<number, number>();
  const id = (x: number, y: number) => { const k = key(x, y); let i = index.get(k); if (i === undefined) { i = pts.length; pts.push({ x, y }); index.set(k, i); } return i; };
  for (let y = -1; y < h; y++) for (let x = -1; x < w; x++) {
    const c = (alpha(x, y) ? 8 : 0) | (alpha(x + 1, y) ? 4 : 0) | (alpha(x + 1, y + 1) ? 2 : 0) | (alpha(x, y + 1) ? 1 : 0);
    const segs = CASES[c];
    if (!segs) continue;
    for (const [a, b] of segs) next.set(id(x + E[a][0], y + E[a][1]), id(x + E[b][0], y + E[b][1]));
  }
  const loops: Pt[][] = [];
  const used = new Set<number>();
  for (const start of next.keys()) {
    if (used.has(start)) continue;
    const loop: Pt[] = [];
    let i: number | undefined = start;
    while (i !== undefined && !used.has(i)) { used.add(i); loop.push(pts[i]); i = next.get(i); }
    if (loop.length > 3) loops.push(simplify(loop, 0.6));
  }
  return loops;
}
function simplify(loop: Pt[], eps: number): Pt[] {
  // Douglas–Peucker on a closed loop: split at the point farthest from the first.
  const dp = (p: Pt[]): Pt[] => {
    if (p.length < 3) return p;
    const a = p[0], b = p[p.length - 1];
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    let far = 0, fi = 0;
    for (let i = 1; i < p.length - 1; i++) {
      const d = Math.abs((p[i].x - a.x) * dy - (p[i].y - a.y) * dx) / len;
      if (d > far) { far = d; fi = i; }
    }
    if (far <= eps) return [a, b];
    const l = dp(p.slice(0, fi + 1)), r = dp(p.slice(fi));
    return [...l.slice(0, -1), ...r];
  };
  let fi = 0, fd = 0;
  for (let i = 1; i < loop.length; i++) { const d = Math.hypot(loop[i].x - loop[0].x, loop[i].y - loop[0].y); if (d > fd) { fd = d; fi = i; } }
  const a = dp(loop.slice(0, fi + 1)), b = dp([...loop.slice(fi), loop[0]]);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

/* ------------------------------------------------------------------ layout */
type Glyph = { ch: string; x: number; y: number; cx: number; cy: number; loops: Pt[][]; cap: HTMLCanvasElement; capX: number; capY: number };
type Layout = { W: number; H: number; dpr: number; fs: number; lines: { text: string; y: number }[]; x0: number; glyphs: Glyph[]; banks: number; cx: number; cy: number };

const FONT = '"Archivo Variable", "Archivo", system-ui, sans-serif';
type Ctx2 = CanvasRenderingContext2D & { fontStretch?: string };
const C = { ground: '#03060C', surface: '#08111E', floor: '#16243A', ink: '#F2F5F9', sun: '#E5591C' };

function makeLayout(W: number, H: number, dpr: number, infoTop: number): Layout {
  const gut = Math.max(16, Math.min(56, W * 0.04));
  const lines = W / H >= 0.9 ? ['DXB MUN', '2027'] : ['DXB', 'MUN', '2027'];
  const m = document.createElement('canvas').getContext('2d') as Ctx2;
  const font = (fs: number) => { m.font = `800 ${fs}px ${FONT}`; m.fontStretch = 'semi-expanded'; };
  font(100);
  const widest = Math.max(...lines.map((l) => m.measureText(l).width));
  const top = 64 + 64, bottom = infoTop - 28;
  const adv = 0.86, cap = 0.73;
  const byW = ((W - 2 * gut) / widest) * 100;
  const byH = (bottom - top) / ((lines.length - 1) * adv + cap);
  const fs = Math.max(48, Math.floor(Math.min(byW, byH)));
  const blockH = fs * ((lines.length - 1) * adv + cap);
  const y0 = top + Math.max(0, (bottom - top - blockH) / 2) + fs * cap;
  font(fs);
  const glyphs: Glyph[] = [];
  const ls = lines.map((text, li) => ({ text, y: Math.round(y0 + li * fs * adv) }));
  for (const l of ls) {
    for (let i = 0; i < l.text.length; i++) {
      const ch = l.text[i];
      if (ch === ' ') continue;
      const x = gut + m.measureText(l.text.slice(0, i)).width;
      const mt = m.measureText(ch);
      const bx = Math.floor(x - mt.actualBoundingBoxLeft) - 2, by = Math.floor(l.y - mt.actualBoundingBoxAscent) - 2;
      const bw = Math.ceil(mt.actualBoundingBoxLeft + mt.actualBoundingBoxRight) + 5, bh = Math.ceil(mt.actualBoundingBoxAscent + mt.actualBoundingBoxDescent) + 5;
      // Trace the glyph's outline once (1 css px grid) for the shadow sweep.
      const t = document.createElement('canvas'); t.width = bw; t.height = bh;
      const tg = t.getContext('2d', { willReadFrequently: true }) as Ctx2;
      tg.font = `800 ${fs}px ${FONT}`; tg.fontStretch = 'semi-expanded'; tg.fillStyle = '#000';
      tg.fillText(ch, x - bx, l.y - by);
      const a = tg.getImageData(0, 0, bw, bh).data;
      const inside = (px: number, py: number) => px >= 0 && py >= 0 && px < bw && py < bh && a[(py * bw + px) * 4 + 3] >= 128;
      const loops = traceLoops(inside, bw, bh).map((lp) => lp.map((p) => ({ x: p.x + bx, y: p.y + by })));
      // The shadow's end cap: the glyph itself in shadow colour, at device resolution.
      const cap = document.createElement('canvas'); cap.width = Math.ceil(bw * dpr); cap.height = Math.ceil(bh * dpr);
      const cg = cap.getContext('2d') as Ctx2;
      cg.scale(dpr, dpr); cg.font = `800 ${fs}px ${FONT}`; cg.fontStretch = 'semi-expanded'; cg.fillStyle = C.ground;
      cg.fillText(ch, x - bx, l.y - by);
      glyphs.push({ ch, x, y: l.y, cx: bx + bw / 2, cy: by + bh / 2, loops, cap, capX: bx, capY: by });
    }
  }
  const cx = glyphs.reduce((s, g) => s + g.cx, 0) / glyphs.length, cy = glyphs.reduce((s, g) => s + g.cy, 0) / glyphs.length;
  return { W, H, dpr, fs, lines: ls, x0: gut, glyphs, banks: W < 640 ? 4 : 8, cx, cy };
}

/* ------------------------------------------------------------------ drawing */
// Bank b strikes on, flickers once, and stays on (hard cuts, like a hall's lamps).
const bankOn = (b: number, t: number) => { const s = 80 + b * 85; return t >= s + 95 || (t >= s && t < s + 40); };
const LIGHT_H = 0.54; // shadow length per px of distance from the light (a light ~3x higher than the letters)

function draw(g: Ctx2, L: Layout, t: number, lx: number, ly: number, sun: boolean) {
  const { W, H, dpr } = L;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = C.ground; g.fillRect(0, 0, W, H);
  const bw = W / L.banks;
  const lit: boolean[] = [];
  for (let b = 0; b < L.banks; b++) {
    lit[b] = bankOn(b, t);
    if (lit[b]) { g.fillStyle = C.floor; g.fillRect(Math.floor(b * bw), 0, Math.ceil(bw) + 1, H); }
  }
  const anyLit = lit.some(Boolean);
  // Shadows: each glyph swept away from the light (Minkowski sum of its outline and the shadow vector).
  if (anyLit) {
    const maxLen = Math.max(W, H) * 0.75;
    g.fillStyle = C.ground;
    for (const gl of L.glyphs) {
      let dx = gl.cx - lx, dy = gl.cy - ly;
      const d = Math.max(1, Math.hypot(dx, dy));
      const len = Math.min(maxLen, Math.max(6, d * LIGHT_H));
      dx = (dx / d) * len; dy = (dy / d) * len;
      g.beginPath();
      for (const lp of gl.loops) {
        for (let i = 0; i < lp.length; i++) {
          let p = lp[i], q = lp[(i + 1) % lp.length];
          if ((q.x - p.x) * dy - (q.y - p.y) * dx < 0) { const s = p; p = q; q = s; }
          g.moveTo(p.x, p.y); g.lineTo(q.x, q.y); g.lineTo(q.x + dx, q.y + dy); g.lineTo(p.x + dx, p.y + dy); g.closePath();
        }
      }
      g.fill('nonzero');
      g.drawImage(gl.cap, gl.capX + dx, gl.capY + dy, gl.cap.width / dpr, gl.cap.height / dpr);
    }
  }
  // Letters: ink where the bank is lit, near-black where it is still dark.
  g.font = `800 ${L.fs}px ${FONT}`; g.fontStretch = 'semi-expanded';
  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  const allLit = lit.every(Boolean);
  const letters = (col: string) => { g.fillStyle = col; for (const l of L.lines) g.fillText(l.text, L.x0, l.y); };
  if (allLit) letters(C.ink);
  else for (let b = 0; b < L.banks; b++) {
    g.save(); g.beginPath(); g.rect(Math.floor(b * bw), 0, Math.ceil(bw) + 1, H); g.clip();
    letters(lit[b] ? C.ink : C.surface);
    g.restore();
  }
  // The sun: a hard orange disc.
  if (sun && anyLit) {
    g.fillStyle = C.sun; g.beginPath(); g.arc(lx, ly, W < 640 ? 7 : 9, 0, Math.PI * 2); g.fill();
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  return lit.filter(Boolean).length / L.banks;
}

/* ------------------------------------------------------------------ component */
type HoldWin = Window & { __OH_HOLD?: boolean; __ohLight?: (x: number, y: number) => void; __ohSeek?: (ms: number) => void };

export function HeroB({ revealed }: { revealed: boolean }) {
  const sec = useRef<HTMLElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const info = useRef<HTMLDivElement>(null);
  const read = useRef<HTMLSpanElement>(null);
  const api = useRef<{ reveal: () => void } | null>(null);

  useEffect(() => {
    const section = sec.current!, canvas = cv.current!;
    // alpha: true keeps text greyscale-antialiased (an opaque canvas would use coloured subpixel fringes).
    const g = canvas.getContext('2d') as Ctx2 | null;
    if (!g) { section.classList.add('herob--flat'); return; }
    const still = isStill();
    const w = window as HoldWin;
    const hold = !!w.__OH_HOLD;
    let L: Layout | null = null;
    let t0 = -1; // reveal start (performance.now), -1 = dark
    let seekT = -1;
    const light = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, init: false };
    let lastPointer = -1e9, raf = 0, last = 0, visible = true, cancelled = false;
    let readText = '';

    const relayout = () => {
      const r = section.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const W = Math.round(r.width), H = Math.round(r.height);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      const it = info.current ? info.current.getBoundingClientRect().top - r.top : H * 0.75;
      L = makeLayout(W, H, dpr, it);
      if (!light.init) { light.x = light.tx = W * 0.18; light.y = light.ty = H * 0.2; light.init = true; }
    };
    const sweep = (now: number) => {
      if (!L) return;
      const th = Math.PI * (0.5 + 0.5 * Math.sin(now / 5200));
      light.tx = L.W * (0.5 - 0.47 * Math.cos(th));
      light.ty = L.H * (0.17 + 0.12 * (1 - Math.sin(th)));
    };
    const paint = (t: number) => {
      if (!L) return;
      const frac = draw(g, L, t, light.x, light.y, !still);
      section.style.setProperty('--herob-lit', String(frac));
      // The instrument line: where the light is, seen from the wordmark.
      const dx = light.x - L.cx, dy = light.y - L.cy;
      const az = Math.round(((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360);
      const alt = Math.round((Math.atan2(L.H * 0.7, Math.hypot(dx, dy)) * 180) / Math.PI);
      const s = `Light · az ${String(az).padStart(3, '0')}° · alt ${String(alt).padStart(2, '0')}°`;
      if (s !== readText && read.current) { read.current.textContent = s; readText = s; }
    };
    const elapsed = (now: number) => (seekT >= 0 ? seekT : t0 < 0 ? -1 : now - t0);
    const loop = (now: number) => {
      if (cancelled) return;
      raf = requestAnimationFrame(loop);
      if (!visible || !L) return;
      const dt = Math.min(1 / 30, last ? (now - last) / 1000 : 1 / 60);
      last = now;
      if (now - lastPointer > 3000) sweep(now);
      const k = 60, c = 13;
      light.vx += (k * (light.tx - light.x) - c * light.vx) * dt; light.vy += (k * (light.ty - light.y) - c * light.vy) * dt;
      light.x += light.vx * dt; light.y += light.vy * dt;
      paint(elapsed(now));
    };
    const onMove = (e: PointerEvent) => {
      const r = section.getBoundingClientRect();
      if (e.clientY < r.top || e.clientY > r.bottom) return;
      light.tx = e.clientX - r.left; light.ty = e.clientY - r.top; lastPointer = performance.now();
    };

    relayout();
    api.current = { reveal: () => { if (t0 < 0) t0 = performance.now(); } };
    const ro = new ResizeObserver(() => { relayout(); if (still || hold) paint(still ? 1e6 : seekT); });
    ro.observe(section);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 });
    io.observe(section);
    void document.fonts.load(`800 100px ${FONT}`).then(() => {
      if (cancelled) return;
      relayout();
      if (still) paint(1e6);
      else if (hold) paint(seekT);
    });
    if (still) {
      paint(1e6);
    } else if (hold) {
      w.__ohSeek = (ms: number) => { seekT = ms; paint(ms); };
      w.__ohLight = (x: number, y: number) => { light.x = light.tx = x; light.y = light.ty = y; paint(seekT); };
      paint(-1);
    } else {
      window.addEventListener('pointermove', onMove, { passive: true });
      window.addEventListener('pointerdown', onMove, { passive: true });
      raf = requestAnimationFrame(loop);
    }
    return () => {
      cancelled = true; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerdown', onMove);
      api.current = null;
    };
  }, []);

  useEffect(() => { if (revealed) api.current?.reveal(); }, [revealed]);

  return (
    <section id="home" ref={sec} className={`herob${isStill() ? ' herob--still' : ''}`} aria-label="DXB MUN 2027">
      <canvas ref={cv} className="herob-cv" aria-hidden="true" />
      <div className="herob-top herob-lit">
        <span className="herob-m">{conference.city} <i>·</i> 25.20° N 55.27° E</span>
        <span className="herob-m herob-read" ref={read} aria-hidden="true">Light · az 000° · alt 00°</span>
      </div>
      <h1 className="herob-h1">{conference.edition}</h1>
      <div className="herob-info herob-lit" ref={info}>
        <div className="herob-say">
          <p className="herob-motto">{conference.motto}.</p>
          <p className="herob-m herob-host"><b aria-hidden="true" />Hosted by {conference.host}</p>
        </div>
        <dl className="herob-facts">
          <div><dt className="herob-m">Dates</dt><dd>{tba(conference.dates)}</dd></div>
          <div><dt className="herob-m">Venue</dt><dd>{tba(conference.venue)}</dd></div>
        </dl>
        <div className="herob-cta">
          <a className="herob-reg" href={register} onClick={() => emit('tap')}>Register</a>
          <a className="herob-link" href="#committees">Committees <span aria-hidden="true">↓</span></a>
        </div>
      </div>
    </section>
  );
}
