// Live overview (DASHBOARD-PLAN.md §3.1): every committee at a glance (room, session, agenda item, the ticking
// timer, present / seats, the open vote, resolutions passed, chits waiting, papers in), plus the conference
// phase switch (before / live / after) behind a confirm. A dense table on desktop, cards on phones.
import { useState, type ReactNode } from 'react';
import { FileText, Mail, MonitorDot, Pause, Play, ScrollText, Users } from 'lucide-react';
import type { OverviewRow, Phase, Timer } from '@/platform/v2';
import { SegmentedControl, SegmentedControlItem } from '../../portal/ui/coss/segmented-control';
import { cn } from '../../portal/ui/coss/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/coss/table';
import { useAction, useAdmin, useLoad, useNow } from '../lib/data';
import { ConfirmDialog } from '../ui/confirm';
import { Clock } from '../../portal/ui/figures';
import { Head, Loaded, Panel, Stat, TBA, Tag, Tba, clock } from '../ui/kit';

const PHASES: { id: Phase; label: string; line: string }[] = [
  { id: 'before', label: 'Before', line: 'Seats, papers and preparation. Committee rooms are closed.' },
  { id: 'live', label: 'Live', line: 'Conference days. Sessions, timers, votes and notes open.' },
  { id: 'after', label: 'After', line: 'The conference is over. Everything becomes read-only.' },
];

/** What the timer shows now, exactly as the contract says. */
export function remaining(t: Timer, now: number): number {
  return t.running && t.endsAt ? Math.max(0, (Date.parse(t.endsAt) - now) / 1000) : t.remainingSeconds;
}

export function LiveScreen() {
  const { me } = useAdmin();
  const rows = useLoad((a) => a.overview(), [], ['live', 'roll', 'votes', 'resolutions', 'chits', 'papers', 'phase', 'speakers']);
  const list = rows.data ?? [];
  const live = list.filter((r) => r.session?.status === 'live').length;
  const votes = list.filter((r) => r.openVote).length;
  const chits = list.reduce((n, r) => n + r.chitsWaiting, 0);

  return (
    <>
      <Head title="Live overview" line="Every committee room, as it happens." aside={me.isCore ? <PhaseSwitch /> : undefined} />
      <div className="grid w-full grid-cols-4 gap-2.5 max-md:grid-cols-2">
        <Count label="Committees in session" n={rows.data ? `${live} / ${list.length}` : '–'} tone={live ? 'success' : undefined} />
        <Count label="Votes open" n={rows.data ? votes : '–'} tone={votes ? 'primary' : undefined} />
        <Count label="Chits waiting" n={rows.data ? chits : '–'} tone={chits ? 'warning' : undefined} />
        <Count label="Resolutions passed" n={rows.data ? list.reduce((n, r) => n + r.resolutionsPassed, 0) : '–'} />
      </div>
      <Panel title="Committees" icon={MonitorDot} bodyClassName="p-0 pt-0 max-md:p-3">
        <Loaded pad load={rows} what="the committees" empty={(d) => (d.length ? null : 'No committees yet. Add them under Committees.')}>
          {(d) => <><RoomsTable rows={d} /><RoomsCards rows={d} /></>}
        </Loaded>
      </Panel>
    </>
  );
}

function Count({ label, n, tone }: { label: string; n: ReactNode; tone?: 'warning' | 'success' | 'primary' }) {
  return <div className="border bg-card px-4 py-3"><Stat label={label} n={n} tone={tone} /></div>;
}

function PhaseSwitch() {
  const phase = useLoad((a) => a.phase(), [], ['phase']);
  const { run } = useAction();
  const [next, setNext] = useState<Phase | null>(null);
  const info = PHASES.find((p) => p.id === next);
  return (
    <div className="flex flex-col gap-1">
      <span id="phase-l" className="font-mono text-[13px] font-medium uppercase text-muted-foreground tracking-[0.08em]">Conference phase</span>
      <SegmentedControl aria-labelledby="phase-l" className="grid grid-cols-3 rounded-none max-md:w-full">
        {PHASES.map((p) => {
          const on = phase.data === p.id;
          return (
            <SegmentedControlItem key={p.id}
              render={<button type="button" aria-pressed={on} onClick={() => { if (!on && phase.data) setNext(p.id); }} />}
              className={cn('h-11 px-5 font-label text-lg font-semibold sm:h-11 sm:text-lg', on && 'bg-primary! text-primary-foreground! hover:text-primary-foreground')}>
              {p.label}
            </SegmentedControlItem>
          );
        })}
      </SegmentedControl>
      <ConfirmDialog
        open={next !== null} onOpenChange={(o) => { if (!o) setNext(null); }}
        title={`Switch to ${info?.label ?? ''}?`}
        line={`${info?.line ?? ''} Every delegate and chair sees the change right away.`}
        confirm={`Switch to ${info?.label ?? ''}`}
        onConfirm={() => next && run('phase', (a) => a.setPhase(next), `Phase is now ${info?.label}`)}
      />
    </div>
  );
}

function SessionTag({ s }: { s: OverviewRow['session'] }) {
  if (!s) return <Tag tone="locked">No session yet</Tag>;
  if (s.status === 'live') return <Tag tone="live">Session {s.number} live</Tag>;
  if (s.status === 'scheduled') return <Tag tone="waiting">Next: session {s.number}</Tag>;
  return <Tag tone="locked">Session {s.number} closed</Tag>;
}

function TimerView({ t, big }: { t: Timer; big?: boolean }) {
  const now = useNow(t.running ? 250 : 5000);
  const left = remaining(t, now);
  const what = t.kind === 'speech' && t.speaker ? t.speaker.label : t.label;
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="flex items-center gap-2">
        {t.running ? <Play size={big ? 18 : 15} aria-hidden="true" className="shrink-0 text-success" /> : <Pause size={big ? 18 : 15} aria-hidden="true" className="shrink-0 text-muted-foreground" />}
        <span className={cn('font-figures font-bold leading-none', big ? 'text-[34px]' : 'text-[26px]', t.running && left <= 10 && 'text-warning')} aria-label={`${clock(left)} ${t.running ? 'running' : 'paused'}`}>
          <Clock text={clock(left)} />
        </span>
        <span className="sr-only">{t.running ? 'Running' : 'Paused'}</span>
      </span>
      <span className="truncate text-sm text-muted-foreground">{cap(t.kind)}{what ? ` · ${what}` : ''}</span>
    </div>
  );
}
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

function Present({ r, short }: { r: OverviewRow; short?: boolean }) {
  if (r.present === null) return <span className="text-sm text-muted-foreground">{short ? 'No roll' : 'No roll call yet'}</span>;
  return <span className="font-figures text-lg">{r.present}<span className="text-muted-foreground"> / {r.seats}</span></span>;
}

function VoteCell({ r }: { r: OverviewRow }) {
  if (!r.openVote) return <span className="text-sm text-muted-foreground">None open</span>;
  return (
    <span className="flex min-w-0 flex-col items-start gap-1">
      <Tag tone="todo">Vote open</Tag>
      <span className="line-clamp-2 text-sm">{r.openVote}</span>
    </span>
  );
}

function RoomsTable({ rows }: { rows: OverviewRow[] }) {
  return (
    <div className="w-full max-md:hidden">
      <Table className="text-base">
        <TableHeader>
          <TableRow>
            <TableHead className="ps-5">Committee</TableHead>
            <TableHead>Session</TableHead>
            <TableHead>Agenda item</TableHead>
            <TableHead>Timer</TableHead>
            <TableHead>Present</TableHead>
            <TableHead>Vote</TableHead>
            <TableHead className="text-right">Passed</TableHead>
            <TableHead className="text-right">Chits</TableHead>
            <TableHead className="pe-5 text-right">Papers</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.committee.id} className="align-top">
              <TableCell className="ps-5">
                <p className="font-mono text-xl font-medium leading-none">{r.committee.abbr}</p>
                <p className="mt-1 text-sm text-muted-foreground">{r.room ?? TBA}</p>
              </TableCell>
              <TableCell><SessionTag s={r.session} /></TableCell>
              <TableCell className="max-w-64 whitespace-normal">{r.agendaItem ? <span className="line-clamp-2">{r.agendaItem}</span> : <Tba />}</TableCell>
              <TableCell className="w-44 max-w-44"><TimerView t={r.timer} /></TableCell>
              <TableCell><Present r={r} /></TableCell>
              <TableCell className="max-w-52 whitespace-normal"><VoteCell r={r} /></TableCell>
              <TableCell className="text-right font-figures text-lg">{r.resolutionsPassed}</TableCell>
              <TableCell className={cn('text-right font-figures text-lg', r.chitsWaiting > 0 && 'text-warning')}>{r.chitsWaiting}</TableCell>
              <TableCell className="pe-5 text-right font-figures text-lg">{r.papersIn}<span className="text-muted-foreground"> / {r.seats}</span></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function RoomsCards({ rows }: { rows: OverviewRow[] }) {
  return (
    <ul className="flex w-full flex-col gap-3 md:hidden" aria-label="Committees">
      {rows.map((r) => (
        <li key={r.committee.id} className="flex flex-col gap-2 border bg-background p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-mono text-2xl font-medium leading-none">{r.committee.abbr}</p>
              <p className="mt-1 text-sm text-muted-foreground">{r.room ?? TBA}</p>
            </div>
            <SessionTag s={r.session} />
          </div>
          <p className="line-clamp-2 text-[15px]">{r.agendaItem ?? <Tba />}</p>
          <TimerView t={r.timer} big />
          {r.openVote && <VoteCell r={r} />}
          <div className="grid grid-cols-4 gap-2 border-t pt-2.5">
            <Mini icon={Users} label="Present"><Present r={r} short /></Mini>
            <Mini icon={ScrollText} label="Passed"><span className="font-figures text-lg">{r.resolutionsPassed}</span></Mini>
            <Mini icon={Mail} label="Chits"><span className={cn('font-figures text-lg', r.chitsWaiting > 0 && 'text-warning')}>{r.chitsWaiting}</span></Mini>
            <Mini icon={FileText} label="Papers"><span className="font-figures text-lg">{r.papersIn}<span className="text-muted-foreground">/{r.seats}</span></span></Mini>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Mini({ icon: Icon, label, children }: { icon: typeof Users; label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="flex items-center gap-1 font-mono text-[13px] font-medium uppercase text-muted-foreground tracking-[0.08em]"><Icon size={13} aria-hidden="true" />{label}</span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}
