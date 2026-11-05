// Live 01 · Broadcast slate: each committee code decodes letter by letter (GSAP ScrambleTextPlugin),
// the full name under it rises out of a clip. Auto-advances only while on screen; buttons step it by hand.
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { committees } from '@/data/conference';
import { Demo, STILL, useInView } from './kit';

gsap.registerPlugin(ScrambleTextPlugin);

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function Scramble() {
  const stage = useRef<HTMLDivElement>(null);
  const code = useRef<HTMLSpanElement>(null);
  const name = useRef<HTMLSpanElement>(null);
  const [i, setI] = useState(12); // UNSC first
  const inView = useInView(stage, '0px');
  const first = useRef(true);

  // Decode on every change.
  useEffect(() => {
    const c = committees[i];
    if (!code.current || !name.current) return;
    if (STILL || first.current) {
      first.current = false;
      code.current.textContent = c.abbr;
      name.current.textContent = c.name;
      return;
    }
    const tl = gsap.timeline();
    tl.to(code.current, { duration: 0.9, ease: 'none', scrambleText: { text: c.abbr, chars: CHARS, speed: 0.6, revealDelay: 0.25 } });
    tl.fromTo(name.current, { yPercent: 105 }, { yPercent: 0, duration: 0.6, ease: 'power3.out', onStart: () => { name.current!.textContent = c.name; } }, 0.35);
    return () => { tl.kill(); };
  }, [i]);

  // Auto-advance every 2.6 s while on screen.
  useEffect(() => {
    if (STILL || !inView) return;
    const t = window.setInterval(() => setI((v) => (v + 1) % committees.length), 2600);
    return () => window.clearInterval(t);
  }, [inView]);

  const step = (d: number) => setI((v) => (v + d + committees.length) % committees.length);

  return (
    <Demo id="demo-scramble" n={1} likeLabel="Broadcast slate decode"
      title="Broadcast slate: the codes decode"
      caption="A programme-feed slate for the opening. Each committee code scrambles into place."
      credit={[{ label: 'GSAP ScrambleTextPlugin', url: 'https://gsap.com/docs/v3/Plugins/ScrambleTextPlugin/' }, { label: 'Motion Primitives Text Scramble', url: 'https://motion-primitives.com/docs/text-scramble' }]}>
      <div ref={stage} className="slate">
        <div className="slate-bar">
          <span>DXB MUN 2027</span>
          <span className="slate-dim">Programme feed</span>
          <span className="slate-count" aria-live="off">{String(i + 1).padStart(2, '0')} / {committees.length}</span>
        </div>
        <div className="slate-body">
          <p className="slate-kicker">Committee</p>
          <p className="slate-code" aria-live="polite"><span ref={code}>UNSC</span></p>
          <p className="slate-name"><span ref={name}>United Nations Security Council</span></p>
        </div>
        <div className="slate-foot">
          <span>Indian High School · Dubai</span>
          <span className="slate-steps">
            <button type="button" onClick={() => step(-1)} aria-label="Previous committee">Prev</button>
            <button type="button" onClick={() => step(1)} aria-label="Next committee">Next</button>
          </span>
        </div>
      </div>
    </Demo>
  );
}
