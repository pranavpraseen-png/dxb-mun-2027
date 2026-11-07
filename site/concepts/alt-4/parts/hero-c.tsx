// NAME: Placard wall
// IDEA: Twenty desk placards, the 19 committees and the host, stand up row by row and flip in a stadium card-stunt wave; their backs join into one huge DXB MUN 2027. Every card tilts toward the cursor on its own spring, a hovered card flips back to show its committee, and scrolling flips the wall back to the committees, top row first.
// WHY: The wordmark is literally made of the committees (part-whole: the brand is its rooms), a card under your hand peeking open rewards curiosity, and the scroll wave hands the visitor straight to the committee index, which is the first thing delegates look for.
// WILD: Make the stunt social: every visitor currently on the page holds one card, and the wall only completes when enough people are here, the way a real stand does it.
import { useEffect, useRef, type CSSProperties } from 'react';
import { committees, conference, tba } from '@/data/conference';
import { isStill } from '@/shared/hooks';
import { register } from '../links';
import { emit } from '../bus';
import './hero-c.css';

type Card = { abbr: string; name: string; idx: string; host?: boolean };
const CARDS: Card[] = [
  ...committees.map((c, i) => ({ abbr: c.abbr, name: c.name, idx: String(i + 1).padStart(2, '0') })),
  { abbr: 'IHS', name: conference.host, idx: 'Host', host: true },
];
const FONT = '"Archivo Variable", "Archivo", system-ui, sans-serif';

type Spring = { x: number; v: number; t: number; k: number; c: number };
const spring = (x: number, k: number, c: number): Spring => ({ x, v: 0, t: x, k, c });
const step = (s: Spring, dt: number) => { s.v += (s.k * (s.t - s.x) - s.c * s.v) * dt; s.x += s.v * dt; };
const rest = (s: Spring) => Math.abs(s.t - s.x) < 0.05 && Math.abs(s.v) < 0.05;

export function HeroC({ revealed }: { revealed: boolean }) {
  const sec = useRef<HTMLElement>(null);
  const wall = useRef<HTMLDivElement>(null);
  const api = useRef<{ reveal: () => void } | null>(null);

  useEffect(() => {
    const section = sec.current!, wallEl = wall.current!;
    const still = isStill();
    const cards = Array.from(wallEl.querySelectorAll<HTMLElement>('.heroc-card'));
    const backs = Array.from(wallEl.querySelectorAll<HTMLElement>('.heroc-back'));
    let mosaicUrl = '';
    let cols = 5, rows = 4, ch = 100, W = 1, H = 1;
    let rect = { x: 0, y: 0 };
    const pos: { x: number; y: number; w: number; h: number }[] = [];
    // Per card: raise (deg, 90 = lying flat), flip (0 = placard, 180 = wordmark), tilt x/y (deg), lift (px).
    const st = cards.map((_, i) => {
      const k = 1 + ((i * 37) % 11) / 30; // a slightly different spring per card: the wall ripples
      return {
        raise: spring(still ? 0 : 90, 170, 15), flip: spring(still ? 180 : 0, 115 * k, 16),
        rx: spring(0, 80 * k, 11), ry: spring(0, 80 * k, 11), z: spring(0, 90, 13),
        raiseAt: Infinity, flipAt: Infinity,
      };
    });
    let t0 = -1, peek = -1, scrollP = 0, raf = 0, last = 0, visible = true, cancelled = false;
    const pointer = { x: -1, y: -1, on: false };

    const measure = () => {
      const r = section.getBoundingClientRect();
      W = r.width; H = r.height;
      const wr = wallEl.getBoundingClientRect();
      cols = Number(getComputedStyle(wallEl).getPropertyValue('--cols')) || 5;
      rows = Math.ceil(cards.length / cols);
      // Layout positions without the 3D transforms (offset* ignore transforms).
      cards.forEach((c, i) => { pos[i] = { x: c.offsetLeft, y: c.offsetTop, w: c.offsetWidth, h: c.offsetHeight }; });
      ch = pos[0]?.h ?? 100;
      const ww = wallEl.offsetWidth, wh = wallEl.offsetHeight;
      rect = { x: wr.left - r.left, y: wr.top - r.top };
      // The mosaic: one wordmark drawn once, each card's back shows its own window onto it.
      // Each line sits inside one row of cards, so the seams cut letters only vertically, like a real card stunt.
      const lines: [string, string][] = cols >= 5 ? [['DXB MUN', '#F2F5F9'], ['2027', '#E5591C']] : [['DXB', '#F2F5F9'], ['MUN', '#F2F5F9'], ['2027', '#E5591C']];
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cvs = document.createElement('canvas');
      cvs.width = Math.max(1, Math.round(ww * dpr)); cvs.height = Math.max(1, Math.round(wh * dpr));
      const g = cvs.getContext('2d') as CanvasRenderingContext2D & { fontStretch?: string };
      g.scale(dpr, dpr);
      g.font = `900 100px ${FONT}`; g.fontStretch = 'expanded';
      const widest = Math.max(...lines.map(([l]) => g.measureText(l).width));
      const capR = g.measureText('DXB').actualBoundingBoxAscent / 100;
      const fs = Math.floor(Math.min((ww * 0.94 / widest) * 100, (ch * 0.9) / capR));
      g.font = `900 ${fs}px ${FONT}`; g.fontStretch = 'expanded';
      g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      const rowTop = [...new Set(pos.map((p) => p.y))].sort((a, b) => a - b);
      const first = Math.max(0, Math.floor((rowTop.length - lines.length) / 2));
      lines.forEach(([text, col], i) => {
        const top = rowTop[first + i] ?? 0;
        g.fillStyle = col;
        g.fillText(text, ww / 2, Math.round(top + (ch + fs * capR) / 2));
      });
      cvs.toBlob((b) => {
        if (!b) return;
        if (mosaicUrl) URL.revokeObjectURL(mosaicUrl);
        mosaicUrl = URL.createObjectURL(b);
        backs.forEach((el, i) => {
          el.style.backgroundImage = `url(${mosaicUrl})`;
          el.style.backgroundSize = `${ww}px ${wh}px`;
          el.style.backgroundPosition = `${-pos[i].x}px ${-pos[i].y}px`;
        });
      });
    };

    const apply = () => {
      cards.forEach((c, i) => {
        const s = st[i];
        const flat = s.raise.x > 88;
        c.style.visibility = flat ? 'hidden' : '';
        c.style.transform =
          `translateZ(${s.z.x.toFixed(1)}px) translateY(${(ch / 2).toFixed(1)}px) rotateX(${s.raise.x.toFixed(2)}deg) translateY(${(-ch / 2).toFixed(1)}px) ` +
          `rotateX(${s.rx.x.toFixed(2)}deg) rotateY(${s.ry.x.toFixed(2)}deg) rotateX(${s.flip.x.toFixed(2)}deg)`;
      });
      const sp = scrollP;
      wallEl.style.transform = `rotateX(${(6 + sp * 30).toFixed(2)}deg) translateY(${(-sp * 40).toFixed(1)}px)`;
    };

    const targets = (now: number) => {
      const r = section.getBoundingClientRect();
      scrollP = Math.min(1, Math.max(0, -r.top / (r.height * 0.7)));
      cards.forEach((_, i) => {
        const s = st[i], p = pos[i];
        if (!p) return;
        const row = Math.floor(i / cols), col = i % cols;
        s.raise.t = now >= s.raiseAt ? 0 : 90;
        let f = now >= s.flipAt ? 180 : 0;
        if (peek === i) f = 0;
        if (scrollP > 0.06 + (row / Math.max(1, rows - 1)) * 0.42 + col * 0.012) f = 0;
        s.flip.t = f;
        if (pointer.on) {
          const cx = rect.x + p.x + p.w / 2, cy = rect.y + p.y + p.h / 2;
          const dx = (pointer.x - cx) / W, dy = (pointer.y - cy) / H;
          s.ry.t = Math.max(-14, Math.min(14, dx * 34));
          s.rx.t = Math.max(-14, Math.min(14, -dy * 30));
          const d = Math.hypot(dx * W, dy * H);
          s.z.t = Math.max(0, 1 - d / (Math.max(W, H) * 0.28)) * 46;
        } else { s.rx.t = 0; s.ry.t = 0; s.z.t = 0; }
      });
    };

    const loop = (now: number) => {
      if (cancelled) return;
      raf = requestAnimationFrame(loop);
      if (!visible) return;
      const dt = Math.min(1 / 30, last ? (now - last) / 1000 : 1 / 60);
      last = now;
      targets(now);
      let moving = false;
      for (const s of st) for (const sp of [s.raise, s.flip, s.rx, s.ry, s.z]) { if (!rest(sp)) { step(sp, dt); moving = true; } }
      if (moving) apply();
    };

    const pick = (x: number, y: number) => {
      for (let i = 0; i < pos.length; i++) {
        const p = pos[i];
        if (x >= rect.x + p.x && x <= rect.x + p.x + p.w && y >= rect.y + p.y && y <= rect.y + p.y + p.h) return i;
      }
      return -1;
    };
    const onMove = (e: PointerEvent) => {
      const r = section.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      pointer.on = y >= 0 && y <= r.height; pointer.x = x; pointer.y = y;
      if (e.pointerType === 'mouse') peek = pick(x, y);
    };
    const onLeave = (e: PointerEvent) => { pointer.on = false; if (e.pointerType === 'mouse') peek = -1; };
    const onUp = (e: PointerEvent) => { if (e.pointerType !== 'mouse') pointer.on = false; }; // a lifted finger stops tilting; the peeked card stays open
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      const r = section.getBoundingClientRect();
      const i = pick(e.clientX - r.left, e.clientY - r.top);
      peek = peek === i ? -1 : i;
    };

    measure(); apply();
    const ro = new ResizeObserver(() => { measure(); apply(); });
    ro.observe(section);
    void document.fonts.load(`900 100px ${FONT}`).then(() => { if (!cancelled) { measure(); apply(); } });
    api.current = {
      reveal: () => {
        if (t0 >= 0 || still) return;
        t0 = performance.now();
        st.forEach((s, i) => {
          const row = Math.floor(i / cols), col = i % cols;
          s.raiseAt = t0 + (rows - 1 - row) * 70 + col * 18; // bottom row stands first
          s.flipAt = t0 + 640 + col * 60 + row * 22; // the stunt wave, left to right
        });
      },
    };
    if (!still) {
      const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 });
      io.observe(section);
      window.addEventListener('pointermove', onMove, { passive: true });
      document.documentElement.addEventListener('pointerleave', onLeave);
      window.addEventListener('pointerup', onUp, { passive: true });
      section.addEventListener('pointerdown', onDown);
      raf = requestAnimationFrame(loop);
      return () => {
        cancelled = true; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); if (mosaicUrl) URL.revokeObjectURL(mosaicUrl);
        window.removeEventListener('pointermove', onMove);
        document.documentElement.removeEventListener('pointerleave', onLeave);
        window.removeEventListener('pointerup', onUp);
        section.removeEventListener('pointerdown', onDown);
        api.current = null;
      };
    }
    return () => { cancelled = true; ro.disconnect(); api.current = null; if (mosaicUrl) URL.revokeObjectURL(mosaicUrl); };
  }, []);

  useEffect(() => { if (revealed) api.current?.reveal(); }, [revealed]);

  return (
    <section id="home" ref={sec} className="heroc" aria-label={conference.edition}>
      <div className="heroc-top">
        <span className="heroc-m">{conference.city} <i>·</i> {conference.kind}</span>
        <span className="heroc-m heroc-count">{committees.length} committees <i>·</i> 1 host</span>
      </div>
      <h1 className="heroc-h1">{conference.edition}</h1>
      <div className="heroc-stage">
        <div className="heroc-wall" ref={wall} aria-hidden="true">
          {CARDS.map((c) => (
            <div className={`heroc-card${c.host ? ' is-host' : ''}`} key={c.abbr}>
              <div className="heroc-face heroc-front">
                <span className="heroc-idx">{c.idx}</span>
                <span className="heroc-abbr" style={{ '--len': Math.max(3, c.abbr.length) } as CSSProperties}>{c.abbr}</span>
                <span className="heroc-name">{c.name}</span>
              </div>
              <div className="heroc-face heroc-back" />
            </div>
          ))}
        </div>
      </div>
      <div className="heroc-info">
        <p className="heroc-motto">{conference.motto}.</p>
        <p className="heroc-cell"><span className="heroc-m">Host</span><span>{conference.host}</span></p>
        <p className="heroc-cell"><span className="heroc-m">Dates</span><span>{tba(conference.dates)}</span></p>
        <p className="heroc-cell"><span className="heroc-m">Venue</span><span>{tba(conference.venue)}</span></p>
        <div className="heroc-cta">
          <a className="heroc-reg" href={register} onClick={() => emit('tap')}>Register</a>
          <a className="heroc-link" href="#committees">Committees <span aria-hidden="true">↓</span></a>
        </div>
      </div>
      <p className="heroc-sr">Hosted by {conference.host}.</p>
    </section>
  );
}
