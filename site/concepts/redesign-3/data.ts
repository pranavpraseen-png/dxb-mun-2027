// Every line on the page is built from src/data/conference.ts. Nothing here is new: it only re-shapes the facts.
import { committees, conference, nav, stats, tba } from '@/data/conference';

/** The control-bar channels: every section of the one-page home (Home is the wordmark). */
export const channels = nav
  .filter((n) => n.id !== 'home')
  .map((n, i) => ({ id: n.id, label: n.label, ch: String(i + 1).padStart(2, '0') }));
export const chOf = (id: string) => channels.find((c) => c.id === id)?.ch ?? '00';

/** The tracker's plain-words steps: one question, one clause each (Opal-style "explain it like I'm five"). */
export type Step = { q: string; verb: string; fact: string; note: string; host?: boolean; tba?: boolean; motto?: boolean; link?: string };
const first = committees[0], last = committees[committees.length - 1];
export const steps: Step[] = [
  { q: 'Where?', verb: 'Meets in', fact: conference.city, note: '25.2048° N · 55.2708° E' },
  { q: 'Who hosts?', verb: 'Hosted by', fact: conference.host, note: `${conference.city}.`, host: true },
  { q: 'Why?', verb: 'Guided by', fact: conference.motto, note: 'The motto of the conference.', motto: true },
  { q: 'How big?', verb: 'Convenes', fact: `${stats[0].value} committees`, note: `From ${first.abbr} to ${last.abbr}.`, link: 'committees' },
  { q: 'How long?', verb: 'Meets for', fact: `${stats[1].value} days · ${stats[2].value} sessions`, note: 'Every timing is in the rundown.', link: 'schedule' },
  { q: 'When?', verb: 'Dates', fact: tba(conference.dates), note: `Venue: ${tba(conference.venue).toLowerCase()}.`, tba: true },
];

export const tickerItems = [
  conference.edition,
  conference.motto,
  `${stats[0].value} committees`,
  `${stats[1].value} days`,
  `${stats[2].value} committee sessions`,
  `Hosted by ${conference.host}`,
  `Dates: ${tba(conference.dates)}`,
  `Venue: ${tba(conference.venue)}`,
  ...committees.map((c) => c.abbr),
];

export const DUBAI = { lat: 25.2048, lon: 55.2708 } as const;
export const formatLat = (v: number) => `${Math.abs(v).toFixed(4)}° ${v >= 0 ? 'N' : 'S'}`;
export const formatLon = (v: number) => {
  const n = ((((v + 180) % 360) + 360) % 360) - 180;
  return `${Math.abs(n).toFixed(4)}° ${n >= 0 ? 'E' : 'W'}`;
};
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
