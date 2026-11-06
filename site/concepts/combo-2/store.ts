// Tiny shared stores: which section is in view (drives the nav and the ticket stub) and loader state.
import { useSyncExternalStore } from 'react';
import type { SectionId } from './data';

function store<T>(initial: T) {
  let v = initial;
  const subs = new Set<() => void>();
  return {
    get: () => v,
    set: (n: T) => { if (n !== v) { v = n; subs.forEach((f) => f()); } },
    sub: (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; },
  };
}

export const sectionStore = store<SectionId>('top');
export const useSection = () => useSyncExternalStore(sectionStore.sub, sectionStore.get, sectionStore.get);

/** 'boot' while the loader runs, 'ready' after. */
export const phaseStore = store<'boot' | 'ready'>('boot');
export const usePhase = () => useSyncExternalStore(phaseStore.sub, phaseStore.get, phaseStore.get);

/** Which desk row (wellness / resources / contact) is open; the nav opens a row when you jump to it. */
export const deskStore = store<string[]>([]);
export const useDesk = () => useSyncExternalStore(deskStore.sub, deskStore.get, deskStore.get);
