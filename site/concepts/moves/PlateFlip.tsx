// Live 04 · GSAP Flip: the 19 nameplates sit in one stack on the dais, then fly to their seats in the grid in a
// single Flip (first, last, invert, play). Runs once when the section scrolls in; the button replays it.
import { useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Flip } from 'gsap/Flip';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import NumberFlow from '@number-flow/react';
import { committees } from '@/data/conference';
import { Demo, STILL } from './kit';

gsap.registerPlugin(Flip, ScrollTrigger);

type Mode = 'stack' | 'grid';
// A tidy, deterministic fan for the stack: small turns and offsets, no randomness between reloads.
const fan = (k: number) => ({ r: ((k * 7) % 11) - 5, x: ((k * 13) % 9) - 4, y: ((k * 5) % 7) - 3 });

export function PlateFlip() {
  const box = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>('grid');
  const [seated, setSeated] = useState(committees.length);
  const pending = useRef<Flip.FlipState | null>(null);
  const played = useRef(false);

  // Measure the grid once, keep that height reserved, then start stacked (motion only).
  useLayoutEffect(() => {
    const el = box.current!;
    const lock = () => { el.style.minHeight = ''; const was = el.dataset.mode; el.dataset.mode = 'grid'; el.style.minHeight = el.offsetHeight + 'px'; el.dataset.mode = was; };
    lock();
    if (STILL) return;
    setMode('stack'); setSeated(0);
    const ro = new ResizeObserver(() => { if (el.dataset.mode === 'grid') { el.style.minHeight = ''; el.style.minHeight = el.offsetHeight + 'px'; } });
    ro.observe(el);
    const st = ScrollTrigger.create({ trigger: el, start: 'top 65%', once: true, onEnter: () => { if (!played.current) go('grid'); } });
    return () => { st.kill(); ro.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = (next: Mode) => {
    played.current = true;
    pending.current = Flip.getState(box.current!.querySelectorAll('.plate'));
    setMode(next);
  };

  // Play the Flip after React has moved the plates to their new layout.
  useLayoutEffect(() => {
    const state = pending.current;
    if (!state) return;
    pending.current = null;
    const toGrid = mode === 'grid';
    const tl = Flip.from(state, {
      duration: toGrid ? 1.1 : 0.8, ease: 'power3.inOut', absolute: true,
      stagger: { each: toGrid ? 0.03 : 0.015, from: toGrid ? 'start' : 'end' },
      onUpdate: function (this: gsap.core.Timeline) { const q = this.progress(); setSeated(Math.round((toGrid ? q : 1 - q) * committees.length)); },
    });
    return () => { tl.progress(1).kill(); };
  }, [mode]);

  return (
    <Demo id="demo-flip" n={4} likeLabel="Nameplate Flip"
      title="Nameplates take their seats"
      caption="Nineteen UN nameplates, stacked on the dais, fly into the committee grid in one Flip."
      credit={[{ label: 'GSAP Flip', url: 'https://gsap.com/docs/v3/Plugins/Flip/' }, { label: 'Codrops 2026 (Flip gallery)', url: 'https://tympanus.net/codrops/2026/07/30/building-an-infinite-gsap-scroll-gallery-with-parallax-and-flip-transitions/' }]}>
      <div className="flip-bar">
        <p className="flip-count"><NumberFlow value={seated} animated={false} /> <span>of {committees.length} committees</span></p>
        <button type="button" className="btn-line" onClick={() => go(mode === 'grid' ? 'stack' : 'grid')} disabled={STILL}>
          {mode === 'grid' ? 'Stack them' : 'Seat the committees'}
        </button>
      </div>
      <div ref={box} className="plates" data-mode={mode}>
        {committees.map((c, k) => {
          const f = fan(k);
          return (
            <div key={c.abbr} className="plate" data-flip-id={c.abbr} style={{ ['--r' as string]: f.r + 'deg', ['--x' as string]: f.x + 'px', ['--y' as string]: f.y + 'px', zIndex: committees.length - k }}>
              <span className="plate-code">{c.abbr}</span>
              <span className="plate-name">{c.name}</span>
            </div>
          );
        })}
      </div>
    </Demo>
  );
}
