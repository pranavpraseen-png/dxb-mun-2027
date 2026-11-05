// Text drawn into canvas textures (no font files fetched by the 3D layer: it reuses the page's loaded fonts).
import * as THREE from 'three';
import type { Committee } from '@/data/conference';
import { DUSK, FONT, SCENE } from './theme';

export { DUSK, SCENE } from './theme';

const DISPLAY: string = FONT.display;
const TEXT: string = FONT.text;
const MONO: string = FONT.mono;

export async function fontsReady() {
  try {
    await Promise.all([
      document.fonts.load(`600 64px ${DISPLAY}`),
      document.fonts.load(`500 32px ${TEXT}`),
      document.fonts.load(`500 64px ${MONO}`),
    ]);
  } catch { /* fall back to system fonts */ }
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  return { c, g };
}
function tex(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
function fit(g: CanvasRenderingContext2D, text: string, weight: number, size: number, maxW: number, family = DISPLAY) {
  let s = size;
  do { g.font = `${weight} ${s}px ${family}`; s -= 2; } while (g.measureText(text).width > maxW && s > 10);
}
function lines(g: CanvasRenderingContext2D, text: string, maxW: number) {
  const words = text.split(' ');
  const out: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? cur + ' ' + w : w;
    if (g.measureText(next).width > maxW && cur) { out.push(cur); cur = w; } else cur = next;
  }
  if (cur) out.push(cur);
  return out;
}

/** A UN nameplate: sand card (action), maroon host rule on top, abbreviation large, full name small. */
export function plateTexture(c: Committee, scale = 1) {
  const W = Math.round(512 * scale), H = Math.round(176 * scale);
  const { c: cv, g } = canvas(W, H);
  g.fillStyle = SCENE.plate; g.fillRect(0, 0, W, H);
  g.fillStyle = SCENE.plateRule; g.fillRect(0, 0, W, Math.round(10 * scale));
  g.fillStyle = SCENE.plateFoot; g.fillRect(0, H - Math.round(3 * scale), W, Math.round(3 * scale));
  g.fillStyle = SCENE.plateInk; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  fit(g, c.abbr, 600, 92 * scale, W * 0.86);
  g.fillText(c.abbr, W / 2, 104 * scale);
  g.fillStyle = SCENE.plateMuted;
  fit(g, c.name, 500, 20 * scale, 99999, TEXT);
  const ls = lines(g, c.name, W * 0.88).slice(0, 2);
  if (ls.length > 1) fit(g, ls.reduce((a, b) => (a.length > b.length ? a : b)), 500, 18 * scale, W * 0.88, TEXT);
  ls.forEach((l, i) => g.fillText(l, W / 2, (ls.length > 1 ? 130 : 140) * scale + i * 22 * scale));
  return tex(cv);
}

/** The rostrum's back screen: the picked day, big. */
export function drawScreen(cv: HTMLCanvasElement, day: { label: string; first: string; items: number; sessions: number }) {
  const g = cv.getContext('2d')!;
  const W = cv.width, H = cv.height, k = W / 1024;
  g.fillStyle = DUSK.surface; g.fillRect(0, 0, W, H);
  g.strokeStyle = DUSK.line; g.lineWidth = 4 * k; g.strokeRect(8 * k, 8 * k, W - 16 * k, H - 16 * k);
  g.fillStyle = DUSK.accent; g.fillRect(8 * k, 8 * k, 18 * k, H - 16 * k);
  g.fillStyle = DUSK.ink; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.font = `600 ${H * 0.36}px ${DISPLAY}`;
  g.fillText(day.label, W * 0.07, H * 0.56);
  g.font = `500 ${H * 0.075}px ${MONO}`;
  g.fillStyle = DUSK.muted;
  g.fillText(`FROM ${day.first.toUpperCase()}`, W * 0.075, H * 0.82);
  g.textAlign = 'right';
  g.fillStyle = DUSK.ink;
  g.font = `600 ${H * 0.14}px ${DISPLAY}`;
  g.fillText(`${day.items} items`, W * 0.93, H * 0.4);
  g.fillStyle = DUSK.action;
  g.fillText(`${day.sessions} ${day.sessions === 1 ? 'session' : 'sessions'}`, W * 0.93, H * 0.6);
  g.fillStyle = DUSK.accent; g.fillRect(W * 0.66, H * 0.7, W * 0.27, 4 * k);
}

/** The chair's desk clock. */
export function drawClock(cv: HTMLCanvasElement, text: string, state: string) {
  const g = cv.getContext('2d')!;
  const W = cv.width, H = cv.height, k = W / 256;
  g.fillStyle = DUSK.ground; g.fillRect(0, 0, W, H);
  g.strokeStyle = DUSK.line; g.lineWidth = 6 * k; g.strokeRect(3 * k, 3 * k, W - 6 * k, H - 6 * k);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `500 ${H * 0.6}px ${MONO}`;
  g.fillStyle = DUSK.raised; // the unlit segments, opaque
  g.fillText('88:88', W / 2, H * 0.46);
  g.fillStyle = state === 'done' ? DUSK.accent : state === 'running' ? DUSK.ink : DUSK.action;
  g.fillText(text, W / 2, H * 0.46);
  g.font = `500 ${H * 0.11}px ${MONO}`;
  g.fillStyle = DUSK.cream;
  g.fillText(state === 'done' ? 'TIME IS UP' : state === 'running' ? 'SPEAKING' : 'FLOOR TIMER', W / 2, H * 0.86);
}

export function makeCanvasTexture(w: number, h: number) {
  const { c } = canvas(w, h);
  return { canvas: c, texture: tex(c) };
}
