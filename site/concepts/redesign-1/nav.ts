// The top nav "jumps the camera": every item is a camera stop, reached by a Lenis scroll so the flight is seen.
import { nav as siteNav } from '@/data/conference';
import { getLenis } from '@/shared/scroll';
import { LAST, rig, STOPS } from './store';

const STOP_OF: Record<string, number> = { home: 0, about: 1, committees: 3, schedule: 4, timer: 5, wellness: 5, resources: 5, contact: 6 };

/** The live site's nav, minus Home (the wordmark goes home). All seven sections, each one camera stop. */
export const NAV = siteNav.filter((n) => n.id !== 'home').map((n) => ({ id: n.id, label: n.label, stop: STOP_OF[n.id] }));

export const BAR_H = 60;

/** Fly to a stop. `anchor` is the element to use when there is no camera (still mode). */
export function flyTo(stop: number, anchor?: string) {
  const lenis = getLenis();
  const r = rig.ranges[stop];
  if (lenis && r && !rig.still) {
    const from = Math.round(rig.t);
    const hops = Math.abs(stop - from);
    lenis.scrollTo(r.top + (stop === LAST ? 0 : 1), { duration: Math.min(3.2, 1.2 + hops * 0.38), force: true });
    return;
  }
  const el = document.getElementById(anchor ?? 'stop-' + STOPS[stop].id) ?? document.getElementById('stop-' + STOPS[stop].id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - (rig.still ? BAR_H : 0);
  window.scrollTo({ top: stop === 0 ? 0 : top, behavior: rig.still ? 'auto' : 'smooth' });
}

/** Which nav items light up at a stop (the globe and Dubai both count as About). */
export const activeAt = (stop: number) => (stop === 2 ? 1 : stop);
