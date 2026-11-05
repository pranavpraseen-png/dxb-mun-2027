// Seats (DASHBOARD-PLAN.md §3.2): per committee, the seats list with "add seats" (paste a list of names,
// capacity 1 or 2) and remove empty seats.
import { useState } from 'react';
import { Armchair, Plus, Trash2 } from 'lucide-react';
import type { Committee, Seat } from '@/platform/v2';
import { Button } from '../../portal/ui/coss/button';
import { Textarea } from '../../portal/ui/coss/textarea';
import { SegmentedControl, SegmentedControlItem } from '../../portal/ui/coss/segmented-control';
import { cn } from '../../portal/ui/coss/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/coss/table';
import { useAction, useAdmin, useLoad } from '../lib/data';
import { setParam, useRoute } from '../lib/route';
import { Choice, Empty, Field, Head, Loaded, Panel, TBA, Tag, labelCls, type Tone } from '../ui/kit';

function seatState(s: Seat): { tone: Tone; word: string } {
  if (s.holders.length >= s.capacity) return { tone: 'done', word: 'Filled' };
  if (s.holders.length > 0) return { tone: 'waiting', word: `${s.holders.length} of ${s.capacity}` };
  return { tone: 'todo', word: 'Open' };
}

export function SeatsScreen() {
  const { committees } = useAdmin();
  const { params } = useRoute();
  const asked = params.get('committee');
  const committee = committees.find((c) => c.id === asked) ?? committees.find((c) => c.seats > 0) ?? committees[0];
  return (
    <>
      <Head title="Seats" line="Pick a committee. Paste the seats, then assign delegates." />
      <div className="w-full max-w-md">
        <span className={labelCls}>Committee</span>
        <div className="mt-1.5">
          <Choice label="Committee" value={committee?.id ?? ''} onChange={(v) => setParam('committee', v)} placeholder="Choose a committee"
            options={committees.map((c) => ({ value: c.id, label: `${c.abbr} · ${c.name} (${c.filled}/${c.seats})` }))} />
        </div>
      </div>
      {!committee ? <Panel title="No committee"><Empty>No committees yet. Add them under Committees.</Empty></Panel> : (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,7fr)_minmax(0,4fr)]">
          <SeatsPanel committee={committee} />
          <AddSeats committee={committee} />
        </div>
      )}
    </>
  );
}

function SeatsPanel({ committee }: { committee: Committee }) {
  const seats = useLoad((a) => a.seats(committee.id), [committee.id], ['seat']);
  const list = seats.data ?? [];
  const filled = list.filter((s) => s.holders.length >= s.capacity).length;
  return (
    <Panel title={`${committee.abbr} seats${seats.data ? ` · ${list.length}` : ''}`} icon={Armchair} bodyClassName="p-0 pt-0 max-md:p-3"
      aside={seats.data && list.length ? <span className="font-mono text-sm text-muted-foreground">{filled} filled · {list.length - filled} with room</span> : undefined}>
      <Loaded pad load={seats} what="seats" empty={(d) => (d.length ? null : `No seats in ${committee.abbr} yet. Paste a list to add them.`)}>
        {(d) => (
          <>
            <div className="tbl-scroll w-full max-md:hidden">
              <Table className="text-base">
                <TableHeader>
                  <TableRow>
                    <TableHead className="ps-5">Seat</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Delegates</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pe-5 text-right"><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.map((s) => {
                    const st = seatState(s);
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="ps-5 font-semibold">{s.label}</TableCell>
                        <TableCell className="text-muted-foreground">{s.capacity === 2 ? 'Double' : 'Single'}</TableCell>
                        <TableCell className="max-w-72 whitespace-normal">{s.holders.length ? s.holders.map((h) => h.fullName).join(', ') : <span className="text-muted-foreground">Nobody yet</span>}</TableCell>
                        <TableCell><Tag tone={st.tone}>{st.word}</Tag></TableCell>
                        <TableCell className="pe-5 text-right"><RemoveSeat s={s} /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <ul className="flex w-full flex-col divide-y divide-border md:hidden" aria-label={`${committee.abbr} seats`}>
              {d.map((s) => {
                const st = seatState(s);
                return (
                  <li key={s.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{s.label}<span className="ms-2 text-sm font-normal text-muted-foreground">{s.capacity === 2 ? 'Double' : 'Single'}</span></p>
                      <p className="truncate text-sm text-muted-foreground">{s.holders.length ? s.holders.map((h) => h.fullName).join(', ') : 'Nobody yet'}</p>
                    </div>
                    <Tag tone={st.tone}>{st.word}</Tag>
                    <RemoveSeat s={s} />
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Loaded>
    </Panel>
  );
}

function RemoveSeat({ s }: { s: Seat }) {
  const { run, pending } = useAction();
  if (s.holders.length) return <span className="inline-block size-11" aria-hidden="true" />;
  return (
    <Button variant="ghost" size="icon-sm" aria-label={`Remove the empty seat ${s.label}`} loading={pending === 'rm'}
      onClick={() => void run('rm', (a) => a.removeSeat(s.id), `Removed ${s.label}`)}>
      <Trash2 aria-hidden="true" />
    </Button>
  );
}

function AddSeats({ committee }: { committee: Committee }) {
  const { run, pending } = useAction();
  const [text, setText] = useState('');
  const [cap, setCap] = useState<1 | 2>(1);
  const labels = [...new Set(text.split(/\n|,|;/).map((l) => l.trim()).filter(Boolean))];
  const add = async () => {
    const ok = await run('add', (a) => a.addSeats(committee.id, labels, cap), (r) =>
      `Added ${r.added} seat${r.added === 1 ? '' : 's'} to ${committee.abbr}${r.skipped.length ? `. Already there: ${r.skipped.join(', ')}` : ''}`);
    if (ok) setText('');
  };
  return (
    <Panel title="Add seats" icon={Plus}>
      <form className="flex w-full flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void add(); }}>
        <Field label="Seat names" hint="One per line, or separated by commas. Countries or portfolios.">
          {(id, by) => <Textarea id={id} aria-describedby={by} rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder={'France\nJapan\nKenya'} className="font-mono text-[15px]" />}
        </Field>
        <div className="flex flex-col gap-1.5">
          <span id="cap-l" className={labelCls}>Delegates per seat</span>
          <SegmentedControl aria-labelledby="cap-l" className="grid w-full grid-cols-2 rounded-none">
            {([1, 2] as const).map((n) => (
              <SegmentedControlItem key={n} render={<button type="button" aria-pressed={cap === n} onClick={() => setCap(n)} />}
                className={cn('h-11 font-label text-lg font-semibold sm:h-11 sm:text-lg', cap === n && 'bg-card! text-foreground!')}>
                {n === 1 ? '1 · single' : '2 · double'}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        </div>
        <Button type="submit" className="self-start max-md:w-full" disabled={!labels.length} loading={pending === 'add'}>
          <Plus aria-hidden="true" /> {labels.length > 1 ? `Add ${labels.length} seats` : 'Add seat'}
        </Button>
        <p className="text-sm text-muted-foreground">Room: {committee.room ?? TBA}</p>
      </form>
    </Panel>
  );
}
