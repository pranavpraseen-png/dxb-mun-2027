import { useEffect, useRef, useState, type ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import clsx from 'clsx';
import { brand } from '@/shared/brand';
import { isStill } from '@/shared/hooks';
import { useDubaiTime } from './clock';
import { chOf } from './data';

gsap.registerPlugin(ScrollTrigger);

/** Height of the fixed control bar (matches --bar in onair.css). */
export const BAR_H = 56;

/* ---------------------------------------------------------------- wordmark (logo slot) */
export function Wordmark() {
  if (brand.logoSrc) return <img className="oa-logo" src={brand.logoSrc} alt={brand.logoAlt} />;
  const [a, b] = brand.wordmark.split(' ');
  return (
    <span className="wm">
      <span className="wm-a">{a}</span>
      <span className="wm-b">{b}</span>
    </span>
  );
}

/* ---------------------------------------------------------------- live Dubai clock (mono) */
export function DubaiClock({ label = true, className }: { label?: boolean; className?: string }) {
  const t = useDubaiTime();
  return (
    <span className={clsx('dclock', className)} title="Local time in Dubai (GST, UTC+4)">
      {label && <span className="dclock-l">DXB</span>}
      <time dateTime={t.iso} aria-label={`Dubai time ${t.hh}:${t.mm}`}>
        {t.hh}:{t.mm}<span className="dclock-s">:{t.ss}</span>
      </time>
      <span className="dclock-z">GST</span>
    </span>
  );
}

export function Tba({ value }: { value: string | null }) {
  return value ? <>{value}</> : <span className="tba"><i aria-hidden="true" />To be announced</span>;
}

export function useMedia(query: string) {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatch(m.matches);
    on();
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [query]);
  return match;
}

/* ---------------------------------------------------------------- section slate (WEIMA colour-block key-on) */
// A colour block sweeps across the title (origin left), then retracts (origin right) and leaves the title behind.
// A hairline rule draws in under it. Runs once when the slate scrolls in; in still mode everything is simply shown.
export function Slate({ id, ch, title, dek, tone = 'maroon', children }: { id: string; ch?: string; title: string; dek?: ReactNode; tone?: 'maroon' | 'accent' | 'cream'; children?: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || isStill()) return;
    const q = gsap.utils.selector(el);
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ paused: true });
      tl.fromTo(q('.slate-block'), { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: 0.42, ease: 'power3.in' })
        .set(q('.slate-title-t'), { clipPath: 'inset(0 0% 0 0)' })
        .set(q('.slate-block'), { transformOrigin: '100% 50%' })
        .to(q('.slate-block'), { scaleX: 0, duration: 0.5, ease: 'power3.out' })
        .fromTo(q('.slate-rule i'), { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: 'power2.out' }, 0.2)
        .fromTo(q('.slate-ch, .slate-dek'), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power2.out' }, 0.45);
      ScrollTrigger.create({ trigger: el, start: 'top 82%', once: true, onEnter: () => tl.play() });
    }, el);
    return () => ctx.revert();
  }, []);
  return (
    <header ref={ref} className={clsx('slate', `slate--${tone}`)}>
      <p className="slate-ch"><span>CH {ch ?? chOf(id)}</span></p>
      <h2 className="slate-title" id={`${id}-title`}>
        <span className="slate-title-t">{title}</span>
        <span className="slate-block" aria-hidden="true" />
      </h2>
      {dek && <p className="slate-dek">{dek}</p>}
      {children}
      <span className="slate-rule" aria-hidden="true"><i /></span>
    </header>
  );
}
