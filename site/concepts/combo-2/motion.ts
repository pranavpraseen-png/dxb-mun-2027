// Night Lab motion system: ONE easing, two durations (Lando: cubic-bezier(0.65,0.05,0,1), 0.75 s).
// The same curve is the CSS variable --ease in night-lab.css. Everything that moves imports from here.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CustomEase } from 'gsap/CustomEase';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { SplitText } from 'gsap/SplitText';
import { isStill } from '@/shared/hooks';

gsap.registerPlugin(ScrollTrigger, CustomEase, ScrambleTextPlugin, SplitText);

export const EASE_CSS = 'cubic-bezier(0.65,0.05,0,1)';
export const EASE = CustomEase.create('nl', '0.65,0.05,0,1');
export const UI = 0.75; // seconds, UI
export const BIG = 1.1; // seconds, big reveals
gsap.defaults({ ease: EASE, duration: UI });

/** The ease as a plain JS function, for per-frame code (WebGL, ScrollTrigger callbacks). */
export const ease = (t: number) => EASE(Math.min(1, Math.max(0, t)));

export const still = isStill();
export const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/·';

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Shared, mutable state read every frame by the WebGL scene (no React re-renders). */
export const live = {
  /** Loader build, 0..1 (1 = globe fully drawn). Still mode starts at 1. */
  boot: still ? 1 : 0,
  /** Flight progress from the pinned stage, 0..1 (raw ScrollTrigger progress). */
  flight: 0,
  /** Whether the stage is on screen (pauses WebGL when false). */
  stageOn: true,
};

export { gsap, ScrollTrigger, SplitText };
