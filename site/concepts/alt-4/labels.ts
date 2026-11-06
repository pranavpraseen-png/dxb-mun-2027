// HTML labels pinned to points in the hall. The camera rig projects them once per frame and writes whole-pixel
// translates, so the text stays real, crisp HTML. A label shows only near its own camera station (`sec`) and hides
// when its box would touch an opaque text panel (the keep-out zones) or leave the frame.
import type { Camera } from 'three';
import { Vector3 } from 'three';

export type Align = 'c' | 'b' | 'r';
type Entry = { el: HTMLElement; p: Vector3; align: Align; sec: number[]; w: number; h: number; x: number; y: number; on: boolean };
const entries = new Map<string, Entry>();
const ro = typeof ResizeObserver !== 'undefined'
  ? new ResizeObserver((list) => list.forEach((e) => {
    const en = entries.get((e.target as HTMLElement).dataset.pin!);
    if (en) { en.w = (e.target as HTMLElement).offsetWidth; en.h = (e.target as HTMLElement).offsetHeight; en.x = NaN; }
  }))
  : null;

export function pin(id: string, p: [number, number, number], align: Align, sec: number[]) {
  return (el: HTMLElement | null) => {
    const old = entries.get(id);
    if (old && old.el !== el) { ro?.unobserve(old.el); entries.delete(id); }
    if (!el) return;
    el.dataset.pin = id;
    el.style.visibility = 'hidden';
    entries.set(id, { el, p: new Vector3(...p), align, sec, w: el.offsetWidth, h: el.offsetHeight, x: NaN, y: NaN, on: false });
    ro?.observe(el);
  };
}

/** Elements with `data-ko` are keep-out zones. Measured every frame (reads only, before any write). */
const PAD = 8;
let zones: DOMRect[] = [];
const hit = (x: number, y: number, w: number, h: number) => {
  for (const r of zones) if (x < r.right + PAD && x + w > r.left - PAD && y < r.bottom + PAD && y + h > r.top - PAD) return true;
  return false;
};

const v = new Vector3();
export function projectLabels(camera: Camera, W: number, H: number, s: number, gate: boolean) {
  zones = [];
  document.querySelectorAll<HTMLElement>('[data-ko]').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.bottom > 0 && r.top < H && r.width > 0) zones.push(r);
  });
  entries.forEach((en) => {
    const near = gate && en.sec.some((k) => Math.abs(s - k) < 0.3);
    let on = near;
    let x = 0, y = 0;
    if (near) {
      v.copy(en.p).project(camera);
      if (v.z > 1 || v.z < -1) on = false;
      x = ((v.x + 1) / 2) * W; y = ((1 - v.y) / 2) * H;
      if (en.align === 'c') { x -= en.w / 2; y -= en.h / 2; }
      else if (en.align === 'b') { x -= en.w / 2; y -= en.h + 6; }
      else { x += 8; y -= en.h / 2; }
      x = Math.round(x); y = Math.round(y);
      if (x < 6 || y < 70 || x + en.w > W - 6 || y + en.h > H - 6) on = false;
      if (on && hit(x, y, en.w, en.h)) on = false;
    }
    if (on && (x !== en.x || y !== en.y)) { en.x = x; en.y = y; en.el.style.transform = `translate3d(${x}px,${y}px,0)`; }
    if (on !== en.on) { en.on = on; en.el.style.visibility = on ? 'visible' : 'hidden'; }
  });
}
