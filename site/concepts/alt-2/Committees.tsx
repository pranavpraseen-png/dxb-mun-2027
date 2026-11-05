import { useEffect, useRef, useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import NumberFlow from '@number-flow/react';
import { committees, type Committee } from '@/data/conference';
import { getLenis } from '@/shared/scroll';
import { gsap } from './motion';
import { register } from './links';

/*
  4 · Committees: the grid becomes the nameplates (BLUEPRINT 3.4, Dropbox).
  Hairlines draw the grid first; then each cell floods with the card tone and its code and name slice up,
  scrubbed to the scroll, until the 19 nameplates lock into a wall. Each nameplate is exactly two tones
  (card #E2D8D0 and ink). Hover inverts it, and the cursor dot grows into a VIEW disc (Outfit).
  Selecting one opens its nameplate full size (Base UI Dialog, the primitive under coss ui's Sheet).
*/
const COLS = { wide: 4, narrow: 2 };
const cells = committees.length + 1; // one empty cell on purpose, like Outfit's wall

export function Committees({ still }: { still: boolean }) {
  const sec = useRef<HTMLElement>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [seen, setSeen] = useState(still);

  useEffect(() => {
    const el = sec.current!;
    if (still) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.2 });
    io.observe(el);
    const q = gsap.utils.selector(el);
    const tl = gsap.timeline({
      scrollTrigger: { trigger: q('.wall')[0], start: 'top 95%', end: 'top 45%', scrub: 0.6 },
    });
    tl.fromTo(q('.wl-h'), { scaleX: 0 }, { scaleX: 1, ease: 'none', duration: 0.35, stagger: 0.03 }, 0)
      .fromTo(q('.wl-v'), { scaleY: 0 }, { scaleY: 1, ease: 'none', duration: 0.35, stagger: 0.03 }, 0.05)
      .fromTo(q('.tile-fill'), { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', duration: 0.3, stagger: 0.025 }, 0.3)
      .fromTo(q('.tile-in'), { yPercent: 102 }, { yPercent: 0, ease: 'none', duration: 0.3, stagger: 0.025 }, 0.36);
    return () => { io.disconnect(); tl.scrollTrigger?.kill(); tl.kill(); };
  }, [still]);

  useEffect(() => {
    const l = getLenis();
    if (sel !== null) l?.stop(); else l?.start();
  }, [sel]);

  const c: Committee | null = sel === null ? null : committees[sel];

  return (
    <section ref={sec} id="committees" className="sec committees" aria-labelledby="cm-h">
      <header className="sec-head">
        <span className="k" data-slice>02 — Committees</span>
        <h2 id="cm-h" className="sec-h">
          <span className="sec-num" aria-hidden="true"><NumberFlow value={seen ? committees.length : 0} trend={1} /></span>
          <span className="sr-only">{committees.length} </span>
          <span data-rise>committees</span>
        </h2>
        <p className="k sec-sub" data-slice>Select a nameplate to view it</p>
      </header>

      <div className="wall" style={{ '--cols-w': COLS.wide, '--cols-n': COLS.narrow } as React.CSSProperties}>
        <div className="wall-lines" aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => <i key={'h' + i} className="wl-h" style={{ '--i': i } as React.CSSProperties} />)}
          {Array.from({ length: 11 }, (_, i) => <i key={'hn' + i} className="wl-h wl-h--n" style={{ '--i': i } as React.CSSProperties} />)}
          {Array.from({ length: 5 }, (_, i) => <i key={'v' + i} className="wl-v" style={{ '--i': i } as React.CSSProperties} />)}
          {Array.from({ length: 3 }, (_, i) => <i key={'vn' + i} className="wl-v wl-v--n" style={{ '--i': i } as React.CSSProperties} />)}
        </div>
        <ul className="tiles">
          {committees.map((cm, i) => (
            <li key={cm.abbr}>
              <button type="button" className="tile" data-cursor="view" onClick={() => setSel(i)} aria-label={`${cm.abbr}: ${cm.name}`}>
                <span className="tile-fill" aria-hidden="true" />
                <span className="tile-mask">
                  <span className="tile-in">
                    <span className="tile-top"><span className="k">{String(i + 1).padStart(2, '0')}</span><span className="k tile-go">View ↗</span></span>
                    <span className={'tile-code' + (cm.abbr.length > 6 ? ' tile-code--long' : '')}>{cm.abbr}</span>
                    <span className="tile-name">{cm.name}</span>
                  </span>
                </span>
              </button>
            </li>
          ))}
          {cells > committees.length && (
            <li className="tile-empty" aria-hidden="true"><span className="k">{committees.length} / {committees.length}</span></li>
          )}
        </ul>
      </div>

      <Dialog.Root open={sel !== null} onOpenChange={(o) => { if (!o) setSel(null); }}>
        <Dialog.Portal>
          <Dialog.Backdrop className="dlg-back" />
          <Dialog.Popup className="plate">
            {c && sel !== null && (
              <>
                <div className="plate-top">
                  <span className="k">Nameplate {String(sel + 1).padStart(2, '0')} / {committees.length}</span>
                  <Dialog.Close className="btn-close" data-cursor="link">Close ✕</Dialog.Close>
                </div>
                <Dialog.Title className="plate-code" style={{ "--n": c.abbr.length } as React.CSSProperties}>{c.abbr}</Dialog.Title>
                <Dialog.Description className="plate-name">{c.name}</Dialog.Description>
                <dl className="plate-rows">
                  <div><dt className="k">Agenda</dt><dd>To be announced</dd></div>
                  <div><dt className="k">Committee</dt><dd>{String(sel + 1).padStart(2, '0')} of {committees.length}</dd></div>
                </dl>
                <div className="plate-act">
                  <button type="button" className="btn btn--line" onClick={() => setSel((sel + committees.length - 1) % committees.length)}>← Previous</button>
                  <button type="button" className="btn btn--line" onClick={() => setSel((sel + 1) % committees.length)}>Next →</button>
                  <a className="btn btn--ink" href={register}>Register →</a>
                </div>
              </>
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}

