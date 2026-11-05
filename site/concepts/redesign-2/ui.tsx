import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useInView } from 'motion/react';
import clsx from 'clsx';
import { brand } from '@/shared/brand';
import { nav } from '@/data/conference';
import { isStill } from '@/shared/hooks';
import { useDubaiTime } from './clock';
import type { Variants } from 'motion/react';
import { InView } from './lib/in-view';
import { TextEffect } from './lib/text-effect';

/** Height of the fixed masthead (matches --bar in redesign2.css). */
export const NAV_H = 64;

/** The six page sections plus the timer view: seven places in the index. */
export const SECTIONS = nav.filter((n) => n.id !== 'home' && n.id !== 'timer');
export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
export const numeral = (id: string) => ROMAN[SECTIONS.findIndex((s) => s.id === id)] ?? '';

/* ---------------------------------------------------------------- wordmark (logo slot) */
export function Wordmark({ className }: { className?: string }) {
  if (brand.logoSrc) return <img className={clsx('logo', className)} src={brand.logoSrc} alt={brand.logoAlt} />;
  const [a, b] = brand.wordmark.split(' ');
  return (
    <span className={clsx('wm', className)}>
      <span className="wm-a">{a}</span>
      <span className="wm-b">{b}</span>
    </span>
  );
}

/* ---------------------------------------------------------------- host mark: maroon field, one gold hairline */
export function HostMark({ host, city, className }: { host: string; city: string; className?: string }) {
  return (
    <p className={clsx('host-mark', className)}>
      <span className="host-k">Hosted by</span>
      <span className="host-v">{host}, {city}</span>
    </p>
  );
}

/* ---------------------------------------------------------------- live Dubai clock */
export function DubaiClock({ label = 'Dubai' }: { label?: string }) {
  const t = useDubaiTime();
  return (
    <span className="dclock" title="Local time in Dubai (GST, UTC+4)">
      {label && <span className="dclock-l">{label}</span>}
      <time dateTime={t.iso} aria-label={`Dubai time ${t.hh}:${t.mm}`}>{t.hh}:{t.mm}:{t.ss}</time>
      <span className="dclock-z">GST</span>
    </span>
  );
}

/* ---------------------------------------------------------------- section kicker: numeral + rule + label */
export function Kicker({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  return (
    <p className={clsx('kicker', className)}>
      <span className="kicker-n">{numeral(id)}</span>
      <span className="kicker-rule" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

/* ---------------------------------------------------------------- reveal (Motion Primitives InView; plain in still mode) */
const rise = { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } };
export function Reveal({ children, as = 'div', group = false, className }: { children: ReactNode; as?: React.ElementType; group?: boolean; className?: string }) {
  const Tag = as;
  if (isStill()) return <Tag className={className}>{children}</Tag>;
  return (
    <InView
      as={as}
      once
      viewOptions={{ once: true, margin: '0px 0px -12% 0px' }}
      variants={group ? stagger : rise}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </InView>
  );
}
/** Child variants for items inside a `group` Reveal. */
export const itemRise: Variants = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } } };

/* ---------------------------------------------------------------- dek: one line set word by word (Motion Primitives TextEffect) */
export function Dek({ children, className }: { children: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });
  if (isStill()) return <p className={className}>{children}</p>;
  return (
    <div ref={ref}>
      <TextEffect as="p" per="word" preset="slide" trigger={seen} speedReveal={0.9} className={className}>{children}</TextEffect>
    </div>
  );
}

/* ---------------------------------------------------------------- media query */
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
