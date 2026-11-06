// Section 4: the committees. Dropbox's move: the hairline grid lines slide into place, then the cells flood
// from their edges until they lock into a wall of 19 two-tone nameplates. Hover inverts a plate (a clip-path
// wipe); the cursor dot grows into a VIEW disc (Outfit). Opening a plate shows it full screen (Base UI Dialog).
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import NumberFlow from '@number-flow/react';
import { Dialog } from '@base-ui/react/dialog';
import { PLATES, committees } from './data';
import { BIG, EASE, ScrollTrigger, gsap, still } from './motion';
import { FitWord, useMedia, useScrollPause } from './ui';
import { KLine } from './KLine';
import { GENTLE } from './kinetic';

const COLS = 5, ROWS = 4;
// where the lines start (fractions of the wall): a tall centre cell, like Dropbox's first screen
const V_FROM = [0.16, 0.3, 0.44, 0.56, 0.7, 0.84];
const H_FROM = [0.06, 0.1, 0.5, 0.9, 0.94];
const FLOOD = ['left', 'top', 'right', 'bottom'] as const;
const CLIP_FROM: Record<(typeof FLOOD)[number], string> = {
  left: 'inset(0% 100% 0% 0%)',
  right: 'inset(0% 0% 0% 100%)',
  top: 'inset(0% 0% 100% 0%)',
  bottom: 'inset(100% 0% 0% 0%)',
};
// flood order: a fixed shuffle, so the wall fills like Dropbox's (scattered, never row by row)
const ORDER = [6, 12, 2, 17, 9, 0, 14, 4, 11, 18, 7, 1, 15, 10, 3, 16, 8, 13, 5];

function Plate({ i, onOpen }: { i: number; onOpen: (i: number) => void }) {
  const p = PLATES[i];
  const body = (
    <>
      <span className="t-top mono"><span>{p.no}</span><span>/ {committees.length}</span></span>
      <span className="t-code mono">{p.abbr}</span>
      <span className="t-name">{p.name}</span>
    </>
  );
  return (
    <button
      type="button"
      className={`tile tone-${p.tone}`}
      data-cursor="view"
      data-flood={FLOOD[(i * 3 + Math.floor(i / COLS)) % 4]}
      onClick={() => onOpen(i)}
      aria-label={`${p.abbr}, ${p.name}. Open the nameplate.`}
    >
      <span className="t-face" aria-hidden="true">{body}</span>
      <span className="t-inv" aria-hidden="true">{body}</span>
    </button>
  );
}

function Head({ n }: { n: number }) {
  return (
    <div className="cm-head">
      <p className="mono"><span className="acc">02</span> / Committees</p>
      <p className="cm-num"><span className="cm-m"><NumberFlow value={n} /></span></p>
      {/* Alt 5's kinetic type, gentle: the word moves only under the pointer */}
      <p className="cm-lab"><span className="cm-m"><KLine as="span" text="Committees" className="cm-k" opts={{ ...GENTLE, weight: 600, track: -0.02 }} /></span></p>
      <p className="mono cm-range"><span className="cm-m"><span>{committees[0].abbr} → {committees[committees.length - 1].abbr}</span></span></p>
    </div>
  );
}

function NameplateView({ open, setOpen }: { open: number | null; setOpen: (i: number | null) => void }) {
  const i = open ?? 0;
  const p = PLATES[i];
  const n = committees.length;
  const step = useCallback((d: number) => setOpen(((i + d) % n + n) % n), [i, n, setOpen]);
  useEffect(() => {
    if (open === null) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, step]);
  useScrollPause(open !== null);
  const prev = PLATES[(i - 1 + n) % n], next = PLATES[(i + 1) % n];
  return (
    <Dialog.Root open={open !== null} onOpenChange={(o) => { if (!o) setOpen(null); }}>
      <Dialog.Portal>
        <Dialog.Popup className={`plate-view tone-${p.tone}`}>
          <div className="pv-top">
            <p className="mono">Committee {p.no} / {n}</p>
            <Dialog.Close className="menu-pill menu-pill--ink mono">Close</Dialog.Close>
          </div>
          <div className="pv-mid">
            <FitWord key={p.abbr} className="pv-code" as="div" maxVh={0.4}>{p.abbr}</FitWord>
            <Dialog.Title className="pv-name">{p.name}</Dialog.Title>
          </div>
          <div className="pv-bot">
            <button type="button" className="mono pv-step" onClick={() => step(-1)}><span aria-hidden="true">←</span> {prev.abbr}</button>
            <span className="mono pv-hint">Arrow keys</span>
            <button type="button" className="mono pv-step" onClick={() => step(1)}>{next.abbr} <span aria-hidden="true">→</span></button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function Committees() {
  const wide = useMedia('(min-width: 1024px) and (min-height: 700px)');
  const pinned = wide && !still;
  const sec = useRef<HTMLElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [n, setN] = useState(still ? committees.length : 0);

  useLayoutEffect(() => {
    const el = sec.current;
    if (!el || still) return;
    const ctx = gsap.context(() => {
      const tiles = gsap.utils.toArray<HTMLElement>('.tile', el);
      const heads = el.querySelectorAll('.cm-m > *');
      ScrollTrigger.create({ trigger: el, start: 'top 75%', onEnter: () => setN(committees.length), onLeaveBack: () => setN(0) });
      if (pinned) {
        const wall = el.querySelector<HTMLElement>('.cm-wall')!;
        const vs = gsap.utils.toArray<HTMLElement>('.gl-v', el);
        const hs = gsap.utils.toArray<HTMLElement>('.gl-h', el);
        const tl = gsap.timeline({
          scrollTrigger: { id: 'committees', trigger: el, start: 'top top', end: () => '+=' + Math.round(window.innerHeight * 1.6), pin: true, scrub: true, invalidateOnRefresh: true },
        });
        vs.forEach((v, k) => tl.fromTo(v, { x: () => wall.clientWidth * V_FROM[k] }, { x: () => wall.clientWidth * (k / COLS), duration: 0.3, ease: EASE }, 0.02 * k));
        hs.forEach((h, k) => tl.fromTo(h, { y: () => wall.clientHeight * H_FROM[k] }, { y: () => wall.clientHeight * (k / ROWS), duration: 0.3, ease: EASE }, 0.03 + 0.02 * k));
        tl.fromTo(heads, { yPercent: 110 }, { yPercent: 0, duration: 0.16, stagger: 0.03, ease: EASE }, 0.12);
        ORDER.forEach((ti, k) => {
          const t = tiles[ti];
          tl.fromTo(t, { clipPath: CLIP_FROM[t.dataset.flood as keyof typeof CLIP_FROM] }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.2, ease: EASE }, 0.26 + k * 0.034);
        });
        tl.set({}, {}, 1);
      } else {
        gsap.set(tiles, { clipPath: (_: number, t: HTMLElement) => CLIP_FROM[t.dataset.flood as keyof typeof CLIP_FROM] });
        ScrollTrigger.batch(tiles, {
          start: 'top 92%',
          onEnter: (b) => gsap.to(b, { clipPath: 'inset(0% 0% 0% 0%)', duration: BIG, stagger: 0.08, ease: EASE }),
        });
        gsap.fromTo(heads, { yPercent: 110 }, { yPercent: 0, duration: BIG, stagger: 0.06, ease: EASE, scrollTrigger: { trigger: el, start: 'top 80%' } });
      }
    }, el);
    return () => ctx.revert();
  }, [pinned]);

  return (
    <section id="committees" className={'cm' + (pinned ? ' is-pinned' : '')} ref={sec} aria-labelledby="cm-h">
      <h2 id="cm-h" className="sr">{committees.length} committees</h2>
      <div className="cm-wall">
        <div className="cm-cell cm-cell--head"><Head n={n} /></div>
        {PLATES.map((p, i) => (
          <div key={p.abbr} className="cm-cell"><Plate i={i} onOpen={setOpen} /></div>
        ))}
        {pinned && (
          <div className="cm-lines" aria-hidden="true">
            {Array.from({ length: COLS + 1 }, (_, k) => <i key={'v' + k} className="gl-v" />)}
            {Array.from({ length: ROWS + 1 }, (_, k) => <i key={'h' + k} className="gl-h" />)}
          </div>
        )}
      </div>
      <NameplateView open={open} setOpen={setOpen} />
    </section>
  );
}
