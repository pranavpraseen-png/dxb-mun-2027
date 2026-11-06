// WEIMA-style page transition, for every jump from the nav, the menu and the tally:
// three opaque full-screen blocks sweep in from the left, the page jumps while it is covered,
// then they sweep off to the right in reverse order. The top block is the target's own colour and names it.
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { MOTIONS, setWipeRunner, type Ground } from './floor';
import { textWidth } from './kinetic';

declare global { interface Window { __alt5Wipe?: gsap.core.Timeline } }

const NEXT: Record<Ground, [Ground, Ground]> = {
  ink: ['signal', 'paper'],
  paper: ['signal', 'ink'],
  signal: ['ink', 'paper'],
  host: ['signal', 'ink'],
};

export function Wipe() {
  const root = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState(0);
  const busy = useRef(false);

  useEffect(() => {
    setWipeRunner((i, jump) => {
      if (busy.current) return;
      busy.current = true;
      setTarget(i);
      const r = root.current!;
      const layers = Array.from(r.querySelectorAll<HTMLElement>('.wipe-b'));
      const label = r.querySelector<HTMLElement>('.wipe-label');
      const g = MOTIONS[i].ground;
      const [a, b] = NEXT[g];
      layers[0].dataset.g = a;
      layers[1].dataset.g = b;
      layers[2].dataset.g = g;
      r.style.visibility = 'visible';
      const tl = gsap.timeline({ onComplete: () => { r.style.visibility = 'hidden'; busy.current = false; } });
      window.__alt5Wipe = tl;
      tl
        .set(layers, { x: 0, xPercent: -101 })
        .set(label, { '--lw': 50 })
        .to(layers, { xPercent: 0, duration: 0.42, ease: 'power4.inOut', stagger: 0.07 })
        .to(label, { '--lw': 150, duration: 0.5, ease: 'expo.out' }, '-=0.18')
        .add(jump, '-=0.3')
        .to([...layers].reverse(), { xPercent: 101, duration: 0.42, ease: 'power4.inOut', stagger: 0.07 }, '+=0.02');
    });
    return () => setWipeRunner(null);
  }, []);

  const m = MOTIONS[target];
  const word = m.label.toUpperCase();
  const gut = innerWidth < 720 ? 16 : 24;
  const size = Math.min(innerWidth * 0.17, innerHeight * 0.36, (innerWidth - gut * 2) / Math.max(1, textWidth(word, 150, 900, -0.01)));
  return (
    <div className="wipe" ref={root} aria-hidden="true">
      <div className="wipe-b" />
      <div className="wipe-b" />
      <div className="wipe-b">
        <div className="wipe-label">
          <span className="mono">Motion {m.n} · {m.motion}</span>
          <b style={{ fontSize: size.toFixed(1) + 'px' }}>{word}</b>
        </div>
      </div>
    </div>
  );
}
