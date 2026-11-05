// OKLCH -> sRGB (Björn Ottosson's matrices, as used by oklch.com) and APCA 0.0.98G-4g (apcaw3.myndex.com).
import type { Lch, Palette, TokenName } from './palettes';

const enc = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);

function linear([L, C, H]: Lch): [number, number, number] {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

export function rgb(c: Lch): [number, number, number] {
  return linear(c).map((v) => Math.min(1, Math.max(0, enc(v)))) as [number, number, number];
}

export function inGamut(c: Lch) {
  return linear(c).every((v) => v > -0.001 && v < 1.001);
}

export function hex(c: Lch) {
  return '#' + rgb(c).map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
}

export const css = ([L, C, H]: Lch) => `oklch(${(L * 100).toFixed(1)}% ${C.toFixed(3)} ${H})`;

function lum(c: Lch) {
  const [r, g, b] = rgb(c);
  let y = 0.2126729 * r ** 2.4 + 0.7151522 * g ** 2.4 + 0.072175 * b ** 2.4;
  if (y < 0.022) y += (0.022 - y) ** 1.414;
  return y;
}

/** APCA lightness contrast (Lc). Positive = dark text on light, negative = light text on dark. */
export function apca(text: Lch, bg: Lch) {
  const yt = lum(text);
  const yb = lum(bg);
  if (Math.abs(yb - yt) < 0.0005) return 0;
  let out: number;
  if (yb > yt) {
    const s = (yb ** 0.56 - yt ** 0.57) * 1.14;
    out = s < 0.1 ? 0 : s - 0.027;
  } else {
    const s = (yb ** 0.65 - yt ** 0.62) * 1.14;
    out = s > -0.1 ? 0 : s + 0.027;
  }
  return Math.round(out * 1000) / 10;
}

export function token(p: Palette, n: TokenName | 'plateInk' | 'plateFill'): Lch {
  if (n === 'plateInk') return p.t[p.plate.ink];
  if (n === 'plateFill') return p.t[p.plate.fill];
  return p.t[n];
}

/** CSS custom properties for a palette, as opaque oklch() values. */
export function vars(p: Palette): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(p.t)) out[`--${k}`] = css(v as Lch);
  out['--plate'] = css(p.t[p.plate.fill]);
  out['--plate-ink'] = css(p.t[p.plate.ink]);
  return out;
}
