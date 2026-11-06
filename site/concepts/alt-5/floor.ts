// The floor: the list of motions, which one is on the floor, and the vote tally (the scroll indicator).
import { useSyncExternalStore } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { isStill } from '@/shared/hooks';
import { getLenis } from '@/shared/scroll';
import { resetScrollBaseline } from './kinetic';

gsap.registerPlugin(ScrollTrigger);

export const NAV_H = 56;

export type Motion = { id: string; n: string; label: string; motion: string; ground: Ground };
export type Ground = 'ink' | 'paper' | 'signal' | 'host';

/** 00 is the opening; 01–07 are the nav sections, in nav order. */
export const MOTIONS: Motion[] = [
  { id: 'home', n: '00', label: 'Opening', motion: 'To open the floor', ground: 'ink' },
  { id: 'about', n: '01', label: 'About', motion: 'To introduce the conference', ground: 'paper' },
  { id: 'committees', n: '02', label: 'Committees', motion: 'To set the agenda', ground: 'ink' },
  { id: 'schedule', n: '03', label: 'Schedule', motion: 'To adopt the timetable', ground: 'signal' },
  { id: 'register', n: '04', label: 'Register', motion: 'To take the floor', ground: 'ink' },
  { id: 'wellness', n: '05', label: 'Wellness', motion: 'For a short recess', ground: 'paper' },
  { id: 'resources', n: '06', label: 'Resources', motion: 'To circulate the rules', ground: 'ink' },
  { id: 'contact', n: '07', label: 'Contact', motion: 'To adjourn', ground: 'host' },
];
export const NAV = MOTIONS.slice(1);

/* ------------------------------------------------------------------ store */
export type Floor = { active: number; forPct: number; abstain: number; skipped: boolean[] };
let state: Floor = { active: 0, forPct: 0, abstain: 0, skipped: MOTIONS.map(() => false) };
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const subscribe = (f: () => void) => { subs.add(f); return () => subs.delete(f); };
export const useFloor = () => useSyncExternalStore(subscribe, () => state, () => state);

/** Cell elements of the tally, filled directly every frame (no React render per frame). */
export const cellFills: (HTMLElement | null)[] = [];

const tops: number[] = [];
const heights: number[] = [];
const visited = MOTIONS.map((_, i) => i === 0);
let since = 0;
let lastActive = 0;

function layout() {
  MOTIONS.forEach((m, i) => {
    const el = document.getElementById(m.id);
    if (!el) return;
    const r = el.getBoundingClientRect();
    tops[i] = r.top + scrollY;
    heights[i] = r.height;
  });
}

function tick() {
  if (!tops.length) layout();
  const y = scrollY + innerHeight * 0.42;
  let active = 0;
  for (let i = 0; i < tops.length; i++) if (tops[i] <= y) active = i;
  const now = performance.now();
  if (active !== lastActive) { lastActive = active; since = now; }
  if (!visited[active] && now - since > 650) visited[active] = true;
  const max = document.documentElement.scrollHeight - innerHeight;
  const forPct = max > 0 ? Math.round(Math.min(1, scrollY / max) * 100) : 0;
  const skipped = MOTIONS.map((_, i) => i > 0 && i < active && !visited[i]);
  const abstain = skipped.filter(Boolean).length;
  for (let i = 1; i < MOTIONS.length; i++) {
    const c = cellFills[i];
    if (!c) continue;
    const p = Math.max(0, Math.min(1, (scrollY + innerHeight - tops[i]) / (heights[i] + innerHeight * 0.4)));
    const v = (i < active ? 1 : i === active ? Math.max(p, 0.08) : 0);
    c.style.transform = `scaleX(${v.toFixed(3)})`;
  }
  if (active !== state.active || forPct !== state.forPct || abstain !== state.abstain || skipped.some((s, i) => s !== state.skipped[i])) {
    state = { active, forPct, abstain, skipped };
    emit();
  }
}

let started = false;
export function startFloor() {
  if (started) return;
  started = true;
  layout();
  addEventListener('resize', layout);
  ScrollTrigger.addEventListener('refresh', layout);
  new ResizeObserver(layout).observe(document.body);
  if (isStill()) {
    addEventListener('scroll', tick, { passive: true });
    tick();
  } else gsap.ticker.add(tick);
}

/* ------------------------------------------------------------------ jumps */
type Runner = (index: number, jump: () => void) => void;
let wipeRunner: Runner | null = null;
export const setWipeRunner = (r: Runner | null) => { wipeRunner = r; };

export function instantJump(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + scrollY;
  const l = getLenis();
  if (l) l.scrollTo(top, { immediate: true, force: true });
  else window.scrollTo(0, top);
  resetScrollBaseline();
  ScrollTrigger.update();
  history.replaceState(null, '', id === 'home' ? location.pathname + location.search : '#' + id);
}

/** Go to a motion: a colour-block wipe covers the screen, the page jumps underneath, the blocks leave. */
export function jumpTo(id: string) {
  const i = MOTIONS.findIndex((m) => m.id === id);
  if (i < 0) return;
  if (isStill() || !wipeRunner) { instantJump(id); return; }
  wipeRunner(i, () => instantJump(id));
}
