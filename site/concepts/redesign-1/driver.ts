// The scroll-to-stop driver. It runs on the GSAP ticker (the same tick Lenis uses), independent of WebGL:
// scroll -> stop parameter (damped for inertia) -> overlay presence, veil, flight map, progress line, active stop.
import { useEffect } from 'react';
import gsap from 'gsap';
import { poseAt } from './layout';
import { LAST, presence, rig, setUI, tAt } from './store';

export function useDriver(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const panels = Array.from(document.querySelectorAll<HTMLElement>('[data-panel]'));
    const veil = document.getElementById('veil');
    const dot = document.getElementById('flight-dot');
    const bar = document.getElementById('top-progress');
    let last = -1;
    const tick = (_time: number, deltaMs: number) => {
      const d = Math.min(deltaMs / 1000, 0.05);
      rig.target = tAt(window.scrollY);
      rig.t += (rig.target - rig.t) * (1 - Math.exp(-3.4 * d));
      if (Math.abs(rig.target - rig.t) < 0.0004 || (window as unknown as { __snap?: boolean }).__snap) rig.t = rig.target;
      if (rig.t === last) return; // nothing moved: no DOM writes
      last = rig.t;
      for (const el of panels) {
        const v = presence(rig.t, Number(el.dataset.panel));
        el.style.setProperty('--p', v.toFixed(3));
        el.toggleAttribute('data-on', v > 0.02);
      }
      if (veil) veil.style.opacity = rig.glAlive ? poseAt(rig.t).veil.toFixed(3) : '0';
      if (dot) dot.style.transform = `translateY(${((rig.t / LAST) * 100).toFixed(2)}%)`;
      if (bar) bar.style.transform = `scaleX(${(rig.t / LAST).toFixed(4)})`;
      setUI({ stop: Math.round(rig.t) });
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [enabled]);
}
