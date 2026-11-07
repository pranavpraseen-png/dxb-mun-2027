// NAME: Roll call
// IDEA: A split-flap board calls the roll of all 193 member states (ISO 3166 alpha-3, alphabetical) at accelerating speed, then every flap slams shut at once on DXB MUN 2027 with a gavel and a hard kick of the board.
// WHY: An accelerating rhythm builds anticipation with zero effort from the visitor, the open count holds attention until it completes, and the single simultaneous slam is a sharp sound-and-picture peak; 193 codes say "the whole world is in the room".
// WILD: Call the visitor's own country last: read the browser's locale region and hold the board on that code ("ARE · PRESENT") for one beat before the slam.
import { useEffect, useRef, useState, type MouseEvent as RMouseEvent } from 'react';
import { isStill } from '@/shared/hooks';
import { Sound, gavel, type Bus } from '../stage/audio';
import './opening-b.css';

/* ------------------------------------------------------------------ data */
// The 193 UN member states as ISO 3166-1 alpha-3 codes, in the alphabetical order of their English short names.
const CODES = (
  'AFG ALB DZA AND AGO ATG ARG ARM AUS AUT AZE BHS BHR BGD BRB BLR BEL BLZ BEN BTN BOL BIH BWA BRA BRN BGR BFA BDI ' +
  'CPV KHM CMR CAN CAF TCD CHL CHN COL COM COG CRI CIV HRV CUB CYP CZE PRK COD DNK DJI DMA DOM ECU EGY SLV GNQ ERI ' +
  'EST SWZ ETH FJI FIN FRA GAB GMB GEO DEU GHA GRC GRD GTM GIN GNB GUY HTI HND HUN ISL IND IDN IRN IRQ IRL ISR ITA ' +
  'JAM JPN JOR KAZ KEN KIR KWT KGZ LAO LVA LBN LSO LBR LBY LIE LTU LUX MDG MWI MYS MDV MLI MLT MHL MRT MUS MEX FSM ' +
  'MCO MNG MNE MAR MOZ MMR NAM NRU NPL NLD NZL NIC NER NGA MKD NOR OMN PAK PLW PAN PNG PRY PER PHL POL PRT QAT KOR ' +
  'MDA ROU RUS RWA KNA LCA VCT WSM SMR STP SAU SEN SRB SYC SLE SGP SVK SVN SLB SOM ZAF SSD ESP LKA SDN SUR SWE CHE ' +
  'SYR TJK THA TLS TGO TON TTO TUN TUR TKM TUV UGA UKR ARE GBR TZA USA URY UZB VUT VEN VNM YEM ZMB ZWE'
).split(' ');
const N_CODES = CODES.length; // 193

/* ------------------------------------------------------------------ timeline (ms) */
const T0 = 220; // roll call starts
const DUR = 2880; // roll call length
const T_SLAM = T0 + DUR + 90; // every flap starts to fall
const SLAM = 70; // the slam itself
const T_HIT = T_SLAM + SLAM; // impact frame: gavel + kick
const T_DONE = T_HIT + 950;

// Codes arrive on idx(u) = 193 (0.06u + 0.94u^3): ~4 per second at first, ~190 per second at the end.
const idxAt = (u: number) => N_CODES * (0.06 * u + 0.94 * u * u * u);
const ARRIVE = CODES.map((_, k) => {
  let lo = 0, hi = 1;
  for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (idxAt(m) < k + 1) lo = m; else hi = m; }
  return T0 + DUR * hi;
});
const flipDur = (k: number) => 150 - 100 * (k / (N_CODES - 1));
const stagger = (k: number) => 16 - 10 * (k / (N_CODES - 1));

/* ------------------------------------------------------------------ board */
const CHARSET = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const STYLE = [
  { face: '#08111E', ink: '#F2F5F9' }, // 0 normal
  { face: '#E5591C', ink: '#03060C' }, // 1 the code being called (the one orange thing)
  { face: '#F2F5F9', ink: '#03060C' }, // 2 the final words
];
type Cell = { c: string; s: number };
const PAD = 3; // atlas gutter, device px

type Board = {
  W: number; H: number; dpr: number;
  C: number; R: number; S: number; // columns, rows, code slots per row
  cw: number; ch: number; gap: number; x0: number; y0: number; bw: number; bh: number;
  cwp: number; chp: number; // tile size in device px
  atlas: HTMLCanvasElement;
  final: Cell[]; // the slammed state, row-major
};

function makeBoard(W: number, H: number, dpr: number): Board {
  const C = W < 640 ? 11 : W < 1080 ? 15 : 23;
  const R = W < 640 ? 13 : W < 1080 ? 11 : 9;
  const S = Math.floor((C + 1) / 4);
  const gut = Math.max(16, Math.min(56, W * 0.04));
  const top = W < 640 ? 76 : 88, bottom = W < 640 ? 92 : 96;
  const gapF = 0.075;
  const byW = (W - 2 * gut) / (C + (C - 1) * gapF);
  const byH = (H - top - bottom) / (R * 1.42 + (R - 1) * gapF * 1.42);
  const cwRaw = Math.min(byW, byH, 92);
  const cwp = Math.floor(cwRaw * dpr), cw = cwp / dpr;
  let chp = Math.floor(cw * 1.42 * dpr); if (chp % 2) chp -= 1; const ch = chp / dpr;
  const gap = Math.max(2, Math.round(cw * gapF * dpr)) / dpr;
  const bw = C * cw + (C - 1) * gap, bh = R * ch + (R - 1) * gap;
  const x0 = Math.round(((W - bw) / 2) * dpr) / dpr;
  const y0 = Math.round((top + (H - top - bottom - bh) / 2) * dpr) / dpr;

  // Tile atlas: one row per style, one column per character. Each tile sits in a gutter of its own face colour,
  // so sampling at a fractional position (the kick) never bleeds a neighbour's colour into the edge.
  const atlas = document.createElement('canvas');
  atlas.width = (cwp + 2 * PAD) * CHARSET.length; atlas.height = (chp + 2 * PAD) * STYLE.length;
  const a = atlas.getContext('2d')!;
  a.textAlign = 'center'; a.textBaseline = 'middle';
  a.font = `700 ${Math.round(chp * 0.6)}px "JetBrains Mono Variable", ui-monospace, monospace`;
  STYLE.forEach((st, r) => {
    for (let i = 0; i < CHARSET.length; i++) {
      const x = i * (cwp + 2 * PAD), y = r * (chp + 2 * PAD);
      a.fillStyle = st.face; a.fillRect(x, y, cwp + 2 * PAD, chp + 2 * PAD);
      if (CHARSET[i] !== ' ') { a.fillStyle = st.ink; a.fillText(CHARSET[i], x + PAD + cwp / 2, y + PAD + chp * 0.53); }
    }
  });

  // The final state: DXB MUN 2027 (inverted tiles) and THE FLOOR IS OPEN.
  const final: Cell[] = Array.from({ length: C * R }, () => ({ c: ' ', s: 0 }));
  // One left-aligned block, centred as a whole (a departures board aligns left).
  const lines: [number, string, number][] = C >= 12
    ? [[-1, 'DXB MUN 2027', 2], [1, 'THE FLOOR IS OPEN', 0]]
    : [[-2, 'DXB MUN', 2], [-1, '2027', 2], [1, 'THE FLOOR', 0], [2, 'IS OPEN', 0]];
  const c0 = Math.floor((C - Math.max(...lines.map((l) => l[1].length))) / 2);
  const mid = Math.floor(R / 2);
  for (const [dr, text, st] of lines) for (let i = 0; i < text.length; i++) if (text[i] !== ' ') final[(mid + dr) * C + c0 + i] = { c: text[i], s: st };
  return { W, H, dpr, C, R, S, cw, ch, gap, x0, y0, bw, bh, cwp, chp, atlas, final };
}

/** The roll-call state of one cell at time t: what it shows, what it showed, and the flip progress. */
function rollState(b: Board, row: number, col: number, t: number, active: number): { from: Cell; to: Cell; p: number } {
  const used = b.S * 4 - 1, off = Math.floor((b.C - used) / 2);
  const rel = col - off;
  const blank = { from: { c: ' ', s: 0 }, to: { c: ' ', s: 0 }, p: 1 };
  if (rel < 0 || rel >= used || rel % 4 === 3) return blank;
  const slot = row * b.S + Math.floor(rel / 4), ci = rel % 4;
  const N = b.S * b.R;
  let k = -1;
  for (let j = slot; j < N_CODES; j += N) { if (ARRIVE[j] + ci * stagger(j) <= t) k = j; else break; }
  if (k < 0) return blank;
  const start = ARRIVE[k] + ci * stagger(k);
  const p = Math.min(1, (t - start) / flipDur(k));
  const prev = k - N;
  const sty = k === active ? 1 : 0;
  return {
    from: prev >= 0 ? { c: CODES[prev][ci], s: prev === active ? 1 : 0 } : { c: ' ', s: 0 },
    to: { c: CODES[k][ci], s: sty },
    p,
  };
}

function drawCell(g: CanvasRenderingContext2D, b: Board, x: number, y: number, from: Cell, to: Cell, p: number) {
  const { atlas, cwp, chp, cw, ch } = b;
  const hp = chp / 2, h = ch / 2;
  const sx = (c: string) => Math.max(0, CHARSET.indexOf(c)) * (cwp + 2 * PAD) + PAD;
  const sy = (s: number) => s * (chp + 2 * PAD) + PAD;
  // The static top half already shows the new character; the old one is on the falling leaf.
  g.drawImage(atlas, sx(to.c), sy(to.s), cwp, hp, x, y, cw, h);
  const bot = p >= 1 ? to : from;
  g.drawImage(atlas, sx(bot.c), sy(bot.s) + hp, cwp, hp, x, y + h, cw, h);
  if (p > 0 && p < 1) {
    const k = Math.cos(p * Math.PI);
    if (k > 0) { // the old top leaf folds down onto the split line
      const lh = Math.max(1 / b.dpr, h * k);
      g.drawImage(atlas, sx(from.c), sy(from.s), cwp, hp, x, y + h - lh, cw, lh);
      g.fillStyle = '#F2F5F9'; g.fillRect(x, y + h - lh, cw, 1 / b.dpr);
    } else { // the new bottom leaf lands
      const lh = Math.max(1 / b.dpr, h * -k);
      g.drawImage(atlas, sx(to.c), sy(to.s) + hp, cwp, hp, x, y + h, cw, lh);
      g.fillStyle = '#03060C'; g.fillRect(x, y + h + lh - 1 / b.dpr, cw, 1 / b.dpr);
    }
  }
  // The split, and the hinge pins.
  g.fillStyle = '#03060C';
  g.fillRect(x, y + h - 1 / b.dpr, cw, Math.max(1, Math.round(b.dpr)) / b.dpr);
}

/** Draws the whole board at time t. Pure: the same t always draws the same frame. */
function drawBoard(g: CanvasRenderingContext2D, b: Board, t: number) {
  g.setTransform(b.dpr, 0, 0, b.dpr, 0, 0);
  g.fillStyle = '#03060C'; g.fillRect(0, 0, b.W, b.H);
  let active = -1;
  for (let k = 0; k < N_CODES; k++) { if (ARRIVE[k] <= t) active = k; else break; }
  if (t >= T_SLAM) active = -1;
  const dt = t - T_HIT;
  const scale = dt >= 0 ? 1 + 0.028 * Math.exp(-dt / 90) : 1;
  const cx = b.x0 + b.bw / 2, cy = b.y0 + b.bh / 2;
  g.translate(cx, cy); g.scale(scale, scale); g.translate(-cx, -cy);
  for (let r = 0; r < b.R; r++) {
    // The kick: each row bounces a few ms after the one above, like a mechanical board taking the hit.
    const rt = dt - r * 9;
    const oy = rt >= 0 ? 15 * Math.exp(-rt / 105) * Math.cos(rt / 34) : 0;
    const y = Math.round((b.y0 + r * (b.ch + b.gap) + oy) * b.dpr) / b.dpr;
    for (let c = 0; c < b.C; c++) {
      const x = b.x0 + c * (b.cw + b.gap);
      if (t < T_SLAM) {
        const s = rollState(b, r, c, t, active);
        drawCell(g, b, x, y, s.from, s.to, s.p);
      } else {
        const at = rollState(b, r, c, T_SLAM - 0.01, -1);
        const fin = b.final[r * b.C + c];
        drawCell(g, b, x, y, at.to, fin, Math.min(1, (t - T_SLAM) / SLAM));
      }
    }
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  return active;
}

/** Number of flap starts in (t0, t1]: drives the click sound. */
function flapsBetween(t0: number, t1: number) {
  let n = 0;
  for (let k = 0; k < N_CODES; k++) {
    const a = ARRIVE[k];
    if (a > t1) break;
    for (let ci = 0; ci < 3; ci++) { const s = a + ci * stagger(k); if (s > t0 && s <= t1) n++; }
  }
  return n;
}

function flap(b: Bus, t: number, size: number) {
  const { ctx } = b;
  const src = ctx.createBufferSource(); src.buffer = b.noise;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400 + Math.random() * 1600; f.Q.value = 1.3;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.28 * size, t + 0.0015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  src.connect(f); f.connect(g); g.connect(b.dry);
  src.start(t, Math.random() * 2); src.stop(t + 0.05);
}

/* ------------------------------------------------------------------ component */
type HoldWin = Window & { __OH_HOLD?: boolean; __ohSeek?: (ms: number) => void };

export function OpeningB({ onDone }: { onDone: () => void }) {
  const still = useRef(isStill()).current;
  const cv = useRef<HTMLCanvasElement>(null);
  const countRef = useRef<HTMLElement>(null);
  const nowRef = useRef<HTMLSpanElement>(null);
  const done = useRef(false);
  const ff = useRef<() => void>(() => {});
  const sound = useRef<Sound | null>(null);
  const [soundOn, setSoundOn] = useState(false);
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
    const g = canvas.getContext('2d', { alpha: false });
    if (!g) { finish(); return; }
    const w = window as HoldWin;
    const hold = !!w.__OH_HOLD;
    sound.current = new Sound(hold);
    let b: Board | null = null;
    let vt = 0, rate = 1, last = 0, raf = 0, pending = -1, prevVt = 0, cancelled = false;

    const size = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const W = window.innerWidth, H = window.innerHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      b = makeBoard(W, H, dpr);
    };
    const paint = (t: number) => {
      if (!b) return;
      const active = drawBoard(g, b, t);
      const n = t >= T_SLAM ? N_CODES : active + 1;
      if (countRef.current) countRef.current.textContent = String(n).padStart(3, '0');
      if (nowRef.current) nowRef.current.textContent = t >= T_SLAM ? 'The floor is open' : active >= 0 ? `${CODES[active]} · present` : 'Calling the roll';
    };
    const audio = (t0: number, t1: number) => {
      const s = sound.current;
      if (!s?.bus || !s.ctx || !s.enabled) return;
      const now = s.ctx.currentTime;
      if (t1 < T_SLAM) { const n = flapsBetween(t0, t1); if (n) flap(s.bus, now, Math.min(1, 0.35 + n / 8)); }
      if (t0 < T_SLAM && t1 >= T_SLAM) for (let i = 0; i < 6; i++) flap(s.bus, now + i * 0.006, 1);
      if (t0 < T_HIT && t1 >= T_HIT) gavel(s.bus, now);
    };
    const loop = (now: number) => {
      if (cancelled) return;
      const dt = last ? Math.min(64, now - last) : 16;
      last = now;
      prevVt = vt; vt += dt * rate;
      if (vt >= T_SLAM) rate = 1;
      paint(vt); audio(prevVt, vt);
      if (vt >= T_DONE) { finish(); return; }
      raf = requestAnimationFrame(loop);
    };
    ff.current = () => { if (vt < T_SLAM - 300) rate = Math.max(rate, (T_SLAM - vt) / 300); };

    size();
    const onResize = () => { size(); paint(hold && pending >= 0 ? pending : vt); };
    window.addEventListener('resize', onResize);
    const fonts = Promise.race([
      document.fonts.load('700 40px "JetBrains Mono Variable"'),
      new Promise((r) => setTimeout(r, 900)),
    ]);
    paint(0);
    void fonts.then(() => {
      if (cancelled) return;
      size();
      if (hold) {
        w.__ohSeek = (ms: number) => { pending = ms; paint(ms); };
        paint(pending >= 0 ? pending : 0);
        document.documentElement.dataset.ohReady = '1';
      } else {
        raf = requestAnimationFrame(loop);
      }
    });
    if (hold) w.__ohSeek = (ms: number) => { pending = ms; };
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

  const wake = () => {
    const s = sound.current;
    if (!s || !s.enabled) return;
    s.wake(); setSoundOn(true);
  };
  const toggleSound = (e: RMouseEvent) => {
    e.stopPropagation();
    const s = sound.current;
    if (!s) return;
    if (soundOn) { s.setEnabled(false); setSoundOn(false); }
    else { s.setEnabled(true); s.wake(); setSoundOn(true); }
  };

  return (
    <div
      className="openingb"
      role="dialog"
      aria-label="Opening: the roll call of 193 member states"
      onPointerDown={() => { wake(); ff.current(); }}
    >
      <canvas ref={cv} className="openingb-cv" aria-hidden="true" />
      <div className="openingb-top">
        <span className="openingb-m">Roll call<span className="openingb-wide"> <i>·</i> 193 member states</span></span>
        <span className="openingb-m openingb-count"><b ref={countRef}>000</b> / 193 present</span>
      </div>
      <div className="openingb-bot">
        <span className="openingb-m openingb-now" ref={nowRef} aria-hidden="true">Calling the roll</span>
        <span className="openingb-ctl">
          <button type="button" className="openingb-m openingb-btn" aria-pressed={soundOn} onClick={toggleSound} onPointerDown={(e) => e.stopPropagation()}>
            Sound {soundOn ? 'on' : 'off'}
          </button>
          <button type="button" className="openingb-m openingb-btn" onClick={(e) => { e.stopPropagation(); finish(); }} onPointerDown={(e) => e.stopPropagation()}>
            Skip
          </button>
        </span>
      </div>
      <p className="openingb-sr" aria-live="polite">DXB MUN 2027. The floor is open.</p>
    </div>
  );
}
