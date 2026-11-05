import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { archPath, lattice, star8, toPath } from './lattice';

/**
 * A mashrabiya screen. Solid ground with the 8-point stars cut out (you see through them),
 * and every star edged with a double brass inlay line.
 */
export function Screen({ cols, rows, anchor = 'xMidYMid', open = 'eights', className }: {
  cols: number; rows: number; anchor?: string; open?: 'eights' | 'all' | 'none'; className?: string;
}) {
  const { solid, lines, w, h } = useMemo(() => {
    const g = lattice(cols, rows);
    const cutouts = open === 'all' ? [...g.eights, ...g.fours] : open === 'eights' ? g.eights : [];
    return {
      solid: `M0 0H${g.width}V${g.height}H0Z` + toPath(cutouts),
      lines: toPath([...g.eights, ...g.fours]),
      w: g.width, h: g.height,
    };
  }, [cols, rows, open]);
  return (
    <svg className={className} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio={`${anchor} slice`} aria-hidden="true" focusable="false">
      <path d={solid} fillRule="evenodd" className="scr-solid" />
      <path d={lines} className="scr-inlay" />
      <path d={lines} className="scr-inlay-gap" />
    </svg>
  );
}

/** An 8-point star ornament. */
export function Star({ size = 16, className }: { size?: number; className?: string }) {
  const d = useMemo(() => star8(50, 50, 48), []);
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <path d={d} />
    </svg>
  );
}

/** A pointed arch frame that measures its box and redraws, so the crown never distorts. */
export function ArchFrame({ className, lines = 2, gap = 9, crown = 0.62, fill = false }: {
  className?: string; lines?: number; gap?: number; crown?: number; fill?: boolean;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = () => { const r = el.getBoundingClientRect(); setBox({ w: Math.round(r.width), h: Math.round(r.height) }); };
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const { w, h } = box;
  return (
    <svg ref={ref} className={className} width="100%" height="100%" viewBox={`0 0 ${w || 1} ${h || 1}`} aria-hidden="true" focusable="false">
      {w > 0 && fill && <path d={archPath(w, h, 0, crown)} className="arch-fill" />}
      {w > 0 && Array.from({ length: lines }, (_, i) => (
        <path key={i} d={archPath(w, h, 1 + i * gap, crown)} className={'arch-line arch-line-' + i} />
      ))}
    </svg>
  );
}
