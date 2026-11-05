// Dubai Dusk (site/THEME.md, the owner's pick 2026-11-05) for the 3D layer and the canvas textures.
// The same tokens live once as CSS custom properties at the top of assembly.css. All opaque: never add alpha.
export const DUSK = {
  ground: '#05161d',    // page background, sky, fog
  surface: '#0b2027',   // panels, nav bar
  raised: '#162c34',    // cards, inputs
  ink: '#f4eee3',       // body text
  muted: '#c9b9a8',     // secondary text
  line: '#28414b',      // 1px hairlines
  action: '#e5cda9',    // sand: the one action colour, nameplate fill
  actionInk: '#05161d', // text on sand
  accent: '#dd8964',    // terracotta: clause verbs, rules, focus
  maroon: '#6e2826',    // IHS host
  gold: '#e9b452',      // awards and the small host rule only
  cream: '#e2c9b4',     // host text on maroon
} as const;

/** An opaque colour equal to `b` laid over `a` at weight t (replaces a translucent material with a solid one). */
export function mix(a: string, b: string, t: number) {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

/** Scene colours, mapped from the tokens: sky = ground; surfaces = surface/raised; lights = sand/terracotta; host = maroon/gold/cream. */
export const SCENE = {
  sky: DUSK.ground,
  // globe
  oceanDeep: DUSK.surface,
  oceanRim: DUSK.raised,
  land: DUSK.action,
  landHi: DUSK.ink,
  graticule: mix(DUSK.surface, DUSK.line, 0.9),
  beam: DUSK.accent,
  beamDash: DUSK.action,
  pin: DUSK.accent,
  // hall lights
  ambient: DUSK.muted,
  key: DUSK.ink,
  daisLight: DUSK.action,  // the big light behind the dais: sand, so the nameplates stay sand
  warmLight: DUSK.accent,  // the small fill: terracotta
  // hall surfaces
  floor: DUSK.surface,
  ringInner: mix(DUSK.surface, DUSK.accent, 0.6),
  ringOuter: DUSK.line,
  tier: DUSK.surface,
  deskTop: DUSK.raised,
  deskFront: DUSK.surface,
  daisBody: DUSK.surface,
  daisFront: DUSK.maroon,
  hostLine: DUSK.gold,
  chairDesk: DUSK.raised,
  clockBody: DUSK.ground,
  wall: DUSK.ground,
  wallRings: [DUSK.accent, mix(DUSK.ground, DUSK.accent, 0.55), mix(DUSK.ground, DUSK.line, 1), mix(DUSK.ground, DUSK.line, 0.7)],
  lightBars: mix(DUSK.ground, DUSK.muted, 0.32),
  ceilingRing: mix(DUSK.ground, DUSK.cream, 0.5),
  // nameplates
  plate: DUSK.action,
  plateBack: DUSK.cream,
  plateInk: DUSK.actionInk,
  plateMuted: mix(DUSK.action, DUSK.actionInk, 0.62),
  plateRule: DUSK.maroon,
  plateFoot: DUSK.accent,
  plateLit: DUSK.accent,
} as const;

export const FONT = {
  display: "'Source Serif 4 Variable', Georgia, serif",
  text: "'Public Sans Variable', system-ui, sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, monospace",
} as const;
