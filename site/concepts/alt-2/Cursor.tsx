import { useEffect, useRef } from 'react';
import { gsap } from './motion';

/*
  The cursor (Outfit): an 8 px maroon dot. Over a nameplate it grows into a 96 px maroon disc reading VIEW;
  over a link or button it grows a little. Fine pointers only; touch screens keep the native behaviour.
  The disc is drawn at full size and scaled DOWN to the dot, so the VIEW label is never upscaled.
*/
export function Cursor() {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const d = el.current!;
    const root = document.documentElement;
    root.classList.add('has-cursor');
    const xTo = gsap.quickTo(d, 'x', { duration: 0.18, ease: 'power3.out' });
    const yTo = gsap.quickTo(d, 'y', { duration: 0.18, ease: 'power3.out' });
    let state = '';
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      d.classList.add('on');
      xTo(e.clientX); yTo(e.clientY);
      const t = (e.target as Element | null)?.closest?.('[data-cursor], a, button');
      const next = t ? (t.getAttribute('data-cursor') === 'view' ? 'view' : 'link') : '';
      if (next !== state) { state = next; d.dataset.state = next; }
    };
    const leave = () => d.classList.remove('on');
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', leave);
    return () => {
      root.classList.remove('has-cursor');
      window.removeEventListener('pointermove', move);
      document.removeEventListener('pointerleave', leave);
    };
  }, []);
  return (
    <div ref={el} className="cursor" aria-hidden="true">
      <span className="cursor-disc"><span>View</span></span>
    </div>
  );
}
