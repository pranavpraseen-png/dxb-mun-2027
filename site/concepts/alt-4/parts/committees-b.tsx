// NAME: Nameplate rail
// IDEA: All 19 committees as delegate nameplates lying flat along one desk edge; drag, swipe or arrow through them with inertia, and the one in front of you stands up and gives its full name.
// WHY: One plate in focus at a time keeps the load to one name (chunking); dragging with real inertia gives agency and a physical, tactile feel; the standing plate is the single isolated thing on screen.
// WILD: Let the visitor raise the plate: hold on a standing nameplate and it tips up vertically, the way delegates raise theirs to speak, to open that committee's page.
import { useCallback, useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { committees, tba } from '@/data/conference';
import { isStill } from '@/shared/hooks';
import './committees-b.css';

const pad2 = (n: number) => String(n).padStart(2, '0');
const N = committees.length;

export function CommitteesB({ id }: { id?: string }) {
  const sid = id ?? 'committees';
  const still = isStill();
  const rail = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0); // the plate nearest the centre, live while moving
  const [shown, setShown] = useState(0); // the caption: changes only when the rail has come to rest
  const tween = useRef<gsap.core.Tween | null>(null);
  const drag = useRef({ on: false, x: 0, left: 0, moved: 0, t: 0, v: 0, lastX: 0 });

  const centreOf = (el: HTMLElement, r: HTMLElement) => el.offsetLeft + el.offsetWidth / 2 - r.clientWidth / 2;
  const plates = () => Array.from(rail.current?.querySelectorAll<HTMLElement>('.committeesb-item') ?? []);
  const nearest = (left: number) => {
    const r = rail.current!;
    let best = 0, d = Infinity;
    plates().forEach((p, i) => { const dd = Math.abs(centreOf(p, r) - left); if (dd < d) { d = dd; best = i; } });
    return best;
  };

  /** Glide to plate i. The rail's own snapping is paused while gsap moves it, then handed back. */
  const go = useCallback((i: number, dur?: number) => {
    const r = rail.current; if (!r) return;
    const idx = Math.max(0, Math.min(N - 1, i));
    const p = plates()[idx]; if (!p) return;
    const to = centreOf(p, r);
    tween.current?.kill();
    if (still) { r.scrollLeft = to; setActive(idx); setShown(idx); return; }
    r.classList.add('is-moving');
    const d = dur ?? Math.min(0.9, 0.35 + Math.abs(to - r.scrollLeft) / 2400);
    tween.current = gsap.to(r, { scrollLeft: to, duration: d, ease: 'power3.out', overwrite: true,
      onComplete: () => { r.classList.remove('is-moving'); setShown(idx); } });
  }, [still]);

  // Track the centre plate while scrolling; settle the caption 120 ms after the rail stops (fast flicks never flash names).
  useEffect(() => {
    const r = rail.current; if (!r) return;
    let raf = 0, rest = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setActive(nearest(r.scrollLeft)));
      clearTimeout(rest);
      rest = window.setTimeout(() => setShown(nearest(r.scrollLeft)), 120);
    };
    r.addEventListener('scroll', on, { passive: true });
    return () => { r.removeEventListener('scroll', on); cancelAnimationFrame(raf); clearTimeout(rest); };
  }, []);

  // Mouse drag with inertia. Touch and trackpads keep the browser's own momentum and snapping.
  const onDown = (e: React.PointerEvent) => {
    drag.current.moved = 0;
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    const r = rail.current!;
    tween.current?.kill();
    drag.current = { on: true, x: e.clientX, left: r.scrollLeft, moved: 0, t: performance.now(), v: 0, lastX: e.clientX };
    r.classList.add('is-moving', 'is-drag');
    r.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d.on) return;
    const r = rail.current!;
    const now = performance.now(), dt = Math.max(1, now - d.t);
    d.v = 0.8 * ((e.clientX - d.lastX) / dt) + 0.2 * d.v;
    d.t = now; d.lastX = e.clientX;
    d.moved = Math.max(d.moved, Math.abs(e.clientX - d.x));
    r.scrollLeft = d.left - (e.clientX - d.x);
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current; if (!d.on) return;
    d.on = false;
    const r = rail.current!;
    r.classList.remove('is-drag');
    r.releasePointerCapture?.(e.pointerId);
    // Throw: project the release velocity forward, then land on the nearest plate.
    const projected = r.scrollLeft - d.v * 260;
    go(nearest(projected), Math.min(1.1, 0.45 + Math.abs(d.v) * 0.25));
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(active + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(active - 1); }
    else if (e.key === 'Home') { e.preventDefault(); go(0); }
    else if (e.key === 'End') { e.preventDefault(); go(N - 1); }
  };

  const c = committees[shown];
  return (
    <section id={sid} className="committeesb" aria-labelledby={sid + '-h'}>
      <div className="committeesb-wrap">
        <p className="committeesb-label"><span>02</span>Committees</p>
        <div className="committeesb-head">
          <h2 className="committeesb-h" id={sid + '-h'}>{N} nameplates. One floor each.</h2>
          <p className="committeesb-sub">Drag, swipe or use the arrow keys. Agendas {tba(null).toLowerCase()}.</p>
        </div>
      </div>

      <div className="committeesb-stage">
        <div ref={rail} className="committeesb-rail" role="listbox" aria-label="The 19 committees" aria-orientation="horizontal"
          aria-activedescendant={`${sid}-plate-${active}`} tabIndex={0} onKeyDown={onKey}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <ol className="committeesb-list">
            {committees.map((cm, i) => (
              <li key={cm.abbr} className={'committeesb-item' + (i === active ? ' is-up' : '') + (Math.abs(i - active) === 1 ? ' is-near' : '')}>
                <div id={`${sid}-plate-${i}`} role="option" aria-selected={i === active} aria-label={`${cm.abbr}, ${cm.name}`}
                  className="committeesb-plate" data-len={cm.abbr.length > 6 ? 'l' : cm.abbr.length > 4 ? 'm' : 's'}
                  onClick={() => { if (drag.current.moved < 6) go(i); }}>
                  <span className="committeesb-ridge" aria-hidden="true" />
                  <span className="committeesb-n" aria-hidden="true">{pad2(i + 1)}</span>
                  <span className="committeesb-abbr" aria-hidden="true">{cm.abbr}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="committeesb-desk" aria-hidden="true" />
      </div>

      <div className="committeesb-wrap committeesb-cap" aria-live="polite">
        <p className="committeesb-count"><b>{pad2(shown + 1)}</b> / {N}</p>
        <div className="committeesb-name">
          <p className="committeesb-abbr2">{c.abbr}</p>
          <h3 className="committeesb-full">{c.name}</h3>
        </div>
        <dl className="committeesb-dl">
          <div><dt>Agenda</dt><dd>{tba(null)}</dd></div>
        </dl>
        <div className="committeesb-nav">
          <button type="button" className="committeesb-btn" onClick={() => go(active - 1)} disabled={active === 0} aria-label="Previous committee">
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12.5 4 6.5 10l6 6" /></svg>
          </button>
          <button type="button" className="committeesb-btn" onClick={() => go(active + 1)} disabled={active === N - 1} aria-label="Next committee">
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7.5 4l6 6-6 6" /></svg>
          </button>
        </div>
      </div>
    </section>
  );
}
