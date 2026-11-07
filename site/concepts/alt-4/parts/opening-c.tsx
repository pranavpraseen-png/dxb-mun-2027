// NAME: The vote
// IDEA: A recorded vote fills three huge bars, FOR / AGAINST / ABSTAIN, with ticking counts (AGAINST leads for a moment); FOR wins, an orange ADOPTED stamp slams down with a gavel, and the impact cracks the whole screen into hard-edged shards that fall away into the page.
// WHY: A live count with a brief upset is suspense (people wait for the result), casting your own vote gives agency and the self-reference effect, and the stamp plus shatter is one physical, multisensory peak that literally breaks you into the site.
// WILD: Make it a real straw poll: each visitor's vote is stored, and the bars open with the running totals of everyone who has visited so far.
import { useEffect, useRef, useState, type MouseEvent as RMouseEvent } from 'react';
import { isStill } from '@/shared/hooks';
import { Sound, gavel, type Bus } from '../stage/audio';
import './opening-c.css';

/* ------------------------------------------------------------------ timeline (ms) */
const T0 = 260; // counting starts
const T1 = 2460; // voting closes
const T_STAMP = T1 + 230; // the stamp starts to fall
const T_HIT = T_STAMP + 110; // impact: gavel, kick, cracks
const T_FALL = T_HIT + 470; // the shards let go
const T_END = T_FALL + 1150;

const LABELS = ['For', 'Against', 'Abstain'] as const;
const BUTTONS = ['Vote for', 'Vote against', 'Abstain'] as const;
const FINAL = [141, 22, 30]; // the scripted recorded vote (193 in all); the visitor's own vote adds one
// How each column fills over u ∈ [0, 1]: FOR starts slow, AGAINST fast (it leads for a moment), ABSTAIN steady.
const EXP = [1.8, 0.5, 1];

/* ------------------------------------------------------------------ helpers */
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function rng(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// Arrival time of every scripted vote, per column (deterministic).
const ARRIVALS = FINAL.map((n, i) => {
  const r = rng(11 + i * 97);
  const out: number[] = [];
  for (let j = 0; j < n; j++) {
    const rank = (j + 0.15 + r() * 0.8) / n;
    out.push(T0 + (T1 - T0) * Math.pow(rank, 1 / EXP[i]));
  }
  return out.sort((a, b) => a - b);
});
const countAt = (i: number, t: number) => { const a = ARRIVALS[i]; let lo = 0, hi = a.length; while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] <= t) lo = m + 1; else hi = m; } return lo; };

type Pt = { x: number; y: number };
type Shard = { poly: Pt[]; c: Pt; bx: number; by: number; bw: number; bh: number; delay: number; vx: number; vy: number; w: number; f: number };
type Seg = { a: Pt; b: Pt; r: number; show: boolean };

type Scene = {
  W: number; H: number; dpr: number; gut: number; phone: boolean;
  titleSize: number; titleY: number; labelY: number;
  baseline: number; maxH: number; colX: number[]; colW: number;
  countSize: number; btnY: number;
  stamp: { x: number; y: number; rot: number; fs: number; w: number; h: number; stretch: string };
  shards: Shard[]; segs: Seg[]; diag: number;
};

const FONT_SANS = '"Archivo Variable", "Archivo", system-ui, sans-serif';
const FONT_MONO = '"JetBrains Mono Variable", ui-monospace, monospace';
type Ctx2 = CanvasRenderingContext2D & { letterSpacing?: string; fontStretch?: string };

function makeScene(W: number, H: number, dpr: number, g: Ctx2): Scene {
  const phone = W < 640;
  const gut = clamp(W * 0.04, 16, 56);
  const titleSize = clamp(Math.min(W * 0.05, H * 0.075), 30, 68);
  const labelY = 64 + 26;
  const titleY = labelY + 18 + titleSize * 0.95;
  const countSize = clamp(Math.min(W * 0.07, H * 0.09), 34, 104);
  const btnY = H - 64 - 16 - 48; // vote buttons sit above the bottom bar
  const baseline = btnY - 44; // column labels sit between the bars and the buttons
  const top = titleY + 26 + countSize * 1.05;
  const maxH = Math.max(80, baseline - top);
  const gap = phone ? 8 : 14;
  const colW = (W - 2 * gut - 2 * gap) / 3;
  const colX = [0, 1, 2].map((i) => gut + i * (colW + gap));

  // The stamp: fit ADOPTED to the width, then make sure the rotated box stays on screen.
  const rot = -0.2;
  const stretch = phone ? 'normal' : 'expanded';
  g.font = `900 100px ${FONT_SANS}`; g.fontStretch = stretch;
  const w100 = g.measureText('ADOPTED').width;
  let fs = (Math.min(W * (phone ? 0.74 : 0.7), 1080) / w100) * 100;
  const box = (f: number) => ({ w: (w100 * f) / 100 + f * 0.7, h: f * 1.5 });
  for (let i = 0; i < 20; i++) {
    const b = box(fs);
    const bw = b.w * Math.cos(-rot) + b.h * Math.sin(-rot);
    if (bw <= W - 2 * gut * 0.6) break;
    fs *= 0.95;
  }
  const sb = box(fs);
  const stamp = { x: W / 2, y: clamp((titleY + baseline) / 2 + 10, H * 0.38, H * 0.56), rot, fs, w: sb.w, h: sb.h, stretch };

  // Cracks: radial rays from the impact, crossed by jittered rings; shards are the cells between them.
  const r = rng(Math.round(W * 7 + H * 13));
  const diag = Math.hypot(W, H);
  const n = phone ? 10 : 13;
  const rays = Array.from({ length: n }, (_, i) => (i / n) * Math.PI * 2 + (r() - 0.5) * (Math.PI * 2 / n) * 0.7);
  const ringsBase = [0.08, 0.18, 0.32, 0.5, 0.74, 1.2];
  const P: Pt[][] = rays.map((a) => ringsBase.map((rb, k) => {
    const rr = rb * diag * (k === ringsBase.length - 1 ? 1 : 0.84 + r() * 0.32);
    return { x: stamp.x + Math.cos(a) * rr, y: stamp.y + Math.sin(a) * rr };
  }));
  const c0 = { x: stamp.x, y: stamp.y };
  const shards: Shard[] = [];
  const segs: Seg[] = [];
  const dist = (p: Pt) => Math.hypot(p.x - c0.x, p.y - c0.y);
  const addShard = (poly: Pt[]) => {
    const c = { x: poly.reduce((s, p) => s + p.x, 0) / poly.length, y: poly.reduce((s, p) => s + p.y, 0) / poly.length };
    const xs = poly.map((p) => p.x), ys = poly.map((p) => p.y);
    const bx = Math.floor(Math.max(0, Math.min(...xs))), by = Math.floor(Math.max(0, Math.min(...ys)));
    const bw = Math.ceil(Math.min(W, Math.max(...xs))) - bx, bh = Math.ceil(Math.min(H, Math.max(...ys))) - by;
    if (bw <= 0 || bh <= 0) return;
    const d = dist(c) / diag;
    shards.push({
      poly, c, bx, by, bw, bh,
      delay: 30 + d * 300 + r() * 60,
      vx: ((c.x - c0.x) / diag) * 0.55,
      vy: -0.06 + ((c.y - c0.y) / diag) * 0.25,
      w: (r() - 0.5) * 0.005,
      f: 0.6 + r() * 1.6,
    });
  };
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    addShard([c0, P[i][0], P[j][0]]);
    segs.push({ a: c0, b: P[i][0], r: dist(P[i][0]), show: true });
    for (let k = 0; k < ringsBase.length - 1; k++) {
      const q = [P[i][k], P[j][k], P[j][k + 1], P[i][k + 1]];
      if (k >= 2 && r() < 0.55) { addShard([q[0], q[1], q[2]]); addShard([q[0], q[2], q[3]]); segs.push({ a: q[0], b: q[2], r: Math.max(dist(q[0]), dist(q[2])), show: false }); }
      else addShard(q);
      // Before the fall only the radial cracks and a few ring cracks show (the rest open as the pieces part).
      segs.push({ a: P[i][k], b: P[i][k + 1], r: dist(P[i][k + 1]), show: true });
      segs.push({ a: P[i][k], b: P[j][k], r: Math.max(dist(P[i][k]), dist(P[j][k])), show: k === 1 || (k >= 2 && r() < 0.3) });
    }
  }
  return { W, H, dpr, gut, phone, titleSize, titleY, labelY, baseline, maxH, colX, colW, countSize, btnY, stamp, shards, segs, diag };
}

type State = { mine: number; mineAt: number };
const counts = (t: number, st: State) => [0, 1, 2].map((i) => countAt(i, t) + (st.mine === i && t >= st.mineAt ? 1 : 0));

/** The vote, the stamp and the cracks at time t (everything before the shards let go). */
function drawScene(g: Ctx2, s: Scene, t: number, st: State) {
  const { W, H, dpr } = s;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = '#03060C'; g.fillRect(0, 0, W, H);
  const dt = t - T_HIT;
  if (dt >= 0) { // the kick
    g.translate(3 * Math.exp(-dt / 80) * Math.sin(dt / 23), 16 * Math.exp(-dt / 100) * Math.cos(dt / 35));
  }
  // Labels and title.
  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  g.font = `600 11px ${FONT_MONO}`; g.letterSpacing = '1.1px';
  g.fillStyle = '#8C99AD';
  g.fillText(s.phone ? 'DRAFT RESOLUTION' : 'DRAFT RESOLUTION · DXB MUN 2027', s.gut, s.labelY);
  g.textAlign = 'right';
  const closed = t >= T1;
  g.fillStyle = closed ? '#F2F5F9' : '#8C99AD';
  const clock = `T+${(Math.max(0, t - T0) / 1000).toFixed(1)}S`;
  g.fillText(closed ? 'VOTING CLOSED' : s.phone ? clock : `RECORDED VOTE · ${clock}`, W - s.gut, s.labelY);
  g.textAlign = 'left'; g.letterSpacing = '0px';
  g.font = `700 ${s.titleSize}px ${FONT_SANS}`; g.fontStretch = 'semi-expanded';
  g.fillStyle = '#F2F5F9';
  g.fillText('The floor votes.', s.gut, s.titleY);
  g.fontStretch = 'normal';

  // Bars.
  const c = counts(t, st);
  const unit = s.maxH / 150;
  const fills = ['#F2F5F9', '#8C99AD', '#16243A'];
  g.fillStyle = '#16243A'; g.fillRect(s.gut, s.baseline, W - 2 * s.gut, 1);
  for (let i = 0; i < 3; i++) {
    const x = Math.round(s.colX[i]), w = Math.round(s.colW);
    const h = Math.round(c[i] * unit);
    const y = s.baseline - h;
    if (h > 0) {
      g.fillStyle = fills[i]; g.fillRect(x, y, w, h);
      if (i === 2) { g.fillStyle = '#8C99AD'; g.fillRect(x, y, w, 1); g.fillRect(x, y, 1, h); g.fillRect(x + w - 1, y, 1, h); }
      // A hairline every ten votes: the bar reads as counted, not drawn.
      g.fillStyle = '#03060C';
      for (let v = 10; v < c[i]; v += 10) g.fillRect(x + (i === 2 ? 1 : 0), Math.round(s.baseline - v * unit), w - (i === 2 ? 2 : 0), 1);
    }
    // Count riding on top of the bar.
    g.font = `800 ${s.countSize}px ${FONT_SANS}`; g.fontStretch = 'semi-condensed';
    g.fillStyle = '#F2F5F9';
    g.fillText(String(c[i]), x, y - Math.round(s.countSize * 0.14));
    g.fontStretch = 'normal';
    g.font = `600 ${s.phone ? 11 : 12}px ${FONT_MONO}`; g.letterSpacing = '1.2px';
    const mine = st.mine === i && t >= st.mineAt;
    g.fillStyle = (i === 0 && closed) || mine ? '#F2F5F9' : '#8C99AD';
    g.fillText(LABELS[i].toUpperCase() + (mine ? (s.phone ? ' +1' : ' · +1 YOU') : ''), x, s.baseline + 24);
    g.letterSpacing = '0px';
  }

  // The stamp.
  if (t >= T_STAMP) {
    const { stamp: sp } = s;
    let sc: number;
    if (t < T_HIT) { const q = (t - T_STAMP) / (T_HIT - T_STAMP); sc = 1.85 - 0.85 * q * q; }
    else sc = 1 - 0.022 * Math.exp(-dt / 60) * Math.cos(dt / 28);
    g.save();
    g.translate(sp.x, sp.y); g.rotate(sp.rot); g.scale(sc, sc);
    const lw = Math.max(4, sp.fs * 0.07);
    g.fillStyle = '#03060C'; g.fillRect(-sp.w / 2, -sp.h / 2, sp.w, sp.h);
    g.fillStyle = '#E5591C';
    const ring = (inset: number, th: number) => {
      const x = -sp.w / 2 + inset, y = -sp.h / 2 + inset, w = sp.w - inset * 2, h = sp.h - inset * 2;
      g.fillRect(x, y, w, th); g.fillRect(x, y + h - th, w, th); g.fillRect(x, y, th, h); g.fillRect(x + w - th, y, th, h);
    };
    ring(0, lw); ring(lw * 1.9, Math.max(1.5, lw * 0.3));
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `900 ${sp.fs}px ${FONT_SANS}`; g.fontStretch = sp.stretch as CanvasFontStretch;
    g.fillText('ADOPTED', 0, sp.fs * 0.06);
    g.fontStretch = 'normal';
    const small = clamp(sp.fs * 0.13, 9, 15);
    g.font = `700 ${small}px ${FONT_MONO}`; g.letterSpacing = `${small * 0.14}px`;
    const fin = counts(T1, st);
    g.fillText('DXB MUN 2027', 0, -sp.h / 2 + lw * 2.2 + small);
    g.fillText(`${fin[0]} FOR · ${fin[1]} AGAINST · ${fin[2]} ABSTAIN`, 0, sp.h / 2 - lw * 2.2 - small);
    g.letterSpacing = '0px';
    g.restore();
  }

  // The cracks race out from the impact in 150 ms.
  if (dt >= 0) {
    const R = (dt / 150) * s.diag;
    const draw = (wid: number, col: string) => {
      g.strokeStyle = col; g.lineWidth = wid; g.lineJoin = 'miter'; g.beginPath();
      for (const sg of s.segs) {
        if (!sg.show) continue;
        if (sg.r > R) {
          const da = Math.hypot(sg.a.x - s.stamp.x, sg.a.y - s.stamp.y);
          if (da >= R) continue;
          const f = (R - da) / Math.max(1, sg.r - da);
          g.moveTo(sg.a.x, sg.a.y); g.lineTo(sg.a.x + (sg.b.x - sg.a.x) * f, sg.a.y + (sg.b.y - sg.a.y) * f);
        } else { g.moveTo(sg.a.x, sg.a.y); g.lineTo(sg.b.x, sg.b.y); }
      }
      g.stroke();
    };
    draw(3, '#03060C'); draw(1, '#F2F5F9');
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
}

/** The shards falling away (t ≥ T_FALL). Returns false once every shard is off screen. */
function drawShards(g: Ctx2, s: Scene, snap: HTMLCanvasElement, t: number) {
  const { dpr, W, H } = s;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, W * dpr, H * dpr);
  const grav = 0.0046 * Math.max(0.8, H / 900);
  let any = false;
  for (const sh of s.shards) {
    const tau = Math.max(0, t - T_FALL - sh.delay);
    const ox = sh.vx * tau, oy = sh.vy * tau + 0.5 * grav * tau * tau;
    if (sh.by + oy - sh.bh > H + 40 && tau > 0) continue;
    any = true;
    // Each piece tumbles a little (never past edge-on, so no mirrored text) and shows a solid edge: a slab, not a cut-out.
    const th = sh.w * tau, flip = Math.cos(Math.min(1.25, tau * 0.003 * sh.f));
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.translate(sh.c.x + ox, sh.c.y + oy); g.rotate(th); g.scale(flip, 1); g.translate(-sh.c.x, -sh.c.y);
    const path = () => { g.beginPath(); sh.poly.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.closePath(); };
    // Outer pieces reach past the screen; only the part that was on screen exists.
    g.save(); g.beginPath(); g.rect(0, 0, W, H); g.clip();
    if (tau > 0) {
      const e = Math.min(6, tau * 0.04);
      g.save(); g.translate(0, e); path(); g.fillStyle = '#16243A'; g.fill(); g.restore();
    }
    path();
    g.save(); g.clip();
    g.drawImage(snap, sh.bx * dpr, sh.by * dpr, sh.bw * dpr, sh.bh * dpr, sh.bx, sh.by, sh.bw, sh.bh);
    g.restore();
    if (tau > 0) { g.strokeStyle = '#8C99AD'; g.lineWidth = 1; g.stroke(); }
    g.restore();
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  return any;
}

/* ------------------------------------------------------------------ sound */
function tick(b: Bus, t: number, size: number) {
  const { ctx } = b;
  const o = ctx.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(1500 + Math.random() * 300, t);
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2200; f.Q.value = 2;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.07 * size, t + 0.001);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.018);
  o.connect(f); f.connect(g); g.connect(b.dry); o.start(t); o.stop(t + 0.03);
}
function crack(b: Bus, t: number) {
  const { ctx } = b;
  for (let i = 0; i < 7; i++) {
    const at = t + 0.004 + i * (0.012 + Math.random() * 0.018);
    const src = ctx.createBufferSource(); src.buffer = b.noise;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 3500 + Math.random() * 3000;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(0.32 - i * 0.03, at + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.05 + Math.random() * 0.05);
    src.connect(f); f.connect(g); g.connect(b.dry);
    const s2 = ctx.createGain(); s2.gain.value = 0.35; g.connect(s2); s2.connect(b.wet);
    src.start(at, Math.random() * 2); src.stop(at + 0.15);
  }
}

/* ------------------------------------------------------------------ component */
type HoldWin = Window & { __OH_HOLD?: boolean; __ohSeek?: (ms: number) => void; __ohVote?: (i: number) => void };

export function OpeningC({ onDone }: { onDone: () => void }) {
  const still = useRef(isStill()).current;
  const cv = useRef<HTMLCanvasElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const done = useRef(false);
  const sound = useRef<Sound | null>(null);
  const vote = useRef<(i: number) => void>(() => {});
  const [soundOn, setSoundOn] = useState(false);
  const [phase, setPhase] = useState<'vote' | 'closed' | 'hit' | 'fall'>('vote');
  const [mine, setMine] = useState(-1);
  const [btns, setBtns] = useState<{ x: number; w: number; y: number }[]>([]);
  const [gone, setGone] = useState(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    setGone(true);
    onDone();
  };

  useEffect(() => {
    if (still) { finish(); return; }
    const canvas = cv.current!;
    const g = canvas.getContext('2d') as Ctx2 | null;
    if (!g) { finish(); return; }
    const w = window as HoldWin;
    const hold = !!w.__OH_HOLD;
    sound.current = new Sound(hold);
    const st: State = { mine: -1, mineAt: 0 };
    let s: Scene | null = null;
    let snap: HTMLCanvasElement | null = null;
    let vt = 0, rate = 1, last = 0, raf = 0, pending = -1, cancelled = false, prevCount = 0;
    let shownPhase = 'vote';

    const size = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const W = window.innerWidth, H = window.innerHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      s = makeScene(W, H, dpr, g);
      snap = null;
      setBtns(s.colX.map((x) => ({ x, w: s!.colW, y: s!.btnY })));
    };
    const makeSnap = () => {
      if (!s) return;
      snap = document.createElement('canvas');
      snap.width = canvas.width; snap.height = canvas.height;
      drawScene(snap.getContext('2d') as Ctx2, s, T_FALL - 0.01, st);
    };
    const setP = (p: 'vote' | 'closed' | 'hit' | 'fall') => { if (p !== shownPhase) { shownPhase = p; setPhase(p); } };
    const paint = (t: number) => {
      if (!s) return true;
      setP(t >= T_FALL ? 'fall' : t >= T_HIT ? 'hit' : t >= T1 ? 'closed' : 'vote');
      if (t < T_FALL) { drawScene(g, s, t, st); return true; }
      if (!snap) makeSnap();
      return drawShards(g, s, snap!, t);
    };
    const audio = (t0: number, t1: number) => {
      const so = sound.current;
      if (!so?.bus || !so.ctx || !so.enabled) return;
      const now = so.ctx.currentTime;
      const n = counts(t1, st).reduce((a, b) => a + b, 0);
      if (n > prevCount && t1 < T1 + 50) tick(so.bus, now, Math.min(1, 0.5 + (n - prevCount) / 6));
      prevCount = n;
      if (t0 < T_HIT && t1 >= T_HIT) { gavel(so.bus, now); crack(so.bus, now); }
    };
    const loop = (now: number) => {
      if (cancelled) return;
      const dt = last ? Math.min(64, now - last) : 16;
      last = now;
      const p = vt; vt += dt * rate;
      if (vt >= T1) rate = 1;
      const alive = paint(vt); audio(p, vt);
      if (vt >= T_END || !alive) { finish(); return; }
      raf = requestAnimationFrame(loop);
    };
    vote.current = (i: number) => {
      if (st.mine >= 0 || vt >= T1) return;
      st.mine = i; st.mineAt = hold && pending >= 0 ? pending : vt;
      setMine(i);
      if (!hold) rate = Math.max(rate, (T1 - vt) / 380);
      else paint(pending >= 0 ? pending : 0);
    };

    size();
    const onResize = () => { size(); paint(hold && pending >= 0 ? pending : vt); };
    window.addEventListener('resize', onResize);
    const fonts = Promise.race([
      Promise.all([
        document.fonts.load(`900 100px ${FONT_SANS}`),
        document.fonts.load(`700 40px ${FONT_SANS}`),
        document.fonts.load(`600 12px ${FONT_MONO}`),
      ]),
      new Promise((r) => setTimeout(r, 900)),
    ]);
    if (hold) { w.__ohSeek = (ms: number) => { pending = ms; }; w.__ohVote = (i: number) => vote.current(i); }
    void fonts.then(() => {
      if (cancelled) return;
      size();
      if (hold) {
        w.__ohSeek = (ms: number) => { pending = ms; paint(ms); };
        paint(pending >= 0 ? pending : 0);
        document.documentElement.dataset.ohReady = '1';
      } else raf = requestAnimationFrame(loop);
    });
    return () => { cancelled = true; cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') finish(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (still || gone) return null;

  const wake = () => { const so = sound.current; if (so && so.enabled) { so.wake(); setSoundOn(true); } };
  const toggleSound = (e: RMouseEvent) => {
    e.stopPropagation();
    const so = sound.current;
    if (!so) return;
    if (soundOn) { so.setEnabled(false); setSoundOn(false); } else { so.setEnabled(true); so.wake(); setSoundOn(true); }
  };

  return (
    <div ref={root} className={`openingc is-${phase}`} role="dialog" aria-label="Opening: the floor votes" onPointerDown={wake}>
      <canvas ref={cv} className="openingc-cv" aria-hidden="true" />
      {phase === 'vote' || phase === 'closed' ? (
        <div className="openingc-vote">
          {btns.map((b, i) => (
            <button
              key={LABELS[i]}
              type="button"
              className={`openingc-btn${mine === i ? ' is-mine' : ''}`}
              style={{ left: b.x, top: b.y, width: b.w }}
              disabled={mine >= 0 || phase !== 'vote'}
              onClick={() => vote.current(i)}
            >
              {BUTTONS[i]}
            </button>
          ))}
        </div>
      ) : null}
      <div className="openingc-bot">
        <span className="openingc-m openingc-hint" aria-live="polite">
          {mine >= 0 ? <>Your vote: <b>{LABELS[mine]}</b><i> · recorded</i></> : phase === 'vote' ? <>Cast your vote<i> or wait for the count</i></> : 'Voting closed'}
        </span>
        <span className="openingc-ctl">
          <button type="button" className="openingc-m openingc-small" aria-pressed={soundOn} onClick={toggleSound} onPointerDown={(e) => e.stopPropagation()}>
            Sound {soundOn ? 'on' : 'off'}
          </button>
          <button type="button" className="openingc-m openingc-small" onClick={(e) => { e.stopPropagation(); finish(); }} onPointerDown={(e) => e.stopPropagation()}>
            Skip
          </button>
        </span>
      </div>
      <p className="openingc-sr" aria-live="polite">{phase === 'hit' || phase === 'fall' ? 'Adopted. DXB MUN 2027.' : ''}</p>
    </div>
  );
}
