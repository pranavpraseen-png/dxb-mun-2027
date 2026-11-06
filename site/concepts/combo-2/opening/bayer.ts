// The 1-bit pass from Alt 6 (gl/shader.ts), rebuilt as a post-process for the R3F opening.
// Pass A: the 3D scene renders into a small target, one texel per block (2 CSS px).
// Pass B: every texel becomes exactly GROUND or INK by an 8×8 Bayer threshold (the orange Dubai mark stays orange).
//         Where the scene drew nothing, Alt 6's noise-flow field shows. The cursor lens prints a negative world with
//         the motto and the Dubai coordinates underneath.
// Pass C: the blocks are copied to the screen with texelFetch, each one a whole number of device pixels.
import { drawDots, CELL_W } from './font5x7';

export const TRAIL = 14;

/** Block geometry, written by the Dither pass on resize and read by the line and point materials. */
export const grid = {
  /** CSS px per block. */
  css: 2,
  /** Device px per block (a whole number). */
  dev: 2,
  /** The renderer's pixel ratio. */
  pr: 1,
  cols: 1,
  rows: 1,
};

/** Point size in render-target texels for a Night Lab point size given in CSS px. */
export const texelSize = (cssPx: number) => Math.max(1, Math.round(cssPx / grid.css));

const hex = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((x) => (x / 255).toFixed(5)).join(', ');
};

export const quadVert = /* glsl */ `
in vec3 position;
void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

export const ditherFrag = /* glsl */ `
precision highp float;
precision highp int;

uniform sampler2D u_scene;   // pass A (linear colour, alpha = 1 where the scene drew)
uniform sampler2D u_layer;   // the lens layer, one texel per block, rows top-down (R = ink)
uniform vec2 u_res;          // texels
uniform float u_time;
uniform vec3 u_trail[${TRAIL}]; // lens trail: x, y (texels, y down), radius (texels)
uniform float u_lens;        // 0..1, stepped
uniform float u_field;       // 0..1 the field resolves top to bottom
uniform float u_fade;        // 0..1 the field dissolves (flight)

out vec4 outColor;

const vec3 GROUND = vec3(${hex('#100904')});
const vec3 INK = vec3(${hex('#faf7ef')});
const vec3 ACCENT = vec3(${hex('#dc5000')});

// Bayer 8x8, as in Paper Shaders' dithering shader (via Alt 6).
const int bayer8[64] = int[64](
  0, 32, 8, 40, 2, 34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44, 4, 36, 14, 46, 6, 38,
  60, 28, 52, 20, 62, 30, 54, 22,
  3, 35, 11, 43, 1, 33, 9, 41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47, 7, 39, 13, 45, 5, 37,
  63, 31, 55, 23, 61, 29, 53, 21);
float bayer(vec2 p) {
  ivec2 q = ivec2(mod(p, 8.0));
  return (float(bayer8[q.y * 8 + q.x]) + 0.5) / 64.0;
}

// 2D simplex noise (Ashima Arts / Stefan Gustavson, MIT).
vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * snoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return s;
}

void main() {
  vec2 cell = floor(gl_FragCoord.xy);                 // y up (render target rows)
  vec2 tl = vec2(cell.x, u_res.y - 1.0 - cell.y);      // y down (screen order)
  float th = bayer(tl);
  float t = u_time;

  // ---- the scene, quantised: ground is cut away, Night Lab's tones become dot densities
  vec4 s = texelFetch(u_scene, ivec2(cell), 0);
  float hit = step(0.5, s.a);
  float isAccent = hit * step(0.3, s.r - s.b);
  float lum = pow(max(dot(s.rgb, vec3(0.2126, 0.7152, 0.0722)), 0.0), 1.0 / 2.2);
  float tone = clamp((lum - 0.08) / 0.72, 0.0, 1.0);
  float sceneOn = step(th, tone);

  // ---- Alt 6's flow field, much quieter: sparse crest dots and dotted contours on the dark ground
  vec2 uv = tl / u_res.y * 1.55;
  vec2 q = vec2(fbm(uv * 0.9 + vec2(0.0, t * 0.04)), fbm(uv * 0.9 + vec2(5.2, 1.3) - vec2(t * 0.034, 0.0)));
  float v = fbm(uv + 1.9 * q + vec2(t * 0.018, -t * 0.025));
  float crest = smoothstep(0.45, 0.9, v) * 0.08;
  float c = v * 2.2;
  float fw = max(fwidth(c), 1e-4);
  float iso = step(abs(fract(c) - 0.5), fw * 0.5) * step(0.05, v) * step(th, 0.25);
  // resolve top to bottom while the globe builds; dissolve by threshold as the flight starts (binary per block)
  float k = clamp(u_field * 2.1 - tl.y / u_res.y - 0.05 * v, 0.0, 1.0) * (1.0 - u_fade);
  float fieldOn = max(step(th, crest), iso) * step(th, k * 0.999);
  float outside = mix(fieldOn, sceneOn, hit);

  // ---- the lens: a metaball chain, wobbled, hard step (Alt 6)
  float f = 0.0;
  for (int i = 0; i < ${TRAIL}; i++) {
    vec3 p = u_trail[i];
    float r = p.z * u_lens;
    vec2 d = tl - p.xy;
    f += (r * r) / (dot(d, d) + 1.0);
  }
  f *= 1.0 + 0.16 * snoise(tl * 0.045 + vec2(t * 0.5, -t * 0.4));
  float inLens = step(1.0, f) * step(0.001, u_lens);
  float ff = max(fwidth(f), 1e-4);
  // the outline ring further out is dotted (half the blocks), so it reads as a trace, not a second coastline
  float ring = (1.0 - inLens) * step(0.46, f) * step(f, 0.46 + ff * 1.2) * step(0.001, u_lens) * step(th, 0.5);

  // inside: cream ground, the world in negative, the second layer in solid ground colour
  float layer = step(0.5, texelFetch(u_layer, ivec2(tl), 0).r);
  float grain = step(th, clamp(v * 0.5 - 0.1, 0.0, 0.2));
  float inside = 1.0 - max(max(hit * sceneOn, layer), grain * (1.0 - hit));

  float on = max(mix(outside, inside, inLens), ring);
  vec3 col = mix(GROUND, INK, on);
  if (isAccent > 0.5 && layer < 0.5) col = ACCENT;
  outColor = vec4(col, 1.0);
}
`;

export const blitFrag = /* glsl */ `
precision highp float;
precision highp int;
uniform sampler2D u_tex;
uniform float u_block; // device px per block
out vec4 outColor;
void main() {
  outColor = texelFetch(u_tex, ivec2(floor(gl_FragCoord.xy / u_block)), 0);
}
`;

/* ------------------------------------------------------------------ the lens layer */
export const DUBAI_LABEL = '25.2048° N · 55.2708° E';

/**
 * Draws the second layer at block resolution and thresholds it: "DIPLOMACY / around us." (Mona Sans heavy and
 * Instrument Serif italic, Night Lab's pairing) and the Dubai coordinates in Alt 6's 5×7 dot font.
 * Returns RGBA bytes, top row first.
 */
/** Where the lens rests and wanders round (share of the frame): over the globe. The motto layer is centred there. */
export const LENS_HOME = { wide: { x: 0.62, y: 0.42 }, phone: { x: 0.5, y: 0.3 } };

export function drawLayer(cols: number, rows: number, phone: boolean) {
  const home = phone ? LENS_HOME.phone : LENS_HOME.wide;
  const c = document.createElement('canvas');
  c.width = cols; c.height = rows;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, cols, rows);
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'alphabetic';
  const sans = '"Mona Sans Variable", "Mona Sans", sans-serif';
  const serif = '"Instrument Serif", Georgia, serif';
  const setSans = (px: number) => {
    ctx.font = `800 ${px}px ${sans}`;
    try { (ctx as unknown as { fontStretch: string }).fontStretch = 'semi-expanded'; } catch { /* older canvas: normal width */ }
  };
  const setSerif = (px: number) => {
    ctx.font = `italic 400 ${px}px ${serif}`;
    try { (ctx as unknown as { fontStretch: string }).fontStretch = 'normal'; } catch { /* ignore */ }
  };
  // "DIPLOMACY" spans most of the width; "around us." sits under it at the same size
  setSans(100);
  const w1 = ctx.measureText('DIPLOMACY').width;
  // sized so a resting lens shows most of a word: about the globe's width
  let size = Math.floor((100 * cols * (phone ? 0.7 : 0.4)) / w1);
  size = Math.min(size, Math.floor(rows * (phone ? 0.09 : 0.16)));
  const cx = cols * home.x;
  // the block (two lines and the coordinates, about 2.4 sizes tall) is centred on the lens home
  const top = Math.round(rows * home.y - size * 1.2);
  setSans(size);
  const a = ctx.measureText('DIPLOMACY').width;
  const y1 = Math.round(top + size * 0.74);
  ctx.fillText('DIPLOMACY', Math.round(cx - a / 2), y1);
  setSerif(Math.round(size * 1.12));
  const b = ctx.measureText('around us.').width;
  const y2 = Math.round(y1 + size * 1.06);
  ctx.fillText('around us.', Math.round(cx - b / 2), y2);
  // the coordinates, 2 texels per dot, centred under the motto
  const s = 2;
  const label = DUBAI_LABEL.replace(/ · /g, '  ') + (phone ? '' : '  DUBAI');
  const lw = label.length * CELL_W * s;
  const scale = lw > cols * 0.94 ? 1 : s;
  const dw = label.length * CELL_W * scale;
  drawDots(ctx, label, Math.round(Math.min(cols - dw - 4, Math.max(4, cx - dw / 2))), Math.round(y2 + size * 0.4), scale);
  const img = ctx.getImageData(0, 0, cols, rows).data;
  const out = new Uint8Array(cols * rows * 4);
  for (let i = 0; i < cols * rows; i++) {
    out[i * 4] = img[i * 4] > 140 ? 255 : 0;
    out[i * 4 + 3] = 255;
  }
  return out;
}
