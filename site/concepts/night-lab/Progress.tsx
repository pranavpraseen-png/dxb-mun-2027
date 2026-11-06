// A 2px orange hairline on the bottom edge of the top bar that fills as you read down the page.
// Transform only (no layout), updated once per frame while scrolling. Styles: opening/opening.css (.nl-progress).
import { useEffect, useRef } from 'react';
import './opening/opening.css';

export function Progress() {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, []);
  return <div className="nl-progress" ref={bar} aria-hidden="true" />;
}
