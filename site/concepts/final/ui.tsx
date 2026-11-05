import { useEffect, useRef, useState, type ReactNode } from 'react';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import NumberFlow from '@number-flow/react';
import clsx from 'clsx';
import { brand } from '@/shared/brand';
import { isStill } from '@/shared/hooks';
import { useDubaiTime } from './clock';

/** Height of the fixed top bar (matches --bar in merged.css). */
export const NAV_H = 60;

/* ---------------------------------------------------------------- wordmark (logo slot) */
// Network-bug style wordmark: two flat blocks. Swapped for the real logo when brand.logoSrc is set.
export function Wordmark({ size = 'md' }: { size?: 'md' | 'lg' }) {
  if (brand.logoSrc) return <img className={clsx('logo', `logo--${size}`)} src={brand.logoSrc} alt={brand.logoAlt} />;
  const [a, b] = brand.wordmark.split(' ');
  return (
    <span className={clsx('wm', `wm--${size}`)}>
      <span className="wm-a">{a}</span>
      <span className="wm-b">{b}</span>
    </span>
  );
}

/* ---------------------------------------------------------------- host mark (IHS maroon, one gold detail) */
export function HostMark({ host, city, className }: { host: string; city: string; className?: string }) {
  return (
    <p className={clsx('host-mark', className)}>
      <span className="host-pip" aria-hidden="true" />
      <span className="host-k">Hosted by</span> <span className="host-v">{host}, {city}</span>
    </p>
  );
}

/* ---------------------------------------------------------------- reveal on view */
// One reveal vocabulary for the whole site: a UN-blue "key" wipes across and leaves the graphic behind.
export function useInView<T extends Element>(threshold = 0.25) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(() => isStill());
  useEffect(() => {
    if (seen || !ref.current) return;
    const io = new IntersectionObserver(
      (es) => { if (es.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect(); } },
      { threshold, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [seen, threshold]);
  return [ref, seen] as const;
}

/** A heading that is "keyed on" like a broadcast graphic: a UN-blue bar sweeps across it once. */
gsap.registerPlugin(SplitText);
export function Keyed({ as: Tag = 'h2', className, children, id }: { as?: 'h1' | 'h2' | 'h3'; className?: string; children: ReactNode; id?: string }) {
  const [ref, seen] = useInView<HTMLDivElement>(0.4);
  // Mat Voyce: when a heading comes into view, its characters rise out of their own masks, once.
  useEffect(() => {
    const h = ref.current?.firstElementChild;
    if (!seen || !h || isStill()) return;
    const split = SplitText.create(h, { type: 'chars', mask: 'chars' });
    const tw = gsap.from(split.chars, { yPercent: 115, duration: 1.1, ease: 'power4.out', stagger: 0.028, onComplete: () => split.revert() });
    return () => { tw.kill(); split.revert(); };
  }, [seen, ref]);
  return (
    <div ref={ref} className={clsx('keyed', seen && 'is-in')}>
      <Tag id={id} className={className}>{children}</Tag>
      <span className="keyed-bar" aria-hidden="true" />
    </div>
  );
}

/* ---------------------------------------------------------------- ticker */
export function Ticker({ items, label }: { items: string[]; label: string }) {
  const row = (hidden: boolean) => (
    <ul className="ticker-row" aria-hidden={hidden || undefined}>
      {items.map((t, i) => (
        <li key={i}>
          <span className="ticker-sep" aria-hidden="true" />
          {t}
        </li>
      ))}
    </ul>
  );
  return (
    <div className="ticker" role="region" aria-label={label}>
      <span className="ticker-tag">DXB MUN 2027</span>
      <div className="ticker-window">
        <div className="ticker-track">
          {row(false)}
          {row(true)}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- seven-segment numerals */
// Drawn as SVG so the shot clock reads like a real arena clock: lit segments over faint unlit ones.
const W = 100, H = 180, T = 20, G = 4;
const hSeg = (y: number) => {
  const x0 = T / 2 + G, x1 = W - T / 2 - G;
  return `${x0},${y} ${x0 + T / 2},${y - T / 2} ${x1 - T / 2},${y - T / 2} ${x1},${y} ${x1 - T / 2},${y + T / 2} ${x0 + T / 2},${y + T / 2}`;
};
const vSeg = (x: number, y0: number, y1: number) => {
  y0 += G; y1 -= G;
  return `${x},${y0} ${x + T / 2},${y0 + T / 2} ${x + T / 2},${y1 - T / 2} ${x},${y1} ${x - T / 2},${y1 - T / 2} ${x - T / 2},${y0 + T / 2}`;
};
const SEGS: Record<string, string> = {
  a: hSeg(T / 2),
  b: vSeg(W - T / 2, T / 2, H / 2),
  c: vSeg(W - T / 2, H / 2, H - T / 2),
  d: hSeg(H - T / 2),
  e: vSeg(T / 2, H / 2, H - T / 2),
  f: vSeg(T / 2, T / 2, H / 2),
  g: hSeg(H / 2),
};
const DIGITS: Record<string, string> = {
  '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc',
  '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg',
};

export function SevenSeg({ text, className }: { text: string; className?: string }) {
  const GAP = 22, COLON = 44, SKEW = 26;
  let x = SKEW;
  const parts: ReactNode[] = [];
  [...text].forEach((ch, i) => {
    if (ch === ':') {
      parts.push(
        <g key={i} transform={`translate(${x + COLON / 2 - T / 2},0)`}>
          <rect className="seg-on" x={0} y={H * 0.3 - T / 2} width={T} height={T} />
          <rect className="seg-on" x={0} y={H * 0.7 - T / 2} width={T} height={T} />
        </g>,
      );
      x += COLON + GAP;
    } else {
      const lit = DIGITS[ch] ?? '';
      parts.push(
        <g key={i} transform={`translate(${x},0)`}>
          {Object.entries(SEGS).map(([k, pts]) => (
            <polygon key={k} points={pts} className={lit.includes(k) ? 'seg-on' : 'seg-off'} />
          ))}
        </g>,
      );
      x += W + GAP;
    }
  });
  const width = x - GAP + 4;
  return (
    <svg className={clsx('seg', className)} viewBox={`0 0 ${width} ${H}`} aria-hidden="true" focusable="false">
      <g transform={`skewX(-8) translate(0,0)`}>{parts}</g>
    </svg>
  );
}

/* ---------------------------------------------------------------- small helpers */
export function Tba({ value }: { value: string | null }) {
  return value ? <>{value}</> : <span className="tba">To be announced</span>;
}

/* ---------------------------------------------------------------- live Dubai clock */
const pad2 = { minimumIntegerDigits: 2 } as const;
export function DubaiClock({ label = true }: { label?: boolean }) {
  const t = useDubaiTime();
  return (
    <span className="dclock" title="Local time in Dubai (GST, UTC+4)">
      {label && <span className="dclock-l">Dubai</span>}
      <time dateTime={t.iso} aria-label={`Dubai time ${t.hh}:${t.mm}`}>
        {/* Terminal Industries: data-like micro-motion, the digits roll on every tick (NumberFlow). */}
        <NumberFlow value={+t.hh} format={pad2} trend={1} />:<NumberFlow value={+t.mm} format={pad2} trend={1} />:<span className="dclock-s"><NumberFlow value={+t.ss} format={pad2} trend={1} /></span>
      </time>
      <span className="dclock-z">GST</span>
    </span>
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
