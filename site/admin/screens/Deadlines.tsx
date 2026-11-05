// Deadlines (DASHBOARD-PLAN.md §3.5): position paper, resolution and registration. An empty date shows as
// "To be announced" on every dashboard.
import { useState } from 'react';
import { CalendarClock, FileText, ScrollText, UserPlus } from 'lucide-react';
import type { Deadline } from '@/platform/v2';
import { Button } from '../../portal/ui/coss/button';
import { Input } from '../../portal/ui/coss/input';
import { useAction, useLoad, useNow } from '../lib/data';
import { Head, Loaded, Panel, TBA, Tag, fromDubaiInput, labelCls, toDubaiInput, when } from '../ui/kit';

const ICON = { position_paper: FileText, resolution: ScrollText, registration: UserPlus } as const;
const ORDER: Deadline['key'][] = ['position_paper', 'resolution', 'registration'];

export function DeadlinesScreen() {
  const list = useLoad((a) => a.deadlines(), [], ['schedule']);
  return (
    <>
      <Head title="Deadlines" line="Delegates see a countdown to each one. Times are Dubai time." />
      <Loaded load={list} what="the deadlines">
        {(d) => (
          <div className="grid w-full items-start gap-4 lg:grid-cols-3">
            {[...d].sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key)).map((x) => <DeadlineCard key={x.key} d={x} />)}
          </div>
        )}
      </Loaded>
    </>
  );
}

function DeadlineCard({ d }: { d: Deadline }) {
  const { run, pending } = useAction();
  const [v, setV] = useState(toDubaiInput(d.dueAt));
  const now = useNow(60_000);
  const changed = v !== toDubaiInput(d.dueAt);
  const passed = d.dueAt ? Date.parse(d.dueAt) < now : false;
  const id = `dl-${d.key}`;
  return (
    <Panel title={d.label} icon={ICON[d.key] ?? CalendarClock}>
      {d.dueAt
        ? <div className="flex flex-col gap-1.5">
            <p className="font-heading text-[30px] font-semibold leading-[1.1] tracking-[-0.01em]">{when(d.dueAt)}</p>
            {passed ? <Tag tone="locked">Passed</Tag> : <Tag tone="waiting">Open</Tag>}
          </div>
        : <div className="flex flex-col gap-1.5"><p className="font-heading text-[30px] font-semibold leading-[1.1] text-muted-foreground tracking-[-0.01em]">{TBA}</p><Tag tone="locked">No date set</Tag></div>}
      <form className="flex w-full flex-col gap-2" onSubmit={(e) => { e.preventDefault(); if (changed) void run('save', (a) => a.setDeadline(d.key, fromDubaiInput(v)), v ? `${d.label} saved` : `${d.label}: ${TBA.toLowerCase()}`); }}>
        <label htmlFor={id} className={labelCls}>Due (Dubai)</label>
        <Input id={id} type="datetime-local" value={v} onChange={(e) => setV(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={!changed} loading={pending === 'save'}>Save</Button>
          {d.dueAt && (
            <Button type="button" variant="ghost" loading={pending === 'clr'}
              onClick={() => void run('clr', (a) => a.setDeadline(d.key, null), `${d.label}: ${TBA.toLowerCase()}`).then((ok) => ok && setV(''))}>
              Clear (to be announced)
            </Button>
          )}
        </div>
      </form>
    </Panel>
  );
}
