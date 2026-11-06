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
    let px = 0, py = 0, raf = 0;
    const timers: number[] = [];
    const set = (t: Element | null) => c.classList.toggle('is-view', !!t?.closest?.('[data-cursor="view"]'));
    const move = (e: PointerEvent) => {
      if (!shown) { gsap.set(c, { x: e.clientX, y: e.clientY }); c.classList.add('is-on'); shown = true; }
      px = e.clientX; py = e.clientY;
      x(px); y(py);
      set(e.target as Element | null);
    };
    // the page can move under a still pointer (scrolling, a nameplate opening full screen over the wall):
    // re-read what is under it, so the VIEW disc never lingers over the dialog or a row that scrolled in
    const resync = () => { raf = 0; if (shown) set(document.elementFromPoint(px, py)); };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(resync); };
    const onClick = () => { timers.push(window.setTimeout(resync, 60), window.setTimeout(resync, 900)); };
    const leave = () => { c.classList.remove('is-on'); shown = false; };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('click', onClick, true);
    document.documentElement.addEventListener('pointerleave', leave);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('click', onClick, true);
      document.documentElement.removeEventListener('pointerleave', leave);
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
    };
  }, []);
  return (
    <div className="cursor" ref={el} aria-hidden="true">
      <span className="cursor-d"><span className="cursor-t mono">View</span></span>
    </div>
  );
}
