// Sign-in backdrop: the website's opening loader (ORDER, ORDER, live on dxbmun-2027) turned into a living background.
// Owner, 2026-11-07: "look at how smooth n how the animation rolls, make it insane, make it like the starting loading
// page of the website". Same engine and type as that loader: Anybody (wdth + wght axes) measured by combo-1/kinetic,
// GSAP for the strikes, Martian Mono for the small label.
//
//   1. Three gavel strikes, the loader's rhythm (0.15 s, 0.72 s, 1.55 s): odd rows land, even rows land, every letter
//      compresses thin, flashes orange, then springs open.
//   2. Then it rolls: a slow wave of width and weight travels through every letter of every row, each row a step behind
//      the one above, so the whole block of DXB MUN rolls like cloth. The crest catches a little orange.
//   3. The cursor: letters near it swell wider and heavier.
// Every row always fills the column exactly (one width correction per row per frame). No blur, no glow.
//
// Two alternatives (owner: "give 2 more alts"), same type and engine:
//   reels  Roll call: six tall reels roll vertically; left to right each slows and locks on its letter, so D X B M U N
//          lands across the middle, each letter flashing as it lands. Hold, roll again. Letters swell as they pass
//          the middle row, like a drum.
//   bands  Session in progress: five bands of words glide sideways in alternating directions; a lens in the middle
//          (it follows the cursor) makes letters swell wide and heavy as they pass through it.
// Live since 2026-11-07: each person gets one of the three at random (pickBackdrop). Reduced motion: everything sits still.
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import '@fontsource-variable/anybody/wdth.css';
import '@fontsource-variable/martian-mono/wdth.css';
import { charWidth, onReady, start, textWidth } from '../../concepts/combo-1/kinetic';
import './backdrop.css';

export type BackdropKind = 'floor' | 'reels' | 'bands';

const KINDS: BackdropKind[] = ['floor', 'reels', 'bands'];
const PICK_KEY = 'dxbmun-signin-bg';
const isKind = (v: unknown): v is BackdropKind => typeof v === 'string' && (KINDS as string[]).includes(v);

/**
 * Which backdrop this person sees. Owner, 2026-11-07: "do all, make it random: for one person it's alt 1 and the
 * other is alt 2". The first visit picks one of the three at random and the device keeps it, so each person has
 * their own. ?bg=floor|reels|bands shows a given one (preview) without changing the person's pick.
 */
export function pickBackdrop(): BackdropKind {
  try {
    const v = new URLSearchParams(location.search).get('bg');
    if (isKind(v)) return v;
  } catch { /* no URL */ }
  try {
    const kept = localStorage.getItem(PICK_KEY);
    if (isKind(kept)) return kept;
    const pick = KINDS[Math.floor(Math.random() * KINDS.length)];
    localStorage.setItem(PICK_KEY, pick);
    return pick;
  } catch {
    return KINDS[Math.floor(Math.random() * KINDS.length)];
  }
}

const WORD = 'DXB MUN';
const TRACK = -0.01;
const PAPER = [242, 239, 232];
const SIGNAL = [255, 77, 0];
const still = () => {
  try { return matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('still'); }
  catch { return false; }
};
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function Backdrop({ kind }: { kind: BackdropKind }) {
  if (kind === 'reels') return <Reels />;
  if (kind === 'bands') return <Bands />;
  return <Floor />;
}

const colour = (o: number, a: number) => {
  const c = PAPER.map((p, j) => Math.round(p + (SIGNAL[j] - p) * o));
  return `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;
};

/** Alt 1 · The floor: rows of DXB MUN after the loader's three strikes, rolling like cloth. */
function Floor() {
  const kind = 'floor';
  const box = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState(0);
  const [strike, setStrike] = useState(0);

  // How many rows fill the column (recomputed on resize).
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    start();
    const fit = () => onReady(() => {
      const { width, height } = el.getBoundingClientRect();
      const F = width / textWidth(WORD, 100, 700, TRACK);
      setRows(Math.max(3, Math.ceil(height / (F * 0.8)) + 1));
    });
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = box.current;
    if (!el || !rows) return;
    let raf = 0;
    let alive = true;
    const rowEls = Array.from(el.querySelectorAll<HTMLElement>('.bd-row'));
    const spans = rowEls.map((r) => Array.from(r.querySelectorAll<HTMLElement>('.bd-c')));
    const chars = WORD.split('');
    const n = chars.length;
    // The show's controls, tweened by the intro strikes.
    const s = { amp: 0, base: 100, weight: 700, flash: 0, alpha: 1, t0: performance.now() };
    const shown = rowEls.map(() => 0);
    const pointer = { x: -1e4, y: -1e4, on: false };
    let geo = { left: 0, top: 0, width: 1, F: 1, rowH: 1 };
    const measure = () => {
      const r = el.getBoundingClientRect();
      const F = r.width / textWidth(WORD, 100, 700, TRACK);
      geo = { left: r.left, top: r.top, width: r.width, F, rowH: F * 0.8 };
      rowEls.forEach((row) => { row.style.fontSize = `${F.toFixed(2)}px`; });
    };
    const onMove = (e: PointerEvent) => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.on = true; };
    const onLeave = () => { pointer.on = false; };

    const paint = (now: number) => {
      const t = (now - s.t0) / 1000;
      const targetEm = geo.width / geo.F;
      for (let r = 0; r < rowEls.length; r++) {
        if (!shown[r]) continue;
        const row = spans[r];
        let em = 0;
        const ws = new Array<number>(n), gs = new Array<number>(n);
        for (let i = 0; i < n; i++) {
          // One full wave across the row, travelling right to left; each row half a step behind the one above.
          const phase = Math.PI * 2 * (i / n - t * 0.11) + r * 0.62;
          const wave = Math.sin(phase);
          let w = s.base + s.amp * 46 * wave;
          let g = s.weight + s.amp * 330 * Math.sin(phase + 0.5);
          if (pointer.on) {
            const cx = geo.left + ((i + 0.5) / n) * geo.width;
            const cy = geo.top + (r + 0.5) * geo.rowH;
            const d = Math.hypot(pointer.x - cx, pointer.y - cy);
            const k = smooth(260, 0, d) * s.amp;
            w += 34 * k; g += 260 * k;
          }
          w = Math.min(150, Math.max(50, w)); g = Math.min(900, Math.max(100, g));
          ws[i] = w; gs[i] = g;
          em += charWidth(chars[i], w, g) + TRACK;
          // Crest light: off-white rising to orange at the top of the wave; the strike flash turns everything orange.
          const crest = smooth(0.55, 1, wave) * s.amp;
          const o = Math.max(crest, s.flash);
          const c = PAPER.map((p, j) => Math.round(p + (SIGNAL[j] - p) * o));
          const a = (0.075 + 0.2 * crest + 0.35 * s.flash) * s.alpha;
          const sp = row[i];
          sp.style.fontVariationSettings = `"wdth" ${w.toFixed(1)}, "wght" ${g.toFixed(0)}`;
          sp.style.color = `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;
        }
        // Keep the row exactly as wide as the column.
        rowEls[r].style.transform = `scaleX(${(targetEm / em).toFixed(4)})`;
      }
    };

    const loop = (now: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(loop);
      if (!document.hidden) paint(now);
    };

    onReady(() => {
      if (!alive) return;
      measure();
      if (still()) {
        rowEls.forEach((_, r) => { shown[r] = 1; rowEls[r].style.visibility = 'visible'; });
        s.amp = 0.35; setStrike(3); paint(performance.now() + 3000);
        return;
      }
      // The loader's three strikes.
      const hit = (n: number, rowsToShow: (r: number) => boolean) => () => {
        setStrike(n);
        rowEls.forEach((row, r) => { if (rowsToShow(r)) { shown[r] = 1; row.style.visibility = 'visible'; } });
        gsap.fromTo(s, { flash: 1 }, { flash: 0, duration: 0.42, ease: 'power2.out', overwrite: 'auto' });
        gsap.fromTo(rowEls, { y: -0.06 * geo.F }, { y: 0, duration: 0.3, ease: 'power4.out', overwrite: true });
      };
      const tl = gsap.timeline();
      tl.add(hit(1, (r) => r % 2 === 0), 0.15)
        .add(hit(2, () => true), 0.72)
        .to(s, { base: 50, weight: 180, duration: 0.5, ease: 'power3.in' }, 1.02)
        .add(hit(3, () => true), 1.55)
        .to(s, { base: 100, weight: 560, duration: 0.9, ease: 'expo.out' }, 1.6)
        .to(s, { amp: 1, duration: 2.4, ease: 'sine.inOut' }, 1.75);
      raf = requestAnimationFrame(loop);
      addEventListener('pointermove', onMove, { passive: true });
      document.documentElement.addEventListener('pointerleave', onLeave);
      addEventListener('resize', measure);
    });
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      gsap.killTweensOf(s);
      removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      removeEventListener('resize', measure);
    };
  }, [rows]);

  return (
    <div ref={box} className={`bd bd-${kind}`} aria-hidden="true">
      <div className="bd-rows">
        {Array.from({ length: rows }, (_, r) => (
          <div className="bd-row" key={r}>
            {WORD.split('').map((ch, i) => <span className="bd-c" key={i}>{ch === ' ' ? ' ' : ch}</span>)}
          </div>
        ))}
      </div>
      <p className="bd-label">
        Gavel <b>{strike}</b> / 3 · {strike < 3 ? 'The chair calls the house to order' : 'The floor is open'}
      </p>
    </div>
  );
}

// ───────────────────────── Alt 2 · Roll call ─────────────────────────
const TARGET = 'DXBMUN';
const REEL_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const REEL_LEN = 24;
const reelFont = (width: number) => ((width / 6) * 0.94) / charWidth('M', 130, 900);

function Reels() {
  const box = useRef<HTMLDivElement>(null);
  const [slots, setSlots] = useState(0);
  const [present, setPresent] = useState(0);
  // Each reel: its letter at index 0, then random letters (fixed for the page load).
  const [strips] = useState(() => TARGET.split('').map((t) => [t, ...Array.from({ length: REEL_LEN - 1 }, () => REEL_CHARS[Math.floor(Math.random() * REEL_CHARS.length)])]));

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    start();
    const fit = () => onReady(() => {
      const r = el.getBoundingClientRect();
      setSlots(Math.ceil(r.height / (reelFont(r.width) * 0.86)) + 3);
    });
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = box.current;
    if (!el || !slots) return;
    let alive = true;
    let raf = 0;
    const cols = Array.from(el.querySelectorAll<HTMLElement>('.bd-reel'));
    const cells = cols.map((c) => Array.from(c.querySelectorAll<HTMLElement>('.bd-cell')));
    const mid = Math.floor(slots / 2);
    // Offsets in rows; start part-way through a strip so the first lock is a real roll.
    const os = cols.map(() => ({ v: -REEL_LEN * 2 - Math.random() * REEL_LEN, flash: 0, lit: 0 }));
    let geo = { F: 1, rowH: 1, cy: 0 };
    const measure = () => {
      const r = el.getBoundingClientRect();
      const F = reelFont(r.width);
      geo = { F, rowH: F * 0.86, cy: r.height / 2 };
      cols.forEach((c) => { c.style.fontSize = `${F.toFixed(2)}px`; });
    };
    const shown = cells.map((col) => col.map(() => ''));

    const paint = () => {
      for (let c = 0; c < cols.length; c++) {
        const o = os[c];
        const base = Math.floor(o.v);
        const frac = o.v - base;
        for (let j = 0; j < slots; j++) {
          const idx = (((base + j - mid) % REEL_LEN) + REEL_LEN) % REEL_LEN;
          const ch = strips[c][idx];
          const cell = cells[c][j];
          if (shown[c][j] !== ch) { cell.textContent = ch; shown[c][j] = ch; }
          // Distance from the middle row, in rows: letters swell as they pass it, like a drum.
          const d = j - mid - frac;
          const g = Math.exp(-(d * d) / 1.3);
          const w = 52 + 78 * g;
          const wt = 160 + 740 * g;
          const y = geo.cy + d * geo.rowH - geo.F * 0.5;
          cell.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
          cell.style.fontVariationSettings = `"wdth" ${w.toFixed(1)}, "wght" ${wt.toFixed(0)}`;
          // Locked letters glow bright enough to read through the see-through card.
          const a = 0.06 + 0.14 * g + (0.55 * o.lit + 0.3 * o.flash) * g;
          cell.style.color = colour(Math.min(1, o.flash * g + 0.35 * o.lit * g), Math.min(0.85, a));
        }
      }
    };
    const loop = () => { if (!alive) return; raf = requestAnimationFrame(loop); if (!document.hidden) paint(); };

    const cycle = () => {
      if (!alive) return;
      setPresent(0);
      os.forEach((o, c) => {
        gsap.to(o, { lit: 0, duration: 0.4, ease: 'power2.out' });
        // Roll about two full reels and lock on the letter, left to right.
        const target = (Math.floor(o.v / REEL_LEN) + 3) * REEL_LEN;
        gsap.to(o, {
          v: target, duration: 2.6 + c * 0.24, ease: 'power3.inOut', delay: c * 0.05,
          onComplete: () => {
            if (!alive) return;
            setPresent((n) => Math.max(n, c + 1));
            gsap.fromTo(o, { flash: 1 }, { flash: 0, duration: 0.5, ease: 'power2.out' });
            gsap.to(o, { lit: 1, duration: 0.3, ease: 'power2.out' });
            if (c === cols.length - 1) {
              gsap.fromTo(cols, { y: -0.04 * geo.F }, { y: 0, duration: 0.3, ease: 'power4.out' });
              gsap.delayedCall(2.8, cycle);
            }
          },
        });
      });
    };

    onReady(() => {
      if (!alive) return;
      measure();
      if (still()) { os.forEach((o) => { o.v = 0; o.lit = 1; }); setPresent(6); paint(); return; }
      raf = requestAnimationFrame(loop);
      cycle();
      addEventListener('resize', measure);
    });
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      os.forEach((o) => gsap.killTweensOf(o));
      gsap.killTweensOf(cycle);
      removeEventListener('resize', measure);
    };
  }, [slots, strips]);

  return (
    <div ref={box} className="bd bd-reels" aria-hidden="true">
      {slots > 0 && TARGET.split('').map((t, c) => (
        <div className="bd-reel" key={t + c} style={{ left: `${(c * 100) / 6}%` }}>
          {Array.from({ length: slots }, (_, j) => <span className="bd-cell" key={j} />)}
        </div>
      ))}
      <p className="bd-label">Roll call · <b>{present}</b> / 6 present{present === 6 ? ' · The floor is open' : ''}</p>
    </div>
  );
}

// ───────────────────────── Alt 3 · Session in progress ─────────────────────────
const BAND_TEXT = ['DXB MUN 2027 · ', 'ORDER, ORDER · ', 'THE FLOOR IS OPEN · ', 'DXB MUN · DUBAI · ', 'ORDER, ORDER · '];
const BANDS = BAND_TEXT.length;

function Bands() {
  const box = useRef<HTMLDivElement>(null);
  const [pool, setPool] = useState(0);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    start();
    const fit = () => onReady(() => {
      const r = el.getBoundingClientRect();
      const F = r.height / (BANDS * 0.86);
      // Enough letters to cover the width when they're squeezed thinnest at the edges.
      setPool(Math.ceil((r.width * 2.2) / (charWidth('I', 50, 300) * F)) + 6);
    });
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = box.current;
    if (!el || !pool) return;
    let alive = true;
    let raf = 0;
    const bandEls = Array.from(el.querySelectorAll<HTMLElement>('.bd-band'));
    const spans = bandEls.map((b) => Array.from(b.querySelectorAll<HTMLElement>('.bd-g')));
    const REST_W = 80, REST_G = 400;
    const text = BAND_TEXT.map((t) => t.split(''));
    const adv = text.map((cs) => cs.map((ch) => charWidth(ch, REST_W, REST_G) - 0.01)); // em, at rest
    const period = adv.map((a) => a.reduce((x, y) => x + y, 0));
    const shown = spans.map((b) => b.map(() => ''));
    const st = { speed: 7, alpha: 0, t: 0 };
    const scroll = text.map((_, b) => Math.random() * period[b]);
    const lens = { x: 0.5, target: 0.5, pointer: false };
    let geo = { W: 1, H: 1, left: 0, F: 1 };
    const measure = () => {
      const r = el.getBoundingClientRect();
      const F = r.height / (BANDS * 0.86);
      geo = { W: r.width, H: r.height, left: r.left, F };
      bandEls.forEach((b) => { b.style.fontSize = `${F.toFixed(2)}px`; });
    };
    // The lens: a smooth warp of x that always increases (so letters never overlap), about 2x at its centre.
    const warp = (x: number, cx: number, sig: number) => { const u = (x - cx) / sig; return x + 0.95 * sig * u * Math.exp(-u * u); };
    const onMove = (e: PointerEvent) => { lens.target = (e.clientX - geo.left) / Math.max(1, geo.W); lens.pointer = true; };
    const onLeave = () => { lens.pointer = false; };
    let last = performance.now();

    const paint = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      st.t += dt;
      if (!lens.pointer) lens.target = 0.5 + 0.22 * Math.sin(st.t * 0.21);
      lens.x += (lens.target - lens.x) * Math.min(1, dt * 2.2);
      const F = geo.F;
      const cx = lens.x * geo.W;
      const sig = geo.W * 0.3;
      for (let b = 0; b < bandEls.length; b++) {
        const dir = b % 2 ? 1 : -1;
        const v = (0.32 + 0.07 * b) * st.speed; // em per second
        scroll[b] = (((scroll[b] + dir * v * dt) % period[b]) + period[b]) % period[b];
        // Lay letters from one period left of the column until past the right edge.
        let x = -scroll[b] - period[b];
        let k = 0, i = 0;
        const cs = text[b], as = adv[b];
        while (k < spans[b].length && x * F < geo.W * 3) {
          const ch = cs[i], a = as[i];
          const xl = warp(x * F, cx, sig), xr = warp((x + a) * F, cx, sig);
          if (xr > -F && xl < geo.W + F) {
            const sp = spans[b][k];
            const mag = (xr - xl) / (a * F);
            const wt = Math.min(900, Math.max(150, REST_G + (mag - 1) * 560));
            // The wdth that gives this width, then a small scale for the remainder.
            const target = (xr - xl) / F;
            const c50 = charWidth(ch, 50, wt), c150 = charWidth(ch, 150, wt);
            const w = Math.min(150, Math.max(50, 50 + (100 * (target - c50)) / Math.max(1e-3, c150 - c50)));
            const sx = target / Math.max(1e-3, charWidth(ch, w, wt));
            if (shown[b][k] !== ch) { sp.textContent = ch === ' ' ? ' ' : ch; shown[b][k] = ch; }
            sp.style.transform = `translate3d(${xl.toFixed(1)}px,0,0) scaleX(${sx.toFixed(3)})`;
            sp.style.fontVariationSettings = `"wdth" ${w.toFixed(1)}, "wght" ${wt.toFixed(0)}`;
            const lift = Math.min(1, Math.max(0, (mag - 1) / 1.1));
            sp.style.color = colour(b === 1 || b === 4 ? lift * 0.9 : lift * 0.25, (0.06 + 0.26 * lift) * st.alpha);
            sp.style.visibility = 'visible';
            k++;
          }
          x += a;
          i = (i + 1) % cs.length;
        }
        for (; k < spans[b].length; k++) spans[b][k].style.visibility = 'hidden';
      }
    };
    const loop = (now: number) => { if (!alive) return; raf = requestAnimationFrame(loop); if (!document.hidden) paint(now); };

    onReady(() => {
      if (!alive) return;
      measure();
      if (still()) { st.speed = 0; st.alpha = 1; paint(performance.now()); return; }
      // Whoosh in fast, settle into a calm glide.
      gsap.to(st, { speed: 1, duration: 2.6, ease: 'expo.out' });
      gsap.to(st, { alpha: 1, duration: 1.2, ease: 'power2.out' });
      last = performance.now();
      raf = requestAnimationFrame(loop);
      addEventListener('pointermove', onMove, { passive: true });
      document.documentElement.addEventListener('pointerleave', onLeave);
      addEventListener('resize', measure);
    });
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      gsap.killTweensOf(st);
      removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      removeEventListener('resize', measure);
    };
  }, [pool]);

  return (
    <div ref={box} className="bd bd-bands" aria-hidden="true">
      {pool > 0 && BAND_TEXT.map((_, b) => (
        <div className="bd-band" key={b} style={{ top: `${(b * 100) / BANDS}%` }}>
          {Array.from({ length: pool }, (_, k) => <span className="bd-g" key={k} />)}
        </div>
      ))}
      <p className="bd-label">Session in progress · <b>The floor is open</b></p>
    </div>
  );
}
