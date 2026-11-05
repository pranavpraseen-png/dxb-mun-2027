// Hash routes for the secretariat dashboard. Ten pages, grouped into seven nav places (DASHBOARD-PLAN.md §3).
// Filters live in the query: #/applicants?status=applied&committee=<id>
import { useSyncExternalStore } from 'react';

export type Page =
  | 'live' | 'applicants' | 'seats' | 'committees' | 'awards' | 'schedule' | 'deadlines'
  | 'announcements' | 'documents' | 'checkin' | 'team';

export const PAGE_TITLE: Record<Page, string> = {
  live: 'Live overview', applicants: 'Delegates', seats: 'Seats', committees: 'Committees and chairs', awards: 'Awards',
  schedule: 'Schedule', deadlines: 'Deadlines', announcements: 'Announcements', documents: 'Documents',
  checkin: 'Check-in', team: 'Team access',
};

export type PlaceId = 'live' | 'delegates' | 'committees' | 'programme' | 'notices' | 'checkin' | 'team';
/** The seven nav places. A place with more than one page shows tabs under its heading. */
export const PLACES: { id: PlaceId; label: string; short: string; pages: { id: Page; label: string }[] }[] = [
  { id: 'live', label: 'Live overview', short: 'Live', pages: [{ id: 'live', label: 'Live overview' }] },
  { id: 'delegates', label: 'Delegates and seats', short: 'Delegates', pages: [{ id: 'applicants', label: 'Delegates' }, { id: 'seats', label: 'Seats' }] },
  { id: 'committees', label: 'Committees', short: 'Committees', pages: [{ id: 'committees', label: 'Committees and chairs' }, { id: 'awards', label: 'Awards' }] },
  { id: 'programme', label: 'Schedule and deadlines', short: 'Schedule', pages: [{ id: 'schedule', label: 'Schedule' }, { id: 'deadlines', label: 'Deadlines' }] },
  { id: 'notices', label: 'Notices and documents', short: 'Notices', pages: [{ id: 'announcements', label: 'Announcements' }, { id: 'documents', label: 'Documents' }] },
  { id: 'checkin', label: 'Check-in', short: 'Check-in', pages: [{ id: 'checkin', label: 'Check-in' }] },
  { id: 'team', label: 'Team access', short: 'Team', pages: [{ id: 'team', label: 'Team access' }] },
];
export const PAGES = PLACES.flatMap((p) => p.pages.map((x) => x.id));
export const placeOf = (page: Page) => PLACES.find((p) => p.pages.some((x) => x.id === page))!;

export type Route = { page: Page; params: URLSearchParams };

function parse(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  const page = (PAGES as string[]).includes(path) ? (path as Page) : 'live';
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

/** Changes the current page's filters without a history entry for every keystroke. */
export function setParams(params: URLSearchParams) {
  const q = params.toString();
  const next = `#/${current.page}${q ? `?${q}` : ''}`;
  history.replaceState(null, '', next);
  current = parse(next);
  notify();
}

/** Sets one filter (empty removes it). */
export function setParam(key: string, value: string) {
  const p = new URLSearchParams(current.params);
  if (value) p.set(key, value); else p.delete(key);
  setParams(p);
}
