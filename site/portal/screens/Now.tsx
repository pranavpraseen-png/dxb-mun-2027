// Now: the page to look at during committee.
//   before: my seat (nameplate, room, chairs, check-in QR), the deadlines and my position paper.
//   live:   roll call or an open vote first (the one main action), then the big timer, the agenda,
//           my place in the speakers' list, what's next on the schedule and the latest announcement.
//   after:  my seat, the last results and the announcements, read-only.
import type { ReactNode } from 'react';
import {
  CalendarClock, CalendarDays, CircleCheck, CircleX, FileText, Hand, Hourglass, Megaphone, Mic, QrCode, Timer as TimerIcon,
  UserRound, Vote as VoteIcon,
} from 'lucide-react';
import type { Announcement, DelegateApi, Deadline, RollCall, ScheduleItem, Speaker, Vote } from '@/platform/v2';
import { useAction, useLoad } from '../lib/data';
import { useConf } from '../lib/conf';
import { countdownText, useNow } from '../lib/clock';
import { dayTime, ordinal, timeOf, TBA } from '../lib/format';
import { href } from '../lib/route';
import { Empty, ErrorBox, Facts, Hint, PageHead, Panel, Plain, ScreenSkeleton } from '../ui/kit';
import { Button } from '../ui/coss/button';
import { Card } from '../ui/coss/card';
import { cn } from '../ui/coss/utils';
import { BigTimer } from '../ui/timer';
import { CheckinQr, SeatFacts, SeatPlate } from '../ui/seat';
import { PAPER, SPEAKER, Status, type StatusDef } from '../ui/status';
import { VOTE_WORD, VoteButtons } from '../ui/VoteButtons';
import { AnnouncementRow } from '../ui/announcements';

async function loadNow(a: DelegateApi, phase: string) {
  const [announcements, schedule, deadlines, paper] = await Promise.all([a.announcements(), a.schedule(), a.deadlines(), a.positionPaper()]);
  if (phase !== 'live' && phase !== 'after') return { announcements, schedule, deadlines, paper, room: null };
  const [live, roll, votes, speakers] = await Promise.all([a.live(), a.rollCall(), a.votes(), a.speakers()]);
  return { announcements, schedule, deadlines, paper, room: { live, roll, votes, speakers } };
}

export function NowScreen() {
  const { phase, seat } = useConf();
  const q = useLoad((a) => loadNow(a, phase), ['live', 'roll', 'votes', 'speakers', 'announcements', 'schedule', 'papers'], [phase]);
  if (!q.data) {
    return (
      <>
        <PageHead title="Now" />
        {q.error ? <ErrorBox error={q.error} onRetry={q.reload} what="Now" /> : <ScreenSkeleton panels={3} />}
      </>
    );
  }
  const { announcements, schedule, deadlines, paper, room } = q.data;
  const latest = announcements.find((a) => a.urgent) ?? announcements[0] ?? null;

  if (phase === 'live' && room) {
    const { live, roll, votes, speakers } = room;
    const myRoll = roll.rows[0]?.status ?? null;
    const open = votes.find((v) => v.status === 'open') ?? null;
    const lastClosed = votes.find((v) => v.status === 'closed') ?? null;
    const rollPending = roll.open && !myRoll;
    const s = live?.session;
    return (
      <>
        <PageHead
          title="Now"
          line={s ? `Session ${s.number} · ${s.status === 'live' ? 'In session' : s.status === 'closed' ? 'Closed' : 'Not started'}` : 'Session to be announced'}
        />
        {rollPending && <RollCard roll={roll} />}
        {!rollPending && open && <VoteCard vote={open} myRoll={myRoll} />}
        <div className="grid-2 grid-2--wide-left">
          <div className="col">
            <Panel title="Timer" icon={TimerIcon}>
              {live ? <BigTimer timer={live.timer} mySeatId={seat.seat.id} /> : <Empty>The timer appears when your committee starts.</Empty>}
            </Panel>
            <Panel title="On the floor" icon={Mic}>
              <Facts items={[
                ['Agenda', live?.agendaItem ?? TBA, live?.agendaItem ? 'font-semibold' : 'text-muted-foreground'],
                ['Motion', live?.currentMotion ?? 'None right now', live?.currentMotion ? undefined : 'text-muted-foreground'],
                ['Room', live?.room ?? seat.room ?? TBA],
              ]} />
            </Panel>
          </div>
          <div className="col">
            {rollPending && open && <VoteCard vote={open} myRoll={myRoll} compact />}
            {!rollPending && <RollStatus roll={roll} status={myRoll} />}
            <MySpeakerPlace speakers={speakers} />
            {!open && lastClosed && <ResultPanel vote={lastClosed} />}
            <NextUp schedule={schedule} committeeId={seat.committee.id} />
            <LatestAnnouncement a={latest} />
          </div>
        </div>
      </>
    );
  }

  // Before (and after): my seat first.
  const after = phase === 'after';
  const lastResults = room?.votes.filter((v) => v.status === 'closed').slice(0, 3) ?? [];
  return (
    <>
      <PageHead title="Now" line={after ? 'The conference has ended.' : 'Before the conference.'} />
      <div className="grid-2">
        <div className="col">
          <Panel title="My seat" icon={UserRound}>
            <SeatPlate seat={seat} />
            <SeatFacts seat={seat} />
          </Panel>
          <Panel title="Check-in QR" icon={QrCode}>
            <CheckinQr seat={seat} />
          </Panel>
        </div>
        <div className="col">
          {!after && <DeadlinesPanel deadlines={deadlines} />}
          <Panel title="Position paper" icon={FileText} aside={<Status s={PAPER[paper.status]} />}>
            {paper.fileName ? <Plain className="break-all font-semibold">{paper.fileName}</Plain> : <Plain muted>No file sent yet.</Plain>}
            <Button variant={!after && paper.status === 'not_sent' ? 'default' : 'outline'} size="lg" render={<a href={href('paper')} />}>
              <FileText aria-hidden="true" /> {!after && paper.status === 'not_sent' ? 'Upload my paper' : 'Open paper page'}
            </Button>
          </Panel>
          {after && lastResults.length > 0 && lastResults.map((v) => <ResultPanel key={v.id} vote={v} />)}
          <LatestAnnouncement a={latest} />
          {after && <Panel title="Schedule" icon={CalendarDays}><Button variant="outline" render={<a href={href('schedule')} />}>See the full schedule</Button></Panel>}
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ roll call */
function RollCard({ roll }: { roll: RollCall }) {
  const { run, pending } = useAction();
  const { readOnly } = useConf();
  return (
    <Card render={<section aria-labelledby="roll-title" />} className={TAKEOVER}>
      <p className="flex items-center gap-2 font-mono text-[14px] font-medium uppercase text-info tracking-[0.08em]">
        <Hand size={20} aria-hidden="true" /> Your turn
      </p>
      <h2 id="roll-title" className="font-heading font-wide text-[52px] font-extrabold leading-[1.05] max-md:text-[40px] tracking-[-0.02em]">
        Roll call{roll.sessionNumber ? `, session ${roll.sessionNumber}` : ''}
      </h2>
      <div className="mt-1 grid w-full grid-cols-2 gap-3 max-md:grid-cols-1 max-md:gap-2.5">
        <Button size="xl" variant="outline" className="h-20 text-[30px]" loading={pending} disabled={readOnly}
          onClick={() => void run((a) => a.answerRoll('present'), 'Marked present')}>
          <CircleCheck aria-hidden="true" /> Present
        </Button>
        <Button size="xl" className="h-20 text-[30px]" loading={pending} disabled={readOnly}
          onClick={() => void run((a) => a.answerRoll('present_voting'), 'Marked present and voting')}>
          <VoteIcon aria-hidden="true" /> Present and voting
        </Button>
      </div>
      <Hint>"Present and voting" means you vote Yes or No: you cannot abstain.</Hint>
    </Card>
  );
}

const ROLL_STATUS: Record<'present' | 'present_voting' | 'absent', StatusDef> = {
  present: { tone: 'success', icon: CircleCheck, word: 'Present' },
  present_voting: { tone: 'success', icon: CircleCheck, word: 'Present and voting' },
  absent: { tone: 'danger', icon: CircleX, word: 'Marked absent' },
};

function RollStatus({ roll, status }: { roll: RollCall; status: RollCall['rows'][number]['status'] }) {
  return (
    <Panel title="Roll call" icon={Hand} aside={status ? <Status s={ROLL_STATUS[status]} /> : <Status s={{ tone: 'muted', icon: Hourglass, word: roll.open ? 'Open' : 'Not taken' }} />}>
      <Plain muted>{status ? `Answered${roll.sessionNumber ? ` for session ${roll.sessionNumber}` : ''}.` : 'The chair opens roll call at the start of a session.'}</Plain>
    </Panel>
  );
}

/* ------------------------------------------------------------------ votes */
const TAKEOVER = 'flex flex-col gap-2.5 rounded-none border border-primary border-t-8 border-t-primary p-6 shadow-none before:hidden max-md:px-4 max-md:py-4.5';

function VoteCard({ vote: v, myRoll, compact }: { vote: Vote; myRoll: RollCall['rows'][number]['status']; compact?: boolean }) {
  const { run, pending } = useAction();
  const { readOnly } = useConf();
  const noAbstain = myRoll === 'present_voting';
  return (
    <Card render={<section aria-labelledby={`vote-${v.id}`} />} className={cn(TAKEOVER, v.myVote && 'border-input border-t-success')}>
      <p className={cn('flex items-center gap-2 font-mono text-[14px] font-medium uppercase tracking-[0.08em]', v.myVote ? 'text-success' : 'text-info')}>
        {v.myVote ? <CircleCheck size={20} aria-hidden="true" /> : <VoteIcon size={20} aria-hidden="true" />}
        {v.myVote ? 'Vote recorded' : 'Vote open: your turn'}
      </p>
      <h2 id={`vote-${v.id}`} className={cn('font-heading font-wide font-extrabold leading-[1.05] tracking-[-0.02em]', compact ? 'text-[34px]' : 'text-[52px] max-md:text-[38px]')}>{v.title}</h2>
      <p className="font-mono text-[15px] text-muted-foreground">{v.majority === 'two_thirds' ? 'Two-thirds majority' : 'Simple majority'}</p>
      <VoteButtons
        mine={v.myVote} pending={pending} label={`Vote on ${v.title}`} noAbstain={noAbstain} disabled={readOnly} compact={compact}
        onVote={(c) => void run((a) => a.castVote(v.id, c), `Vote recorded: ${VOTE_WORD[c]}`)}
      />
      {v.myVote
        ? <p className="text-lg text-muted-foreground" role="status">You voted <strong className="text-foreground">{VOTE_WORD[v.myVote]}</strong>. The result shows when voting closes.</p>
        : noAbstain && <Hint>You answered "present and voting", so you cannot abstain.</Hint>}
    </Card>
  );
}

function ResultPanel({ vote: v }: { vote: Vote }) {
  const s: StatusDef = v.passed === null
    ? { tone: 'muted', icon: Hourglass, word: 'Closed' }
    : v.passed ? { tone: 'success', icon: CircleCheck, word: 'Passed' } : { tone: 'danger', icon: CircleX, word: 'Failed' };
  return (
    <Panel title="Vote result" icon={VoteIcon} aside={<Status s={s} />}>
      <Plain className="text-xl font-semibold">{v.title}</Plain>
      {v.counts && (
        <dl className="grid w-full grid-cols-4 gap-2 text-center max-md:grid-cols-2">
          {([['Yes', v.counts.yes], ['No', v.counts.no], ['Abstain', v.counts.abstain], ['Not voted', v.counts.notVoted]] as const).map(([k, n]) => (
            <div key={k} className="border bg-background px-2 py-2">
              <dt className="font-mono text-sm font-medium uppercase text-muted-foreground tracking-[0.08em]">{k}</dt>
              <dd className="font-figures text-[28px] font-bold leading-tight">{n}</dd>
            </div>
          ))}
        </dl>
      )}
      {v.myVote && <Plain muted>You voted {VOTE_WORD[v.myVote]}.</Plain>}
    </Panel>
  );
}

/* ------------------------------------------------------------------ speakers */
function MySpeakerPlace({ speakers }: { speakers: Speaker[] }) {
  const { run, pending } = useAction();
  const { readOnly } = useConf();
  const me = speakers.find((s) => s.isMe && s.status !== 'done');
  const queue = speakers.filter((s) => s.status !== 'done');
  const place = me ? queue.indexOf(me) + 1 : 0;
  const ahead = me ? queue.filter((s) => s.position < me.position).length : 0;
  return (
    <Panel title="Speakers' list" icon={Mic} aside={me ? <Status s={SPEAKER[me.status]} /> : undefined}>
      {me?.status === 'speaking' ? (
        <p className="font-heading text-[34px] font-extrabold leading-[1.1] text-info tracking-[-0.02em]">You're speaking</p>
      ) : me ? (
        <>
          <p className="font-heading font-wide text-[40px] font-extrabold leading-[1.1] tracking-[-0.02em]">{ordinal(place)} in line</p>
          <Plain muted>{ahead === 0 ? "You're up next." : `${ahead} ahead of you.`}</Plain>
        </>
      ) : (
        <Plain muted>You're not on the list.</Plain>
      )}
      <div className="flex flex-wrap gap-2.5">
        {!me && <Button loading={pending} disabled={readOnly} onClick={() => void run((a) => a.joinSpeakers(), "Added to the speakers' list")}><Mic aria-hidden="true" /> Add me</Button>}
        <Button variant="outline" render={<a href={href('speakers')} />}>Full list</Button>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ schedule, deadlines, announcements */
function NextUp({ schedule, committeeId }: { schedule: ScheduleItem[]; committeeId: string }) {
  const now = useNow();
  const mine = schedule.filter((i) => !i.committeeId || i.committeeId === committeeId);
  const current = mine.find((i) => i.startsAt && i.endsAt && Date.parse(i.startsAt) <= now && now < Date.parse(i.endsAt));
  const next = mine.find((i) => i.startsAt && Date.parse(i.startsAt) > now);
  return (
    <Panel title="Schedule" icon={CalendarClock}>
      {!current && !next ? (
        <Empty>Times are to be announced.</Empty>
      ) : (
        <Facts items={[
          ...(current ? [['Now', <span key="c"><strong>{current.title}</strong> <span className="text-muted-foreground">until {timeOf(current.endsAt)}</span></span>] as [string, ReactNode]] : []),
          ...(next ? [['Next', <span key="n"><strong>{next.title}</strong> <span className="text-muted-foreground">at {timeOf(next.startsAt)}</span></span>] as [string, ReactNode]] : []),
        ]} />
      )}
      <Button variant="outline" size="sm" render={<a href={href('schedule')} />}><CalendarDays aria-hidden="true" /> Full schedule</Button>
    </Panel>
  );
}

function DeadlinesPanel({ deadlines }: { deadlines: Deadline[] }) {
  const now = useNow();
  return (
    <Panel title="Deadlines" icon={CalendarClock}>
      {deadlines.length === 0 ? (
        <Empty>Deadlines are to be announced.</Empty>
      ) : (
        <div className="flex w-full flex-col divide-y">
          {deadlines.map((d) => {
            const left = countdownText(d.dueAt, now);
            return (
              <div key={d.key} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2.5 first:pt-0 last:pb-0">
                <span className="font-semibold">{d.label}</span>
                <span className={cn('text-[17px]', !d.dueAt && 'text-muted-foreground')}>
                  {dayTime(d.dueAt)}{left && <span className={cn('ms-2 font-mono text-[15px]', left === 'Passed' ? 'text-muted-foreground' : 'text-foreground')}>{left === 'Passed' ? 'passed' : `in ${left}`}</span>}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function LatestAnnouncement({ a }: { a: Announcement | null }) {
  return (
    <Panel title="Latest announcement" icon={Megaphone} className={cn(a?.urgent && 'border-destructive-line')}>
      {a ? <AnnouncementRow a={a} compact /> : <Empty>No announcements yet.</Empty>}
      <p className="text-[15px] text-muted-foreground">Older ones are under the bell at the top.</p>
    </Panel>
  );
}
