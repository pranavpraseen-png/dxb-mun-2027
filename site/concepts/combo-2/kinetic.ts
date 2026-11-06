// The kinetic type engine, copied from Alt 5 (kinetic.ts) and retuned for Mona Sans (wdth 75-125, wght 200-900).
// Every kinetic line is registered here and re-solved each frame:
// each letter gets its own width (wdth) and weight (wght) from the cursor, the scroll speed and its segment's
// emphasis, and then one base width is found that makes the whole line fill its column exactly.
// Reads happen at the start of the frame (layout is clean then), writes after, so there is no layout thrash.
import { gsap } from 'gsap';
import { isStill } from '@/shared/hooks';

export const FAMILY = '"Mona Sans Variable", "Mona Sans", system-ui, sans-serif';
const WS = [75, 87.5, 100, 112.5, 125];
const GS = [200, 550, 900];
const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ,.·’\'&/-–';
export const W_MIN = 75;
export const W_MAX = 125;
/** Mona Sans' axes are half as wide as Anybody's (Alt 5), so every axis offset is scaled by this. */
const AX = 0.5;

/* ------------------------------------------------------------------ metrics */
// Width of one character in em at a given wdth/wght: measured once at 5 × 3 points, then bilinear.
const table = new Map<string, Float32Array>();
let ready = false;
const readyCbs: (() => void)[] = [];
export const onReady = (cb: () => void) => (ready ? cb() : readyCbs.push(cb));
export const isReady = () => ready;

function measure() {
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = `position:absolute;left:-99999px;top:0;visibility:hidden;white-space:pre;font-family:${FAMILY};font-size:100px;line-height:1;letter-spacing:0;font-kerning:none;`;
  const spans: [string, number, HTMLSpanElement][] = [];
  for (const ch of CHARSET) {
    WS.forEach((w, wi) => GS.forEach((g, gi) => {
      const s = document.createElement('span');
      s.textContent = ch;
      s.style.cssText = `display:inline-block;font-variation-settings:"wdth" ${w},"wght" ${g}`;
      host.appendChild(s);
      spans.push([ch, wi * 3 + gi, s]);
    }));
  }
  document.body.appendChild(host);
  for (const [ch, idx, s] of spans) {
    let t = table.get(ch);
    if (!t) { t = new Float32Array(15); table.set(ch, t); }
    t[idx] = s.getBoundingClientRect().width / 100;
  }
  host.remove();
}

export function charWidth(ch: string, w: number, g: number) {
  const t = table.get(ch) ?? table.get('N');
  if (!t) return 0.6;
  const wp = Math.min(3.9999, Math.max(0, (w - 75) / 12.5));
  const gp = Math.min(1.9999, Math.max(0, (g - 200) / 350));
  const wi = Math.floor(wp), gi = Math.floor(gp);
  const wf = wp - wi, gf = gp - gi;
  const a = t[wi * 3 + gi], b = t[(wi + 1) * 3 + gi], c = t[wi * 3 + gi + 1], d = t[(wi + 1) * 3 + gi + 1];
  return (a * (1 - wf) + b * wf) * (1 - gf) + (c * (1 - wf) + d * wf) * gf;
}
/** Width of a whole string in em, every letter at the same wdth/wght. */
export function textWidth(text: string, w: number, g: number, track = 0) {
  let s = 0;
  for (const ch of text) s += charWidth(ch, w, g) + track;
  return s;
}
/** The wdth that makes `text` exactly `em` wide (clamped to the axis). */
export function solveWidth(text: string, em: number, g: number, track = 0) {
  let lo = W_MIN, hi = W_MAX;
  if (textWidth(text, lo, g, track) >= em) return lo;
  if (textWidth(text, hi, g, track) <= em) return hi;
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    if (textWidth(text, mid, g, track) > em) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
}

/* ------------------------------------------------------------------ global inputs */
const still = typeof window !== 'undefined' && isStill();
const pointer = { x: -9999, y: -9999, active: false, last: 0 };
let vel = 0; // smoothed scroll velocity, px per 60 fps frame (signed)
let lastY = 0;
let lastT = 0;
let ignoreVel = 0;
export const getVelocity = () => vel;
/** After an instant jump (the wipe), forget the jump so it does not read as speed. */
export const resetScrollBaseline = () => { lastY = scrollY; vel = 0; ignoreVel = 3; };

/* ------------------------------------------------------------------ lines */
export type LineOpts = {
  mode: 'fill' | 'fit'; // fill: always reach the column (the size gives way); fit: at most the column
  weight: number; // resting weight
  track: number; // letter spacing in em
  cursor: number; // 0..1 cursor response
  wave: number; // 0..1 scroll-speed response
  breathe: number; // 0..1 idle breathing (hero)
  bMin: number; bMax: number; // range for the base width
  maxSize: number; // px cap for the font size in fill mode (0 = none)
  hoverOnly: boolean; // cursor response only while the pointer is over this line
  fill: number; // 0..1 share of the column to fill (animated for stretch-ins)
  /** Combo 2: keep the line at its natural length at this resting wdth (the box is sized to it), instead of a column. */
  natural: number; // 0 = off
};
type Line = {
  box: HTMLElement;
  el: HTMLElement;
  spans: HTMLElement[];
  chars: string[];
  seg: Int16Array;
  emph: number[]; emphCur: number[];
  o: LineOpts;
  offW: Float32Array; curG: Float32Array; // current (smoothed) per-letter offset and weight
  wW: Float32Array; wG: Float32Array; // last written
  F: number; Fw: number; Sw: number; k: number;
  W: number; Fd: number;
  visible: boolean;
  dirty: boolean;
  left: number; top: number; h: number; actual: number;
};
const lines = new Set<Line>();
let io: IntersectionObserver | null = null;
let ro: ResizeObserver | null = null;
const byBox = new Map<Element, Line>();
let stillFrames = 0;
const wake = () => { stillFrames = 50; };

/** Combo 2's calm setting for section words: natural length, cursor only while over the word, no scroll ripple. */
export const GENTLE: Partial<LineOpts> = { mode: 'fit', natural: 100, cursor: 0.6, wave: 0, hoverOnly: true };

export type LineHandle = {
  opts: LineOpts;
  setEmph: (seg: number, v: number) => void;
  destroy: () => void;
};

const DEFAULTS: LineOpts = { mode: 'fill', weight: 800, track: -0.01, cursor: 1, wave: 1, breathe: 0, bMin: W_MIN, bMax: W_MAX, maxSize: 0, fill: 1, hoverOnly: false, natural: 0 };

export function register(box: HTMLElement, el: HTMLElement, segCount: number, opts: Partial<LineOpts>): LineHandle {
  const spans = Array.from(el.querySelectorAll<HTMLElement>('[data-k]'));
  const n = spans.length;
  const o = { ...DEFAULTS, ...opts };
  const line: Line = {
    box, el, spans, chars: spans.map((s) => s.dataset.k ?? 'N'),
    seg: Int16Array.from(spans.map((s) => Number(s.dataset.seg ?? -1))),
    emph: new Array(segCount).fill(0), emphCur: new Array(segCount).fill(0),
    o,
    offW: new Float32Array(n), curG: new Float32Array(n).fill(o.weight),
    wW: new Float32Array(n).fill(-1), wG: new Float32Array(n).fill(-1),
    F: 0, Fw: 0, Sw: 0, k: 1, W: 0, Fd: 0, visible: still, dirty: true,
    left: 0, top: 0, h: 0, actual: 0,
  };
  lines.add(line);
  byBox.set(box, line);
  ensureObservers();
  io!.observe(box);
  ro!.observe(box);
  measureBox(line);
  wake();
  return {
    opts: o,
    setEmph: (s, v) => {
      line.emph[s] = v;
      if (still) line.emphCur[s] = v;
      wake();
    },
    destroy: () => { lines.delete(line); byBox.delete(box); io?.unobserve(box); ro?.unobserve(box); },
  };
}

function measureBox(l: Line) {
  const cs = getComputedStyle(l.box);
  l.Fd = parseFloat(cs.fontSize);
  if (l.o.natural > 0) {
    if (!ready) return;
    // the line's own length at rest, rounded down to a whole pixel; the box takes exactly that width
    let em = 0;
    for (const ch of l.chars) em += charWidth(ch, l.o.natural, l.o.weight) + l.o.track;
    const W = Math.floor(em * l.Fd);
    if (W !== l.W) { l.W = W; l.box.style.width = W + 'px'; }
  } else l.W = l.box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  l.dirty = true;
}

function ensureObservers() {
  if (io) return;
  io = new IntersectionObserver((es) => {
    for (const e of es) { const l = byBox.get(e.target); if (l) l.visible = still || e.isIntersecting; }
  }, { rootMargin: '25% 0px 25% 0px' });
  ro = new ResizeObserver((es) => {
    for (const e of es) { const l = byBox.get(e.target); if (l) measureBox(l); }
    wake();
  });
}

/* ------------------------------------------------------------------ the frame */
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

function sumAt(l: Line, b: number) {
  let s = 0;
  const n = l.spans.length;
  for (let i = 0; i < n; i++) s += charWidth(l.chars[i], clamp(b + l.offW[i], W_MIN, W_MAX), l.curG[i]) + l.o.track;
  return s;
}

function frame(time: number) {
  if (still && stillFrames-- <= 0) return;
  const t = time; // seconds (gsap ticker time)
  const dt = Math.max(1 / 240, Math.min(0.1, t - lastT || 1 / 60));
  lastT = t;
  // velocity from the real scroll position, so it works with Lenis, native touch and keys alike
  const y = scrollY;
  const raw = ((y - lastY) / dt) / 60;
  lastY = y;
  if (ignoreVel > 0) ignoreVel--; else vel += (raw - vel) * (still ? 1 : 0.16);
  if (still) vel = 0;
  const vn = clamp(Math.abs(vel) / 32, 0, 1);
  const dir = vel >= 0 ? 1 : -1;
  const pActive = !still && pointer.active && performance.now() - pointer.last < 4000;

  // read phase
  for (const l of lines) {
    if (!l.visible) continue;
    const r = l.el.getBoundingClientRect();
    l.left = r.left; l.top = r.top; l.h = r.height; l.actual = r.width;
  }
  // solve + write phase
  for (const l of lines) {
    if (!l.visible || !ready || l.W <= 0) continue;
    const o = l.o;
    const n = l.spans.length;
    // correction from what the browser actually laid out last frame
    if (l.Fw > 0 && l.Sw > 0 && l.actual > 0) {
      const kNew = l.actual / (l.Fw * l.Sw);
      if (kNew > 0.7 && kNew < 1.4) l.k += (kNew - l.k) * 0.5;
    }
    const ease = still ? 1 : Math.min(1, dt * 11);
    for (let s = 0; s < l.emph.length; s++) l.emphCur[s] += (l.emph[s] - l.emphCur[s]) * (still ? 1 : Math.min(1, dt * 8));
    // letter centres from the current layout (model widths × size × correction)
    const F0 = l.F || l.Fd;
    let x = l.left;
    const cy = l.top + l.h / 2;
    const over = !o.hoverOnly || (pointer.y >= l.top - 8 && pointer.y <= l.top + l.h + 8 && pointer.x >= l.left - 8 && pointer.x <= l.left + l.actual + 8);
    const R = o.hoverOnly ? Math.max(90, F0 * 1.1) : Math.max(200, F0 * 1.3);
    for (let i = 0; i < n; i++) {
      const wi = charWidth(l.chars[i], l.wW[i] < 0 ? 100 : l.wW[i], l.curG[i]) * F0 * l.k;
      const cx = x + wi / 2;
      x += wi + o.track * F0 * l.k;
      let e = 0;
      if (pActive && over && o.cursor > 0) {
        const dx = pointer.x - cx, dy = (pointer.y - cy) * 1.3;
        const d = Math.sqrt(dx * dx + dy * dy);
        e = clamp(1 - d / R, 0, 1);
        e = e * e * (3 - 2 * e) * o.cursor;
      }
      const sg = l.seg[i];
      const em = sg >= 0 ? l.emphCur[sg] : 0;
      let tw = 52 * AX * e;
      let tg = o.weight + (900 - o.weight) * e;
      if (sg >= 0 || l.emph.length) {
        // segmented line: emphasised parts wide and heavy, the rest squeezed and light
        tw += (-18 + 62 * em) * AX;
        tg = 260 + (900 - 260) * Math.max(em, e);
      }
      if (o.wave > 0 && !still) {
        tw += 46 * AX * vn * o.wave * Math.sin(i * 0.95 - t * 7 * dir);
        tg -= 330 * vn * o.wave;
      }
      if (o.breathe > 0 && !still) tw += 13 * AX * o.breathe * Math.sin(t * 1.25 + i * 0.7);
      tg = clamp(tg, 200, 900);
      l.offW[i] += (tw - l.offW[i]) * ease;
      l.curG[i] += (tg - l.curG[i]) * ease;
    }
    // solve the base width so the line fills its target
    const T = l.W * clamp(o.fill, 0.05, 1);
    let F = l.Fd;
    let b: number;
    const target = (FF: number) => T / (FF * l.k);
    const sLo = sumAt(l, o.bMin), sHi = sumAt(l, o.bMax);
    if (target(F) <= sLo) { b = o.bMin; F = T / (l.k * sLo); }
    else if (target(F) >= sHi) {
      b = o.bMax;
      if (o.mode === 'fill') { F = T / (l.k * sHi); if (o.maxSize > 0) F = Math.min(F, o.maxSize); }
    } else {
      let lo = o.bMin, hi = o.bMax;
      const want = target(F);
      for (let it = 0; it < 16; it++) { const mid = (lo + hi) / 2; if (sumAt(l, mid) > want) hi = mid; else lo = mid; }
      b = (lo + hi) / 2;
    }
    // write
    let S = 0;
    for (let i = 0; i < n; i++) {
      const w = clamp(b + l.offW[i], W_MIN, W_MAX);
      const g = l.curG[i];
      if (Math.abs(w - l.wW[i]) > 0.12 || Math.abs(g - l.wG[i]) > 0.8) {
        l.spans[i].style.fontVariationSettings = `"wdth" ${w.toFixed(2)}, "wght" ${g.toFixed(0)}`;
        l.wW[i] = w; l.wG[i] = g;
      }
      S += charWidth(l.chars[i], l.wW[i], l.wG[i]) + o.track;
    }
    if (Math.abs(F - l.F) > 0.04) { l.el.style.fontSize = F.toFixed(2) + 'px'; l.F = F; }
    l.Fw = l.F; l.Sw = S;
    if (l.dirty) { l.box.classList.add('is-ready'); l.dirty = false; }
  }
}

/* ------------------------------------------------------------------ start */
let started = false;
export function start() {
  if (started) return;
  started = true;
  lastY = scrollY;
  const setP = (x: number, y: number) => { pointer.x = x; pointer.y = y; pointer.active = true; pointer.last = performance.now(); };
  addEventListener('pointermove', (e) => setP(e.clientX, e.clientY), { passive: true });
  addEventListener('pointerdown', (e) => setP(e.clientX, e.clientY), { passive: true });
  addEventListener('touchmove', (e) => { const p = e.touches[0]; if (p) setP(p.clientX, p.clientY); }, { passive: true });
  addEventListener('touchend', () => { pointer.active = false; }, { passive: true });
  addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') pointer.active = false; }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { pointer.active = false; });
  addEventListener('resize', wake);
  const go = () => {
    measure();
    ready = true;
    for (const l of lines) measureBox(l);
    readyCbs.splice(0).forEach((cb) => cb());
    wake();
    gsap.ticker.add(frame);
  };
  const fonts = Promise.all([
    document.fonts.load(`900 100px ${FAMILY}`),
    document.fonts.load(`100 100px ${FAMILY}`),
  ]);
  Promise.race([fonts, new Promise((r) => setTimeout(r, 2500))]).then(() => document.fonts.ready).then(go, go);
}
