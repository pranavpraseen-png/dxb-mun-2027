// The opening's clocks: the loader timeline (Alt 3's phases) and the scroll flight to Dubai.
// The 3D reads these every frame; React subscribes to the few changes that alter the HTML.
import { useSyncExternalStore } from 'react';

/** Loader phases: 0 ASCII shuffle → 1 numbered point web → 2 wireframe globe draws → 3 hero text → 4 done. */
export const PHASE_AT = [0, 1.2, 2.2, 3.2, 3.7];
export const DONE = PHASE_AT.length - 1;

export const now = () => performance.now() / 1000;
/** Seconds since the opening started building (it starts once the fonts and the canvas are ready). */
export const intro = { t0: Infinity };
export function startIntro() {
  if (intro.t0 === Infinity) intro.t0 = now();
}
export const introT = () => now() - intro.t0;
/** 0…1 progress of the loader between two moments (seconds). */
export const span = (a: number, b: number) => Math.max(0, Math.min(1, (introT() - a) / (b - a)));
/** Any key, tap or wheel jumps the loader to the hero text. */
export function skipIntro() {
  if (introT() < PHASE_AT[3]) { startIntro(); intro.t0 = now() - PHASE_AT[3]; }
}

/** Scroll flight, 0 (hero) … 1 (Dubai): raw pinned ScrollTrigger progress, written by the section. */
export const fly = { p: 0 };

type UiState = { phase: number; flying: boolean; dubai: boolean };
const state: UiState = { phase: 0, flying: false, dubai: false };
const subs = new Set<() => void>();
export const getUi = () => state;
export function setUi(patch: Partial<UiState>) {
  let changed = false;
  for (const k of Object.keys(patch) as (keyof UiState)[]) if (state[k] !== patch[k]) { (state as Record<string, unknown>)[k] = patch[k]; changed = true; }
  if (!changed) return;
  document.documentElement.dataset.opPhase = String(state.phase); // read by the screenshot script
  subs.forEach((f) => f());
}
export function useUi<T>(pick: (s: UiState) => T): T {
  return useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => pick(state), () => pick(state));
}
