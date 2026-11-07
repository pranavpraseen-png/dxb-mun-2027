// Clocks and shared state. The 3D reads `intro`, `cam` and `ui` every frame; React subscribes to `ui` changes.
import { useSyncExternalStore } from 'react';

export const now = () => performance.now() / 1000;

/* ------------------------------------------------------------------ the opening */
/** Opening moments (seconds): plan draws, seats fill, camera lands, hero text, done. */
export const T = { plan: 0, fill: 1.0, descend: 1.5, podium: 3.0, hero: 3.6, done: 4.4 };
declare global { interface Window { __A4_HOLD?: number; __a4?: { seek: (t: number) => void; play: () => void; skip: () => void; lift: () => number } } }
export const intro = { t0: Infinity, hold: (typeof window !== 'undefined' && typeof window.__A4_HOLD === 'number' ? window.__A4_HOLD : null) as number | null };
export function startIntro() { if (intro.t0 === Infinity) intro.t0 = now(); }
export const introT = () => (intro.hold !== null ? intro.hold : now() - intro.t0);
/** 0…1 progress between two opening moments. */
export const span = (a: number, b: number) => Math.max(0, Math.min(1, (introT() - a) / (b - a)));
export function skipIntro() {
  if (intro.hold !== null) return;
  if (introT() < T.hero) { startIntro(); intro.t0 = now() - T.hero; }
}
if (typeof window !== 'undefined') {
  window.__a4 = {
    seek: (t) => { intro.hold = t; },
    play: () => { const t = introT(); intro.hold = null; intro.t0 = now() - (Number.isFinite(t) ? t : 0); },
    skip: () => { intro.hold = null; intro.t0 = now() - T.done - 0.1; },
    lift: () => Math.round(cam.lift * 1000) / 1000,
  };
}

/* ------------------------------------------------------------------ scroll → camera station */
/** s = 0 (hero) … 7 (contact). Written by the page's scroll listener, read by the camera rig. */
export const cam = { s: 0, lift: 0 };

/* ------------------------------------------------------------------ UI state */
export type Ui = { phase: 0 | 1 | 2 | 3 | 4; section: number; block: number; day: number; slot: number; menu: boolean };
const state: Ui = { phase: 0, section: 0, block: 0, day: 0, slot: 1, menu: false };
const subs = new Set<() => void>();
export const ui = state;
if (typeof document !== 'undefined') { document.documentElement.dataset.phase = '0'; document.documentElement.dataset.section = '0'; }
export function setUi(patch: Partial<Ui>) {
  let changed = false;
  for (const k of Object.keys(patch) as (keyof Ui)[]) {
    if (state[k] !== patch[k]) { (state as Record<string, unknown>)[k] = patch[k]; changed = true; }
  }
  if (!changed) return;
  const d = document.documentElement.dataset;
  d.phase = String(state.phase); d.section = String(state.section); // read by the screenshot script
  subs.forEach((f) => f());
}
export function useUi<V>(pick: (s: Ui) => V): V {
  return useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => pick(state), () => pick(state));
}

export const smoother = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const easeOutBack = (x: number) => { const c = 1.4; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };
export const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
