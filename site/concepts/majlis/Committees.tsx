import { useCallback, useEffect, useRef, useState } from 'react';
import NumberFlow from '@number-flow/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { committees } from '@/data/conference';
import { archPath } from './lattice';
import { Star } from './ornament';

// Niches share one aspect ratio at every size, so a fixed viewBox keeps the arch true.
const NW = 240, NH = 341;
const OUTER = archPath(NW, NH, 0, 0.6);
const INNER = archPath(NW, NH, 12, 0.6);
const INNER2 = archPath(NW, NH, 17, 0.6);

const fit = (abbr: string) => (abbr.length >= 8 ? 'n-abbr n-xl' : abbr.length >= 6 ? 'n-abbr n-l' : 'n-abbr');

export function Committees({ still }: { still: boolean }) {
  const track = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  // While a button-driven scroll glides, ignore the in-between positions.
  const lock = useRef(0);
  const total = committees.length;

  const measure = useCallback(() => {
    const el = track.current;
    if (!el || Date.now() < lock.current) return;
    const items = el.children;
    const anchor = el.scrollLeft + parseFloat(getComputedStyle(el).paddingLeft);
    let best = 0, dist = Infinity;
    for (let i = 0; i < items.length; i++) {
      const it = items[i] as HTMLElement;
      const d = Math.abs(it.offsetLeft - anchor);
      if (d < dist) { dist = d; best = i; }
    }
    setActive(best);
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let raf = 0;
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); };
    el.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    measure();
    return () => { el.removeEventListener('scroll', on); window.removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, [measure]);

  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    const n = Math.max(0, Math.min(total - 1, i));
    const it = el.children[n] as HTMLElement;
    lock.current = Date.now() + (still ? 0 : 900);
    el.scrollTo({ left: it.offsetLeft - parseFloat(getComputedStyle(el).paddingLeft), behavior: still ? 'auto' : 'smooth' });
    setActive(n);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(active + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(active - 1); }
    else if (e.key === 'Home') { e.preventDefault(); go(0); }
    else if (e.key === 'End') { e.preventDefault(); go(total - 1); }
  };

  const current = committees[active];

  return (
    <section id="committees" className="cmt" aria-labelledby="cmt-h">
      <div className="wrap cmt-head">
        <div>
          <h2 id="cmt-h" className="h2 on-dark">The committees</h2>
          <p className="cmt-sub">
            Nineteen rooms, each with its own agenda. Swipe along the arcade, use the arrows, or focus it and use the arrow keys.
          </p>
        </div>
        <div className="cmt-ctl">
          <p className="cmt-count" aria-hidden="true">
            <NumberFlow value={active + 1} format={{ minimumIntegerDigits: 2 }} animated={!still} />
            <span className="cmt-of">of {total}</span>
          </p>
          <button type="button" className="ring" onClick={() => go(active - 1)} disabled={active === 0} aria-label="Previous committee">
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
          <button type="button" className="ring" onClick={() => go(active + 1)} disabled={active === total - 1} aria-label="Next committee">
            <ChevronRight size={22} aria-hidden="true" />
          </button>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">{`Committee ${active + 1} of ${total}: ${current.name} (${current.abbr})`}</p>

      <ul
        ref={track}
        className="arcade"
        tabIndex={0}
        role="list"
        aria-label="Committees, use the left and right arrow keys to browse"
        onKeyDown={onKey}
      >
        {committees.map((c, i) => (
          <li key={c.abbr} className={'niche' + (i === active ? ' is-on' : '')} onClick={() => go(i)} aria-current={i === active ? 'true' : undefined}>
            <svg className="niche-svg" viewBox={`0 0 ${NW} ${NH}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
              <path d={OUTER} className="niche-fill" />
              <path d={INNER} className="niche-line" />
              <path d={INNER2} className="niche-line niche-line-2" />
            </svg>
            <div className="niche-body">
              <Star size={30} className="orn niche-star" />
              <h3 className={fit(c.abbr)}>{c.abbr}</h3>
              <p className="n-name">{c.name}</p>
              <span className="n-idx" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
