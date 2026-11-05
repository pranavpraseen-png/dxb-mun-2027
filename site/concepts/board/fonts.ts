// Six font pairings. Every family ships from an @fontsource npm package (SIL Open Font License 1.1), so all are free
// for commercial web use and self-hosted by Vite. Imported once, here.
import '@fontsource-variable/source-serif-4/opsz.css';
import '@fontsource-variable/source-serif-4/opsz-italic.css';
import '@fontsource-variable/public-sans';
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import '@fontsource-variable/inter-tight';
import '@fontsource-variable/ibm-plex-sans/wdth.css';
import '@fontsource-variable/ibm-plex-sans/wght-italic.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/600.css';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/archivo/wdth-italic.css';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import '@fontsource-variable/instrument-sans';
import '@fontsource-variable/fraunces/full.css';
import '@fontsource-variable/fraunces/full-italic.css';
import '@fontsource-variable/manrope';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource-variable/noto-naskh-arabic';
import '@fontsource-variable/noto-kufi-arabic';

export type Face = {
  family: string;
  weight: number;
  /** letter-spacing in em, tight on display sizes */
  tracking?: number;
  stretch?: string;
  variation?: string;
  upper?: boolean;
};

export type Pairing = {
  id: string;
  name: string;
  why: string;
  display: Face & { label: string; source: string };
  text: Face & { label: string; source: string };
  verb: { family: string; weight: number; variation?: string };
  mono: { family: string; label: string };
  arabic: { family: string; label: string; weight: number };
  packages: string[];
  licence: string;
};

const OFL = 'SIL Open Font License 1.1: free for commercial use, self-hosting allowed.';

export const pairings: Pairing[] = [
  {
    id: 'record',
    name: 'Official Record',
    why: 'A document serif over a government sans. Reads like a printed resolution.',
    display: { label: 'Source Serif 4', source: 'Adobe Originals', family: "'Source Serif 4 Variable', Georgia, serif", weight: 600, tracking: -0.02 },
    text: { label: 'Public Sans', source: 'U.S. Web Design System', family: "'Public Sans Variable', system-ui, sans-serif", weight: 400 },
    verb: { family: "'Source Serif 4 Variable', Georgia, serif", weight: 500 },
    mono: { family: "'IBM Plex Mono', ui-monospace, monospace", label: 'IBM Plex Mono' },
    arabic: { family: "'Noto Naskh Arabic Variable', serif", label: 'Noto Naskh Arabic', weight: 600 },
    packages: ['@fontsource-variable/source-serif-4', '@fontsource-variable/public-sans', '@fontsource/ibm-plex-mono', '@fontsource-variable/noto-naskh-arabic'],
    licence: OFL,
  },
  {
    id: 'broadsheet',
    name: 'Broadsheet',
    why: 'A newspaper serif with a tight grotesk. Serious news, not fashion.',
    display: { label: 'Newsreader', source: 'Production Type for Google Fonts', family: "'Newsreader Variable', Georgia, serif", weight: 500, tracking: -0.025 },
    text: { label: 'Inter Tight', source: 'Rasmus Andersson', family: "'Inter Tight Variable', system-ui, sans-serif", weight: 400 },
    verb: { family: "'Newsreader Variable', Georgia, serif", weight: 400 },
    mono: { family: "'JetBrains Mono Variable', ui-monospace, monospace", label: 'JetBrains Mono' },
    arabic: { family: "'Noto Naskh Arabic Variable', serif", label: 'Noto Naskh Arabic', weight: 600 },
    packages: ['@fontsource-variable/newsreader', '@fontsource-variable/inter-tight', '@fontsource-variable/jetbrains-mono'],
    licence: OFL,
  },
  {
    id: 'plex',
    name: 'Plex Institutional',
    why: 'One corporate superfamily with a real Arabic. Calm, neutral, very legible.',
    display: { label: 'IBM Plex Sans Condensed (width axis 75)', source: 'IBM / Bold Monday', family: "'IBM Plex Sans Variable', system-ui, sans-serif", weight: 600, tracking: -0.015, stretch: '75%', variation: "'wdth' 75" },
    text: { label: 'IBM Plex Sans', source: 'IBM / Bold Monday', family: "'IBM Plex Sans Variable', system-ui, sans-serif", weight: 400 },
    verb: { family: "'IBM Plex Sans Variable', system-ui, sans-serif", weight: 500 },
    mono: { family: "'IBM Plex Mono', ui-monospace, monospace", label: 'IBM Plex Mono' },
    arabic: { family: "'IBM Plex Sans Arabic', sans-serif", label: 'IBM Plex Sans Arabic', weight: 600 },
    packages: ['@fontsource-variable/ibm-plex-sans', '@fontsource/ibm-plex-mono', '@fontsource/ibm-plex-sans-arabic'],
    licence: OFL,
  },
  {
    id: 'terminal',
    name: 'Terminal Grotesk',
    why: 'Condensed caps over a Swiss-style text face with mono data, after Terminal Industries (Suisse Intl and Geist Mono).',
    display: { label: 'Archivo Condensed (width axis 62)', source: 'Omnibus-Type', family: "'Archivo Variable', system-ui, sans-serif", weight: 650, tracking: 0, stretch: '62%', variation: "'wdth' 62", upper: true },
    text: { label: 'Geist', source: 'Vercel', family: "'Geist Variable', system-ui, sans-serif", weight: 400 },
    verb: { family: "'Archivo Variable', system-ui, sans-serif", weight: 500, variation: "'wdth' 90" },
    mono: { family: "'Geist Mono Variable', ui-monospace, monospace", label: 'Geist Mono' },
    arabic: { family: "'Noto Kufi Arabic Variable', sans-serif", label: 'Noto Kufi Arabic', weight: 600 },
    packages: ['@fontsource-variable/archivo', '@fontsource-variable/geist', '@fontsource-variable/geist-mono', '@fontsource-variable/noto-kufi-arabic'],
    licence: OFL,
  },
  {
    id: 'gallery',
    name: 'Gallery Serif',
    why: 'A sharp, high-contrast serif in one weight with its sister sans. The luxury register.',
    display: { label: 'Instrument Serif', source: 'Instrument', family: "'Instrument Serif', Georgia, serif", weight: 400, tracking: -0.01 },
    text: { label: 'Instrument Sans', source: 'Instrument', family: "'Instrument Sans Variable', system-ui, sans-serif", weight: 400 },
    verb: { family: "'Instrument Serif', Georgia, serif", weight: 400 },
    mono: { family: "'Geist Mono Variable', ui-monospace, monospace", label: 'Geist Mono' },
    arabic: { family: "'Noto Naskh Arabic Variable', serif", label: 'Noto Naskh Arabic', weight: 500 },
    packages: ['@fontsource/instrument-serif', '@fontsource-variable/instrument-sans', '@fontsource-variable/noto-naskh-arabic'],
    licence: OFL,
  },
  {
    id: 'plate',
    name: 'Engraved Plate',
    why: 'Fraunces with its soft and wonky axes switched off reads like an engraved brass plate.',
    display: { label: 'Fraunces (SOFT 0, WONK 0)', source: 'Undercase Type', family: "'Fraunces Variable', Georgia, serif", weight: 560, tracking: -0.02, variation: "'SOFT' 0, 'WONK' 0" },
    text: { label: 'Manrope', source: 'Mikhail Sharanda', family: "'Manrope Variable', system-ui, sans-serif", weight: 450 },
    verb: { family: "'Fraunces Variable', Georgia, serif", weight: 400, variation: "'SOFT' 0, 'WONK' 0" },
    mono: { family: "'JetBrains Mono Variable', ui-monospace, monospace", label: 'JetBrains Mono' },
    arabic: { family: "'Noto Kufi Arabic Variable', sans-serif", label: 'Noto Kufi Arabic', weight: 600 },
    packages: ['@fontsource-variable/fraunces', '@fontsource-variable/manrope', '@fontsource-variable/jetbrains-mono', '@fontsource-variable/noto-kufi-arabic'],
    licence: OFL,
  },
];
