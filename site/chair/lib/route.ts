// Hash routes for the chair dashboard: #/run, #/floor?tab=vote, #/awards?tab=ranking …
import { useSyncExternalStore } from 'react';

export type Page = 'run' | 'floor' | 'papers' | 'resolutions' | 'chits' | 'awards' | 'docs';
export const PAGES: Page[] = ['run', 'floor', 'papers', 'resolutions', 'chits', 'awards', 'docs'];
export type Route = { page: Page; params: URLSearchParams };

function parse(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  const page = (PAGES as string[]).includes(path) ? (path as Page) : 'run';
  return { page, params: new URLSearchParams(query) };
}

let current = parse(typeof location === 'undefined' ? '' : location.hash);
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => { current = parse(location.hash); notify(); });
}

export function useRoute(): Route {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => current, () => current);
}

export function href(page: Page, params?: Record<string, string>): string {
  const q = params ? new URLSearchParams(params).toString() : '';
  return `#/${page}${q ? `?${q}` : ''}`;
}

export function go(page: Page, params?: Record<string, string>) {
  location.hash = href(page, params);
}

/** Changes one query value on the current page without a new history entry. */
export function setParam(key: string, value: string) {
  const p = new URLSearchParams(current.params);
  p.set(key, value);
  const next = `#/${current.page}?${p.toString()}`;
  history.replaceState(null, '', next);
  current = parse(next);
  notify();
}
