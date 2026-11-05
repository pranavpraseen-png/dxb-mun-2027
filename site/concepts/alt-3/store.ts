// One tiny store for the whole stage: where the camera is on the scene path, which scene is the destination,
// the loader phase, and the two picks (committee, day). The 3D reads it every frame; React subscribes to changes.
import { useSyncExternalStore } from 'react';
import { N } from './content';

/** The one easing curve, everywhere: cubic-bezier(0.65, 0.05, 0, 1). Solved numerically for x → y. */
export const EASE_CSS = 'cubic-bezier(0.65, 0.05, 0, 1)';
const bez = (p1: number, p2: number) => (t: number) => 3 * (1 - t) * (1 - t) * t * p1 + 3 * (1 - t) * t * t * p2 + t * t * t;
const bx = bez(0.65, 0), by = bez(0.05, 1);
export function ease(x: number) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  let lo = 0, hi = 1, t = x;
  for (let i = 0; i < 24; i++) {
    t = (lo + hi) / 2;
    if (bx(t) < x) lo = t; else hi = t;
  }
  return by(t);
}

/** Loader phases: 0 ASCII shuffle → 1 numbered point web → 2 wireframe draws → 3 hero text → 4 done. */
export const PHASE_AT = [0, 1.2, 2.2, 3.2, 3.7];

type State = {
  scene: number; // destination scene (what the corners and captions show)
  phase: number; // loader phase
  committee: number;
  day: number;
  menu: boolean;
};
const state: State = { scene: 0, phase: 0, committee: 0, day: 0, menu: false };
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
export const set = (patch: Partial<State>) => {
  Object.assign(state, patch);
  // Mirrored on <html> for the screenshot script and for CSS hooks.
  const ds = document.documentElement.dataset;
  ds.phase = String(state.phase);
  ds.scene = String(state.scene);
  emit();
};
export const get = () => state;
export function useStore<T>(pick: (s: State) => T): T {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => pick(state), () => pick(state));
}

/* ------------------------------------------------------------------ the camera flight */
// `pos` is a float scene index (0…N-1). A flight eases it from `from` to `to`; the rig reads it every frame.
export const flight = { pos: 0, from: 0, to: 0, t0: 0, dur: 0, busy: false };
export const now = () => performance.now() / 1000;
export function goTo(i: number) {
  const to = Math.max(0, Math.min(N - 1, i));
  if (to === flight.to && !flight.busy && Math.abs(flight.pos - to) < 1e-3) return;
  const dist = Math.abs(to - flight.pos);
  flight.from = flight.pos;
  flight.to = to;
  flight.t0 = now();
  flight.dur = Math.min(1.9, 1.1 + 0.2 * Math.max(0, dist - 1));
  flight.busy = true;
  set({ scene: to, menu: false });
  try { history.replaceState(null, '', '#' + ['globe', 'dubai', 'resolution', 'committees', 'schedule', 'register'][to]); } catch { /* sandboxed */ }
}
export function tickFlight(t: number) {
  if (!flight.busy) return flight.pos;
  const k = (t - flight.t0) / flight.dur;
  flight.pos = flight.from + (flight.to - flight.from) * ease(k);
  if (k >= 1) { flight.pos = flight.to; flight.busy = false; }
  return flight.pos;
}
/** The loader clock: seconds since the stage started building (it starts once the fonts and the canvas are ready;
 *  until then it reads -Infinity and the ASCII loader keeps shuffling). Skipping moves t0 back to the hero phase. */
export const intro = { t0: Infinity };
export function startIntro() {
  if (intro.t0 !== Infinity) return;
  intro.t0 = now();
  document.documentElement.dataset.intro = 'run';
}
export const introT = () => now() - intro.t0;
/** 0…1 progress of the loader between two moments (seconds). */
export const span = (a: number, b: number) => Math.max(0, Math.min(1, (introT() - a) / (b - a)));

/** 0…1 through the current flight (1 when resting). */
export const flightProgress = () => (flight.busy ? Math.min(1, (now() - flight.t0) / flight.dur) : 1);
