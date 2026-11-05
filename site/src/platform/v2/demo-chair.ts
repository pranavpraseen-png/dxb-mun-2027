// Demo ChairApi (the dais) over the shared demo store. A chair's writes reach every delegate tab live.
//
// Choices made where the contract leaves room:
//   * Admins can run every committee (myRole 'chair'); chairs only the committees they're given.
//   * Only one vote can be open per committee. A vote on a resolution or amendment moves it to 'voting',
//     and closing the vote sets it to 'passed' or 'failed'.
//   * Majorities: simple = more yes than no; two-thirds = yes ≥ two-thirds of yes + no. Abstentions don't count.
//     notVoted = filled seats minus votes cast. A placard count (recordCount) replaces the phone ballots.
//   * Approving a working paper with a number turns it into a draft resolution.
//   * sendChit with toSeatId null goes to every seat (as the contract says), even when it's a reply.
//   * endSession pauses the timer; the next startSession opens the next session number.
import {
  type ChairApi, type ChairCommittee, type ChairRole, type Chit, type Criterion, type DaisSeat, type Nomination, type PaperRow,
  type RollCall, type RollStatus, type ScoreSheet, type Timer, type VoteTarget,
} from './contract';
import {
  announcementView, awardRank, checkLibraryFile, cleanLink, cleanText, clone, committeesSorted, criteriaFor, demoAuth, fail,
  fileView, filledSeatCount, holderNames, holdersOf, intIn, liveRow, liveView, newestFirst, openUrl, optText, paperView, pause,
  profileName, rankingFor, resolutionView, seatInCommittee, seatRef, seatsOf, signedInProfile, sortFiles, speakersView, subscribeFiltered,
  voteView, votesSorted,
} from './demo-common';
import { passes, tally } from './demo-seed';
import {
  getState, nowIso, rememberFile, scenarioFromUrl, ensureScenario, uid, write,
  type DemoState, type ProfileRow, type ResolutionRow, type VoteRow,
} from './demo-store';

const TIMER_KINDS: Timer['kind'][] = ['speech', 'caucus', 'session', 'other'];
const ROLL: RollStatus[] = ['present', 'present_voting', 'absent'];
const TARGETS: VoteTarget[] = ['motion', 'resolution', 'amendment'];
const INBOX_ORDER: Record<ResolutionRow['status'], number> = { submitted: 0, voting: 1, approved: 2, returned: 3, passed: 4, failed: 5, draft: 6 };
const MAX_TIMER = 3 * 60 * 60;

function chairProfile(s: DemoState): ProfileRow {
  const p = signedInProfile(s);
  if (p.role !== 'chair' && p.role !== 'admin') fail('Sign in with a chair account to use the dais.');
  return p;
}
function roleIn(s: DemoState, p: ProfileRow, committeeId: string): ChairRole | null {
  if (p.role === 'admin') return 'chair';
  return s.chairs.find((x) => x.committeeId === committeeId && x.profileId === p.id)?.role ?? null;
}
/** The signed-in chair, checked against the committee. */
function dais(s: DemoState, committeeId: string): ProfileRow {
  const p = chairProfile(s);
  if (typeof committeeId !== 'string' || !s.committees.some((x) => x.id === committeeId)) fail('That committee does not exist.');
  if (!roleIn(s, p, committeeId)) fail("You don't chair this committee.");
  return p;
}
function notAfter(s: DemoState) {
  if (s.phase === 'after') fail('The conference has ended. Live sessions are closed.');
}
const remainingNow = (t: Timer) => (t.running && t.endsAt ? Math.max(0, Math.round((Date.parse(t.endsAt) - Date.now()) / 1000)) : t.remainingSeconds);

function renumber(s: DemoState, committeeId: string) {
  s.speakers.filter((x) => x.committeeId === committeeId).sort((a, b) => a.position - b.position).forEach((x, i) => { x.position = i + 1; });
}
function finishVote(s: DemoState, v: VoteRow) {
  v.final = tally(v, filledSeatCount(s, v.committeeId));
  v.passed = passes(v.final, v.majority);
  if (v.targetId && v.target !== 'motion') {
    const r = s.resolutions.find((x) => x.id === v.targetId);
    if (r) { r.status = v.passed ? 'passed' : 'failed'; r.updatedAt = nowIso(); }
  }
}
function slug(v: string) {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30);
}

export function createDemoChairApi(): ChairApi {
  // A chair page can also be pointed at a scenario (?demo=live) for testing; without it the store is left as is.
  const fromUrl = scenarioFromUrl();
  if (fromUrl) ensureScenario(fromUrl);

  /** Read for committee c (access checked), returning a copy. */
  const read = async <T>(c: string, fn: (s: DemoState, me: ProfileRow) => T): Promise<T> => {
    await pause();
    const s = getState();
    return clone(fn(s, dais(s, c)));
  };
  /** Write for committee c (access checked). */
  const change = async <T>(c: string, topics: Parameters<typeof write>[0], fn: (s: DemoState, me: ProfileRow) => T): Promise<T> => {
    await pause();
    return write(topics, c, (s) => fn(s, dais(s, c)));
  };
  /** Find which committee a row belongs to, so methods that take only an id can check access. */
  const owner = (find: (s: DemoState) => { committeeId: string | null } | undefined, missing: string) => {
    const row = find(getState());
    if (!row?.committeeId) fail(missing);
    return row.committeeId;
  };
  const timer = (c: string, fn: (t: Timer, s: DemoState) => void) => change(c, ['live'], (s) => {
    const l = liveRow(s, c);
    fn(l.timer, s);
    l.updatedAt = nowIso();
  });

  return {
    ...demoAuth,

    async phase() { await pause(); return getState().phase; },
    async myCommittees() {
      await pause();
      const s = getState();
      const p = chairProfile(s);
      return committeesSorted(s).flatMap((c): ChairCommittee[] => {
        const role = roleIn(s, p, c.id);
        return role ? [{ id: c.id, abbr: c.abbr, name: c.name, myRole: role, room: c.room }] : [];
      });
    },

    // ── Run the session ──
    live: (c) => read(c, (s) => liveView(s, c)),
    startSession: (c) => change(c, ['live'], (s) => {
      notAfter(s);
      const l = liveRow(s, c);
      if (l.session?.status === 'live') fail('A session is already running. End it first.');
      const number = !l.session ? 1 : l.session.status === 'scheduled' ? l.session.number : l.session.number + 1;
      l.session = { number, status: 'live', startedAt: nowIso() };
      l.updatedAt = nowIso();
    }),
    endSession: (c) => change(c, ['live'], (s) => {
      const l = liveRow(s, c);
      if (l.session?.status !== 'live') fail('No session is running.');
      l.session.status = 'closed';
      if (l.timer.running) Object.assign(l.timer, { remainingSeconds: remainingNow(l.timer), running: false, endsAt: null });
      l.updatedAt = nowIso();
    }),
    async setAgenda(c, input) {
      const agendaItem = optText(input?.agendaItem, 'The agenda item', 200);
      const currentMotion = optText(input?.currentMotion, 'The motion', 200);
      await change(c, ['live'], (s) => { const l = liveRow(s, c); Object.assign(l, { agendaItem, currentMotion, updatedAt: nowIso() }); });
    },

    // ── Timer ──
    async setTimer(c, input) {
      if (!TIMER_KINDS.includes(input?.kind)) fail('Choose what the timer is for.');
      const label = optText(input.label, 'The timer label', 120);
      const durationSeconds = intIn(input.durationSeconds, 5, MAX_TIMER, 'Set a time between 5 seconds and 3 hours.');
      await timer(c, (t, s) => {
        const speaker = input.speakerSeatId ? seatRef(s, seatInCommittee(s, c, input.speakerSeatId).id) : null;
        Object.assign(t, { kind: input.kind, label, durationSeconds, running: false, endsAt: null, remainingSeconds: durationSeconds, speaker });
      });
    },
    startTimer: (c) => timer(c, (t) => {
      if (t.running) return;
      if (t.remainingSeconds <= 0) fail('The timer is at zero. Reset it or add time first.');
      t.running = true;
      t.endsAt = new Date(Date.now() + t.remainingSeconds * 1000).toISOString();
    }),
    pauseTimer: (c) => timer(c, (t) => {
      if (!t.running) return;
      Object.assign(t, { remainingSeconds: remainingNow(t), running: false, endsAt: null });
    }),
    resetTimer: (c) => timer(c, (t) => { Object.assign(t, { running: false, endsAt: null, remainingSeconds: t.durationSeconds }); }),
    async addTime(c, seconds) {
      intIn(seconds, -MAX_TIMER, MAX_TIMER, 'Add between -3 hours and 3 hours.');
      if (seconds === 0) return;
      await timer(c, (t) => {
        const left = Math.min(MAX_TIMER, Math.max(0, remainingNow(t) + seconds));
        t.remainingSeconds = left;
        if (t.running && t.endsAt) t.endsAt = new Date(Date.now() + left * 1000).toISOString();
      });
    },

    // ── People in the room ──
    seats: (c) => read(c, (s) => seatsOf(s, c).map((seat): DaisSeat => ({
      seat: { id: seat.id, label: seat.label }, delegates: holderNames(s, seat.id),
      checkedIn: holdersOf(s, seat.id).some((r) => r.checkinDays.length > 0),
    }))),
    rollCall: (c) => read(c, (s): RollCall => {
      const roll = s.rolls.find((r) => r.committeeId === c);
      return { open: roll?.open ?? false, sessionNumber: roll?.sessionNumber ?? null,
        rows: seatsOf(s, c).map((seat) => ({ seat: { id: seat.id, label: seat.label }, status: roll?.marks[seat.id] ?? null })) };
    }),
    openRoll: (c) => change(c, ['roll'], (s) => {
      notAfter(s);
      const existing = s.rolls.find((r) => r.committeeId === c);
      if (existing?.open) fail('Roll call is already open.');
      s.rolls = s.rolls.filter((r) => r.committeeId !== c);
      s.rolls.push({ committeeId: c, sessionNumber: liveRow(s, c).session?.number ?? null, open: true, marks: {} });
    }),
    closeRoll: (c) => change(c, ['roll'], (s) => {
      const roll = s.rolls.find((r) => r.committeeId === c);
      if (!roll?.open) fail("Roll call isn't open.");
      for (const seat of seatsOf(s, c)) if (!roll.marks[seat.id]) roll.marks[seat.id] = 'absent';
      roll.open = false;
    }),
    async markRoll(c, seatId, status) {
      if (!ROLL.includes(status)) fail('Choose Present, Present and voting, or Absent.');
      await change(c, ['roll'], (s) => {
        seatInCommittee(s, c, seatId);
        let roll = s.rolls.find((r) => r.committeeId === c);
        if (!roll) { roll = { committeeId: c, sessionNumber: liveRow(s, c).session?.number ?? null, open: false, marks: {} }; s.rolls.push(roll); }
        roll.marks[seatId] = status;
      });
    },

    speakers: (c) => read(c, (s) => speakersView(s, c, null)),
    addSpeaker: (c, seatId) => change(c, ['speakers'], (s) => {
      notAfter(s);
      seatInCommittee(s, c, seatId);
      const list = s.speakers.filter((x) => x.committeeId === c);
      if (list.some((x) => x.seatId === seatId && x.status !== 'done')) fail('That seat is already on the list.');
      s.speakers.push({ id: uid('spk'), committeeId: c, seatId, position: list.reduce((m, x) => Math.max(m, x.position), 0) + 1, status: 'waiting' });
    }),
    async moveSpeaker(id, toPosition) {
      const c = owner((s) => s.speakers.find((x) => x.id === id), 'That speaker is no longer on the list.');
      intIn(toPosition, 1, 10_000, 'Choose a place on the list.');
      await change(c, ['speakers'], (s) => {
        const list = s.speakers.filter((x) => x.committeeId === c).sort((a, b) => a.position - b.position);
        const item = list.find((x) => x.id === id);
        if (!item) fail('That speaker is no longer on the list.');
        if (item.status !== 'waiting') fail('Only waiting speakers can be moved.');
        const rest = list.filter((x) => x.id !== id);
        const firstWaiting = rest.findIndex((x) => x.status === 'waiting');
        const minIndex = firstWaiting < 0 ? rest.length : firstWaiting;
        const index = Math.min(rest.length, Math.max(minIndex, toPosition - 1));
        rest.splice(index, 0, item);
        rest.forEach((x, i) => { x.position = i + 1; });
      });
    },
    async removeSpeaker(id) {
      const c = owner((s) => s.speakers.find((x) => x.id === id), 'That speaker is no longer on the list.');
      await change(c, ['speakers'], (s) => { s.speakers = s.speakers.filter((x) => x.id !== id); renumber(s, c); });
    },
    async nextSpeaker(c, speechSeconds) {
      const seconds = intIn(speechSeconds, 5, MAX_TIMER, 'Set a speech time between 5 seconds and 3 hours.');
      await change(c, ['speakers', 'live'], (s) => {
        const list = s.speakers.filter((x) => x.committeeId === c).sort((a, b) => a.position - b.position);
        const current = list.find((x) => x.status === 'speaking');
        const next = list.find((x) => x.status === 'waiting');
        if (!current && !next) fail('No one is waiting on the speakers’ list.');
        if (current) current.status = 'done';
        const l = liveRow(s, c);
        if (next) {
          next.status = 'speaking';
          const seat = seatRef(s, next.seatId);
          l.timer = { kind: 'speech', label: seat.label, durationSeconds: seconds, running: true,
            endsAt: new Date(Date.now() + seconds * 1000).toISOString(), remainingSeconds: seconds, speaker: seat };
        } else if (l.timer.running) {
          Object.assign(l.timer, { remainingSeconds: remainingNow(l.timer), running: false, endsAt: null });
        }
        l.updatedAt = nowIso();
      });
    },

    // ── Votes ──
    votes: (c) => read(c, (s) => votesSorted(s, c).map((v) => voteView(s, v, 'dais'))),
    async openVote(c, input) {
      if (!TARGETS.includes(input?.target)) fail('Choose what the vote is on.');
      const title = cleanText(input.title, 'A title for the vote', 200);
      if (input.majority !== 'simple' && input.majority !== 'two_thirds') fail('Choose a simple or two-thirds majority.');
      return change(c, ['votes', 'resolutions'], (s) => {
        notAfter(s);
        if (s.votes.some((v) => v.committeeId === c && v.status === 'open')) fail('Close the open vote first.');
        let targetId: string | null = null;
        if (input.target !== 'motion' && input.targetId) {
          const r = s.resolutions.find((x) => x.id === input.targetId && x.committeeId === c);
          if (!r) fail('That paper is not in this committee.');
          if ((input.target === 'amendment') !== (r.kind === 'amendment')) fail(input.target === 'amendment' ? 'Choose an amendment.' : 'Choose a draft resolution.');
          if (r.status !== 'submitted' && r.status !== 'approved') fail('Only papers that are received or approved can go to a vote.');
          r.status = 'voting'; r.updatedAt = nowIso();
          targetId = r.id;
        }
        const id = uid('vote');
        s.votes.push({ id, committeeId: c, target: input.target, targetId, title, majority: input.majority, status: 'open',
          openedAt: nowIso(), closedAt: null, ballots: {}, recorded: null, final: null, passed: null });
        return id;
      });
    },
    async closeVote(voteId) {
      const c = owner((s) => s.votes.find((v) => v.id === voteId), 'That vote does not exist.');
      await change(c, ['votes', 'resolutions'], (s) => {
        const v = s.votes.find((x) => x.id === voteId)!;
        if (v.status !== 'open') fail('This vote is already closed.');
        v.status = 'closed'; v.closedAt = nowIso();
        finishVote(s, v);
      });
    },
    async recordCount(voteId, counts) {
      const c = owner((s) => s.votes.find((v) => v.id === voteId), 'That vote does not exist.');
      const n = (x: unknown, what: string) => intIn(x, 0, 1000, `Enter the number of ${what} votes (0 or more).`);
      const recorded = { yes: n(counts?.yes, 'yes'), no: n(counts?.no, 'no'), abstain: n(counts?.abstain, 'abstain') };
      await change(c, ['votes', 'resolutions'], (s) => {
        const v = s.votes.find((x) => x.id === voteId)!;
        v.recorded = recorded;
        if (v.status === 'closed') finishVote(s, v);
      });
    },

    // ── Papers and resolutions ──
    papers: (c) => read(c, (s) => seatsOf(s, c).map((seat): PaperRow => ({
      seat: { id: seat.id, label: seat.label }, delegates: holderNames(s, seat.id), paper: paperView(s, seat.id),
    }))),
    openPaper: (c, seatId) => read(c, (s) => {
      const seat = seatInCommittee(s, c, seatId);
      const p = s.papers.find((x) => x.seatId === seatId);
      if (!p) fail("This delegate hasn't sent a paper yet.");
      return openUrl({ title: `${seat.label} position paper`, fileName: p.fileName, fileKey: p.fileKey, sizeBytes: p.sizeBytes });
    }),
    markPaperSeen: (c, seatId) => change(c, ['papers'], (s) => {
      seatInCommittee(s, c, seatId);
      const p = s.papers.find((x) => x.seatId === seatId);
      if (!p) fail("This delegate hasn't sent a paper yet.");
      p.seenAt = p.seenAt ?? nowIso();
    }),
    resolutions: (c) => read(c, (s) => s.resolutions
      .filter((r) => r.committeeId === c && r.status !== 'draft')
      .sort((a, b) => INBOX_ORDER[a.status] - INBOX_ORDER[b.status] || b.updatedAt.localeCompare(a.updatedAt))
      .map((r) => resolutionView(s, r, null))),
    async approveResolution(id, number) {
      const c = owner((s) => s.resolutions.find((r) => r.id === id), 'That paper does not exist.');
      const num = cleanText(number, 'A number such as DR 1.1', 20);
      await change(c, ['resolutions'], (s) => {
        const r = s.resolutions.find((x) => x.id === id)!;
        if (r.status !== 'submitted' && r.status !== 'approved') fail('Only received papers can be approved.');
        if (s.resolutions.some((x) => x.committeeId === c && x.id !== id && x.number?.toLowerCase() === num.toLowerCase())) fail(`${num} is already used in this committee.`);
        r.number = num; r.status = 'approved'; r.returnComment = null; r.updatedAt = nowIso();
        if (r.kind === 'working_paper') r.kind = 'draft_resolution';
      });
    },
    async returnResolution(id, comment) {
      const c = owner((s) => s.resolutions.find((r) => r.id === id), 'That paper does not exist.');
      const text = cleanText(comment, 'A comment for the authors', 500, { multiline: true });
      await change(c, ['resolutions'], (s) => {
        const r = s.resolutions.find((x) => x.id === id)!;
        if (r.status !== 'submitted' && r.status !== 'approved') fail('Only received or approved papers can be returned.');
        r.status = 'returned'; r.returnComment = text; r.updatedAt = nowIso();
      });
    },

    // ── Chits ──
    chits: (c) => read(c, (s) => s.chits.filter((x) => x.committeeId === c)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((x): Chit => ({
        id: x.id, from: x.fromSeatId ? seatRef(s, x.fromSeatId) : null, to: x.toSeatId ? seatRef(s, x.toSeatId) : null,
        body: x.body, replyTo: x.replyTo, status: x.status,
        direction: x.fromSeatId === null ? 'out' : x.toSeatId === null ? 'in' : 'other', createdAt: x.createdAt,
      }))),
    async setChitStatus(id, status) {
      if (status !== 'delivered' && status !== 'blocked') fail('Choose Deliver or Block.');
      const c = owner((s) => s.chits.find((x) => x.id === id), 'That note does not exist.');
      await change(c, ['chits'], (s) => {
        const x = s.chits.find((y) => y.id === id)!;
        if (x.fromSeatId === null) fail('Notes from the dais are always delivered.');
        x.status = status;
      });
    },
    async sendChit(c, toSeatId, body, replyTo) {
      const text = cleanText(body, 'Your note', 300, { multiline: true });
      await change(c, ['chits'], (s) => {
        if (toSeatId !== null) seatInCommittee(s, c, toSeatId);
        if (replyTo && !s.chits.some((x) => x.id === replyTo && x.committeeId === c)) fail('That note is no longer there to reply to.');
        s.chits.push({ id: uid('chit'), committeeId: c, fromSeatId: null, toSeatId, toAll: toSeatId === null, body: text,
          replyTo: replyTo ?? null, status: 'delivered', createdAt: nowIso() });
      });
    },

    // ── Committee files and notices ──
    files: (c) => read(c, (s) => sortFiles(s.files
      .filter((f) => f.scope === 'conference' || (f.scope === 'committee' && f.committeeId === c))
      .map((f) => fileView(s, f, { canRemove: f.scope === 'committee' })))),
    async addFile(c, input) {
      if (!input || typeof input !== 'object') fail('Choose a file or paste a link.');
      const title = cleanText(input.title, 'A title', 200);
      if (!['guide', 'rules', 'handbook', 'schedule', 'map', 'research', 'other'].includes(input.kind)) fail('Choose what kind of file this is.');
      if (!input.file && !input.link) fail('Add a file or a link.');
      if (input.file && input.link) fail('Add a file or a link, not both.');
      const file = input.file ? checkLibraryFile(input.file) : null;
      const link = input.link ? cleanLink(input.link) : null;
      await change(c, ['files'], (s, me) => {
        s.files.push({ id: uid('file'), title, kind: input.kind, scope: 'committee', committeeId: c, ownerProfileId: me.id,
          fileName: file?.name ?? null, link, sizeBytes: file?.size ?? null, fileKey: file ? rememberFile(file) : null,
          addedBy: me.fullName, addedAt: nowIso(), sharedWithSeatIds: [] });
      });
    },
    async removeFile(id) {
      const c = owner((s) => s.files.find((f) => f.id === id && f.scope === 'committee'), 'You can only remove your committee’s files.');
      await change(c, ['files'], (s) => { s.files = s.files.filter((f) => f.id !== id); });
    },
    async openFile(id) {
      await pause();
      const s = getState();
      const f = s.files.find((x) => x.id === id && x.scope !== 'mine');
      if (!f) fail("That file isn't available.");
      if (f.scope === 'committee') dais(s, f.committeeId!); else chairProfile(s);
      return openUrl(f);
    },
    announcements: (c) => read(c, (s) => s.announcements
      .filter((a) => a.audience === 'all' || a.audience === 'chairs' || a.audience === 'delegates' || (a.audience === 'committee' && a.committeeId === c))
      .sort(newestFirst).map(announcementView)),
    async announce(c, input) {
      const title = cleanText(input?.title, 'A title', 120);
      const body = optText(input.body, 'The message', 1000, true);
      await change(c, ['announcements'], (s) => {
        s.announcements.push({ id: uid('ann'), title, body, urgent: !!input.urgent, from: 'chair', committeeId: c, audience: 'committee', publishedAt: nowIso() });
      });
    },

    // ── Awards rubric ──
    criteria: (c) => read(c, (s) => criteriaFor(s, c)),
    async setCriteria(c, criteria) {
      if (!Array.isArray(criteria) || criteria.length < 1 || criteria.length > 12) fail('Use between 1 and 12 criteria.');
      const clean: Criterion[] = criteria.map((x) => {
        const label = cleanText(x?.label, 'A criterion name', 60);
        const key = slug(typeof x?.key === 'string' && x.key.trim() ? x.key : label);
        if (!key) fail(`Give "${label}" a name with letters or numbers.`);
        const max = x?.max === undefined ? 10 : intIn(x.max, 1, 100, 'The top mark must be a whole number from 1 to 100.');
        return { key, label, max };
      });
      if (new Set(clean.map((x) => x.key)).size !== clean.length) fail('Each criterion needs a different name.');
      await change(c, ['scores'], (s) => { s.criteria[c] = clean; });
    },
    scores: (c, sessionNumber) => read(c, (s, me) => s.scores
      .filter((x) => x.committeeId === c && x.sessionNumber === sessionNumber && x.chairId === me.id)
      .sort((a, b) => seatRef(s, a.seatId).label.localeCompare(seatRef(s, b.seatId).label))
      .map((x): ScoreSheet => ({ seatId: x.seatId, sessionNumber: x.sessionNumber, chairId: x.chairId, marks: { ...x.marks }, comment: x.comment, updatedAt: x.updatedAt }))),
    async saveScore(c, input) {
      const sessionNumber = intIn(input?.sessionNumber, 1, 100, 'Choose a session.');
      const comment = optText(input.comment, 'The comment', 1000, true);
      if (!input.marks || typeof input.marks !== 'object') fail('Enter the marks.');
      await change(c, ['scores'], (s, me) => {
        seatInCommittee(s, c, input.seatId);
        const criteria = criteriaFor(s, c);
        const marks: Record<string, number> = {};
        for (const [k, v] of Object.entries(input.marks)) {
          if (v === null || v === undefined) continue;
          const crit = criteria.find((x) => x.key === k);
          if (!crit) fail('One of those criteria is no longer on the rubric.');
          marks[k] = intIn(v, 1, crit.max, `${crit.label}: give a mark from 1 to ${crit.max}.`);
        }
        s.scores = s.scores.filter((x) => !(x.committeeId === c && x.seatId === input.seatId && x.sessionNumber === sessionNumber && x.chairId === me.id));
        if (Object.keys(marks).length || comment) {
          s.scores.push({ committeeId: c, seatId: input.seatId, sessionNumber, chairId: me.id, marks, comment, updatedAt: nowIso() });
        }
      });
    },
    ranking: (c) => read(c, (s) => rankingFor(s, c)),
    nominations: (c) => read(c, (s) => s.nominations.filter((n) => n.committeeId === c)
      .sort((a, b) => awardRank(a.award) - awardRank(b.award) || seatRef(s, a.seatId).label.localeCompare(seatRef(s, b.seatId).label))
      .map((n): Nomination => ({ id: n.id, seat: seatRef(s, n.seatId), award: n.award, nominatedBy: profileName(s, n.nominatedBy), final: n.final }))),
    async nominate(c, seatId, award) {
      const a = cleanText(award, 'The award', 60);
      await change(c, ['scores'], (s, me) => {
        seatInCommittee(s, c, seatId);
        if (s.nominations.some((n) => n.committeeId === c && n.seatId === seatId && n.award.toLowerCase() === a.toLowerCase())) fail('That seat is already nominated for this award.');
        s.nominations.push({ id: uid('nom'), committeeId: c, seatId, award: a, nominatedBy: me.id, final: false });
      });
    },
    async removeNomination(id) {
      const c = owner((s) => s.nominations.find((n) => n.id === id), 'That nomination does not exist.');
      await change(c, ['scores'], (s) => {
        if (s.nominations.find((n) => n.id === id)!.final) fail('The secretariat has locked this award.');
        s.nominations = s.nominations.filter((n) => n.id !== id);
      });
    },

    subscribe(c, cb) { return subscribeFiltered(() => c, cb); },
  };
}

