// One shared clock for every countdown on the page. It updates five times a second so the shown second
// flips on time, but only components that call useNow() re-render.
import { useSyncExternalStore } from 'react';
import type { Timer } from '@/platform/v2';

let now = Date.now();
const listeners = new Set<() => void>();
let handle: ReturnType<typeof setInterval> | null = null;

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!handle) handle = setInterval(() => { now = Date.now(); listeners.forEach((l) => l()); }, 200);
  return () => {
    listeners.delete(cb);
    if (!listeners.size && handle) { clearInterval(handle); handle = null; }
  };
}

export function useNow(): number {
  return useSyncExternalStore(subscribe, () => now, () => now);
}

/** Exactly as the contract says: running ? max(0, (endsAt - now) / 1000) : remainingSeconds. */
export function remainingOf(t: Timer, at: number): number {
  if (t.running && t.endsAt) {
    const end = Date.parse(t.endsAt);
    if (!Number.isNaN(end)) return Math.max(0, (end - at) / 1000);
  }
  return Math.max(0, t.remainingSeconds);
}

/** Whole seconds to show: rounded up, so "0:00" appears only when time is really up. */
export const shownSeconds = (sec: number) => Math.max(0, Math.ceil(sec - 0.001));

/** 90 -> "01:30", 3725 -> "1:02:05". */
export function clockText(sec: number): string {
  const s = shownSeconds(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${p(m)}:${p(r)}` : `${p(m)}:${p(r)}`;
}

/** Spoken form for screen readers: "1 minute 30 seconds". */
export function clockWords(sec: number): string {
  const s = shownSeconds(sec);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const part = (n: number, w: string) => (n ? `${n} ${w}${n === 1 ? '' : 's'}` : '');
  return [part(h, 'hour'), part(m, 'minute'), part(r, 'second')].filter(Boolean).join(' ') || '0 seconds';
}

export type TimerTone = 'normal' | 'warning' | 'over';
export function timerTone(sec: number): TimerTone {
  const s = shownSeconds(sec);
  if (s <= 0) return 'over';
  if (s < 10) return 'warning';
  return 'normal';
}

/** "3 days 4 h", "5 h 12 min", "12 min", or null when the date is unknown. Past dates return "Passed". */
export function countdownText(iso: string | null, at: number): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const diff = Math.floor((t - at) / 1000);
  if (diff <= 0) return 'Passed';
  const d = Math.floor(diff / 86400), h = Math.floor((diff % 86400) / 3600), m = Math.floor((diff % 3600) / 60);
  if (d > 0) return `${d} day${d === 1 ? '' : 's'} ${h} h`;
  if (h > 0) return `${h} h ${m} min`;
  return `${Math.max(1, m)} min`;
}
