// Live DelegateApi (Supabase). Contract: ./contract.ts. Schema: 0001_init.sql + 0004_conference_day.sql.
// Privileged writes are RPCs: sign_up, answer_roll, join_speakers, leave_speakers, cast_ballot, save_document,
// send_chit, add_library_file, share_library_file, remove_library_file. Private notes (my_notes) are direct
// writes limited by RLS and column grants. Position papers: storage upload + the position_papers row (column grants).
import type { DelegateApi, MyNote, NoteTag, Registration, Topic } from './contract';
import {
  CONFERENCE_WATCHES, addLibraryFile, checkPaperFile, cleanText, committeeCache, committeeWatches, fail, friendly, getClient,
  loadChits, loadDeadlines, loadFiles, loadLive, loadPhase, loadResolutions, loadSchedule, loadSpeakers, loadVotes,
  makeAuth, newId, openLibraryFile, paperDueAt, q, removeLibraryFile, requireUid, seatRows, sessionRows, currentSession,
  toAnnouncement, toCommitteeRef, toPaper, uniqIds, watchTables, ANN_COLS, type AnnRow, type Watch,
} from './supabase-core';

type RegRow = { id: string; status: 'applied' | 'approved' | 'allocated' | 'confirmed' | 'withdrawn' | 'rejected'; created_at: string };
type SeatInfo = {
  committee_id: string; committee_abbr: string; committee_name: string; room: string | null;
  seat_id: string; seat_label: string; partner: string | null; checkin_code: string | null;
};
type Ctx = { uid: string; reg: RegRow | null; seat: SeatInfo | null };

const TAGS: NoteTag[] = ['poi', 'doubt', 'speech', 'general'];
const regStatus = (s: RegRow['status']): Registration['status'] =>
  s === 'approved' ? 'applied' : s === 'confirmed' ? 'allocated' : s;

export function createSupabaseDelegateApi(url: string, anonKey: string): DelegateApi {
  const sb = getClient(url, anonKey);
  const committees = committeeCache(sb);

  // Who am I and where do I sit: cached for 4 s, cleared on sign-in / sign-out and seat changes.
  let ctxCache: { at: number; p: Promise<Ctx> } | null = null;
  const invalidate = () => { ctxCache = null; };
  function ctx(): Promise<Ctx> {
    if (ctxCache && Date.now() - ctxCache.at < 4000) return ctxCache.p;
    const p = (async (): Promise<Ctx> => {
      const uid = await requireUid(sb);
      const reg = await q<RegRow | null>(sb.from('registrations').select('id, status, created_at').eq('profile_id', uid).maybeSingle());
      const seat = reg ? (await q<SeatInfo[]>(sb.rpc('my_seat_info')))?.[0] ?? null : null;
      return { uid, reg, seat };
    })();
    ctxCache = { at: Date.now(), p };
    p.catch(() => { if (ctxCache?.p === p) ctxCache = null; });
    return p;
  }
  const needSeat = async () => {
    const c = await ctx();
    if (!c.seat) fail('This opens once you have a seat.');
    return { ...c, seat: c.seat };
  };

  const api: DelegateApi = {
    ...makeAuth(sb, () => { invalidate(); committees.clear(); }),

    phase: () => loadPhase(sb),
    async committees() {
      return (await committees.rows()).map(toCommitteeRef);
    },

    // ── Sign-up ──
    async registration() {
      const c = await ctx();
      if (!c.reg) return null;
      const [p, prefs, rows] = await Promise.all([
        q<{ full_name: string | null; school_name: string | null; grade: string | null }>(sb.from('profiles').select('full_name, school_name, grade').eq('id', c.uid).single()),
        q<{ rank: number; committee_id: string }[]>(sb.from('preferences').select('rank, committee_id').eq('registration_id', c.reg.id).order('rank')),
        committees.rows(),
      ]);
      return {
        status: regStatus(c.reg.status), fullName: p.full_name ?? '', schoolName: p.school_name ?? '', grade: p.grade ?? '',
        choices: prefs.map((x) => rows.find((r) => r.id === x.committee_id)).filter((r): r is NonNullable<typeof r> => !!r).map(toCommitteeRef),
        createdAt: c.reg.created_at,
      };
    },
    async signUp(input) {
      if (!input || typeof input !== 'object') fail('Fill in the form first.');
      const fullName = cleanText(input.fullName, 'Your full name', 120).replace(/\s+/g, ' ');
      const schoolName = cleanText(input.schoolName, 'Your school', 160);
      const grade = cleanText(input.grade, 'Your grade', 20);
      const ids = Array.isArray(input.committeeIds) ? input.committeeIds.filter((x) => typeof x === 'string' && x) : [];
      if (ids.length < 1 || ids.length > 3) fail('Choose up to three committees.');
      if (new Set(ids).size !== ids.length) fail('Pick a different committee for each choice.');
      await q(sb.rpc('sign_up', { p_full_name: fullName, p_school_name: schoolName, p_grade: grade, p_committees: ids }));
      invalidate();
    },
    async seat() {
      const c = await ctx();
      if (!c.seat) return null;
      const s = c.seat;
      const chairs = await q<{ committee_id: string; full_name: string | null; role: 'chair' | 'vice_chair' | 'rapporteur' }[]>(sb.rpc('my_committee_chairs'));
      const order = { chair: 0, vice_chair: 1, rapporteur: 2 } as const;
      return {
        committee: { id: s.committee_id, abbr: s.committee_abbr, name: s.committee_name },
        seat: { id: s.seat_id, label: s.seat_label }, room: s.room, partner: s.partner,
        chairs: chairs.filter((x) => x.committee_id === s.committee_id).sort((a, b) => order[a.role] - order[b.role])
          .map((x) => ({ fullName: x.full_name, role: x.role })),
        checkinCode: s.checkin_code ?? '',
      };
    },

    // ── Room ──
    async live() {
      const c = await ctx();
      if (!c.seat) return null;
      return loadLive(sb, await committees.byId(c.seat.committee_id));
    },
    schedule: () => loadSchedule(sb),
    deadlines: () => loadDeadlines(sb),
    async announcements() {
      const rows = await q<AnnRow[]>(sb.from('announcements').select(ANN_COLS).not('published_at', 'is', null)
        .lte('published_at', new Date().toISOString()).order('published_at', { ascending: false }).limit(100));
      return rows.map(toAnnouncement);
    },
    async committeeSeats() {
      const c = await ctx();
      if (!c.seat) return [];
      return (await seatRows(sb, c.seat.committee_id)).filter((s) => s.id !== c.seat!.seat_id).map((s) => ({ id: s.id, label: s.label }));
    },
    async rollCall() {
      const c = await ctx();
      if (!c.seat) return { open: false, sessionNumber: null, rows: [] };
      const s = currentSession(await sessionRows(sb, c.seat.committee_id));
      const mine = s
        ? await q<{ status: 'present' | 'present_voting' | 'absent' } | null>(sb.from('roll_calls').select('status').eq('session_id', s.id).eq('seat_id', c.seat.seat_id).maybeSingle())
        : null;
      return {
        open: !!s && s.status === 'live' && s.roll_open, sessionNumber: s?.number ?? null,
        rows: [{ seat: { id: c.seat.seat_id, label: c.seat.seat_label }, status: mine?.status ?? null }],
      };
    },
    async answerRoll(status) {
      await needSeat();
      if (status !== 'present' && status !== 'present_voting') fail('Answer present, or present and voting.');
      await q(sb.rpc('answer_roll', { p_status: status }));
    },
    async speakers() {
      const c = await ctx();
      if (!c.seat) return [];
      return loadSpeakers(sb, c.seat.committee_id, c.seat.seat_id);
    },
    async joinSpeakers() {
      await needSeat();
      await q(sb.rpc('join_speakers'));
    },
    async leaveSpeakers() {
      await needSeat();
      await q(sb.rpc('leave_speakers'));
    },
    async votes() {
      const c = await ctx();
      if (!c.seat) return [];
      return loadVotes(sb, c.seat.committee_id, false);
    },
    async castVote(voteId, choice) {
      await needSeat();
      if (choice !== 'yes' && choice !== 'no' && choice !== 'abstain') fail('Choose yes, no or abstain.');
      await q(sb.rpc('cast_ballot', { p_vote: voteId, p_choice: choice }), 'Your seat has already voted.');
    },

    // ── Papers and resolutions ──
    async positionPaper() {
      const c = await ctx();
      const due = await paperDueAt(sb);
      if (!c.reg) return toPaper(null, due);
      const r = await q<{ file_path: string; original_name: string | null; submitted_at: string; seen_at: string | null } | null>(
        sb.from('position_papers').select('file_path, original_name, submitted_at, seen_at').eq('registration_id', c.reg.id).maybeSingle());
      return toPaper(r, due);
    },
    async uploadPositionPaper(file) {
      const kind = await checkPaperFile(file, 10);
      const c = await needSeat();
      if (!c.reg) fail('Sign up first.');
      const path = `${c.reg.id}/paper.${kind.ext}`;
      const { error } = await sb.storage.from('position-papers').upload(path, file, { upsert: true, contentType: kind.type, cacheControl: '0' });
      if (error) friendly({ message: error.message });
      const original_name = file.name.slice(0, 200);
      // Column grants: insert (registration_id, file_path, original_name), update (file_path, original_name).
      // The server stamps submitted_at and clears "seen" (trigger).
      const existing = await q<{ file_path: string } | null>(sb.from('position_papers').select('file_path').eq('registration_id', c.reg.id).maybeSingle());
      if (existing) await q(sb.from('position_papers').update({ file_path: path, original_name }).eq('registration_id', c.reg.id));
      else await q(sb.from('position_papers').insert({ registration_id: c.reg.id, file_path: path, original_name }));
    },
    async resolutions() {
      const c = await ctx();
      if (!c.seat) return [];
      return loadResolutions(sb, c.seat.committee_id, c.uid, 'updated');
    },
    async saveResolution(input) {
      if (!input || typeof input !== 'object') fail('Fill in the paper first.');
      const c = await needSeat();
      const title = cleanText(input.title, 'The title', 200);
      if (!['working_paper', 'draft_resolution', 'amendment'].includes(input.kind)) fail('Choose working paper, draft resolution or amendment.');
      if (input.kind === 'amendment' && !input.parentId) fail('Choose the draft resolution this amendment changes.');
      if (input.kind !== 'amendment' && input.parentId) fail('Only amendments point at a draft resolution.');
      const body = typeof input.body === 'string' ? input.body : '';
      if (body.length > 60000) fail('The text is too long. Keep it under 60000 characters.');
      const mine = c.seat.seat_id;
      const sponsors = uniqIds(input.sponsorSeatIds).filter((id) => id !== mine);
      const signatories = uniqIds(input.signatorySeatIds).filter((id) => id !== mine && !sponsors.includes(id));
      let path: string | null = null;
      if (input.file) {
        const kind = await checkPaperFile(input.file, 10);
        path = `${c.seat.committee_id}/${newId()}.${kind.ext}`;
        const { error } = await sb.storage.from('documents').upload(path, input.file, { contentType: kind.type, upsert: false });
        if (error) friendly({ message: error.message });
      }
      const id = await q<string>(sb.rpc('save_document', {
        p_id: input.id ?? null, p_type: input.kind, p_title: title, p_body: body || null,
        p_parent: input.kind === 'amendment' ? input.parentId ?? null : null,
        p_clause: input.kind === 'amendment' ? input.clause ?? null : null,
        p_sponsors: sponsors, p_signatories: signatories,
        p_file_path: path, p_original_name: input.file ? input.file.name.slice(0, 200) : null, p_submit: !!input.submit,
      }));
      if (!id) fail('Something went wrong. Please try again.');
      return id;
    },

    // ── Notes ──
    async chits() {
      const c = await ctx();
      if (!c.seat) return [];
      return loadChits(sb, c.seat.committee_id, { seatId: c.seat.seat_id });
    },
    async sendChit(toSeatId, body, replyTo) {
      const c = await needSeat();
      const text = typeof body === 'string' ? body.trim() : '';
      if (!text) fail('Write something before sending.');
      if (text.length > 300) fail('Chits can be up to 300 characters.');
      if (toSeatId === c.seat.seat_id) fail('Choose who the chit is for.');
      await q(sb.rpc('send_chit', { p_to: toSeatId, p_body: text, p_reply_to: replyTo ?? null }));
    },
    async myNotes() {
      const uid = await requireUid(sb);
      const rows = await q<{ id: string; body: string; tag: NoteTag; done: boolean; created_at: string; updated_at: string }[]>(
        sb.from('my_notes').select('id, body, tag, done, created_at, updated_at').eq('owner_id', uid)
          .order('done').order('updated_at', { ascending: false }).limit(1000));
      return rows.map((r): MyNote => ({ id: r.id, body: r.body, tag: r.tag, done: r.done, createdAt: r.created_at, updatedAt: r.updated_at }));
    },
    async saveNote(input) {
      await requireUid(sb);
      const body = cleanText(input?.body, 'The note', 2000);
      const tag = TAGS.includes(input.tag) ? input.tag : fail('Choose a tag.');
      if (input.id) {
        const rows = await q<{ id: string }[]>(sb.from('my_notes').update({ body, tag }).eq('id', input.id).select('id'));
        if (!rows.length) fail('That note no longer exists.');
        return input.id;
      }
      const row = await q<{ id: string }>(sb.from('my_notes').insert({ body, tag }).select('id').single());
      return row.id;
    },
    async setNoteDone(id, done) {
      const rows = await q<{ id: string }[]>(sb.from('my_notes').update({ done: !!done }).eq('id', id).select('id'));
      if (!rows.length) fail('That note no longer exists.');
    },
    async deleteNote(id) {
      await q(sb.from('my_notes').delete().eq('id', id));
    },

    // ── Files ──
    async files() {
      const c = await ctx();
      return loadFiles(sb, c.uid, {
        where: (r) => r.scope !== 'committee' || (!!c.seat && r.committee_id === c.seat.committee_id),
        canRemove: (r) => r.scope === 'mine' && r.owner_id === c.uid,
      });
    },
    async addFile(input) {
      const uid = await requireUid(sb);
      await addLibraryFile(sb, input, { scope: 'mine', committeeId: null, folder: `mine/${uid}/` });
    },
    async shareFile(id, seatIds) {
      await q(sb.rpc('share_library_file', { p_file: id, p_seats: uniqIds(seatIds) }));
    },
    removeFile: (id) => removeLibraryFile(sb, id),
    openFile: (id) => openLibraryFile(sb, id),

    subscribe(cb) {
      let stopped = false;
      let stopRoom: (() => void) | null = null;
      let roomFor: string | null = null;
      // Rebuild the committee channels when my seat changes (allocated, moved or removed).
      const syncRoom = async () => {
        invalidate();
        const c = await ctx().catch(() => null);
        if (stopped) return;
        const cid = c?.seat?.committee_id ?? null;
        if (cid === roomFor) return;
        stopRoom?.();
        stopRoom = null;
        roomFor = cid;
        if (cid && c?.seat) {
          const watches: Watch[] = committeeWatches(cid, { scores: false })
            .map((w) => (w.table === 'roll_calls' ? { ...w, filter: `seat_id=eq.${c.seat!.seat_id}` } : w));
          stopRoom = watchTables(sb, 'delegate-room', watches, cb);
        }
      };
      const fire = (t: Topic) => { if (!stopped) cb(t); };
      const stopBase = watchTables(sb, 'delegate', [
        ...CONFERENCE_WATCHES,
        { table: 'registrations', topics: ['seat'], also: () => { void syncRoom(); } },
        { table: 'assignments', topics: ['seat', 'live'], also: () => { void syncRoom(); } },
        { table: 'position_papers', topics: ['papers'] },
        { table: 'checkins', topics: ['seat'] },
      ], fire);
      void syncRoom();
      return () => { stopped = true; stopBase(); stopRoom?.(); };
    },
  };

  return api;
}
