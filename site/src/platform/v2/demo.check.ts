// Node check of the v2 demo adapters (no browser, no Vite). Run from site/:  npx jiti src/platform/v2/demo.check.ts
// Polyfills localStorage, sessionStorage and a window that fires `storage` events, then drives the three adapters.
/* eslint-disable no-console */
class MemoryStorage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  clear() { this.m.clear(); }
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  removeItem(k: string) { this.m.delete(k); }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
}
const g = globalThis as unknown as Record<string, unknown>;
g.localStorage = new MemoryStorage();
g.sessionStorage = new MemoryStorage();
g.window = new EventTarget();

let passed = 0;
let failed = 0;
function ok(cond: unknown, what: string) {
  if (cond) { passed += 1; console.log(`  ok   ${what}`); } else { failed += 1; console.log(`  FAIL ${what}`); }
}
async function throws(p: Promise<unknown>, match: RegExp, what: string) {
  try { await p; ok(false, `${what} (did not throw)`); } catch (e) { ok(match.test(String((e as Error).message)), `${what} → "${(e as Error).message}"`); }
}
const near = (a: number, b: number, tol = 2) => Math.abs(a - b) <= tol;

async function main() {
  const { createDemoDelegateApi } = await import('./demo-delegate');
  const { createDemoChairApi } = await import('./demo-chair');
  const { createDemoSecretariatApi } = await import('./demo-secretariat');
  const store = await import('./demo-store');
  const { UNSC_ID, seatId } = await import('./demo-seed');

  const d = createDemoDelegateApi();
  const ch = createDemoChairApi();
  const sec = createDemoSecretariatApi();
  const as = async (email: string) => { await d.verifyCode(email, '123456'); };
  const FR = seatId('France'); const KE = seatId('Kenya'); const BR = seatId('Brazil');

  console.log('Sign-in');
  await throws(d.verifyCode('a@b.co', '12345'), /6 to 10 digits/, 'short code rejected');
  await throws(d.verifyCode('a@b.co', '654321'), /isn't right/, 'wrong code rejected');
  await throws(d.me(), /sign in/, 'me() needs sign-in');
  await as('someone@school.test');
  ok((await d.me()).role === 'delegate', 'random email is a delegate');
  await as('head.chair@x.test'); ok((await d.me()).fullName === 'Sample Chair', 'chair email → Sample Chair');
  await as('vice.chair@demo.test'); ok((await d.me()).fullName === 'Sample Vice Chair', 'vice chair email');
  await as('sec.gen@x.test'); const m = await d.me(); ok(m.role === 'admin' && m.isCore, '"sec" email → core secretariat');

  console.log('Scenario: default seated, then live');
  ok(store.currentDemoScenario() === 'seated', 'store seeds as seated');
  await as('me@x.test');
  ok((await d.seat())?.seat.label === 'France', 'seated: France');
  ok((await d.phase()) === 'before', 'seated: phase before');
  ok((await d.live())?.timer.running === false, 'seated: timer stopped');
  store.ensureScenario('live');
  ok((await d.phase()) === 'live', 'live: phase live');
  const live = (await d.live())!;
  ok(live.session?.number === 2 && live.session.status === 'live', 'live: session 2 running');
  ok(live.timer.running && !!live.timer.endsAt, 'live: timer running with endsAt');
  ok(live.room === null, 'room is null (to be announced)');
  ok((await d.schedule()).every((x) => x.startsAt === null && x.location === null), 'schedule times and places all null');
  ok((await d.deadlines()).every((x) => x.dueAt === null), 'deadlines all null');

  console.log('Cross-tab sync (storage event)');
  const heard: string[] = [];
  const un = d.subscribe((t) => heard.push(t));
  const raw = (g.localStorage as MemoryStorage).getItem(store.STORE_KEY)!;
  const other = JSON.parse(raw); other.rev += 1; other.change = { topics: ['live'], committeeId: UNSC_ID };
  const ev = Object.assign(new Event('storage'), { key: store.STORE_KEY, newValue: JSON.stringify(other) });
  (g.window as EventTarget).dispatchEvent(ev);
  ok(heard.includes('live'), 'storage event → subscriber hears "live"');

  console.log('Roll call and votes');
  let roll = await d.rollCall();
  ok(roll.open && roll.rows.length === 1 && roll.rows[0].status === null, 'delegate sees only own row, unanswered');
  await d.answerRoll('present_voting');
  const vote = (await d.votes())[0];
  ok(vote.status === 'open' && vote.counts === null, 'delegate: open vote has no counts');
  await throws(d.castVote(vote.id, 'abstain'), /can't abstain/, 'present_voting cannot abstain');
  await d.castVote(vote.id, 'yes');
  ok((await d.votes())[0].myVote === 'yes', 'myVote recorded');
  ok(heard.includes('votes') && heard.includes('roll'), 'same-tab writes notify topics');
  await as('chair@demo.test');
  const daisVote = (await ch.votes(UNSC_ID))[0];
  ok(daisVote.counts?.yes === 5 && daisVote.counts.no === 1 && daisVote.counts.abstain === 1, 'dais sees live counts');
  await throws(ch.openVote(UNSC_ID, { target: 'motion', title: 'Another', majority: 'simple' }), /Close the open vote/, 'one open vote per committee');
  await ch.closeVote(daisVote.id);
  await ch.closeRoll(UNSC_ID);
  roll = await ch.rollCall(UNSC_ID);
  ok(roll.rows.find((r) => r.seat.label === 'Ghana')?.status === 'absent', 'closing roll marks unanswered seats absent');
  ok(roll.rows.find((r) => r.seat.id === FR)?.status === 'present_voting', 'answered seat kept');
  await as('me@x.test');
  const closed = (await d.votes()).find((v) => v.id === daisVote.id)!;
  ok(closed.counts?.yes === 5 && closed.counts.notVoted === 8 && closed.passed === true, 'delegate sees counts and result after close');
  await throws(d.answerRoll('present'), /isn't open/, 'answerRoll only while open');

  console.log('Timer maths');
  await as('chair@demo.test');
  await throws(ch.setTimer(UNSC_ID, { kind: 'speech', label: null, durationSeconds: 3 }), /5 seconds/, 'timer below 5 s rejected');
  await ch.setTimer(UNSC_ID, { kind: 'caucus', label: 'Mod caucus', durationSeconds: 90 });
  let t = (await ch.live(UNSC_ID)).timer;
  ok(!t.running && t.remainingSeconds === 90 && t.endsAt === null, 'setTimer stops and loads 90 s');
  await ch.startTimer(UNSC_ID);
  await ch.addTime(UNSC_ID, 30);
  t = (await ch.live(UNSC_ID)).timer;
  ok(t.running && near((Date.parse(t.endsAt!) - Date.now()) / 1000, 120), 'addTime while running moves endsAt (+30 → ~120 s)');
  await ch.pauseTimer(UNSC_ID);
  t = (await ch.live(UNSC_ID)).timer;
  ok(!t.running && t.endsAt === null && near(t.remainingSeconds, 120), 'pause keeps remaining');
  await ch.addTime(UNSC_ID, -500);
  ok((await ch.live(UNSC_ID)).timer.remainingSeconds === 0, 'negative addTime floors at 0');
  await throws(ch.startTimer(UNSC_ID), /zero/, 'cannot start at zero');
  await ch.resetTimer(UNSC_ID);
  ok((await ch.live(UNSC_ID)).timer.remainingSeconds === 90, 'reset → duration');

  console.log('Speakers');
  await ch.nextSpeaker(UNSC_ID, 45);
  let sp = await ch.speakers(UNSC_ID);
  ok(sp.find((x) => x.seat.id === KE)?.status === 'done' && sp.find((x) => x.seat.id === BR)?.status === 'speaking', 'nextSpeaker: Kenya done, Brazil speaking');
  t = (await ch.live(UNSC_ID)).timer;
  ok(t.running && t.kind === 'speech' && t.durationSeconds === 45 && t.speaker?.id === BR, 'nextSpeaker loads and starts the speech timer');
  const japan = sp.find((x) => x.seat.label === 'Japan')!;
  await ch.moveSpeaker(japan.id, 1);
  sp = await ch.speakers(UNSC_ID);
  ok(sp.filter((x) => x.status === 'waiting')[0].seat.label === 'Japan', 'moveSpeaker to the front of the waiting list');
  await as('me@x.test');
  await throws(d.joinSpeakers(), /already/, 'cannot join twice');
  await d.leaveSpeakers();
  ok(!(await d.speakers()).some((x) => x.isMe), 'leaveSpeakers');

  console.log('Chits and notes');
  await d.sendChit(KE, 'Sample chit to Kenya');
  await throws(d.sendChit(FR, 'x'), /yourself/, 'no chit to self');
  await throws(d.sendChit(KE, 'x'.repeat(301)), /300/, 'chit max 300 chars');
  await as('chair@demo.test');
  const mine = (await ch.chits(UNSC_ID)).find((x) => x.body === 'Sample chit to Kenya')!;
  ok(mine.direction === 'other' && mine.status === 'delivered', 'dais sees every chit (delivered by default)');
  await ch.setChitStatus(mine.id, 'blocked');
  await as('delegate12@demo.test');
  ok((await d.seat())?.seat.label === 'Kenya', 'delegate12 is Kenya');
  ok(!(await d.chits()).some((x) => x.id === mine.id), 'blocked chit hidden from recipient');
  await as('me@x.test');
  ok((await d.chits()).find((x) => x.id === mine.id)?.status === 'blocked', 'sender sees it blocked');
  const noteId = await d.saveNote({ body: 'Private POI', tag: 'poi' });
  await as('delegate2@demo.test');
  ok(!(await d.myNotes()).some((n) => n.id === noteId), 'private note invisible to others');
  await as('me@x.test');
  await d.setNoteDone(noteId, true);
  const notes = await d.myNotes();
  ok(notes.find((n) => n.id === noteId)?.done === true && notes[notes.length - 1].done, 'done notes sort last');

  console.log('Files');
  await d.addFile({ title: 'Bloc link', kind: 'research', link: 'https://example.org/doc', shareWithSeatIds: [KE] });
  await throws(d.addFile({ title: 'x', kind: 'other' }), /^Add a file or a link\.$/, 'file or link required');
  const myFile = (await d.files()).find((f) => f.title === 'Bloc link')!;
  ok(myFile.scope === 'mine' && myFile.canRemove && myFile.sharedWith[0]?.id === KE, 'own file shared with Kenya');
  await as('delegate12@demo.test');
  const shared = (await d.files()).find((f) => f.id === myFile.id);
  ok(shared?.scope === 'shared_with_me' && !shared.canRemove, 'Kenya sees it as shared_with_me');
  await throws(d.removeFile(myFile.id), /own files/, 'Kenya cannot remove it');
  const guide = (await d.files()).find((f) => f.kind === 'guide')!;
  ok(/^blob:|^data:/.test(await d.openFile(guide.id)), 'sample file opens as a placeholder URL');

  console.log('Position paper');
  await as('me@x.test');
  await throws(d.uploadPositionPaper(new File(['x'], 'paper.txt', { type: 'text/plain' })), /PDF or a Word/, 'wrong type rejected');
  await throws(d.uploadPositionPaper(new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'big.pdf', { type: 'application/pdf' })), /10 MB/, '>10 MB rejected');
  await d.uploadPositionPaper(new File(['%PDF-1.4 sample'], 'France.pdf', { type: 'application/pdf' }));
  ok((await d.positionPaper()).status === 'submitted', 'paper submitted');
  await as('chair@demo.test');
  await ch.markPaperSeen(UNSC_ID, FR);
  await as('me@x.test');
  ok((await d.positionPaper()).status === 'seen', 'chair marked it seen');

  console.log('Resolutions');
  await d.saveResolution({ id: 'res-3', kind: 'working_paper', title: 'Sample working paper B (France)', sponsorSeatIds: [KE], signatorySeatIds: [KE, BR], submit: true });
  let r3 = (await d.resolutions()).find((r) => r.id === 'res-3')!;
  ok(r3.status === 'submitted' && r3.sponsors.map((x) => x.id).join() === [FR, KE].join() && r3.signatories.length === 1, 'submit: author first sponsor, no double listing');
  await throws(d.saveResolution({ id: 'res-3', kind: 'working_paper', title: 'x', sponsorSeatIds: [], signatorySeatIds: [], submit: false }), /with the chair/, 'cannot edit once submitted');
  await as('chair@demo.test');
  ok((await ch.resolutions(UNSC_ID)).some((r) => r.id === 'res-3'), 'chair inbox has it');
  await ch.returnResolution('res-3', 'Sample: add a funding clause.');
  await as('me@x.test');
  r3 = (await d.resolutions()).find((r) => r.id === 'res-3')!;
  ok(r3.status === 'returned' && r3.returnComment === 'Sample: add a funding clause.', 'returned with comment');
  await d.saveResolution({ id: 'res-3', kind: 'working_paper', title: 'Sample working paper B (France)', sponsorSeatIds: [], signatorySeatIds: [], submit: true });
  await as('chair@demo.test');
  await throws(ch.approveResolution('res-3', 'DR 1.1'), /already used/, 'duplicate number rejected');
  await ch.approveResolution('res-3', 'DR 1.2');
  r3 = (await ch.resolutions(UNSC_ID)).find((r) => r.id === 'res-3')!;
  ok(r3.status === 'approved' && r3.number === 'DR 1.2' && r3.kind === 'draft_resolution', 'approved → DR 1.2, now a draft resolution');
  const vId = await ch.openVote(UNSC_ID, { target: 'resolution', targetId: 'res-3', title: 'DR 1.2', majority: 'two_thirds' });
  await ch.recordCount(vId, { yes: 8, no: 4, abstain: 3 });
  await ch.closeVote(vId);
  ok((await ch.resolutions(UNSC_ID)).find((r) => r.id === 'res-3')?.status === 'passed', 'two-thirds of yes+no (8 of 12) passes; resolution passed');

  console.log('Awards ranking');
  const rank = await ch.ranking(UNSC_ID);
  ok(rank[0].seat.id === KE && rank[0].total === 45, `Kenya first with 45 (got ${rank[0].seat.label} ${rank[0].total})`);
  ok(rank[1].seat.label === 'France' && rank[1].total === 43 && rank[1].byChair.length === 2, 'France 43, two chairs combined');
  ok(rank[1].byCriterion.speeches === 7.5, 'byCriterion is the average mark');
  await ch.saveScore(UNSC_ID, { seatId: FR, sessionNumber: 2, marks: { speeches: 10 }, comment: null });
  ok((await ch.ranking(UNSC_ID)).find((x) => x.seat.id === FR)?.byCriterion.speeches === 8.75, 'session averages: (7.5 + 10) / 2 = 8.75');
  await throws(ch.saveScore(UNSC_ID, { seatId: FR, sessionNumber: 2, marks: { speeches: 11 }, comment: null }), /1 to 10/, 'mark above max rejected');

  console.log('Secretariat');
  await as('admin@demo.test');
  const apps = await sec.applicants();
  const applicant = apps.find((a) => a.status === 'applied')!;
  await sec.addSeats(UNSC_ID, ['Germany', 'germany', 'France'], 1).then((r) => ok(r.added === 1 && r.skipped.length === 2, 'addSeats skips duplicates'));
  const germany = (await sec.seats(UNSC_ID)).find((x) => x.label === 'Germany')!;
  await sec.assignSeat(applicant.registrationId, germany.id);
  ok((await sec.applicants()).find((a) => a.registrationId === applicant.registrationId)?.status === 'allocated', 'assignSeat allocates');
  await throws(sec.removeSeat(germany.id), /Move the delegates/, 'cannot remove a filled seat');
  const c1 = await sec.checkin('demo-0001', 3);
  const c2 = await sec.checkin('DEMO-0001', 3);
  ok(c1.first && !c2.first && c1.seat?.label === 'France', 'check-in: first, then repeat');
  const ov = (await sec.overview()).find((o) => o.committee.abbr === 'UNSC')!;
  ok(ov.present === 12 && ov.resolutionsPassed === 1 && ov.openVote === null, `overview: 12 present, 1 passed (got ${ov.present}, ${ov.resolutionsPassed})`);
  await throws(sec.setRole('p-admin', 'delegate'), /own role/, 'cannot change own role');

  console.log('Scenario switching');
  await as('chair@demo.test');
  await ch.setAgenda(UNSC_ID, { agendaItem: 'Kept agenda', currentMotion: null });
  store.ensureScenario('live');
  ok((await ch.live(UNSC_ID)).agendaItem === 'Kept agenda', 'same scenario keeps chair work');
  store.ensureScenario('after');
  ok((await ch.live(UNSC_ID)).agendaItem === null, 'new scenario re-seeds');
  await as('me@x.test');
  await throws(d.saveNote({ body: 'x', tag: 'general' }), /read-only/, 'after: delegate writes blocked');
  ok((await d.myNotes()).length === 3, 'after: notes still readable');
  store.ensureScenario('new');
  ok((await d.registration()) === null && (await d.seat()) === null, 'new: not signed up');
  await d.signUp({ fullName: 'Test Person', schoolName: 'Sample School A', grade: '11', committeeIds: [UNSC_ID] });
  ok((await d.registration())?.status === 'applied', 'signUp → applied');
  ok((await d.me()).fullName === 'Test Person', 'signUp sets the name');
  store.ensureScenario('applied');
  ok((await d.registration())?.status === 'applied' && (await d.seat()) === null && (await d.live()) === null, 'applied: waiting for a seat');

  un();
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
