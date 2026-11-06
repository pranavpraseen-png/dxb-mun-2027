// The one fragment shader. It runs at block resolution (one texel = one dither block), so the result is pixel-snapped
// by construction; the canvas is scaled up with `image-rendering: pixelated`. Every texel is exactly INK or PAPER.
export const TRAIL = 14;

export const vert = /* glsl */ `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

export const frag = /* glsl */ `#version 300 es
precision highp float;
precision highp int;

uniform vec2 u_res;          // canvas size in texels (blocks)
uniform float u_time;
uniform float u_scroll;      // 0..1 through the hero
uniform vec3 u_trail[${TRAIL}]; // lens trail: x, y (texels, y down), radius (texels)
uniform float u_lens;        // 0..1 lens size
uniform sampler2D u_layer;   // the second layer, one texel per block (R = ink)
uniform sampler2D u_matrix;  // loader dot bitmap (R = on, GB = print order)
uniform vec2 u_mSize;        // bitmap size in dots
uniform vec2 u_mOrigin;      // bitmap top-left in texels
uniform float u_mPitch;      // texels per dot (1 or 2)
uniform float u_print;       // characters printed
uniform float u_blink;       // 0/1 block cursor
uniform float u_flood;       // 0..1 loader flood
uniform float u_resolve;     // 0..1 field emerges
uniform float u_field;       // 0..1 field visible (0 during the print)

out vec4 outColor;

const vec3 INK = vec3(${hex('#0B0B0A')});
const vec3 PAPER = vec3(${hex('#E9E4D8')});

// Bayer 8x8, as in Paper Shaders' dithering shader.
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
  vec2 tl = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y); // texel coords, y down
  vec2 cell = floor(tl);
  float th = bayer(cell);
  float t = u_time;

  // ---- the flow field: domain-warped fBm, drifting with time and scroll
  vec2 uv = cell / u_res.y * 1.55 + vec2(0.0, u_scroll * 0.9);
  vec2 q = vec2(fbm(uv * 0.9 + vec2(0.0, t * 0.04)), fbm(uv * 0.9 + vec2(5.2, 1.3) - vec2(t * 0.034, 0.0)));
  float v = fbm(uv + 1.9 * q + vec2(t * 0.018, -t * 0.025));
  // mostly ink: only the crests of the flow carry paper dots
  float tone = smoothstep(0.05, 0.62, v) * 0.62;
  // isolines, one texel wide (fwidth is exact here: neighbouring texels are neighbouring blocks)
  float c = v * 4.0;
  float fw = max(fwidth(c), 1e-4);
  float iso = step(abs(fract(c) - 0.5), fw * 0.5) * step(-0.02, v);
  float fieldOn = max(step(th, tone), iso);

  // ---- the lens: a metaball chain, wobbled, hard step
  float f = 0.0;
  for (int i = 0; i < ${TRAIL}; i++) {
    vec3 p = u_trail[i];
    float r = p.z * u_lens;
    vec2 d = cell - p.xy;
    f += (r * r) / (dot(d, d) + 1.0);
  }
  f *= 1.0 + 0.16 * snoise(cell * 0.045 + vec2(t * 0.5, -t * 0.4));
  float inLens = step(1.0, f);
  float ff = max(fwidth(f), 1e-4);
  float ring = (1.0 - inLens) * step(0.46, f) * step(f, 0.46 + ff * 1.2);

  // inside: paper ground, ink dither of the field, the second layer in solid ink
  float layer = texelFetch(u_layer, ivec2(cell), 0).r;
  float inkIn = max(step(th, clamp(v * 0.5 - 0.08, 0.0, 0.26)), step(0.5, layer));
  float lensOn = 1.0 - inkIn;

  float on = mix(fieldOn, lensOn, inLens);
  on = max(on, ring);

  // ---- loader: flood (ordered dissolve to paper), then resolve (the field emerges top to bottom)
  vec2 mid = u_mOrigin + u_mSize * u_mPitch * 0.5;
  float dist = length(cell - mid) / u_res.y;
  float floodTone = clamp(u_flood * 2.3 - dist * 1.25 + 0.12 * v * min(1.0, u_flood * 4.0), 0.0, 1.0);
  float floodOn = step(th, floodTone);
  float k = clamp(u_resolve * 2.1 - tl.y / u_res.y - 0.05 * v, 0.0, 1.0);
  float heroOn = mix(floodOn, on, step(0.001, u_field) * k);
  if (u_resolve <= 0.0) heroOn = floodOn;

  // ---- the dot-matrix printout (only before the resolve)
  if (u_resolve <= 0.0) {
    vec2 local = cell - u_mOrigin;
    vec2 dotP = floor(local / u_mPitch);
    bool onGrid = all(equal(mod(local, u_mPitch), vec2(0.0)));
    if (onGrid && all(greaterThanEqual(dotP, vec2(0.0))) && all(lessThan(dotP, u_mSize))) {
      vec4 m = texelFetch(u_matrix, ivec2(dotP), 0);
      float order = floor(m.g * 255.0 + 0.5) + floor(m.b * 255.0 + 0.5) * 256.0;
      float printed = step(order + 0.5, u_print) * step(0.5, m.r);
      float cursor = step(abs(order - floor(u_print)), 0.25) * u_blink * step(order, 65000.0);
      float dotOn = max(printed, cursor);
      if (dotOn > 0.5) heroOn = 1.0 - floodOn; // the text inverts as the flood passes under it
    }
  }

  outColor = vec4(mix(INK, PAPER, heroOn), 1.0);
}
`;

function hex(h: string) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((x) => (x / 255).toFixed(5)).join(', ');
}
