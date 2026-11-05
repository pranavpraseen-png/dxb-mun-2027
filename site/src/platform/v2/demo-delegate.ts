// Demo DelegateApi over the shared demo store. See demo-store.ts for sync, demo-seed.ts for the sample world.
//
// Choices made where the contract leaves room (also listed in the report to the lead):
//   * Chits start as 'delivered' (the recipient sees them at once). The dais can block one later; a blocked chit
//     disappears for the recipient and shows as 'blocked' to its sender. 'pending' is never produced by the demo.
//   * committeeSeats() is every seat in my committee except my own (sponsors, chit recipients, sharing).
//   * Phase 'after' makes every delegate write throw "The conference has ended…"; reads keep working.
//   * Delegates start working papers or amendments; a working paper becomes a draft resolution when the chair
//     approves and numbers it.
import type {
  Chit, DelegateApi, LibraryFile, MySeat, MyNote, NoteTag, Registration, ResolutionInput, RollCall, VoteChoice,
} from './contract';
import {
  announcementView, checkLibraryFile, checkPaperFile, cleanLink, cleanText, clone, committeeRef, committeesSorted, demoAuth, fail,
  fileView, holderNames, liveView, newestFirst, openUrl, optText, paperView, pause, resolutionView, scheduleSorted, seatInCommittee,
  seatRef, seatsOf, signedInProfile, sortFiles, speakersView, subscribeFiltered, voteView, votesSorted,
} from './demo-common';
import {
  ensureScenario, getState, nowIso, rememberFile, scenarioFromUrl, uid, write,
  type ChitRow, type DemoState, type FileRow, type RegRow, type ResolutionRow,
} from './demo-store';

const NOTE_TAGS: NoteTag[] = ['poi', 'doubt', 'speech', 'general'];
const FILE_KINDS: LibraryFile['kind'][] = ['guide', 'rules', 'handbook', 'schedule', 'map', 'research', 'other'];
const PUBLIC_RESOLUTION: ResolutionRow['status'][] = ['approved', 'voting', 'passed', 'failed'];

type Ctx = { s: DemoState; profileId: string; name: string | null; reg: RegRow | null; seatId: string | null; committeeId: string | null };

function ctx(s: DemoState): Ctx {
  const p = signedInProfile(s);
  const regs = s.registrations.filter((r) => r.profileId === p.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const reg = regs.find((r) => r.status === 'allocated') ?? regs[0] ?? null;
  const seat = reg?.status === 'allocated' && reg.seatId ? s.seats.find((x) => x.id === reg.seatId) ?? null : null;
  return { s, profileId: p.id, name: p.fullName, reg, seatId: seat?.id ?? null, committeeId: seat?.committeeId ?? null };
}
function seated(c: Ctx): { seatId: string; committeeId: string } {
  if (!c.seatId || !c.committeeId) fail("You don't have a seat yet. The secretariat will give you one.");
  return { seatId: c.seatId, committeeId: c.committeeId };
}
function writable(s: DemoState) {
  if (s.phase === 'after') fail('The conference has ended. Everything is read-only now.');
}
/** Read, then a fresh context inside the write. */
function change<T>(topics: Parameters<typeof write>[0], committeeId: string | null, fn: (c: Ctx) => T): T {
  return write(topics, committeeId, (s) => { const c = ctx(s); writable(s); return fn(c); });
}

function visibleChit(c: Ctx, x: ChitRow): boolean {
  if (!c.committeeId || x.committeeId !== c.committeeId) return false;
  if (x.fromSeatId === c.seatId) return true;
  if (x.status !== 'delivered') return false;
  return x.toSeatId === c.seatId || (x.toAll && x.fromSeatId === null);
}
function visibleFile(c: Ctx, f: FileRow): LibraryFile['scope'] | null {
  if (f.scope === 'conference') return 'conference';
  if (f.scope === 'committee') return f.committeeId && f.committeeId === c.committeeId ? 'committee' : null;
  if (f.ownerProfileId === c.profileId) return 'mine';
  if (c.seatId && f.sharedWithSeatIds.includes(c.seatId)) return 'shared_with_me';
  return null;
}
function cleanSeatIds(s: DemoState, committeeId: string, ids: unknown, exclude: string | null): string[] {
  if (ids === undefined || ids === null) return [];
  if (!Array.isArray(ids)) fail('Choose seats from your committee.');
  const out: string[] = [];
  for (const id of ids) {
    if (typeof id !== 'string') fail('Choose seats from your committee.');
    seatInCommittee(s, committeeId, id);
    if (id !== exclude && !out.includes(id)) out.push(id);
  }
  return out;
}

export function createDemoDelegateApi(): DelegateApi {
  // The delegate dashboard picks the scenario: ?demo=… in the URL, else whatever the shared store is in now.
  const fromUrl = scenarioFromUrl();
  if (fromUrl) ensureScenario(fromUrl);

  const read = async <T>(fn: (c: Ctx) => T): Promise<T> => { await pause(); return clone(fn(ctx(getState()))); };
  const myCommittee = () => { try { return ctx(getState()).committeeId; } catch { return null; } };

  return {
    ...demoAuth,

    async phase() { await pause(); return getState().phase; },
    async committees() { await pause(); const s = getState(); return committeesSorted(s).map((c) => committeeRef(s, c.id)); },

    // ── Sign-up ──
    registration: () => read((c): Registration | null => c.reg && {
      status: c.reg.status, fullName: c.reg.fullName, schoolName: c.reg.schoolName, grade: c.reg.grade,
      choices: c.reg.choiceIds.filter((id) => c.s.committees.some((x) => x.id === id)).map((id) => committeeRef(c.s, id)),
      createdAt: c.reg.createdAt,
    }),
    async signUp(input) {
      await pause();
      const fullName = cleanText(input?.fullName, 'Your full name', 120);
      const schoolName = cleanText(input?.schoolName, 'Your school', 120);
      const grade = cleanText(input?.grade, 'Your grade', 20);
      const ids = Array.isArray(input?.committeeIds) ? input.committeeIds : [];
      if (ids.length < 1 || ids.length > 3) fail('Choose up to three committees, in order.');
      if (new Set(ids).size !== ids.length) fail('Choose each committee only once.');
      change(['seat'], null, (c) => {
        for (const id of ids) if (!c.s.committees.some((x) => x.id === id)) fail('One of those committees does not exist.');
        if (c.reg?.status === 'allocated') fail('You already have a seat. Ask the secretariat to change it.');
        const profile = c.s.profiles.find((p) => p.id === c.profileId)!;
        profile.fullName = fullName;
        const row = c.s.registrations.find((r) => r.id === c.reg?.id);
        if (row) Object.assign(row, { status: 'applied', fullName, schoolName, grade, choiceIds: [...ids], seatId: null });
        else {
          const n = c.s.registrations.length + 1;
          c.s.registrations.push({
            id: uid('reg'), profileId: c.profileId, status: 'applied', fullName, schoolName, grade, choiceIds: [...ids],
            seatId: null, checkinCode: `DEMO-${String(n + 100).padStart(4, '0')}`, checkinDays: [], createdAt: nowIso(),
          });
        }
      });
    },
    seat: () => read((c): MySeat | null => {
      if (!c.seatId || !c.committeeId || !c.reg) return null;
      const cm = c.s.committees.find((x) => x.id === c.committeeId)!;
      const roleOrder = { chair: 0, vice_chair: 1, rapporteur: 2 } as const;
      return {
        committee: committeeRef(c.s, c.committeeId), seat: seatRef(c.s, c.seatId), room: cm.room,
        partner: holderNames(c.s, c.seatId).find((n) => n !== c.reg!.fullName) ?? null,
        chairs: c.s.chairs.filter((x) => x.committeeId === c.committeeId).sort((a, b) => roleOrder[a.role] - roleOrder[b.role])
          .map((x) => ({ fullName: c.s.profiles.find((p) => p.id === x.profileId)?.fullName ?? null, role: x.role })),
        checkinCode: c.reg.checkinCode,
      };
    }),

    // ── Room ──
    live: () => read((c) => (c.committeeId ? liveView(c.s, c.committeeId) : null)),
    schedule: () => read((c) => scheduleSorted(c.s.schedule.filter((x) => x.committeeId === null || x.committeeId === c.committeeId))),
    deadlines: () => read((c) => c.s.deadlines),
    announcements: () => read((c) => c.s.announcements
      .filter((a) => a.audience === 'all' || a.audience === 'delegates' || (!!c.committeeId && a.committeeId === c.committeeId && a.audience === 'committee'))
      .sort(newestFirst).map(announcementView)),
    committeeSeats: () => read((c) => (c.committeeId ? seatsOf(c.s, c.committeeId).filter((x) => x.id !== c.seatId).map((x) => ({ id: x.id, label: x.label })) : [])),

    rollCall: () => read((c): RollCall => {
      if (!c.seatId || !c.committeeId) return { open: false, sessionNumber: null, rows: [] };
      const roll = c.s.rolls.find((r) => r.committeeId === c.committeeId);
      return { open: roll?.open ?? false, sessionNumber: roll?.sessionNumber ?? null, rows: [{ seat: seatRef(c.s, c.seatId), status: roll?.marks[c.seatId] ?? null }] };
    }),
    async answerRoll(status) {
      await pause();
      if (status !== 'present' && status !== 'present_voting') fail('Choose Present or Present and voting.');
      const cid = myCommittee();
      change(['roll'], cid, (c) => {
        const { seatId, committeeId } = seated(c);
        const roll = c.s.rolls.find((r) => r.committeeId === committeeId);
        if (!roll?.open) fail("Roll call isn't open right now.");
        roll.marks[seatId] = status;
      });
    },

    speakers: () => read((c) => (c.committeeId ? speakersView(c.s, c.committeeId, c.seatId) : [])),
    async joinSpeakers() {
      await pause();
      change(['speakers'], myCommittee(), (c) => {
        const { seatId, committeeId } = seated(c);
        const list = c.s.speakers.filter((x) => x.committeeId === committeeId);
        if (list.some((x) => x.seatId === seatId && x.status !== 'done')) fail("You're already on the speakers' list.");
        c.s.speakers.push({ id: uid('spk'), committeeId, seatId, position: list.reduce((m, x) => Math.max(m, x.position), 0) + 1, status: 'waiting' });
      });
    },
    async leaveSpeakers() {
      await pause();
      change(['speakers'], myCommittee(), (c) => {
        const { seatId, committeeId } = seated(c);
        const mine = c.s.speakers.find((x) => x.committeeId === committeeId && x.seatId === seatId && x.status !== 'done');
        if (!mine) fail("You're not on the speakers' list.");
        if (mine.status === 'speaking') fail("You're speaking now. The chair ends your turn.");
        c.s.speakers = c.s.speakers.filter((x) => x.id !== mine.id);
        c.s.speakers.filter((x) => x.committeeId === committeeId).sort((a, b) => a.position - b.position).forEach((x, i) => { x.position = i + 1; });
      });
    },

    votes: () => read((c) => (c.committeeId ? votesSorted(c.s, c.committeeId).map((v) => voteView(c.s, v, { seatId: c.seatId })) : [])),
    async castVote(voteId, choice: VoteChoice) {
      await pause();
      if (choice !== 'yes' && choice !== 'no' && choice !== 'abstain') fail('Choose Yes, No or Abstain.');
      change(['votes'], myCommittee(), (c) => {
        const { seatId, committeeId } = seated(c);
        const v = c.s.votes.find((x) => x.id === voteId && x.committeeId === committeeId);
        if (!v) fail('That vote does not exist.');
        if (v.status !== 'open') fail('This vote has closed.');
        const roll = c.s.rolls.find((r) => r.committeeId === committeeId);
        if (choice === 'abstain' && roll?.marks[seatId] === 'present_voting') fail("You answered Present and voting, so you can't abstain.");
        v.ballots[seatId] = choice;
      });
    },

    // ── Papers and resolutions ──
    positionPaper: () => read((c) => (c.seatId ? paperView(c.s, c.seatId) : { status: 'not_sent' as const, fileName: null, submittedAt: null, seenAt: null })),
    async uploadPositionPaper(file) {
      const f = checkPaperFile(file);
      await pause();
      const cid = myCommittee();
      change(['papers'], cid, (c) => {
        const { seatId } = seated(c);
        const fileKey = rememberFile(f);
        c.s.papers = c.s.papers.filter((p) => p.seatId !== seatId);
        c.s.papers.push({ seatId, fileName: f.name, sizeBytes: f.size, fileKey, submittedAt: nowIso(), seenAt: null });
      });
    },
    resolutions: () => read((c) => {
      if (!c.committeeId) return [];
      const me = c.seatId;
      return c.s.resolutions
        .filter((r) => r.committeeId === c.committeeId && (
          r.authorSeatId === me || r.authorProfileId === c.profileId ||
          (!!me && (r.sponsorSeatIds.includes(me) || r.signatorySeatIds.includes(me))) ||
          PUBLIC_RESOLUTION.includes(r.status)))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map((r) => resolutionView(c.s, r, me));
    }),
    async saveResolution(input: ResolutionInput) {
      if (!input || typeof input !== 'object') fail('Fill in the paper first.');
      if (!['working_paper', 'draft_resolution', 'amendment'].includes(input.kind)) fail('Choose a working paper or an amendment.');
      const title = cleanText(input.title, 'A title', 200);
      const body = input.body === undefined ? undefined : optText(input.body, 'The text', 20000, true);
      const file = input.file ? checkPaperFile(input.file) : null;
      await pause();
      return change(['resolutions'], myCommittee(), (c) => {
        const { seatId, committeeId } = seated(c);
        const existing = input.id ? c.s.resolutions.find((r) => r.id === input.id && r.committeeId === committeeId) : undefined;
        if (input.id) {
          if (!existing || (existing.authorSeatId !== seatId && existing.authorProfileId !== c.profileId)) fail('You can only edit your own papers.');
          if (existing.status !== 'draft' && existing.status !== 'returned') fail("This paper is with the chair. You can't edit it now.");
        }
        if (input.kind === 'draft_resolution' && existing?.kind !== 'draft_resolution') fail('Start a working paper. The chair numbers it as a draft resolution.');
        let parentId: string | null = null;
        let clause: string | null = null;
        if (input.kind === 'amendment') {
          const parent = c.s.resolutions.find((r) => r.id === input.parentId && r.committeeId === committeeId);
          if (!parent || parent.kind === 'amendment') fail('Choose the draft resolution this amendment changes.');
          if (parent.status !== 'approved' && parent.status !== 'voting') fail('You can only amend a draft resolution the chair has approved.');
          parentId = parent.id;
          clause = cleanText(input.clause, 'The clause', 60);
        }
        const sponsors = [seatId, ...cleanSeatIds(c.s, committeeId, input.sponsorSeatIds, seatId)];
        const signatories = cleanSeatIds(c.s, committeeId, input.signatorySeatIds, seatId).filter((id) => !sponsors.includes(id));
        const finalBody = body === undefined ? existing?.body ?? null : body;
        const hasFile = !!file || !!existing?.fileName;
        if (input.submit && !finalBody && !hasFile) fail('Write the text or attach a file before sending.');
        const fileKey = file ? rememberFile(file) : existing?.fileKey ?? null;
        const now = nowIso();
        const row: ResolutionRow = existing ?? {
          id: uid('res'), committeeId, kind: input.kind, number: null, title, body: null, fileName: null, fileKey: null,
          parentId: null, clause: null, status: 'draft', returnComment: null, sponsorSeatIds: [], signatorySeatIds: [],
          authorSeatId: seatId, authorProfileId: c.profileId, createdAt: now, updatedAt: now,
        };
        Object.assign(row, {
          kind: input.kind, title, body: finalBody, fileName: file ? file.name : row.fileName, fileKey,
          parentId, clause, sponsorSeatIds: sponsors, signatorySeatIds: signatories, updatedAt: now,
        });
        if (input.submit) { row.status = 'submitted'; row.returnComment = null; }
        if (!existing) c.s.resolutions.push(row);
        return row.id;
      });
    },

    // ── Notes ──
    chits: () => read((c): Chit[] => c.s.chits.filter((x) => visibleChit(c, x))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((x) => ({
        id: x.id, from: x.fromSeatId ? seatRef(c.s, x.fromSeatId) : null, to: x.toSeatId ? seatRef(c.s, x.toSeatId) : null,
        body: x.body, replyTo: x.replyTo, status: x.status, direction: x.fromSeatId === c.seatId ? 'out' : 'in', createdAt: x.createdAt,
      }))),
    async sendChit(toSeatId, body, replyTo) {
      const text = cleanText(body, 'Your note', 300, { multiline: true });
      await pause();
      change(['chits'], myCommittee(), (c) => {
        const { seatId, committeeId } = seated(c);
        if (toSeatId !== null) {
          if (typeof toSeatId !== 'string') fail('Choose who the note is for.');
          seatInCommittee(c.s, committeeId, toSeatId);
          if (toSeatId === seatId) fail("You can't send a note to yourself.");
        }
        if (replyTo && !c.s.chits.some((x) => x.id === replyTo && visibleChit(c, x))) fail('That note is no longer there to reply to.');
        c.s.chits.push({ id: uid('chit'), committeeId, fromSeatId: seatId, toSeatId, toAll: false, body: text, replyTo: replyTo ?? null, status: 'delivered', createdAt: nowIso() });
      });
    },
    myNotes: () => read((c): MyNote[] => c.s.notes.filter((n) => n.profileId === c.profileId)
      .sort((a, b) => Number(a.done) - Number(b.done) || b.updatedAt.localeCompare(a.updatedAt))
      .map(({ id, body, tag, done, createdAt, updatedAt }) => ({ id, body, tag, done, createdAt, updatedAt }))),
    async saveNote(input) {
      const body = cleanText(input?.body, 'Your note', 2000, { multiline: true });
      if (!NOTE_TAGS.includes(input?.tag)) fail('Choose a tag: POI, Doubt, Speech point or General.');
      await pause();
      return change([], null, (c) => {
        const now = nowIso();
        if (input.id) {
          const n = c.s.notes.find((x) => x.id === input.id && x.profileId === c.profileId);
          if (!n) fail('That note is no longer there.');
          Object.assign(n, { body, tag: input.tag, updatedAt: now });
          return n.id;
        }
        const id = uid('note');
        c.s.notes.push({ id, profileId: c.profileId, body, tag: input.tag, done: false, createdAt: now, updatedAt: now });
        return id;
      });
    },
    async setNoteDone(id, done) {
      await pause();
      change([], null, (c) => {
        const n = c.s.notes.find((x) => x.id === id && x.profileId === c.profileId);
        if (!n) fail('That note is no longer there.');
        n.done = !!done; n.updatedAt = nowIso();
      });
    },
    async deleteNote(id) {
      await pause();
      change([], null, (c) => {
        if (!c.s.notes.some((x) => x.id === id && x.profileId === c.profileId)) fail('That note is no longer there.');
        c.s.notes = c.s.notes.filter((x) => x.id !== id);
      });
    },

    // ── Files ──
    files: () => read((c) => sortFiles(c.s.files.flatMap((f) => {
      const scope = visibleFile(c, f);
      return scope ? [fileView(c.s, f, { scope, canRemove: scope === 'mine' })] : [];
    }))),
    async addFile(input) {
      if (!input || typeof input !== 'object') fail('Choose a file or paste a link.');
      const title = cleanText(input.title, 'A title', 200);
      if (!FILE_KINDS.includes(input.kind)) fail('Choose what kind of file this is.');
      if (!input.file && !input.link) fail('Add a file or a link.');
      if (input.file && input.link) fail('Add a file or a link, not both.');
      const file = input.file ? checkLibraryFile(input.file) : null;
      const link = input.link ? cleanLink(input.link) : null;
      await pause();
      change(['files'], myCommittee(), (c) => {
        const share = input.shareWithSeatIds?.length ? cleanSeatIds(c.s, seated(c).committeeId, input.shareWithSeatIds, c.seatId) : [];
        c.s.files.push({
          id: uid('file'), title, kind: input.kind, scope: 'mine', committeeId: c.committeeId, ownerProfileId: c.profileId,
          fileName: file?.name ?? null, link, sizeBytes: file?.size ?? null, fileKey: file ? rememberFile(file) : null,
          addedBy: c.name, addedAt: nowIso(), sharedWithSeatIds: share,
        });
      });
    },
    async shareFile(id, seatIds) {
      await pause();
      change(['files'], myCommittee(), (c) => {
        const f = c.s.files.find((x) => x.id === id && x.scope === 'mine' && x.ownerProfileId === c.profileId);
        if (!f) fail('You can only share your own files.');
        f.sharedWithSeatIds = seatIds.length ? cleanSeatIds(c.s, seated(c).committeeId, seatIds, c.seatId) : [];
      });
    },
    async removeFile(id) {
      await pause();
      change(['files'], myCommittee(), (c) => {
        if (!c.s.files.some((x) => x.id === id && x.scope === 'mine' && x.ownerProfileId === c.profileId)) fail('You can only remove your own files.');
        c.s.files = c.s.files.filter((x) => x.id !== id);
      });
    },
    async openFile(id) {
      await pause();
      const c = ctx(getState());
      const f = c.s.files.find((x) => x.id === id);
      if (!f || !visibleFile(c, f)) fail("That file isn't available.");
      return openUrl(f);
    },

    subscribe(cb) { return subscribeFiltered(myCommittee, cb); },
  };
}
