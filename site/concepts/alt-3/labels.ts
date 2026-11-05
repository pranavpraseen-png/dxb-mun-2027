// DOM labels pinned to 3D anchors. The camera rig projects every registered label once per frame and writes a
// whole-pixel translate, so the text is real, crisp HTML (never a texture, never scaled).
import type { Camera } from 'three';
import { Vector3 } from 'three';
import { anchors, R } from './layout';

export type Align = 'c' | 'r' | 'l' | 'b' | 'tl';
type Entry = { el: HTMLElement; align: Align; w: number; h: number; x: number; y: number; hidden: boolean; blocked: boolean };
const entries = new Map<string, Entry>();
const ro = typeof ResizeObserver !== 'undefined'
  ? new ResizeObserver((list) => list.forEach((e) => {
    const id = (e.target as HTMLElement).dataset.anchor!;
    const en = entries.get(id);
    if (en) { en.w = (e.target as HTMLElement).offsetWidth; en.h = (e.target as HTMLElement).offsetHeight; en.x = NaN; }
  }))
  : null;

export function register(id: string, align: Align) {
  return (el: HTMLElement | null) => {
    const old = entries.get(id);
    if (old && old.el !== el) { ro?.unobserve(old.el); entries.delete(id); }
    if (!el) return;
    el.dataset.anchor = id;
    el.style.display = '';
    el.style.visibility = '';
    entries.set(id, { el, align, w: el.offsetWidth, h: el.offsetHeight, x: NaN, y: NaN, hidden: false, blocked: false });
    ro?.observe(el);
  };
}

/* ------------------------------------------------------------------ keep-out zones */
// Every HTML text block (captions, the four corners) is a keep-out zone: a 3D label whose box would touch one is
// hidden, so a pinned label never sits on HTML text. Zones are re-measured when they or the window change size.
const PAD = 10;
const zones = new Map<string, { el: HTMLElement; r: DOMRect }>();
const measure = () => zones.forEach((z) => { z.r = z.el.getBoundingClientRect(); });
const zro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
if (typeof window !== 'undefined') window.addEventListener('resize', measure);
export function keepOut(id: string) {
  return (el: HTMLElement | null) => {
    const old = zones.get(id);
    if (old && old.el !== el) { zro?.unobserve(old.el); zones.delete(id); }
    if (!el) return;
    zones.set(id, { el, r: el.getBoundingClientRect() });
    zro?.observe(el);
  };
}
const blockedAt = (x: number, y: number, w: number, h: number) => {
  for (const { r } of zones.values()) {
    if (x < r.right + PAD && x + w > r.left - PAD && y < r.bottom + PAD && y + h > r.top - PAD) return true;
  }
  return false;
};

const v = new Vector3(), d = new Vector3();
/** True when the globe (centre 0, radius R) stands between the camera and the point. */
function behindGlobe(cam: Vector3, p: Vector3) {
  d.subVectors(p, cam);
  const len = d.length();
  d.divideScalar(len);
  const b = cam.dot(d), c = cam.lengthSq() - R * R;
  const disc = b * b - c;
  if (disc <= 0) return false;
  const t = -b - Math.sqrt(disc);
  return t > 0 && t < len - 0.05;
}
export function projectLabels(camera: Camera, W: number, H: number) {
  entries.forEach((en, id) => {
    const a = anchors.get(id);
    if (!a) return;
    v.copy(a).project(camera);
    const behind = v.z > 1 || v.z < -1 || behindGlobe(camera.position, a);
    if (behind !== en.hidden) { en.hidden = behind; en.el.style.display = behind ? 'none' : ''; }
    if (behind) return;
    let x = ((v.x + 1) / 2) * W, y = ((1 - v.y) / 2) * H;
    if (en.align === 'c') { x -= en.w / 2; y -= en.h / 2; }
    else if (en.align === 'r') { x += 10; y -= en.h / 2; }
    else if (en.align === 'l') { x -= en.w + 10; y -= en.h / 2; }
    else if (en.align === 'b') { x -= en.w / 2; y -= en.h + 8; }
    // Keep a label whose point is on screen fully inside the frame (narrow phones).
    if (Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1) x = Math.max(8, Math.min(W - en.w - 8, x));
    x = Math.round(x); y = Math.round(y);
    if (x !== en.x || y !== en.y) { en.x = x; en.y = y; en.el.style.transform = `translate3d(${x}px,${y}px,0)`; }
    const blocked = blockedAt(x, y, en.w, en.h);
    if (blocked !== en.blocked) { en.blocked = blocked; en.el.style.visibility = blocked ? 'hidden' : ''; }
  });
}
