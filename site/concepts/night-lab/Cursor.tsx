// Outfit's cursor: an 8 px orange dot that follows the pointer and grows into a VIEW disc over a nameplate.
// Fine pointers only, never in still / reduced motion. Moves with transform (gsap.quickTo).
import { useEffect, useRef } from 'react';
import { EASE, gsap, still } from './motion';

export function Cursor() {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const c = el.current;
    if (!c || still || !window.matchMedia('(pointer: fine)').matches) return;
    const x = gsap.quickTo(c, 'x', { duration: 0.5, ease: EASE });
    const y = gsap.quickTo(c, 'y', { duration: 0.5, ease: EASE });
    let shown = false;
    const move = (e: PointerEvent) => {
      if (!shown) { gsap.set(c, { x: e.clientX, y: e.clientY }); c.classList.add('is-on'); shown = true; }
      x(e.clientX); y(e.clientY);
      const t = e.target as Element | null;
      c.classList.toggle('is-view', !!t?.closest?.('[data-cursor="view"]'));
    };
    const leave = () => { c.classList.remove('is-on'); shown = false; };
    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    return () => { window.removeEventListener('pointermove', move); document.documentElement.removeEventListener('pointerleave', leave); };
  }, []);
  return (
    <div className="cursor" ref={el} aria-hidden="true">
      <span className="cursor-d"><span className="cursor-t mono">View</span></span>
    </div>
  );
}
