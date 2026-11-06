// The ORDER, ORDER loader, copied unchanged from Alt 5 · Motion (timing, type, colours). Three strikes: "ORDER," /
// "ORDER, ORDER" / the line compresses and its letters hard-swap into the wordmark. Then a hard cut to the dither hero.
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { conference } from '@/data/conference';
import { onReady, solveWidth, textWidth } from './kinetic';

declare global {
  interface Window { __alt5Loader?: gsap.core.Timeline; __alt5Pause?: boolean }
}

const phone = () => innerWidth < 720;

export function Loader({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const [strike, setStrike] = useState(0);
  const [lines] = useState(() => (phone()
    ? { src: ['ORDER,', 'ORDER'], dst: ['DXB MUN', '2027'] }
    : { src: ['ORDER, ORDER'], dst: ['DXB MUN 2027'] }));

  useEffect(() => {
    const html = document.documentElement;
    html.dataset.ld = '0';
    let tl: gsap.core.Timeline | null = null;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      html.dataset.ld = 'done';
      onDone();
    };
    const skip = () => { if (tl) tl.progress(1); else finish(); };
    const onKey = (e: KeyboardEvent) => { if (e.key !== 'Tab') skip(); };
    addEventListener('keydown', onKey);
    addEventListener('wheel', skip, { passive: true });
    addEventListener('pointerdown', skip);

    onReady(() => {
      const r = root.current;
      if (!r || finished) return;
      const rows = Array.from(r.querySelectorAll<HTMLElement>('.ld-row'));
      const spans = rows.map((row) => Array.from(row.querySelectorAll<HTMLElement>('.ld-c')));
      const all = spans.flat();
      const gut = phone() ? 16 : 32;
      const W = (innerWidth - gut * 2) * 0.96;
      const widest = Math.max(...lines.src.map((s) => textWidth(s, phone() ? 54 : 70, 900, -0.01)));
      const F = Math.min(W / widest, innerHeight * (phone() ? 0.17 : 0.34));
      rows.forEach((row) => { row.style.fontSize = F.toFixed(1) + 'px'; });
      const fitSrc = Math.min(...lines.src.map((s) => solveWidth(s, W / F, 900, -0.01)));
      const fitDst = Math.min(...lines.dst.map((s) => solveWidth(s, W / F, 900, -0.01)));
      const ax = { w: solveWidth(lines.src[0].slice(0, 6), W / F, 900, -0.01), g: 900 };
      const paint = () => { for (const s of all) s.style.fontVariationSettings = `"wdth" ${ax.w.toFixed(1)}, "wght" ${ax.g.toFixed(0)}`; };
      paint();
      // which letters belong to strike 1 and strike 2
      const first: HTMLElement[] = [], second: HTMLElement[] = [];
      if (rows.length === 1) spans[0].forEach((s, i) => (i < 6 ? first : second).push(s));
      else { first.push(...spans[0]); second.push(...spans[1]); }
      second.forEach((s) => { s.style.display = 'none'; });
      const hit = (n: number) => () => {
        setStrike(n);
        html.dataset.ld = String(n);
        r.classList.add('is-hit');
        gsap.delayedCall(0.14, () => r.classList.remove('is-hit'));
        gsap.fromTo(rows, { y: -0.06 * F }, { y: 0, duration: 0.3, ease: 'power4.out', overwrite: true });
      };
      tl = gsap.timeline({ onComplete: finish, onUpdate: paint });
      tl.set(r, { '--ready': 1 })
        .add(hit(1), 0.15)
        .set(first, { visibility: 'visible' }, 0.15)
        .add(hit(2), 0.72)
        .set(second, { display: 'inline-block', visibility: 'visible' }, 0.72)
        .set(ax, { w: fitSrc }, 0.72)
        .to(ax, { w: 50, g: 180, duration: 0.5, ease: 'power3.in' }, 1.02)
        .add(hit(3), 1.55);
      // hard letter swaps, left to right
      let k = 0;
      spans.forEach((row, ri) => {
        const dst = lines.dst[ri];
        row.forEach((s, i) => {
          const ch = dst[i];
          tl!.call(() => {
            if (ch === undefined) s.style.display = 'none';
            else { s.textContent = ch === ' ' ? ' ' : ch; s.style.display = 'inline-block'; }
          }, undefined, 1.55 + k * 0.028);
          k++;
        });
      });
      tl.to(ax, { w: fitDst, g: 900, duration: 0.6, ease: 'expo.out' }, 1.55 + k * 0.028 + 0.02)
        .to({}, { duration: 0.32 });
      window.__alt5Loader = tl;
      if (window.__alt5Pause) tl.pause();
    });
    return () => {
      removeEventListener('keydown', onKey);
      removeEventListener('wheel', skip);
      removeEventListener('pointerdown', skip);
      tl?.kill();
    };
  }, [lines, onDone]);

  return (
    <div className="loader" ref={root} role="status" aria-label="Loading DXB MUN 2027">
      <span className="ld-corner ld-tl mono">{conference.edition} · {conference.kind}</span>
      <span className="ld-corner ld-tr mono">Gavel <b>{strike}</b> / 3</span>
      <span className="ld-corner ld-bl mono">{strike < 3 ? 'The chair calls the house to order' : 'The floor is open'}</span>
      <span className="ld-corner ld-br mono">{matchMedia('(pointer: coarse)').matches ? 'Tap to skip' : 'Press any key to skip'}</span>
      <div className="ld-lines" aria-hidden="true">
        {lines.src.map((s, ri) => {
          const n = Math.max(s.length, lines.dst[ri].length);
          return (
            <div className="ld-row" key={ri}>
              {Array.from({ length: n }, (_, i) => (
                <span className="ld-c" key={i} style={i >= s.length ? { display: 'none' } : undefined}>{s[i] === ' ' ? ' ' : s[i] ?? ''}</span>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
