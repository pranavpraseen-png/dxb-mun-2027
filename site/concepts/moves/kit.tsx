// Shared bits for the moves page: the likes store (localStorage `moves.likes`), the Like toggle,
// the demo section frame, an in-view hook and the still / reduced-motion flag.
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from 'react';
import { isStill } from '@/shared/hooks';

/** `?still` or the OS "reduce motion" setting: final states, no motion. */
export const STILL = isStill();
export const FINE_POINTER = typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
export const NARROW = typeof window !== 'undefined' && window.innerWidth < 768;

/* ------------------------------------------------------------ likes */
const KEY = 'moves.likes';
let likes: string[] = (() => {
  try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []; }
  catch { return []; }
})();
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(likes)); } catch { /* storage blocked: keep in memory */ } };
window.addEventListener('storage', (e) => {
  if (e.key !== KEY) return;
  try { likes = JSON.parse(e.newValue || '[]'); } catch { likes = []; }
  emit();
});
export const useLikes = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => likes);
export const toggleLike = (id: string) => {
  likes = likes.includes(id) ? likes.filter((x) => x !== id) : [...likes, id];
  save(); emit();
};
export const clearLikes = () => { likes = []; save(); emit(); };

export function LikeButton({ id, label }: { id: string; label: string }) {
  const all = useLikes();
  const on = all.includes(id);
  const n = all.indexOf(id) + 1;
  return (
    <button type="button" className="like" aria-pressed={on} onClick={() => toggleLike(id)} aria-label={(on ? 'Unlike ' : 'Like ') + label}>
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        {on ? <path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="square" />
            : <path d="M8 3v10M3 8h10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />}
      </svg>
      <span>{on ? `Liked · pick ${n}` : 'Like'}</span>
    </button>
  );
}

/* ------------------------------------------------------------ in view */
/** True while the element is within `margin` of the viewport. Used to pause demos off screen. */
export function useInView(ref: RefObject<Element | null>, margin = '200px') {
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setV(e.isIntersecting), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin]);
  return v;
}

/* ------------------------------------------------------------ demo frame */
type DemoProps = {
  id: string; n: number; title: string; caption: string;
  credit: { label: string; url: string }[];
  likeLabel: string;
  /** Extra class for the section (e.g. a tall scroll track). */
  className?: string;
  children: ReactNode;
};
export function Demo({ id, n, title, caption, credit, likeLabel, className, children }: DemoProps) {
  const ref = useRef<HTMLElement>(null);
  return (
    <section id={id} ref={ref} className={'demo ' + (className ?? '')} aria-labelledby={id + '-t'}>
      <header className="demo-head">
        <p className="demo-n">Live {String(n).padStart(2, '0')}</p>
        <h2 id={id + '-t'} className="demo-t">{title}</h2>
        <p className="demo-cap">{caption}</p>
        <p className="demo-credit">
          Source:{' '}
          {credit.map((c, i) => (
            <span key={c.url}>{i > 0 && ' · '}<a href={c.url} target="_blank" rel="noopener">{c.label}</a></span>
          ))}
        </p>
        <LikeButton id={id} label={likeLabel} />
      </header>
      {children}
    </section>
  );
}

/** Where the public site hands off to the dashboards (copied from concepts/final/links.ts). */
const ROOT = '../../';
export const portal = ROOT + 'portal/';
export const register = portal + '#/now';
export const signIn = portal + '#/now';
