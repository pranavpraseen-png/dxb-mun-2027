// Live ChairApi (the dais, Supabase). Contract: ./contract.ts. Schema: 0001_init.sql + 0004_conference_day.sql.
// Every write is a chair_* RPC that checks the caller chairs that committee (admins: every committee),
// except nominations, which are direct writes limited by the awards policies (own nominations, not final).
import {
  DEFAULT_AWARDS,
  type ChairApi, type ChairCommittee, type ChairRole, type Criterion, type DaisSeat, type Nomination, type PaperRow,
  type RollStatus, type ScoreSheet,
} from './contract';
import {
  CONFERENCE_WATCHES, addLibraryFile, cleanText, committeeCache, committeeWatches, fail, getClient, labeller, loadChits,
  loadCriteria, loadFiles, loadLive, loadMe, loadPhase, loadRanking, loadResolutions, loadSpeakers, loadVotes, makeAuth,
  openLibraryFile, paperDueAt, q, removeLibraryFile, requireUid, seatRows, sessionRows, currentSession, signedUrl, toAnnouncement,
  toPaper, watchTables, ANN_COLS, type AnnRow,
} from './supabase-core';

type DaisRow = { seat_id: string; seat_label: string; capacity: number; delegates: string[]; checked_in: boolean };
type PaperRpcRow = {
  seat_id: string; seat_label: string; delegates: string[]; registration_id: string | null; file_path: string | null;
  original_name: string | null; submitted_at: string | null; seen_at: string | null;
};
const KINDS = ['speech', 'caucus', 'session', 'other'] as const;
const awardRank = (a: string) => { const i = (DEFAULT_AWARDS as readonly string[]).indexOf(a); return i < 0 ? DEFAULT_AWARDS.length : i; };
const intIn = (v: unknown, lo: number, hi: number, msg: string): number => {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < lo || v > hi) fail(msg);
  return v;
};

export function createSupabaseChairApi(url: string, anonKey: string): ChairApi {
  const sb = getClient(url, anonKey);
  const committees = committeeCache(sb);
  const rpc = (fn: string, args: Record<string, unknown>, duplicate?: string) => q<unknown>(sb.rpc(fn, args), duplicate).then(() => undefined);

  const api: ChairApi = {
    ...makeAuth(sb, () => committees.clear()),
    phase: () => loadPhase(sb),
    async myCommittees() {
      const rows = await q<{ id: string; abbr: string; name: string; room: string | null; my_role: ChairRole }[]>(sb.rpc('my_dais_committees'));
      return rows.map((r): ChairCommittee => ({ id: r.id, abbr: r.abbr, name: r.name, myRole: r.my_role, room: r.room }));
    },

    // ── Run the session ──
    async live(c) {
      committees.clear();   // the room may have changed
      return loadLive(sb, await committees.byId(c));
    },
    startSession: (c) => rpc('chair_start_session', { p_committee: c }),
    endSession: (c) => rpc('chair_end_session', { p_committee: c }),
    setAgenda: (c, input) => rpc('chair_set_agenda', { p_committee: c, p_agenda: input?.agendaItem ?? null, p_motion: input?.currentMotion ?? null }),
    async setTimer(c, input) {
      if (!input || !KINDS.includes(input.kind)) fail('Choose a timer type.');
      const d = intIn(input.durationSeconds, 5, 10800, 'The timer can be from 5 seconds to 3 hours.');
      await rpc('chair_set_timer', { p_committee: c, p_kind: input.kind, p_label: input.label ?? null, p_duration: d, p_speaker: input.speakerSeatId ?? null });
    },
    startTimer: (c) => rpc('chair_timer', { p_committee: c, p_action: 'start', p_seconds: 0 }),
    pauseTimer: (c) => rpc('chair_timer', { p_committee: c, p_action: 'pause', p_seconds: 0 }),
    resetTimer: (c) => rpc('chair_timer', { p_committee: c, p_action: 'reset', p_seconds: 0 }),
    async addTime(c, seconds) {
      const s = intIn(seconds, -10800, 10800, 'You can add up to 3 hours at a time.');
      await rpc('chair_timer', { p_committee: c, p_action: 'add', p_seconds: s });
    },

    // ── People in the room ──
    async seats(c) {
      const rows = await q<DaisRow[]>(sb.rpc('dais_seats', { p_committee: c }));
      return rows.map((r): DaisSeat => ({ seat: { id: r.seat_id, label: r.seat_label }, delegates: r.delegates ?? [], checkedIn: !!r.checked_in }));
    },
    async rollCall(c) {
      const [sessions, seats] = await Promise.all([sessionRows(sb, c), seatRows(sb, c)]);
      const s = currentSession(sessions);
      const marks = s ? await q<{ seat_id: string; status: RollStatus }[]>(sb.from('roll_calls').select('seat_id, status').eq('session_id', s.id)) : [];
      const by = new Map(marks.map((m) => [m.seat_id, m.status]));
      return {
        open: !!s && s.status === 'live' && s.roll_open, sessionNumber: s?.number ?? null,
        rows: seats.map((x) => ({ seat: { id: x.id, label: x.label }, status: by.get(x.id) ?? null })),
      };
    },
    openRoll: (c) => rpc('chair_open_roll', { p_committee: c }),
    closeRoll: (c) => rpc('chair_close_roll', { p_committee: c }),
    async markRoll(c, seatId, status) {
      if (!['present', 'present_voting', 'absent'].includes(status)) fail('Choose present, present and voting, or absent.');
      await rpc('chair_mark_roll', { p_committee: c, p_seat: seatId, p_status: status });
    },
    speakers: (c) => loadSpeakers(sb, c, null),
    addSpeaker: (c, seatId) => rpc('chair_add_speaker', { p_committee: c, p_seat: seatId }),
    async moveSpeaker(id, toPosition) {
      await rpc('chair_move_speaker', { p_speaker: id, p_position: intIn(toPosition, 1, 10000, 'Choose a place in the list.') });
    },
    removeSpeaker: (id) => rpc('chair_remove_speaker', { p_speaker: id }),
    async nextSpeaker(c, speechSeconds) {
      await rpc('chair_next_speaker', { p_committee: c, p_seconds: intIn(speechSeconds, 5, 10800, 'The timer can be from 5 seconds to 3 hours.') });
    },

    // ── Votes ──
    votes: (c) => loadVotes(sb, c, true),
    async openVote(c, input) {
      if (!input || !['motion', 'resolution', 'amendment'].includes(input.target)) fail('Choose what the vote is on.');
      if (input.majority !== 'simple' && input.majority !== 'two_thirds') fail('Choose a simple or two-thirds majority.');
      const title = cleanText(input.title, 'The vote title', 200);
      const id = await q<string>(sb.rpc('chair_open_vote', {
        p_committee: c, p_target: input.target, p_target_id: input.targetId ?? null, p_title: title, p_majority: input.majority,
      }), 'Close the open vote first.');
      if (!id) fail('Something went wrong. Please try again.');
      return id;
    },
    closeVote: (voteId) => rpc('chair_close_vote', { p_vote: voteId }),
    async recordCount(voteId, counts) {
      const n = (v: unknown) => intIn(v, 0, 1000, 'Counts must be whole numbers from 0 to 1000.');
      await rpc('chair_record_count', { p_vote: voteId, p_yes: n(counts?.yes), p_no: n(counts?.no), p_abstain: n(counts?.abstain) });
    },

    // ── Papers and resolutions ──
    async papers(c) {
      const [rows, due] = await Promise.all([q<PaperRpcRow[]>(sb.rpc('committee_papers', { p_committee: c })), paperDueAt(sb)]);
      return rows.map((r): PaperRow => ({ seat: { id: r.seat_id, label: r.seat_label }, delegates: r.delegates ?? [], paper: toPaper(r, due) }));
    },
    async openPaper(c, seatId) {
      const rows = await q<PaperRpcRow[]>(sb.rpc('committee_papers', { p_committee: c }));
      const r = rows.find((x) => x.seat_id === seatId);
      if (!r?.file_path) fail('This seat has not sent a position paper yet.');
      return signedUrl(sb, 'position-papers', r.file_path);
    },
    markPaperSeen: (c, seatId) => rpc('chair_mark_paper_seen', { p_committee: c, p_seat: seatId }),
    async resolutions(c) {
      return loadResolutions(sb, c, await requireUid(sb), 'inbox');
    },
    approveResolution: (id, number) => rpc('chair_approve_document', { p_document: id, p_number: number }, 'That number is already used in this committee.'),
    returnResolution: (id, comment) => rpc('chair_return_document', { p_document: id, p_comment: comment }),

    // ── Chits ──
    chits: (c) => loadChits(sb, c, 'dais'),
    async setChitStatus(id, status) {
      if (status !== 'delivered' && status !== 'blocked') fail('Choose deliver or block.');
      await rpc('chair_set_chit_status', { p_note: id, p_status: status });
    },
    async sendChit(c, toSeatId, body, replyTo) {
      const text = typeof body === 'string' ? body.trim() : '';
      if (!text) fail('Write something before sending.');
      if (text.length > 300) fail('Chits can be up to 300 characters.');
      await rpc('chair_send_chit', { p_committee: c, p_to: toSeatId, p_body: text, p_reply_to: replyTo ?? null });
    },

    // ── Committee files and notices ──
    async files(c) {
      const [uid, me] = await Promise.all([requireUid(sb), loadMe(sb)]);
      return loadFiles(sb, uid, {
        where: (r) => r.scope === 'conference' || (r.scope === 'committee' && r.committee_id === c),
        canRemove: (r) => r.scope === 'committee' || (r.scope === 'conference' && me.isCore),
      });
    },
    addFile: (c, input) => addLibraryFile(sb, input, { scope: 'committee', committeeId: c, folder: `committee/${c}/` }),
    removeFile: (id) => removeLibraryFile(sb, id),
    openFile: (id) => openLibraryFile(sb, id),
    async announcements(c) {
      const rows = await q<AnnRow[]>(sb.from('announcements').select(`${ANN_COLS}, audience`)
        .or(`audience.eq.all,audience.eq.chairs,committee_id.eq.${c}`)
        .not('published_at', 'is', null).lte('published_at', new Date().toISOString())
        .order('published_at', { ascending: false }).limit(100));
      return rows.map(toAnnouncement);
    },
    async announce(c, input) {
      const title = cleanText(input?.title, 'The title', 140);
      const body = typeof input.body === 'string' ? input.body.trim() : '';
      if (body.length > 4000) fail('The text is too long. Keep it under 4000 characters.');
      await rpc('chair_announce', { p_committee: c, p_title: title, p_body: body || null, p_urgent: !!input.urgent });
    },

    // ── Awards rubric ──
    criteria: (c) => loadCriteria(sb, c),
    async setCriteria(c, criteria) {
      if (!Array.isArray(criteria) || criteria.length < 1 || criteria.length > 12) fail('Use between 1 and 12 criteria.');
      const clean = criteria.map((x: Criterion) => ({
        key: typeof x?.key === 'string' ? x.key.trim() : '', label: typeof x?.label === 'string' ? x.label.trim() : '', max: x?.max,
      }));
      await rpc('chair_set_criteria', { p_committee: c, p_criteria: clean });
    },
    async scores(c, sessionNumber) {
      const uid = await requireUid(sb);
      const s = (await sessionRows(sb, c)).find((x) => x.number === sessionNumber);
      if (!s) return [];
      const rows = await q<{ seat_id: string; criteria: Record<string, number>; comment: string | null; updated_at: string }[]>(
        sb.from('scores').select('seat_id, criteria, comment, updated_at').eq('session_id', s.id).eq('chair_id', uid));
      return rows.map((r): ScoreSheet => ({ seatId: r.seat_id, sessionNumber, chairId: uid, marks: r.criteria ?? {}, comment: r.comment, updatedAt: r.updated_at }));
    },
    async saveScore(c, input) {
      if (!input || typeof input !== 'object') fail('Add the marks.');
      const session = intIn(input.sessionNumber, 1, 50, 'Choose a session.');
      const marks: Record<string, number> = {};
      for (const [k, v] of Object.entries(input.marks ?? {})) if (v !== null && v !== undefined) marks[k] = v;
      const comment = typeof input.comment === 'string' ? input.comment.trim() : '';
      if (comment.length > 500) fail('Keep the comment under 500 characters.');
      await rpc('chair_save_score', { p_committee: c, p_seat: input.seatId, p_session: session, p_marks: marks, p_comment: comment || null });
    },
    ranking: (c) => loadRanking(sb, c),
    async nominations(c) {
      const [rows, seats, chairs] = await Promise.all([
        q<{ id: string; seat_id: string; award: string; nominated_by: string | null; final: boolean }[]>(
          sb.from('awards').select('id, seat_id, award, nominated_by, final').eq('committee_id', c)),
        seatRows(sb, c),
        q<{ profile_id: string; full_name: string | null }[]>(sb.rpc('committee_chairs', { p_committee: c })),
      ]);
      const seat = labeller(seats);
      const names = new Map(chairs.map((x) => [x.profile_id, x.full_name]));
      return rows.map((r): Nomination => ({
        id: r.id, seat: seat(r.seat_id), award: r.award, nominatedBy: r.nominated_by ? names.get(r.nominated_by) ?? null : null, final: r.final,
      })).sort((a, b) => awardRank(a.award) - awardRank(b.award) || a.seat.label.localeCompare(b.seat.label));
    },
    async nominate(c, seatId, award) {
      const uid = await requireUid(sb);
      const a = cleanText(award, 'The award', 80);
      await q(sb.from('awards').insert({ committee_id: c, seat_id: seatId, award: a, nominated_by: uid }), 'You have already nominated this seat for that award.');
    },
    async removeNomination(id) {
      const rows = await q<{ id: string }[]>(sb.from('awards').delete().eq('id', id).select('id'));
      if (!rows.length) fail("You can only remove your own nominations that aren't final yet.");
    },

    subscribe(c, cb) {
      return watchTables(sb, `chair-${c}`, [
        ...CONFERENCE_WATCHES,
        ...committeeWatches(c, { scores: true }),
        { table: 'assignments', topics: ['seat', 'papers'] },
        { table: 'checkins', topics: ['seat'] },
        { table: 'position_papers', topics: ['papers'] },
      ], cb);
    },
  };
  return api;
}
