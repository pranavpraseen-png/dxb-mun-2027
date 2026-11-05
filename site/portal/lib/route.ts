// Hash routes, so the back button and deep links work: #/now, #/notes/mine, #/resolutions/new ...
// The first segment is the place (one of the seven); the rest name a tab or an item inside it.
import { useSyncExternalStore } from 'react';

export type Place = 'now' | 'speakers' | 'resolutions' | 'paper' | 'notes' | 'files' | 'schedule';
export type Route = { page: Place; parts: string[]; section: string | null };

export const PLACE_IDS: Place[] = ['now', 'speakers', 'resolutions', 'paper', 'notes', 'files', 'schedule'];

function parse(hash: string): Route {
  const [a, ...rest] = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const page = (PLACE_IDS as string[]).includes(a) ? (a as Place) : 'now';
  const parts = page === a ? rest : [];
  return { page, parts, section: parts[0] ?? null };
}

let current = parse(typeof location === 'undefined' ? '' : location.hash);
const listeners = new Set<() => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    current = parse(location.hash);
    listeners.forEach((l) => l());
  });
}

export function useRoute(): Route {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => current,
    () => current,
  );
}

export const href = (page: Place, ...parts: string[]) => `#/${page}${parts.length ? '/' + parts.join('/') : ''}`;

export function go(page: Place, ...parts: string[]) {
  const next = href(page, ...parts);
  if (location.hash === next) {
    current = { ...parse(next) };
    listeners.forEach((l) => l());
  } else {
    location.hash = next;
  }
}
