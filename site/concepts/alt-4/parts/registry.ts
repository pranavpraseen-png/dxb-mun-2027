// Every part of Alt 4 in versions A, B and C, plus the lead's pick and wild ideas per part.
// A versions live in Stage.tsx / Nav.tsx / Sections.tsx; B and C are parts/<part>-<b|c>.tsx (found automatically).
// Each B/C file's header comment (NAME / IDEA / WHY / WILD) is read from its source, so the board always matches the code.
import type { ComponentType } from 'react';
import { AboutA, CommitteesA, ContactA, RegisterA, ScheduleA, WellnessA } from '../Sections';
import { NavA } from '../Nav';

export const PART_IDS = ['opening', 'hero', 'nav', 'about', 'committees', 'schedule', 'register', 'wellness', 'contact'] as const;
export type PartId = (typeof PART_IDS)[number];
export type Letter = 'a' | 'b' | 'c';

export type Option = {
  letter: Letter;
  name: string;
  idea: string;
  why: string;
  wild: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Component: ComponentType<any> | null; // null for opening/hero A (the Stage)
};

export type Part = { id: PartId; label: string; number: string; options: Option[]; wild: string[] };

const mods = import.meta.glob('./*-[bc].tsx', { eager: true }) as Record<string, Record<string, unknown>>;
const raws = import.meta.glob('./*-[bc].tsx', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
const header = (src: string, key: string) => src.match(new RegExp(`//\\s*${key}:\\s*(.+)`))?.[1]?.trim() ?? '';
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** Option A of each part, written by the lead. */
const A: Record<PartId, Omit<Option, 'letter'>> = {
  opening: {
    name: 'Hold to take the floor',
    idea: 'Press and hold: a drone rises, a heartbeat quickens, the counter climbs to 193; a held breath of silence, then the gavel.',
    why: 'Agency + anticipation (you choose when the peak lands) and loss aversion (letting go drains it), then a startle with sound and picture on the same frame.',
    wild: 'Hold with two fingers on a phone and the floor splits into two delegations that collide on the strike.',
    Component: null,
  },
  hero: {
    name: 'The floor rises',
    idea: 'About 13,000 lit bars; the gavel’s shockwave races through them and the bars inside the wordmark rise into DXB MUN.',
    why: 'Von Restorff isolation: one bright shape in a dark field holds attention without any text animation.',
    wild: 'Each bar is a real seat count from past sessions, so the floor is a data sculpture of the conference.',
    Component: null,
  },
  nav: { name: 'Quiet bar', idea: 'A fixed bar with every section and an active underline; a full-screen menu on phones.', why: 'Fitts and Jakob’s law: the place everyone already looks, one click to anywhere.', wild: 'The bar reads your scroll speed and hides only while you skim fast.', Component: NavA },
  about: { name: 'Facts on rules', idea: 'Motto, host, city and the stats as plain typographic facts separated by thin rules.', why: 'Chunking: four facts a skimmer can take in one glance.', wild: 'Each fact is spoken aloud by a synthesised chair voice on hover.', Component: AboutA },
  committees: { name: 'Index + detail', idea: 'All 19 abbreviations in a keyboard list; the full name opens in a pane beside it.', why: 'Recognition over recall: the full list is always visible, only one detail at a time.', wild: 'The list reorders by how many delegates picked each committee, live.', Component: CommitteesA },
  schedule: { name: 'Day tabs + ruler', idea: 'Three day tabs and the slots on a vertical time ruler; committee sessions in orange.', why: 'One day at a time keeps the load low; orange isolates what delegates care about.', wild: 'Add-to-calendar per slot once the dates are announced.', Component: ScheduleA },
  register: { name: 'Your nameplate', idea: 'Type your name and your placard builds live beside the Register button.', why: 'Self-reference + IKEA effect: people value what has their name on it.', wild: 'The placard prints as a PDF you can bring to the conference.', Component: RegisterA },
  wellness: { name: 'Checklist', idea: 'Water, stretch, breathe: three checks saved on this device for today.', why: 'A tiny commitment that’s easy to finish (the goal-gradient effect).', wild: 'A quiet chime reminds you between sessions.', Component: WellnessA },
  contact: { name: 'Plain lists', idea: 'Resources, contact and the host as calm lists, then the footer.', why: 'At the end, nothing to decode: the peak–end rule wants a clean finish.', wild: 'The footer’s clock counts down to the opening ceremony once the date is set.', Component: ContactA },
};

/** The lead's pick per part. Set after looking at all three. */
// Chosen 2026-11-06 after seeing every option: one big peak (the Floor), calm and skimmable below,
// and a strong end (sign the charter, then the wordmark sign-off). About A, not C, so it doesn't repeat Schedule C's flaps.
export const PICK: Record<PartId, Letter> = {
  opening: 'a', hero: 'a', nav: 'b', about: 'a', committees: 'c', schedule: 'c', register: 'c', wellness: 'b', contact: 'c',
};

/** More wild ideas per part (not built), for the owner to react to. */
const WILD: Record<PartId, string[]> = {
  opening: ['Say “order” into the microphone to open the session (speech recognition, opt-in).', 'The page waits for the visitor’s local time to hit a whole minute, then strikes in sync for everyone online.'],
  hero: ['The bars spell the name of whatever city the visitor is in, then morph into DUBAI.', 'A live count of visitors on the site rises as bars at the edge of the floor.'],
  nav: ['Hold Shift to see every section as a zoomed-out map of the page.', 'The active section’s name is spoken quietly when you jump to it.'],
  about: ['A one-line “position paper” generator: pick a stance and the site writes your opening line.', 'The facts appear as a UN-style resolution you can sign.'],
  committees: ['A “which committee fits you” 5-question quiz.', 'Each committee has a 3-second sound signature that plays on hover.'],
  schedule: ['Your personal schedule once you register, with “you are here” on conference day.', 'A real-time dais clock on conference day.'],
  register: ['Your placard drops onto the 3D floor from the hero, in its seat.', 'Delegations register together and see their placards appear side by side.'],
  wellness: ['A heart-rate breath pacer using the phone camera (opt-in).', 'A shared “water break” counter for everyone at the conference.'],
  contact: ['Ask the secretariat a question in a chat that answers from the published facts only.', 'A printable one-page brief of the whole site.'],
};

const LABEL: Record<PartId, string> = {
  opening: 'Opening', hero: 'Hero', nav: 'Navigation', about: 'About', committees: 'Committees',
  schedule: 'Schedule', register: 'Register', wellness: 'Wellness', contact: 'Resources + contact',
};

export const PARTS: Part[] = PART_IDS.map((id, i) => {
  const options: Option[] = [{ letter: 'a', ...A[id] }];
  for (const letter of ['b', 'c'] as const) {
    const path = `./${id}-${letter}.tsx`;
    const mod = mods[path];
    const src = raws[path] ?? '';
    const Component = (mod?.[cap(id) + letter.toUpperCase()] as ComponentType | undefined) ?? null;
    if (!mod || !Component) continue;
    options.push({ letter, name: header(src, 'NAME') || `${LABEL[id]} ${letter.toUpperCase()}`, idea: header(src, 'IDEA'), why: header(src, 'WHY'), wild: header(src, 'WILD'), Component });
  }
  return { id, label: LABEL[id], number: String(i + 1).padStart(2, '0'), options, wild: WILD[id] };
});

export const partById = (id: PartId) => PARTS.find((p) => p.id === id)!;

/** Read the combination from the URL: ?about=b&nav=c … (missing or unknown = the lead's pick). `opening=none` skips it. */
export function readCombo(search = location.search): Record<PartId, Letter | 'none'> {
  const q = new URLSearchParams(search);
  const out = {} as Record<PartId, Letter | 'none'>;
  for (const p of PARTS) {
    const v = q.get(p.id);
    out[p.id] = v === 'none' && p.id === 'opening' ? 'none' : p.options.some((o) => o.letter === v) ? (v as Letter) : q.has('all-a') ? 'a' : PICK[p.id];
  }
  return out;
}

export const comboQuery = (c: Partial<Record<PartId, string>>) =>
  PART_IDS.filter((id) => c[id]).map((id) => `${id}=${c[id]}`).join('&');
