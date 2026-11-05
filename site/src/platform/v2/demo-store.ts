// Demo store: ONE shared in-browser database for the three demo adapters (delegate, chair, secretariat).
// It lives in localStorage under `dxbmun.v2.demo`, so every tab of the site sees the same data. A write in one
// tab fires the `storage` event in the others, and each tab tells its subscribers which Topic changed; a write
// also notifies subscribers in the same tab. Nothing here is a real person or a real conference fact.
import type {
  Announcement, ChairRole, Chit, Criterion, Deadline, FileKind, NoteTag, Phase, Registration, Resolution, ResolutionStatus,
  Role, RollStatus, ScheduleItem, Speaker, Timer, Topic, Unsubscribe, Vote, VoteChoice, VoteTarget,
} from './contract';
import { buildSeed } from './demo-seed';

export const STORE_KEY = 'dxbmun.v2.demo';
export const STORE_VERSION = 1;
export const ALL_TOPICS: Topic[] = ['live', 'roll', 'speakers', 'votes', 'resolutions', 'chits', 'files', 'announcements', 'schedule', 'phase', 'seat', 'papers', 'scores'];

export const demoScenarios = ['new', 'applied', 'seated', 'live', 'after'] as const;
export type DemoScenario = (typeof demoScenarios)[number];
export const isScenario = (v: unknown): v is DemoScenario => typeof v === 'string' && (demoScenarios as readonly string[]).includes(v);

// ───────────────────────── Rows ─────────────────────────
export type ProfileRow = { id: string; email: string; fullName: string | null; role: Role; isCore: boolean };
export type RegRow = {
  id: string; profileId: string; status: Registration['status'];
  fullName: string; schoolName: string; grade: string; choiceIds: string[];
  seatId: string | null; checkinCode: string; checkinDays: number[]; createdAt: string;
};
export type CommitteeRow = { id: string; abbr: string; name: string; sort: number; room: string | null };
export type SeatRow = { id: string; committeeId: string; label: string; capacity: 1 | 2 };
export type ChairRow = { committeeId: string; profileId: string; role: ChairRole };
export type SessionRow = { number: number; status: 'scheduled' | 'live' | 'closed'; startedAt: string | null };
export type LiveRow = { committeeId: string; session: SessionRow | null; agendaItem: string | null; currentMotion: string | null; timer: Timer; updatedAt: string };
export type RollRow = { committeeId: string; sessionNumber: number | null; open: boolean; marks: Record<string, RollStatus> };
export type SpeakerRow = { id: string; committeeId: string; seatId: string; position: number; status: Speaker['status'] };
export type Counts = { yes: number; no: number; abstain: number; notVoted: number };
export type VoteRow = {
  id: string; committeeId: string; target: VoteTarget; targetId: string | null; title: string; majority: Vote['majority'];
  status: 'open' | 'closed'; openedAt: string; closedAt: string | null;
  ballots: Record<string, VoteChoice>;                       // seat id → choice
  recorded: { yes: number; no: number; abstain: number } | null;   // placard count from the dais
  final: Counts | null; passed: boolean | null;              // frozen when the vote closes
};
export type PaperFileRow = { seatId: string; fileName: string; sizeBytes: number | null; fileKey: string | null; submittedAt: string; seenAt: string | null };
export type ResolutionRow = {
  id: string; committeeId: string; kind: Resolution['kind']; number: string | null;
  title: string; body: string | null; fileName: string | null; fileKey: string | null;
  parentId: string | null; clause: string | null; status: ResolutionStatus; returnComment: string | null;
  sponsorSeatIds: string[]; signatorySeatIds: string[];
  authorSeatId: string | null; authorProfileId: string | null; createdAt: string; updatedAt: string;
};
export type ChitRow = {
  id: string; committeeId: string;
  fromSeatId: string | null;   // null = the dais
  toSeatId: string | null;     // null = the dais, or every seat when toAll
  toAll: boolean;              // a dais notice to every seat
  body: string; replyTo: string | null; status: Chit['status']; createdAt: string;
};
export type NoteRow = { id: string; profileId: string; body: string; tag: NoteTag; done: boolean; createdAt: string; updatedAt: string };
export type FileRow = {
  id: string; title: string; kind: FileKind; scope: 'conference' | 'committee' | 'mine';
  committeeId: string | null; ownerProfileId: string | null;
  fileName: string | null; link: string | null; sizeBytes: number | null; fileKey: string | null;
  addedBy: string | null; addedAt: string; sharedWithSeatIds: string[];
};
export type AnnouncementRow = Announcement & { audience: 'all' | 'delegates' | 'chairs' | 'committee' };
export type ScoreRow = { committeeId: string; seatId: string; sessionNumber: number; chairId: string; marks: Record<string, number>; comment: string | null; updatedAt: string };
export type NominationRow = { id: string; committeeId: string; seatId: string; award: string; nominatedBy: string | null; final: boolean };

export type DemoState = {
  version: number;
  scenario: DemoScenario;
  rev: number;
  change: { topics: Topic[]; committeeId: string | null };
  phase: Phase;
  profiles: ProfileRow[];
  registrations: RegRow[];
  committees: CommitteeRow[];
  seats: SeatRow[];
  chairs: ChairRow[];
  live: LiveRow[];
  rolls: RollRow[];
  speakers: SpeakerRow[];
  votes: VoteRow[];
  papers: PaperFileRow[];
  resolutions: ResolutionRow[];
  chits: ChitRow[];
  notes: NoteRow[];
  files: FileRow[];
  announcements: AnnouncementRow[];
  schedule: ScheduleItem[];
  deadlines: Deadline[];
  criteria: Record<string, Criterion[]>;   // committee id → criteria (missing = DEFAULT_CRITERIA)
  scores: ScoreRow[];
  nominations: NominationRow[];
};

// ───────────────────────── localStorage access ─────────────────────────
function storage(): Storage | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
}

let cache: DemoState | null = null;
let cacheRaw: string | null = null;

function parse(raw: string | null): DemoState | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as DemoState;
    return s && s.version === STORE_VERSION && isScenario(s.scenario) ? s : null;
  } catch { return null; }
}

function save(s: DemoState) {
  const raw = JSON.stringify(s);
  cache = s; cacheRaw = raw;
  try { storage()?.setItem(STORE_KEY, raw); } catch (e) {
    console.warn('[demo] could not save the sample data (storage full or blocked); it still works in this tab.', e);
  }
}

/** The current state (read-only by convention: adapters copy what they return). Seeds it on first use. */
export function getState(): DemoState {
  const ls = storage();
  let raw: string | null = null;
  try { raw = ls ? ls.getItem(STORE_KEY) : null; } catch { raw = null; }
  if (raw !== null && raw === cacheRaw && cache) return cache;
  const parsed = parse(raw);
  if (parsed) { cache = parsed; cacheRaw = raw; return parsed; }
  if (cache && !ls) return cache;                      // no storage at all: keep the in-memory copy
  const seeded = buildSeed('seated');
  save(seeded);
  return seeded;
}

/**
 * Change the store. `fn` mutates a fresh copy; if it throws, nothing is saved. On success the copy is saved,
 * same-tab subscribers hear `topics` now and other tabs hear them through the `storage` event.
 */
export function write<T>(topics: Topic[], committeeId: string | null, fn: (s: DemoState) => T): T {
  const draft = structuredClone(getState());
  const result = fn(draft);
  draft.rev += 1;
  draft.change = { topics, committeeId };
  save(draft);
  notify(topics, committeeId);
  return result;
}

/** Replace everything with a fresh seed for `scenario` and tell everyone that everything changed. */
export function reseed(scenario: DemoScenario) {
  const rev = cache?.rev ?? 0;
  const s = buildSeed(scenario);
  s.rev = rev + 1;
  s.change = { topics: ALL_TOPICS, committeeId: null };
  save(s);
  notify(ALL_TOPICS, null);
}

// ───────────────────────── Subscribers ─────────────────────────
type Listener = (topics: Topic[], committeeId: string | null) => void;
const listeners = new Set<Listener>();
let listening = false;

function notify(topics: Topic[], committeeId: string | null) {
  for (const cb of [...listeners]) {
    try { cb(topics, committeeId); } catch (e) { console.error(e); }
  }
}

function onStorage(e: StorageEvent) {
  if (e.key !== null && e.key !== STORE_KEY) return;
  const next = parse(e.newValue ?? null);
  if (!next) {                     // cleared or replaced by something unreadable: re-seed lazily, refetch everything
    cache = null; cacheRaw = null;
    notify(ALL_TOPICS, null);
    return;
  }
  cache = next; cacheRaw = e.newValue;
  const topics = Array.isArray(next.change?.topics) ? next.change.topics : ALL_TOPICS;
  if (topics.length) notify(topics, next.change?.committeeId ?? null);   // [] = a private change (my notes): nothing to refetch
}

/** Hear every change (this tab and other tabs). `committeeId` is the committee the change belongs to, or null. */
export function subscribeStore(cb: Listener): Unsubscribe {
  if (!listening && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('storage', onStorage);
    listening = true;
  }
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

// ───────────────────────── Scenario ─────────────────────────
/** The scenario named in the page URL (?demo=…), if any. */
export function scenarioFromUrl(): DemoScenario | null {
  try {
    const v = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('demo');
    return isScenario(v) ? v : null;
  } catch { return null; }
}

/** The scenario the shared store is in now. */
export function currentDemoScenario(): DemoScenario {
  return getState().scenario;
}

/**
 * Put the store into `scenario`. Only re-seeds when the scenario actually changes, so a chair tab's work in the
 * same scenario is kept when a delegate tab opens or reloads.
 */
export function ensureScenario(scenario: DemoScenario) {
  if (getState().scenario !== scenario) reseed(scenario);
}

/** "Reset sample data": a fresh seed for the current scenario (or the one given). Uploaded files are forgotten. */
export function resetDemoData(scenario?: DemoScenario) {
  forgetBlobs();
  reseed(scenario ?? scenarioFromUrl() ?? getState().scenario);
}

// ───────────────────────── Uploaded files (this tab's memory only) ─────────────────────────
// The store keeps a file's name and size; the bytes stay in this tab as a blob URL for the session.
const blobs = new Map<string, string>();

export function rememberFile(file: File): string {
  const key = uid('blob');
  try { blobs.set(key, URL.createObjectURL(file)); } catch { /* no blob URLs here: the name and size are still kept */ }
  return key;
}

export function blobFor(key: string | null): string | null {
  return key ? blobs.get(key) ?? null : null;
}

function forgetBlobs() {
  for (const url of blobs.values()) { try { URL.revokeObjectURL(url); } catch { /* ignore */ } }
  blobs.clear();
}

// ───────────────────────── Small shared helpers ─────────────────────────
export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
export const nowIso = () => new Date().toISOString();
export const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
