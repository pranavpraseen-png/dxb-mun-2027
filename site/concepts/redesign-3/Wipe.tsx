// WEIMA-style colour-block transition for nav jumps: four colour columns rise over the page with a channel slate
// in the middle, the scroll jumps behind them, then they lift away. Reduced motion or still mode: a plain jump.
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { isStill } from '@/shared/hooks';
import { getLenis, scrollToSection } from '@/shared/scroll';
import { BAR_H } from './ui';
import { chOf, channels } from './data';

let root: HTMLDivElement | null = null;
let busy = false;

function jumpNow(id: string) {
  const el = id === 'home' ? document.body : document.getElementById(id);
  if (!el) return;
  const top = id === 'home' ? 0 : el.getBoundingClientRect().top + scrollY - BAR_H;
  const l = getLenis();
  if (l) l.scrollTo(top, { immediate: true, force: true });
  else window.scrollTo({ top, behavior: 'instant' as ScrollBehavior });
  ScrollTrigger.update();
}

/** Go to a section through the colour-block wipe. */
export function wipeTo(id: string) {
  if (isStill() || !root) { if (id === 'home') window.scrollTo({ top: 0 }); else scrollToSection(id, BAR_H); return; }
  if (busy) return;
  busy = true;
  const q = gsap.utils.selector(root);
  const ch = id === 'home' ? '00' : chOf(id);
  const label = id === 'home' ? 'Programme start' : channels.find((c) => c.id === id)?.label ?? '';
  q('.wipe-ch')[0].textContent = `CH ${ch}`;
  q('.wipe-label')[0].textContent = label;
  root.dataset.on = 'true';
  const tl = gsap.timeline({
    defaults: { ease: 'power3.inOut' },
    onComplete: () => { busy = false; if (root) root.dataset.on = 'false'; },
  });
  tl.set(q('.wipe-col'), { transformOrigin: '50% 100%' })
    .fromTo(q('.wipe-col'), { scaleY: 0 }, { scaleY: 1, duration: 0.42, stagger: 0.055 })
    .fromTo(q('.wipe-slate'), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out' }, 0.3)
    .add(() => jumpNow(id), 0.62)
    .to(q('.wipe-slate'), { opacity: 0, y: -10, duration: 0.18, ease: 'power2.in' }, 0.78)
    .set(q('.wipe-col'), { transformOrigin: '50% 0%' }, 0.8)
    .to(q('.wipe-col'), { scaleY: 0, duration: 0.46, stagger: 0.055 }, 0.8);
}

export function Wipe() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    root = ref.current;
    return () => { root = null; };
  }, []);
  return (
    <div ref={ref} className="wipe" data-on="false" aria-hidden="true">
      <span className="wipe-col wipe-col--maroon" />
      <span className="wipe-col wipe-col--accent" />
      <span className="wipe-col wipe-col--surface" />
      <span className="wipe-col wipe-col--cream" />
      <div className="wipe-slate">
        <span className="wipe-ch">CH 00</span>
        <span className="wipe-label" />
      </div>
    </div>
  );
}
