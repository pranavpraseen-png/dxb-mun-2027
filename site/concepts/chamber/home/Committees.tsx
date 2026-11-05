import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import NumberFlow from '@number-flow/react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import clsx from 'clsx';
import { committees, conference } from '@/data/conference';
import { gsap, ScrollTrigger, useGSAP, scrollToY, useMedia, SCROLL_FEEL } from '../motion';

const LAST = committees.length - 1;
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * The committee rail. Desktop with motion: a pinned stage whose placard track is scrubbed sideways by
 * scroll (GSAP ScrollTrigger), with drag and arrow keys mapped back onto the scroll position.
 * Phones, touch-first screens and still mode: a native scroll-snap rail. Nothing traps the page.
 */
export function Committees({ still }: { still: boolean }) {
  const wide = useMedia('(min-width: 900px) and (hover: hover) and (pointer: fine)');
  const pinned = wide && !still;

  const section = useRef<HTMLElement>(null);
  const view = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLOListElement>(null);
  const st = useRef<ScrollTrigger | null>(null);
  const [index, setIndex] = useState(0);
  const [live, setLive] = useState('');

  /* ---------------- pinned mode ---------------- */
  useGSAP(
    () => {
      if (!pinned) return;
      const sec = section.current!;
      const tr = track.current!;
      const step = () => {
        const items = tr.children;
        return items.length > 1 ? (items[1] as HTMLElement).offsetLeft - (items[0] as HTMLElement).offsetLeft : 0;
      };
      const tween = gsap.fromTo(
        tr,
        { x: 0 },
        {
          x: () => -step() * LAST,
          ease: 'none',
          // Follow the smoothed tween (not the raw scroll) so the lit placard matches what is on screen.
          onUpdate() { setIndex(Math.round(this.progress() * LAST)); },
          scrollTrigger: {
            trigger: sec,
            start: 'top top',
            end: 'bottom bottom',
            scrub: SCROLL_FEEL.scrub,
            invalidateOnRefresh: true,
            // One placard per wheel notch: the pin gives each placard about one notch of scroll, then snaps.
            snap: { snapTo: 1 / LAST, duration: { min: 0.3, max: 0.8 }, ease: 'power2.inOut', directional: false, delay: 0.05 },
          },
        },
      );
      st.current = tween.scrollTrigger ?? null;
      ScrollTrigger.refresh();
      return () => { st.current = null; };
    },
    { scope: section, dependencies: [pinned] },
  );

  /* ---------------- native mode ---------------- */
  useEffect(() => {
    if (pinned) return;
    const v = view.current!;
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const items = track.current!.children;
        const step = items.length > 1 ? (items[1] as HTMLElement).offsetLeft - (items[0] as HTMLElement).offsetLeft : 1;
        setIndex(Math.max(0, Math.min(LAST, Math.round(v.scrollLeft / step))));
      });
    };
    v.addEventListener('scroll', on, { passive: true });
    on();
    return () => { v.removeEventListener('scroll', on); cancelAnimationFrame(raf); };
  }, [pinned]);

  const go = useCallback(
    (i: number) => {
      const n = Math.max(0, Math.min(LAST, i));
      const c = committees[n];
      setLive(`${c.abbr}, ${c.name}. ${n + 1} of ${committees.length}.`);
      if (pinned && st.current) {
        const s = st.current;
        scrollToY(s.start + ((s.end - s.start) * n) / LAST);
      } else if (view.current && track.current) {
        const items = track.current.children;
        const step = items.length > 1 ? (items[1] as HTMLElement).offsetLeft - (items[0] as HTMLElement).offsetLeft : 0;
        view.current.scrollTo({ left: step * n, behavior: still ? 'auto' : 'smooth' });
      }
    },
    [pinned, still],
  );

  const onKey = (e: KeyboardEvent) => {
    const map: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: LAST, PageDown: index + 3, PageUp: index - 3 };
    if (e.key in map) { e.preventDefault(); go(map[e.key]); }
  };

  // Drag (mouse) maps sideways movement back onto the page scroll that drives the rail.
  const drag = useRef<{ x: number; y: number; ratio: number } | null>(null);
  const onDown = (e: PointerEvent) => {
    if (!pinned || e.pointerType !== 'mouse' || e.button !== 0 || !st.current || !track.current) return;
    const items = track.current.children;
    const step = (items[1] as HTMLElement).offsetLeft - (items[0] as HTMLElement).offsetLeft;
    const s = st.current;
    drag.current = { x: e.clientX, y: window.scrollY, ratio: (s.end - s.start) / (step * LAST) };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    (e.currentTarget as HTMLElement).dataset.dragging = '';
  };
  const onMove = (e: PointerEvent) => {
    if (!drag.current) return;
    scrollToY(drag.current.y - (e.clientX - drag.current.x) * drag.current.ratio * 1.4, true);
  };
  const onUp = (e: PointerEvent) => {
    if (!drag.current) return;
    drag.current = null;
    delete (e.currentTarget as HTMLElement).dataset.dragging;
    if (st.current) go(Math.round(st.current.progress * LAST));
  };

  return (
    <section
      id="committees"
      ref={section}
      className={clsx('cm', pinned ? 'cm--pinned' : 'cm--native')}
      aria-labelledby="cm-h"
    >
      <div className="cm-stage">
        <div className="wrap cm-head">
          <div className="cm-title">
            <h2 id="cm-h" className="h2">Committees</h2>
            <p className="cm-sub">
              {committees.length} committees, from the {committees[0].name} to {committees[LAST].abbr}.
            </p>
          </div>
          <div className="cm-ctrl">
            <p className="cm-count" aria-hidden="true">
              <NumberFlow value={index + 1} format={{ minimumIntegerDigits: 2 }} animated={!still} className="cm-count-n" />
              <span className="cm-count-of">/ {committees.length}</span>
            </p>
            <div className="cm-btns">
              <button type="button" className="icon-btn" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous committee">
                <ArrowLeft size={20} aria-hidden="true" />
              </button>
              <button type="button" className="icon-btn" onClick={() => go(index + 1)} disabled={index === LAST} aria-label="Next committee">
                <ArrowRight size={20} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        <div
          ref={view}
          className="cm-view"
          tabIndex={0}
          role="region"
          aria-roledescription="carousel"
          aria-label={`Committees, ${committees.length} placards. Use the arrow keys to move.`}
          onKeyDown={onKey}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <ol ref={track} className="cm-track">
            {committees.map((c, i) => (
              <li
                key={c.abbr}
                className={clsx('plac', i === index && 'is-on')}
                aria-current={i === index ? 'true' : undefined}
                aria-label={`${i + 1} of ${committees.length}: ${c.name}`}
              >
                <div className="plac-face" style={{ '--len': Math.max(3, c.abbr.length) } as CSSProperties}>
                  <div className="plac-top">
                    <span className="plac-no">{pad(i + 1)}</span>
                    <span className="plac-org">{conference.name}</span>
                  </div>
                  <h3 className="plac-abbr">{c.abbr}</h3>
                  <p className="plac-name">{c.name}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="wrap cm-foot">
          <div className="cm-ticks" aria-hidden="true">
            {committees.map((c, i) => (
              <span key={c.abbr} className={clsx('cm-tick', i === index && 'is-on', i < index && 'is-past')} />
            ))}
          </div>
          <p className="cm-hint">{pinned ? 'Scroll, drag or use the arrow keys' : 'Swipe, or use the arrows'}</p>
        </div>
        <p className="sr-only" aria-live="polite">{live}</p>
      </div>
    </section>
  );
}
