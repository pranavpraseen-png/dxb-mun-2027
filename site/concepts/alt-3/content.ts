// Every word on the stage comes from src/data/conference.ts. Unknown values go through tba() ("To be announced").
import { committees, conference, schedule, stats, tba } from '@/data/conference';

export { committees, conference, schedule, stats, tba };

/** The six scenes of the one stage, in camera order. `id` doubles as the URL hash and the static page anchor. */
export const SCENES = [
  { id: 'globe', name: 'Globe' },
  { id: 'dubai', name: 'Dubai' },
  { id: 'resolution', name: 'Resolution' },
  { id: 'committees', name: 'Committees' },
  { id: 'schedule', name: 'Schedule' },
  { id: 'register', name: 'Register' },
] as const;
export const N = SCENES.length;
export const pad2 = (n: number) => String(n).padStart(2, '0');

/** Dubai, as on every other build (decimal degrees). */
export const DUBAI = { lat: 25.2048, lon: 55.2708 };
export const DUBAI_LABEL = '25.2048° N · 55.2708° E';

/** The facts as resolution clauses (wording follows the Merged page's draft resolution). */
export type Clause = { verb: string; fact: string; host?: boolean };
export const CLAUSES: Clause[] = [
  { verb: 'Hosted by', fact: conference.host, host: true },
  { verb: 'Guided by', fact: conference.motto },
  { verb: 'Convenes', fact: `${stats[0].value} committees` },
  { verb: 'Meets for', fact: `${stats[1].value} days · ${stats[2].value} sessions` },
  { verb: 'Dates', fact: tba(conference.dates) },
  { verb: 'Venue', fact: tba(conference.venue) },
];

/** "12:30 PM – 1:30 PM" or "5:30 PM" → minutes after midnight for the start (and end, when given). */
const toMin = (s: string) => {
  const m = s.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return NaN;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === 'PM') h += 12;
  return h * 60 + Number(m[2]);
};
export const slotSpan = (time: string) => {
  const [a, b] = time.split('–');
  const start = toMin(a);
  const end = b ? toMin(b) : start + 30;
  return { start, end };
};
/** The schedule ruler runs 09:00 → 19:00 (every slot on the live schedule falls inside it). */
export const RULER = { from: 9 * 60, to: 19 * 60 };

export const FACT_ROWS = {
  dubai: [
    ['Host', conference.host],
    ['City', conference.city],
    ['Venue', tba(conference.venue)],
    ['Dates', tba(conference.dates)],
  ],
  register: [
    ['Dates', tba(conference.dates)],
    ['Venue', tba(conference.venue)],
    ['Email', tba(conference.email)],
    ['Instagram', tba(conference.instagram)],
  ],
} as const;
