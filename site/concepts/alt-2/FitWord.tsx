import { useLayoutEffect, useRef } from 'react';

/**
 * A word set edge to edge (Outfit's full-width wordmark): the font size is measured so the word fills its
 * container exactly, rounded DOWN to a whole pixel (crisp, and never wider than the page).
 * Each letter sits in its own span so it can rise from behind the mask line, one after another.
 */
export function FitWord({ text, className = '', label }: { text: string; className?: string; label?: string }) {
  const box = useRef<HTMLSpanElement>(null);
  const word = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const b = box.current, el = word.current;
    if (!b || !el) return;
    const fit = () => {
      el.style.fontSize = '100px';
      const w = el.getBoundingClientRect().width;
      const target = b.clientWidth;
      if (!w || !target) return;
      el.style.fontSize = Math.max(12, Math.floor((100 * target) / w)) + 'px';
    };
    fit();
    document.fonts?.ready.then(fit);
    const ro = new ResizeObserver(fit);
    ro.observe(b);
    return () => ro.disconnect();
  }, [text]);

  const chars = [...text];
  return (
    <span ref={box} className={'fit ' + className} role="img" aria-label={label ?? text}>
      <span ref={word} className="fit-word" aria-hidden="true">
        {chars.map((c, i) => (
          <span key={i} className={'ch' + (c === ' ' ? ' ch-sp' : '') + (i === chars.length - 1 ? ' ch-last' : '')}>
            {c === ' ' ? ' ' : c}
          </span>
        ))}
      </span>
    </span>
  );
}
