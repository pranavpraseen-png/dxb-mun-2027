// One tiny shared store for the DOM overlays and the WebGL stage.
// `rig` is mutable and read every frame (no React renders); `ui` is the small React-visible slice.
import { useSyncExternalStore } from 'react';
import { committees } from '@/data/conference';

/** Camera stops, in scroll order. `dwell` and `travel` are in viewport heights of scroll. */
export const STOPS = [
  { id: 'home', cam: 'Slate', label: 'On air', dwell: 0.12, travel: 0.8 },
  { id: 'about', cam: 'Orbit', label: 'About', dwell: 0.32, travel: 0.6 },
  { id: 'dubai', cam: 'Dubai', label: 'Dubai', dwell: 0.3, travel: 0.95 },
  { id: 'committees', cam: 'Floor', label: 'Committees', dwell: 0.45, travel: 0.65 },
  { id: 'schedule', cam: 'Rostrum', label: 'Schedule', dwell: 0.35, travel: 0.6 },
  { id: 'timer', cam: 'Dais', label: 'Timer and desk', dwell: 0.45, travel: 0.65 },
  { id: 'contact', cam: 'Aerial', label: 'Contact', dwell: 0, travel: 0 },
] as const;
export type StopId = (typeof STOPS)[number]['id'];
export const LAST = STOPS.length - 1;
/** Where the camera leaves the space world and enters the hall (inside the fog). */
export const SWITCH = 2.5;

type Range = { top: number; dwellEnd: number };

export const rig = {
  /** scroll-mapped stop parameter (0..LAST), and its damped copy that the camera uses */
  target: 0,
  t: 0,
  ranges: [] as Range[],
  pointer: { x: 0, y: 0 },
  narrow: false,
  lite: false,
  still: false,
  /** false until the WebGL stage is drawing, and again if its context is lost */
  glAlive: false,
  /** smoothed focus on the picked nameplate (phone camera follows it) */
  plateFocus: 0,
};

/** Map a scroll position to the stop parameter: hold during each stop's dwell, then travel to the next. */
export function tAt(s: number) {
  const r = rig.ranges;
  if (!r.length) return 0;
  for (let i = r.length - 1; i >= 0; i--) {
    if (s < r[i].top && i > 0) continue;
    if (i === r.length - 1) return i;
    if (s <= r[i].dwellEnd) return i;
    const span = Math.max(1, r[i + 1].top - r[i].dwellEnd);
    return i + Math.min(1, (s - r[i].dwellEnd) / span);
  }
  return 0;
}

/** Re-measure the stop spacers (called on ScrollTrigger refresh). */
export function measureStops() {
  const vh = window.innerHeight;
  rig.ranges = STOPS.map((s) => {
    const el = document.getElementById('stop-' + s.id);
    const top = el ? el.getBoundingClientRect().top + window.scrollY : 0;
    return { top, dwellEnd: top + s.dwell * vh };
  });
}

/** How visible stop i's overlay is at stop parameter t (1 during the dwell, 0 mid-flight). */
export function presence(t: number, i: number) {
  const d = Math.abs(t - i);
  const a = 0.14, b = 0.4;
  if (d <= a) return 1;
  if (d >= b) return 0;
  const x = (d - a) / (b - a);
  return 1 - x * x * (3 - 2 * x);
}

/* ------------------------------------------------------------------ React-visible slice */
type UI = { stop: number; picked: number; day: number; timer: string; timerState: 'ready' | 'running' | 'paused' | 'done'; posters: string[] };
let ui: UI = { stop: 0, picked: 0, day: 1, timer: '01:00', timerState: 'ready', posters: [] };
const subs = new Set<() => void>();
export const getUI = () => ui;
export function setUI(patch: Partial<UI>) {
  let changed = false;
  for (const k in patch) if ((patch as Record<string, unknown>)[k] !== (ui as Record<string, unknown>)[k]) changed = true;
  if (!changed) return;
  ui = { ...ui, ...patch };
  subs.forEach((f) => f());
}
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export function useUI<T>(pick: (u: UI) => T): T {
  return useSyncExternalStore(subscribe, () => pick(ui), () => pick(ui));
}

export const pickPlate = (i: number) => setUI({ picked: ((i % committees.length) + committees.length) % committees.length });
