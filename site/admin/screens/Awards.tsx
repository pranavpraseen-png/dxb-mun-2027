// Awards (DASHBOARD-PLAN.md §3.10): per committee, the chairs' rubric ranking (read-only) and their
// nominations, each with a "lock as final" toggle. The only page where IHS gold appears.
import { Award, Lock, Medal, Trophy } from 'lucide-react';
import { DEFAULT_AWARDS, type Nomination, type CommitteeRef, type RankingRow } from '@/platform/v2';
import { Badge } from '../../portal/ui/coss/badge';
import { Label } from '../../portal/ui/coss/label';
import { cn } from '../../portal/ui/coss/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/coss/table';
import { Switch } from '../ui/coss/switch';
import { useAction, useAdmin, useLoad } from '../lib/data';
import { setParam, useRoute } from '../lib/route';
import { Choice, Empty, Head, Loaded, Panel, labelCls } from '../ui/kit';

type Nom = Nomination & { committee: CommitteeRef };

export function AwardsScreen() {
  const { committees } = useAdmin();
  const { params } = useRoute();
  const all = useLoad((a) => a.nominations(null), [], ['scores']);
  const busiest = committees.find((c) => (all.data ?? []).some((n) => n.committee.id === c.id));
  const committee = committees.find((c) => c.id === params.get('committee')) ?? busiest ?? committees[0];
  const locked = (all.data ?? []).filter((n) => n.final).length;
  return (
    <>
      <Head title="Awards" line={all.data ? `${locked} of ${all.data.length} nominations locked as final` : 'The chairs score; you lock the winners.'} />
      <div className="w-full max-w-md">
        <span className={labelCls}>Committee</span>
        <div className="mt-1.5">
          <Choice label="Committee" value={committee?.id ?? ''} onChange={(v) => setParam('committee', v)} placeholder="Choose a committee"
            options={committees.map((c) => {
              const n = (all.data ?? []).filter((x) => x.committee.id === c.id);
              return { value: c.id, label: `${c.abbr} · ${n.length ? `${n.filter((x) => x.final).length}/${n.length} final` : 'no nominations'}` };
            })} />
        </div>
      </div>
      {!committee ? <Panel title="No committee"><Empty>No committees yet.</Empty></Panel> : (
        <div className="grid w-full items-start gap-5 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <Ranking committeeId={committee.id} abbr={committee.abbr} />
          <Nominations list={(all.data ?? []).filter((n) => n.committee.id === committee.id)} loaded={!!all.data} abbr={committee.abbr} />
        </div>
      )}
    </>
  );
}

function Ranking({ committeeId, abbr }: { committeeId: string; abbr: string }) {
  const rank = useLoad((a) => a.ranking(committeeId), [committeeId], ['scores']);
  const chairs = rank.data?.[0]?.byChair ?? [];
  return (
    <Panel title={`${abbr} ranking`} icon={Trophy} bodyClassName="p-0 pt-0 max-md:p-3"
      aside={<span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><Lock size={14} aria-hidden="true" /> Read-only</span>}>
      <Loaded pad load={rank} what="the ranking" empty={(d) => (d.length ? null : `The ${abbr} chairs haven't scored anyone yet.`)}>
        {(d) => (
          <>
            <div className="tbl-scroll w-full max-md:hidden">
              <Table className="text-base">
                <TableHeader>
                  <TableRow>
                    <TableHead className="ps-5">#</TableHead>
                    <TableHead>Seat</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Sessions</TableHead>
                    {chairs.map((c) => <TableHead key={c.chairId} className="text-right last:pe-5">{c.chairName ?? 'A chair'}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.map((r, i) => (
                    <TableRow key={r.seat.id}>
                      <TableCell className="ps-5"><Place i={i} /></TableCell>
                      <TableCell>
                        <p className="font-semibold">{r.seat.label}</p>
                        <p className="text-sm text-muted-foreground">{r.delegates.join(', ') || 'No delegate'}</p>
                      </TableCell>
                      <TableCell className={cn('text-right font-mono text-lg font-medium', i === 0 && 'text-gold')}>{fmt(r.total)}</TableCell>
                      <TableCell className="text-right font-mono">{r.sessionsScored}</TableCell>
                      {chairs.map((c) => <TableCell key={c.chairId} className="text-right font-mono last:pe-5">{fmt(r.byChair.find((x) => x.chairId === c.chairId)?.total)}</TableCell>)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ol className="flex w-full flex-col divide-y divide-border md:hidden" aria-label={`${abbr} ranking`}>
              {d.map((r: RankingRow, i) => (
                <li key={r.seat.id} className="flex items-center gap-3 py-2.5">
                  <Place i={i} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{r.seat.label}</p>
                    <p className="truncate text-sm text-muted-foreground">{r.delegates.join(', ') || 'No delegate'} · {r.sessionsScored} sessions</p>
                  </div>
                  <span className={cn('font-mono text-lg font-medium', i === 0 && 'text-gold')}>{fmt(r.total)}</span>
                </li>
              ))}
            </ol>
          </>
        )}
      </Loaded>
    </Panel>
  );
}

const fmt = (n: number | undefined) => (n == null ? '–' : Number.isInteger(n) ? String(n) : n.toFixed(1));

function Place({ i }: { i: number }) {
  return (
    <span className={cn('inline-flex size-8 items-center justify-center border font-mono text-[15px] font-medium', i === 0 ? 'border-gold text-gold' : 'border-input text-muted-foreground')}>
      {i === 0 ? <Medal size={16} aria-label="1st" /> : i + 1}
    </span>
  );
}

function Nominations({ list, loaded, abbr }: { list: Nom[]; loaded: boolean; abbr: string }) {
  const order = (a: string) => { const i = (DEFAULT_AWARDS as readonly string[]).indexOf(a); return i < 0 ? 99 : i; };
  const sorted = [...list].sort((a, b) => order(a.award) - order(b.award) || a.seat.label.localeCompare(b.seat.label));
  return (
    <Panel title={`${abbr} nominations`} icon={Award}>
      {!loaded ? <Empty>Loading…</Empty> : sorted.length === 0 ? <Empty>The {abbr} chairs haven't nominated anyone yet.</Empty> : (
        <ul className="flex w-full flex-col divide-y divide-border">
          {sorted.map((n) => <NomRow key={n.id} n={n} />)}
        </ul>
      )}
    </Panel>
  );
}

function NomRow({ n }: { n: Nom }) {
  const { run, pending } = useAction();
  return (
    <li className={cn('flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0', n.final && 'bg-[linear-gradient(var(--ihs-gold),var(--ihs-gold))] bg-[length:3px_100%] bg-no-repeat ps-3')}>
      <div className="min-w-0 flex-1">
        <p className={cn('font-label text-lg font-semibold leading-tight', n.final ? 'text-gold' : 'text-muted-foreground')}>{n.award}</p>
        <p className="font-semibold">{n.seat.label}</p>
        <p className="text-sm text-muted-foreground">Nominated by {n.nominatedBy ?? 'a chair'}</p>
      </div>
      {n.final && (
        <Badge variant="outline" className="h-7 gap-1.5 border-gold bg-transparent px-2 font-label text-[15px] font-semibold text-gold dark:bg-transparent sm:h-7 sm:text-[15px]">
          <Trophy aria-hidden="true" className="size-4!" /> Final
        </Badge>
      )}
      <Label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-base font-normal sm:text-base">
        <Switch checked={n.final} disabled={pending === 'f'}
          onCheckedChange={(v) => void run('f', (a) => a.setFinal(n.id, v), `${n.award}, ${n.seat.label}: ${v ? 'locked as final' : 'unlocked'}`)} />
        Lock as final
      </Label>
    </li>
  );
}
