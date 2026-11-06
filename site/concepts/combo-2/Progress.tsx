// The scroll indicator: Night Lab's 2px hairline under the top bar, cut into Alt 5's vote tally (Tally.tsx / floor.ts).
// One cell per nav section. FOR: a section you read fills orange. AGAINST: the brown track still ahead.
// ABSTAIN: a section you jumped past without stopping (less than 0.65 s in view) turns cream.
// Fills move by transform only; React re-renders only when the counts change. Styles: combo.css (.tally-line).
import { useEffect, useRef, useState } from 'react';
import { NAV } from './data';
import './opening/opening.css';

const DWELL = 650;

export function Progress() {
  const fills = useRef<(HTMLElement | null)[]>([]);
  const [tally, setTally] = useState({ read: 0, abs: [] as boolean[] });
  useEffect(() => {
    const visited = NAV.map(() => false);
    let active = -1, since = 0, raf = 0;
    let last = '';
    const box = (id: string) => {
      const el = document.getElementById(id);
      if (!el) return null;
      // a pinned section's spacer holds its scroll length; measure that when present
      return (el.parentElement?.classList.contains('pin-spacer') ? el.parentElement : el).getBoundingClientRect();
    };
    const tick = () => {
      raf = 0;
      const mid = window.innerHeight * 0.45;
      const now = performance.now();
      const p = NAV.map((n) => {
        const r = box(n.id);
        return r ? Math.min(1, Math.max(0, (mid - r.top) / Math.max(1, r.height))) : 0;
      });
      let a = -1;
      p.forEach((v, i) => { if (v > 0) a = i; });
      if (a !== active) { active = a; since = now; }
      if (a >= 0 && !visited[a] && now - since > DWELL) visited[a] = true;
      // the page's end: the last cells count as read once the bottom is reached
      const atEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
      const abs = NAV.map((_, i) => i < a && !visited[i]);
      p.forEach((v, i) => {
        const f = fills.current[i];
        if (!f) return;
        const s = atEnd ? 1 : i < a ? 1 : i === a ? v : 0;
        f.style.transform = `scaleX(${s.toFixed(4)})`;
      });
      const read = atEnd ? NAV.length : Math.max(0, a);
      const key = read + ':' + abs.map(Number).join('');
      if (key !== last) { last = key; setTally({ read, abs }); }
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick();
    // the dwell timer needs a beat even when the page is still
    const id = window.setInterval(on, 250);
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); cancelAnimationFrame(raf); clearInterval(id); };
  }, []);
  const abstain = tally.abs.filter(Boolean).length;
  const label = `Vote tally: for ${tally.read - abstain}, against ${NAV.length - tally.read}, abstain ${abstain} of ${NAV.length} sections`;
  return (
    <div className="nl-progress tally-line" role="img" aria-label={label}>
      {NAV.map((n, i) => (
        <span key={n.id} className={'tl-cell' + (tally.abs[i] ? ' is-abs' : '')}>
          <i ref={(el) => { fills.current[i] = el; }} />
        </span>
      ))}
    </div>
  );
}
