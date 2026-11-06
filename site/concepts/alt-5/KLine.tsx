// One kinetic line. Plain text, or a row of parts (buttons or links) that share one fitted line.
import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { isStill } from '@/shared/hooks';
import { register, type LineHandle, type LineOpts } from './kinetic';

export type Part = {
  key: string;
  text: string;
  active?: boolean;
  onClick?: () => void;
  href?: string;
  label?: string; // accessible name
  pressed?: boolean; // toggle buttons
  current?: boolean; // tabs
  controls?: string;
};

type Props = {
  text?: string;
  parts?: Part[];
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'div';
  className?: string;
  opts?: Partial<LineOpts>;
  /** Stretch in from this share of the column whenever the text changes (0 = no stretch-in). */
  stretchFrom?: number;
  /** Stretch in when this value becomes true (e.g. after the loader). */
  play?: boolean;
  label?: string;
  id?: string;
  children?: ReactNode;
};

const still = isStill();

function letters(text: string, seg: number) {
  return Array.from(text).map((ch, i) => (
    <span key={i} data-k={ch} data-seg={seg} className="kc" aria-hidden="true">{ch === ' ' ? ' ' : ch}</span>
  ));
}

export function KLine({ text, parts, as: Tag = 'div', className, opts, stretchFrom = 0, play = true, label, id, children }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const el = useRef<HTMLSpanElement>(null);
  const h = useRef<LineHandle | null>(null);
  const sig = parts ? parts.map((p) => p.key + p.text).join('|') : text ?? '';
  const optsKey = JSON.stringify(opts ?? {});

  useLayoutEffect(() => {
    const handle = register(box.current!, el.current!, parts?.length ?? 0, opts ?? {});
    h.current = handle;
    if (parts) parts.forEach((p, i) => handle.setEmph(i, p.active ? 1 : 0));
    if (stretchFrom > 0 && !still) {
      handle.opts.fill = stretchFrom;
      if (play) gsap.to(handle.opts, { fill: opts?.fill ?? 1, duration: 0.9, ease: 'expo.out' });
    }
    return () => { gsap.killTweensOf(handle.opts); handle.destroy(); h.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, optsKey]);

  useEffect(() => {
    const handle = h.current;
    if (!handle || stretchFrom <= 0 || still || !play) return;
    gsap.to(handle.opts, { fill: opts?.fill ?? 1, duration: 0.9, ease: 'expo.out' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play]);

  useEffect(() => {
    if (!parts || !h.current) return;
    parts.forEach((p, i) => h.current!.setEmph(i, p.active ? 1 : 0));
  });

  const hover = (i: number, on: boolean) => {
    const p = parts?.[i];
    if (!p || !h.current) return;
    h.current.setEmph(i, p.active ? 1 : on ? 0.45 : 0);
  };

  return (
    <Tag className={'kbox ' + (className ?? '')} ref={box as never} id={id}>
      {label || text ? <span className="sr">{label ?? text}</span> : null}
      <span className="kl" ref={el}>
        {parts
          ? parts.map((p, i) => {
              const inner = letters(p.text, i);
              const common = {
                className: 'kpart' + (p.active ? ' is-on' : ''),
                onMouseEnter: () => hover(i, true),
                onMouseLeave: () => hover(i, false),
                onFocus: () => hover(i, true),
                onBlur: () => hover(i, false),
                'aria-label': p.label ?? p.text,
              };
              if (!p.href && !p.onClick) {
                const node = <span key={p.key} className={common.className}>{inner}</span>;
                return i < parts.length - 1
                  ? [node, <span key={p.key + '-gap'} data-k=" " data-seg={-1} className="kc" aria-hidden="true">{' '}</span>]
                  : node;
              }
              const node = p.href
                ? <a key={p.key} href={p.href} {...common}>{inner}</a>
                : (
                  <button
                    key={p.key}
                    type="button"
                    onClick={p.onClick}
                    aria-pressed={p.pressed ?? p.current}
                    aria-controls={p.controls}
                    {...common}
                  >{inner}</button>
                );
              return i < parts.length - 1
                ? [node, <span key={p.key + '-gap'} data-k=" " data-seg={-1} className="kc" aria-hidden="true">{' '}</span>,
                  <span key={p.key + '-gap2'} data-k=" " data-seg={-1} className="kc" aria-hidden="true">{' '}</span>]
                : node;
            })
          : letters(text ?? '', -1)}
      </span>
      {children}
    </Tag>
  );
}
