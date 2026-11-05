// Schedule (DASHBOARD-PLAN.md §3.4): days 1–3, each with its items (title, start, end, location, everyone or one
// committee). Every timer and the delegates' Now page read from this. Unknown times show "To be announced".
import { useState } from 'react';
import { CalendarDays, Clock, MapPin, Pencil, Plus, Trash2, Users } from 'lucide-react';
import type { ScheduleItem } from '@/platform/v2';
import { Button } from '../../portal/ui/coss/button';
import { Input } from '../../portal/ui/coss/input';
import { SegmentedControl, SegmentedControlItem } from '../../portal/ui/coss/segmented-control';
import { cn } from '../../portal/ui/coss/utils';
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from '../ui/coss/dialog';
import { useAction, useAdmin, useLoad } from '../lib/data';
import { ConfirmDialog } from '../ui/confirm';
import { Choice, Empty, Field, Head, Loaded, Panel, TBA, fromDubaiInput, labelCls, toDubaiInput, when } from '../ui/kit';

const DAYS = [1, 2, 3] as const;

export function timeRange(i: ScheduleItem): string {
  if (!i.startsAt) return TBA;
  const s = when(i.startsAt, { date: false });
  return i.endsAt ? `${s}–${when(i.endsAt, { date: false })}` : s;
}

export function ScheduleScreen() {
  const items = useLoad((a) => a.schedule(), [], ['schedule']);
  const [edit, setEdit] = useState<ScheduleItem | { day: number } | null>(null);
  return (
    <>
      <Head title="Schedule" line="Three days. Times are Dubai time." aside={<Button onClick={() => setEdit({ day: 1 })}><Plus aria-hidden="true" /> Add item</Button>} />
      <Loaded load={items} what="the schedule">
        {(list) => (
          <div className="grid w-full items-start gap-4 xl:grid-cols-3">
            {DAYS.map((d) => <DayPanel key={d} day={d} items={list.filter((i) => i.day === d)} onEdit={setEdit} />)}
          </div>
        )}
      </Loaded>
      <ItemDialog value={edit} onClose={() => setEdit(null)} />
    </>
  );
}

function DayPanel({ day, items, onEdit }: { day: number; items: ScheduleItem[]; onEdit: (i: ScheduleItem | { day: number }) => void }) {
  const { committees } = useAdmin();
  const { run } = useAction();
  const [del, setDel] = useState<ScheduleItem | null>(null);
  const date = items.find((i) => i.startsAt)?.startsAt;
  return (
    <Panel title={`Day ${day}`} icon={CalendarDays}
      aside={<span className="text-sm text-muted-foreground">{date ? when(date, { time: false }) : TBA}</span>}>
      {items.length === 0 ? <Empty>Nothing on day {day} yet.</Empty> : (
        <ul className="flex w-full flex-col divide-y divide-border" aria-label={`Day ${day}`}>
          {items.map((i) => {
            const who = i.committeeId ? committees.find((c) => c.id === i.committeeId)?.abbr ?? 'One committee' : 'Everyone';
            return (
              <li key={i.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-snug">{i.title}</p>
                  <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
                    <span className={cn('inline-flex items-center gap-1', i.startsAt && 'font-mono text-foreground')}><Clock size={13} aria-hidden="true" />{timeRange(i)}</span>
                    <span className="inline-flex items-center gap-1"><MapPin size={13} aria-hidden="true" />{i.location ?? TBA}</span>
                    <span className="inline-flex items-center gap-1"><Users size={13} aria-hidden="true" />{who}</span>
                  </p>
                </div>
                <div className="flex shrink-0">
                  <Button variant="ghost" size="icon-sm" aria-label={`Edit ${i.title}`} onClick={() => onEdit(i)}><Pencil aria-hidden="true" /></Button>
                  <Button variant="ghost" size="icon-sm" aria-label={`Remove ${i.title}`} onClick={() => setDel(i)}><Trash2 aria-hidden="true" /></Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Button variant="outline" size="sm" onClick={() => onEdit({ day })}><Plus aria-hidden="true" /> Add to day {day}</Button>
      <ConfirmDialog open={!!del} onOpenChange={(o) => { if (!o) setDel(null); }} danger
        title={`Remove “${del?.title ?? ''}”?`} line="It disappears from every dashboard." confirm="Remove"
        onConfirm={() => del && run('rm', (a) => a.removeScheduleItem(del.id), `Removed ${del.title}`)} />
    </Panel>
  );
}

function ItemDialog({ value, onClose }: { value: ScheduleItem | { day: number } | null; onClose: () => void }) {
  return (
    <Dialog open={value !== null} onOpenChange={(o) => { if (!o) onClose(); }}>
      {value && <ItemForm key={'id' in value ? value.id : `new-${value.day}`} item={'id' in value ? value : null} day={value.day} onClose={onClose} />}
    </Dialog>
  );
}

function ItemForm({ item, day: day0, onClose }: { item: ScheduleItem | null; day: number; onClose: () => void }) {
  const { committees } = useAdmin();
  const { run, pending } = useAction();
  const [title, setTitle] = useState(item?.title ?? '');
  const [day, setDay] = useState(item?.day ?? day0);
  const [start, setStart] = useState(toDubaiInput(item?.startsAt ?? null));
  const [end, setEnd] = useState(toDubaiInput(item?.endsAt ?? null));
  const [loc, setLoc] = useState(item?.location ?? '');
  const [cid, setCid] = useState(item?.committeeId ?? '');
  const bad = start && end && end <= start ? 'The end must be after the start.' : null;
  const save = async () => {
    const done = await run('save', (a) => a.saveScheduleItem({
      id: item?.id, day, title: title.trim(), startsAt: fromDubaiInput(start), endsAt: fromDubaiInput(end), location: loc.trim() || null, committeeId: cid || null,
    }), item ? 'Schedule item saved' : `Added to day ${day}`);
    if (done) onClose();
  };
  return (
    <DialogPopup className="rounded-sm">
      <form className="contents" onSubmit={(e) => { e.preventDefault(); if (title.trim() && !bad) void save(); }}>
        <DialogHeader>
          <DialogTitle className="font-heading text-[28px] font-semibold leading-[1.1] tracking-[-0.01em]">{item ? 'Edit item' : 'Add item'}</DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">Leave a time or place empty and it shows "{TBA}".</DialogDescription>
        </DialogHeader>
        <DialogPanel className="flex flex-col gap-4">
          <Field label="Title">{(id) => <Input id={id} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Committee session 1" required />}</Field>
          <div className="flex flex-col gap-1.5">
            <span id="day-l" className={labelCls}>Day</span>
            <SegmentedControl aria-labelledby="day-l" className="grid w-full grid-cols-3 rounded-none">
              {DAYS.map((d) => (
                <SegmentedControlItem key={d} render={<button type="button" aria-pressed={day === d} onClick={() => setDay(d)} />}
                  className={cn('h-11 font-label text-lg font-semibold sm:h-11 sm:text-lg', day === d && 'bg-card! text-foreground!')}>Day {d}</SegmentedControlItem>
              ))}
            </SegmentedControl>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Starts (Dubai)">{(id) => <Input id={id} type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />}</Field>
            <Field label="Ends (Dubai)">{(id) => <Input id={id} type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} aria-invalid={!!bad || undefined} />}</Field>
          </div>
          {bad && <p role="alert" className="font-semibold text-destructive">{bad}</p>}
          <Field label="Location">{(id) => <Input id={id} value={loc} onChange={(e) => setLoc(e.target.value)} placeholder={TBA} />}</Field>
          <Field label="For">
            {(id) => <Choice id={id} value={cid} onChange={setCid} placeholder="Everyone" options={committees.map((c) => ({ value: c.id, label: `${c.abbr} only` }))} />}
          </Field>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><Clock size={14} aria-hidden="true" /> Times are entered and shown in Dubai time.</p>
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button type="submit" disabled={!title.trim() || !!bad} loading={pending === 'save'}>{item ? 'Save' : 'Add item'}</Button>
        </DialogFooter>
      </form>
    </DialogPopup>
  );
}
