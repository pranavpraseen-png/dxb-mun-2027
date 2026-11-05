// Six palettes taken from real, physical sources. Every token is authored in OKLCH [L, C, H] and is fully opaque.
// Hex values and APCA scores are computed from these numbers at runtime (color.ts), so the board can never drift from them.
export type Lch = readonly [number, number, number];
export type TokenName =
  | 'ground' | 'surface' | 'raised' | 'ink' | 'muted' | 'line' | 'action' | 'actionInk' | 'accent'
  | 'maroon' | 'gold' | 'cream';

export type Palette = {
  id: string;
  name: string;
  source: string;
  dark: boolean;
  t: Record<TokenName, Lch>;
  /** The nameplate: a card on the desk. Fill and ink, picked per palette. */
  plate: { fill: TokenName; ink: TokenName };
};

export const TOKEN_ROLE: Record<TokenName, string> = {
  ground: 'Page ground',
  surface: 'Panels',
  raised: 'Cards, inputs',
  ink: 'Body text',
  muted: 'Secondary text',
  line: 'Hairlines',
  action: 'Buttons (the one action colour)',
  actionInk: 'Text on buttons',
  accent: 'Rules, clause verbs',
  maroon: 'IHS host strip',
  gold: 'Awards only',
  cream: 'Nameplates, host text',
};

export const palettes: Palette[] = [
  {
    id: 'un',
    name: 'Printed UN Blue',
    source: 'UN documents and the flag as printed: emblem blue on uncoated stock, navy ink, off-white paper.',
    dark: true,
    t: {
      ground: [0.175, 0.03, 252],
      surface: [0.215, 0.032, 251],
      raised: [0.26, 0.033, 250],
      ink: [0.955, 0.012, 88],
      muted: [0.79, 0.022, 248],
      line: [0.34, 0.035, 249],
      action: [0.755, 0.1, 237],
      actionInk: [0.17, 0.03, 252],
      accent: [0.73, 0.1, 62],
      maroon: [0.36, 0.1, 24],
      gold: [0.8, 0.13, 80],
      cream: [0.86, 0.033, 62],
    },
    plate: { fill: 'cream', ink: 'ground' },
  },
  {
    id: 'rostrum',
    name: 'Assembly Rostrum',
    source: 'The General Assembly hall: blue-grey slate walls, the gilt emblem, the green marble behind the rostrum.',
    dark: true,
    t: {
      ground: [0.2, 0.014, 232],
      surface: [0.24, 0.016, 230],
      raised: [0.29, 0.018, 228],
      ink: [0.945, 0.012, 92],
      muted: [0.79, 0.018, 215],
      line: [0.37, 0.02, 225],
      action: [0.82, 0.075, 88],
      actionInk: [0.19, 0.014, 232],
      accent: [0.67, 0.07, 168],
      maroon: [0.37, 0.095, 25],
      gold: [0.8, 0.12, 85],
      cream: [0.85, 0.035, 70],
    },
    plate: { fill: 'ink', ink: 'ground' },
  },
  {
    id: 'walnut',
    name: 'Walnut and Brass',
    source: 'Delegate desks and nameplates: oiled walnut, brushed brass, copper rivets.',
    dark: true,
    t: {
      ground: [0.175, 0.014, 55],
      surface: [0.215, 0.018, 55],
      raised: [0.26, 0.022, 55],
      ink: [0.94, 0.018, 80],
      muted: [0.79, 0.03, 70],
      line: [0.35, 0.03, 58],
      action: [0.785, 0.095, 72],
      actionInk: [0.18, 0.015, 55],
      accent: [0.71, 0.115, 50],
      maroon: [0.38, 0.1, 26],
      gold: [0.8, 0.13, 80],
      cream: [0.86, 0.04, 60],
    },
    plate: { fill: 'cream', ink: 'ground' },
  },
  {
    id: 'passport',
    name: 'Diplomatic Passport',
    source: 'A maroon passport cover with gold-foil emblem and cream visa pages; sits right next to the IHS maroon.',
    dark: true,
    t: {
      ground: [0.19, 0.035, 20],
      surface: [0.23, 0.042, 20],
      raised: [0.28, 0.05, 21],
      ink: [0.945, 0.02, 75],
      muted: [0.795, 0.035, 40],
      line: [0.37, 0.05, 22],
      action: [0.88, 0.04, 75],
      actionInk: [0.21, 0.045, 20],
      accent: [0.78, 0.105, 78],
      maroon: [0.42, 0.115, 26],
      gold: [0.8, 0.13, 80],
      cream: [0.86, 0.04, 62],
    },
    plate: { fill: 'cream', ink: 'ground' },
  },
  {
    id: 'dusk',
    name: 'Dubai Dusk',
    source: 'The Gulf after sunset: deep sea-blue sky, a terracotta last light, desert sand and limestone.',
    dark: true,
    t: {
      ground: [0.19, 0.028, 225],
      surface: [0.23, 0.03, 224],
      raised: [0.28, 0.032, 222],
      ink: [0.95, 0.016, 80],
      muted: [0.795, 0.03, 70],
      line: [0.36, 0.035, 224],
      action: [0.86, 0.055, 78],
      actionInk: [0.19, 0.028, 225],
      accent: [0.71, 0.115, 44],
      maroon: [0.38, 0.1, 25],
      gold: [0.8, 0.13, 80],
      cream: [0.85, 0.04, 62],
    },
    plate: { fill: 'action', ink: 'actionInk' },
  },
  {
    id: 'paper',
    name: 'Resolution Paper',
    source: 'A printed UN resolution: off-white paper, black ink, the emblem blue, a red-brown stamp.',
    dark: false,
    t: {
      ground: [0.965, 0.012, 88],
      surface: [0.94, 0.015, 85],
      raised: [0.995, 0.006, 90],
      ink: [0.21, 0.015, 255],
      muted: [0.45, 0.02, 250],
      line: [0.85, 0.018, 80],
      action: [0.47, 0.11, 245],
      actionInk: [0.975, 0.008, 88],
      accent: [0.52, 0.12, 45],
      maroon: [0.36, 0.115, 26],
      gold: [0.57, 0.12, 70],
      cream: [0.86, 0.04, 62],
    },
    plate: { fill: 'raised', ink: 'ink' },
  },
];

/** The pairs we score with APCA, with the Lc each one must reach (75 body, 60 large/button, 45 display/non-text). */
export const PAIRS: { text: TokenName | 'plateInk'; bg: TokenName | 'plateFill'; label: string; need: number }[] = [
  { text: 'ink', bg: 'ground', label: 'Body on ground', need: 75 },
  { text: 'ink', bg: 'raised', label: 'Body on card', need: 75 },
  { text: 'muted', bg: 'ground', label: 'Secondary on ground', need: 60 },
  { text: 'actionInk', bg: 'action', label: 'Button label', need: 60 },
  { text: 'accent', bg: 'ground', label: 'Accent verb (display)', need: 45 },
  { text: 'cream', bg: 'maroon', label: 'Host text on maroon', need: 60 },
  { text: 'plateInk', bg: 'plateFill', label: 'Nameplate', need: 75 },
];
