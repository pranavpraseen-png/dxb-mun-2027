// Roll call and votes: two tabs on one page (the nav holds at most seven places).
// Roll call: open / close, a grid of seats with status chips, click a seat to mark it, plain counts.
// Voting: open a vote on a motion, resolution or amendment, live counts, close or record a placard count.
import { useState } from 'react';
import { CheckCircle2, ChevronDown, CircleDashed, Hand, ListChecks, Lock, Play, UserX, Vote as VoteIcon, XCircle } from 'lucide-react';
import type { DaisSeat, Resolution, RollCall, RollStatus, Vote, VoteTarget } from '@/platform/v2';
import { cn } from '../../portal/ui/coss/utils';
import { Button } from '../../portal/ui/coss/button';
import { Input } from '../../portal/ui/coss/input';
import { Label } from '../../portal/ui/coss/label';
import { Tabs, TabsList, TabsPanel, TabsTab } from '../../portal/ui/coss/tabs';
import { Menu, MenuPopup, MenuRadioGroup, MenuRadioItem, MenuTrigger } from '../../portal/ui/coss/menu';
import { useAction, useLoad } from '../lib/data';
import { setParam, useRoute } from '../lib/route';
import { Choices, Empty, Loaded, PageHead, Panel, Pick, Tag, names, timeOnly, type Tone } from '../ui/kit';
import { Confirm } from '../ui/confirm';

export function FloorScreen() {
  const { params } = useRoute();
  const tab = params.get('tab') === 'vote' ? 'vote' : 'roll';
  return (
    <>
      <PageHead title="Roll call and votes" line="Delegates answer and vote on their phones. You can mark anything by hand." />
      <Tabs value={tab} onValueChange={(v) => setParam('tab', String(v))}>
        <TabsList className="max-md:w-full">
          <TabsTab value="roll" className="h-11 px-5 font-label text-lg font-semibold sm:h-11 sm:text-lg"><ListChecks aria-hidden="true" /> Roll call</TabsTab>
          <TabsTab value="vote" className="h-11 px-5 font-label text-lg font-semibold sm:h-11 sm:text-lg"><VoteIcon aria-hidden="true" /> Voting</TabsTab>
        </TabsList>
        <TabsPanel value="roll" className="mt-2"><RollTab /></TabsPanel>
        <TabsPanel value="vote" className="mt-2"><VoteTab /></TabsPanel>
      </Tabs>
    </>
  );
}

/* ------------------------------------------------------------------ roll call */
const ROLL: Record<RollStatus | 'none', { tone: Tone; word: string; icon: typeof CheckCircle2 }> = {
  present_voting: { tone: 'ok', word: 'Present and voting', icon: CheckCircle2 },
  present: { tone: 'live', word: 'Present', icon: Hand },
  absent: { tone: 'bad', word: 'Absent', icon: UserX },
  none: { tone: 'off', word: 'Not answered', icon: CircleDashed },
};

function RollTab() {
  const roll = useLoad((a, c) => a.rollCall(c), ['roll']);
  const seats = useLoad((a, c) => a.seats(c), ['seat', 'roll']);
  return (
    <Loaded load={roll} what="roll call" lines={6}>
      {(r) => <RollBody roll={r} seats={seats.data ?? []} />}
    </Loaded>
  );
}

function RollBody({ roll, seats }: { roll: RollCall; seats: DaisSeat[] }) {
  const { run, pending } = useAction();
  const byId = new Map(seats.map((s) => [s.seat.id, s]));
  const count = (st: RollStatus | null) => roll.rows.filter((r) => r.status === st).length;
  const pv = count('present_voting');
  const p = count('present');
  const ab = count('absent');
  const none = count(null);
  const total = roll.rows.length;
  const filled = seats.filter((s) => s.delegates.length > 0).length;

  return (
    <div className="flex flex-col gap-4">
      <Panel
        title={roll.sessionNumber ? `Roll call · session ${roll.sessionNumber}` : 'Roll call'}
        icon={ListChecks}
        aside={roll.open ? <Tag tone="live">Open</Tag> : <Tag tone="off" icon={Lock}>Closed</Tag>}
      >
        <div className="flex flex-wrap items-center gap-2.5">
          {roll.open ? (
            <Confirm
              title="Close roll call?"
              line={none ? `${none} seat${none === 1 ? '' : 's'} not answered will be marked absent.` : 'Every seat has answered.'}
              confirm="Close roll call"
              onConfirm={() => run((a, c) => a.closeRoll(c), 'Roll call closed')}
              trigger={<Button size="lg" disabled={pending}><Lock aria-hidden="true" /> Close roll call</Button>}
            />
          ) : (
            <Button size="lg" loading={pending} onClick={() => void run((a, c) => a.openRoll(c), 'Roll call open')}><Play aria-hidden="true" /> Open roll call</Button>
          )}
          <p className="text-base text-muted-foreground">Click a seat to mark it by hand.</p>
        </div>
        <dl className="grid grid-cols-4 gap-2 max-md:grid-cols-2">
          <Count label="Present and voting" value={pv} tone="ok" />
          <Count label="Present" value={p} tone="live" />
          <Count label="Absent" value={ab} tone="bad" />
          <Count label="Not answered" value={none} tone="off" />
        </dl>
        <p className="text-lg">
          <strong>{pv + p}</strong> of <strong>{total}</strong> seats present
          <span className="text-muted-foreground"> · {filled} seats filled{pv > 0 ? ` · ${pv} present and voting (cannot abstain)` : ''}</span>
        </p>
        <p className="text-[15px] text-muted-foreground">Quorum: check your rules of procedure. These are plain counts.</p>
      </Panel>

      <ul className="seat-grid" aria-label="Seats">
        {roll.rows.map((r) => {
          const st = ROLL[r.status ?? 'none'];
          const d = byId.get(r.seat.id);
          return (
            <li key={r.seat.id}>
              <Menu>
                <MenuTrigger
                  className={cn('flex min-h-22 w-full flex-col items-start gap-1.5 border bg-card p-3 text-left hover:border-input data-popup-open:border-primary',
                    r.status === 'absent' && 'border-destructive-line', r.status === 'present_voting' && 'border-success-line')}
                  aria-label={`${r.seat.label}: ${st.word}. Change`}
                >
                  <span className="flex w-full items-start justify-between gap-1">
                    <span className="min-w-0 font-label text-xl font-semibold leading-tight">{r.seat.label}</span>
                    <ChevronDown size={16} aria-hidden="true" className="mt-1 shrink-0 text-muted-foreground" />
                  </span>
                  {d && <span className="truncate text-sm text-muted-foreground max-w-full">{names(d.delegates)}</span>}
                  <Tag tone={st.tone} icon={st.icon} className="h-6 text-[13px] sm:h-6 sm:text-[13px]">{st.word}</Tag>
                </MenuTrigger>
                <MenuPopup align="start" sideOffset={4} className="min-w-56 rounded-sm">
                  <MenuRadioGroup value={r.status ?? ''} onValueChange={(v) => void run((a, c) => a.markRoll(c, r.seat.id, v as RollStatus), `${r.seat.label}: ${ROLL[v as RollStatus].word}`)}>
                    {(['present_voting', 'present', 'absent'] as RollStatus[]).map((k) => (
                      <MenuRadioItem key={k} value={k} closeOnClick className="min-h-11 text-base">{ROLL[k].word}</MenuRadioItem>
                    ))}
                  </MenuRadioGroup>
                </MenuPopup>
              </Menu>
            </li>
          );
        })}
      </ul>
      {!roll.rows.length && <Empty title="No seats yet" line="The secretariat adds the committee's seats." />}
    </div>
  );
}

function Count({ label, value, tone }: { label: string; value: number; tone: Tone }) {
  return (
    <div className={cn('flex flex-col gap-0.5 border bg-background px-3 py-2.5',
      tone === 'ok' && 'border-s-4 border-s-success', tone === 'live' && 'border-s-4 border-s-primary', tone === 'bad' && 'border-s-4 border-s-destructive', tone === 'off' && 'border-s-4 border-s-input')}>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-mono text-3xl font-medium leading-none">{value}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ voting */
function VoteTab() {
  const votes = useLoad((a, c) => a.votes(c), ['votes']);
  const resos = useLoad((a, c) => a.resolutions(c), ['resolutions']);
  return (
    <div className="two-col">
      <div className="col">
        <OpenVoteForm resolutions={resos.data ?? []} hasOpen={!!votes.data?.some((v) => v.status === 'open')} />
      </div>
      <div className="col">
        <Loaded load={votes} what="votes" lines={5}>
          {(vs) => (
            <>
              {vs.filter((v) => v.status === 'open').map((v) => <OpenVote key={v.id} vote={v} />)}
              <Panel title="Results" icon={CheckCircle2}>
                {vs.some((v) => v.status === 'closed')
                  ? <ul className="flex flex-col divide-y">{vs.filter((v) => v.status === 'closed').map((v) => <ClosedVote key={v.id} vote={v} />)}</ul>
                  : <Empty title="No results yet" line="Closed votes show here, newest first." />}
              </Panel>
            </>
          )}
        </Loaded>
      </div>
    </div>
  );
}

const TARGETS: { value: VoteTarget; label: string }[] = [
  { value: 'motion', label: 'Motion' }, { value: 'resolution', label: 'Resolution' }, { value: 'amendment', label: 'Amendment' },
];
const MAJ: { value: Vote['majority']; label: string }[] = [{ value: 'simple', label: 'Simple majority' }, { value: 'two_thirds', label: 'Two-thirds' }];
const resoName = (r: Resolution) => (r.number ? `${r.number}: ${r.title}` : r.title);

function OpenVoteForm({ resolutions, hasOpen }: { resolutions: Resolution[]; hasOpen: boolean }) {
  const { run, pending } = useAction();
  const [target, setTarget] = useState<VoteTarget>('motion');
  const [title, setTitle] = useState('');
  const [pick, setPick] = useState('');
  const [majority, setMajority] = useState<Vote['majority']>('simple');
  const list = resolutions.filter((r) => (target === 'amendment' ? r.kind === 'amendment' : r.kind !== 'amendment') && ['approved', 'voting', 'submitted'].includes(r.status));
  const chosen = list.find((r) => r.id === pick);
  const finalTitle = target === 'motion' ? title.trim() : chosen ? (target === 'amendment' ? `Amendment to ${chosen.clause ?? 'clause'}: ${resoName(chosen)}` : resoName(chosen)) : '';
  const submit = async () => {
    const ok = await run((a, c) => a.openVote(c, { target, targetId: target === 'motion' ? null : pick, title: finalTitle, majority }), 'Vote open');
    if (ok) { setTitle(''); setPick(''); }
  };
  return (
    <Panel title="Open a vote" icon={VoteIcon} aside={hasOpen ? <Tag tone="wait">A vote is open</Tag> : undefined}>
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (finalTitle) void submit(); }}>
        <div className="flex flex-col gap-1.5">
          <span className="text-base font-semibold">On</span>
          <Choices label="Vote on" value={target} options={TARGETS} onChange={(v) => { setTarget(v); setPick(''); }} />
        </div>
        {target === 'motion' ? (
          <div className="flex flex-col gap-1">
            <Label htmlFor="v-title" className="text-base font-semibold">Motion</Label>
            <Input id="v-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Motion to close debate" maxLength={120} />
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <Label className="text-base font-semibold">{target === 'amendment' ? 'Amendment' : 'Resolution'}</Label>
            {list.length
              ? <Pick label={target === 'amendment' ? 'Amendment' : 'Resolution'} value={pick} onChange={setPick} placeholder="Choose one" options={list.map((r) => ({ value: r.id, label: target === 'amendment' ? `${r.clause ?? 'Clause'}: ${r.title}` : resoName(r) }))} />
              : <p className="text-base text-muted-foreground">None ready. Approve one on the Resolutions page first.</p>}
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <span className="text-base font-semibold">Majority needed</span>
          <Choices label="Majority" value={majority} options={MAJ} onChange={setMajority} />
        </div>
        <Button type="submit" size="lg" className="self-start" disabled={!finalTitle || hasOpen} loading={pending}><Play aria-hidden="true" /> Open vote</Button>
        {hasOpen && <p className="text-base text-muted-foreground">Close the open vote first.</p>}
      </form>
    </Panel>
  );
}

function Bars({ c }: { c: NonNullable<Vote['counts']> }) {
  const total = Math.max(1, c.yes + c.no + c.abstain + c.notVoted);
  const rows: [string, number, string, typeof CheckCircle2][] = [
    ['Yes', c.yes, 'bg-success', CheckCircle2], ['No', c.no, 'bg-destructive', XCircle], ['Abstain', c.abstain, 'bg-warning', CircleDashed], ['Not voted', c.notVoted, 'bg-input', CircleDashed],
  ];
  return (
    <dl className="flex w-full flex-col gap-2">
      {rows.map(([l, n, bg, Icon]) => (
        <div key={l} className="grid grid-cols-[8.5rem_minmax(0,1fr)_3rem] items-center gap-2 max-md:grid-cols-[7rem_minmax(0,1fr)_2.5rem]">
          <dt className="flex items-center gap-1.5 text-base"><Icon size={16} aria-hidden="true" /> {l}</dt>
          <div className="h-3 bg-muted" aria-hidden="true"><div className={cn('h-full', bg)} style={{ width: `${(n / total) * 100}%` }} /></div>
          <dd className="text-right font-mono text-xl font-medium">{n}</dd>
        </div>
      ))}
    </dl>
  );
}

function OpenVote({ vote }: { vote: Vote }) {
  const { run, pending } = useAction();
  const [placard, setPlacard] = useState(false);
  const [yes, setYes] = useState('');
  const [no, setNo] = useState('');
  const [ab, setAb] = useState('');
  const num = (s: string) => (s.trim() === '' ? NaN : Number(s));
  const valid = [yes, no, ab].every((s) => Number.isInteger(num(s)) && num(s) >= 0);
  return (
    <Panel title={vote.title} icon={VoteIcon} className="border-s-4 border-s-primary" aside={<Tag tone="live">Open · {vote.majority === 'two_thirds' ? 'two-thirds' : 'simple'}</Tag>}>
      <p className="text-base text-muted-foreground">Opened {timeOnly(vote.openedAt)} · live count</p>
      {vote.counts ? <Bars c={vote.counts} /> : <p className="text-base text-muted-foreground">No counts yet.</p>}
      <div className="flex flex-wrap gap-2.5">
        <Button size="lg" loading={pending} onClick={() => void run((a) => a.closeVote(vote.id), 'Vote closed')}><Lock aria-hidden="true" /> Close vote</Button>
        <Button size="lg" variant="outline" onClick={() => setPlacard((p) => !p)} aria-expanded={placard}><Hand aria-hidden="true" /> Placard count</Button>
      </div>
      {placard && (
        <form className="flex flex-col gap-3 border-t pt-3" onSubmit={(e) => { e.preventDefault(); if (valid) void run((a) => a.recordCount(vote.id, { yes: num(yes), no: num(no), abstain: num(ab) }), 'Count recorded'); }}>
          <p className="text-base">Count the raised placards and type the numbers.</p>
          <div className="grid grid-cols-3 gap-2">
            {([['Yes', yes, setYes], ['No', no, setNo], ['Abstain', ab, setAb]] as const).map(([l, v, set]) => (
              <div key={l} className="flex flex-col gap-1">
                <Label htmlFor={`pc-${vote.id}-${l}`} className="text-base">{l}</Label>
                <Input id={`pc-${vote.id}-${l}`} type="number" min={0} inputMode="numeric" value={v} onChange={(e) => set(e.target.value)} className="*:data-[slot=input]:font-mono *:data-[slot=input]:text-xl" />
              </div>
            ))}
          </div>
          <Button type="submit" variant="outline" className="self-start" disabled={!valid}>Save count</Button>
        </form>
      )}
    </Panel>
  );
}

function ClosedVote({ vote }: { vote: Vote }) {
  const c = vote.counts;
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{vote.title}</p>
        <p className="text-sm text-muted-foreground">
          {vote.majority === 'two_thirds' ? 'Two-thirds' : 'Simple majority'} · {c ? `${c.yes} yes, ${c.no} no, ${c.abstain} abstain` : 'No counts'} · closed {timeOnly(vote.closedAt)}
        </p>
      </div>
      {vote.passed === null ? <Tag tone="off">No result</Tag> : vote.passed ? <Tag tone="ok">Passed</Tag> : <Tag tone="bad" icon={XCircle}>Failed</Tag>}
    </li>
  );
}
