// Chits: every note in the committee, newest first. Hold or deliver each one, reply to notes sent to the
// dais, and send a note to one seat or to all seats.
import { useState } from 'react';
import { ArrowRight, Ban, CheckCircle2, Hourglass, MessageSquareText, Reply, Send } from 'lucide-react';
import type { Chit, SeatRef } from '@/platform/v2';
import { cn } from '../../portal/ui/coss/utils';
import { Button } from '../../portal/ui/coss/button';
import { Label } from '../../portal/ui/coss/label';
import { Textarea } from '../../portal/ui/coss/textarea';
import { useAction, useLoad } from '../lib/data';
import { Choices, Empty, Loaded, PageHead, Panel, Pick, Tag, timeOnly, type Tone } from '../ui/kit';

const MAX = 300;
const STATUS: Record<Chit['status'], { tone: Tone; word: string; icon: typeof Ban }> = {
  pending: { tone: 'wait', word: 'Waiting', icon: Hourglass },
  delivered: { tone: 'ok', word: 'Delivered', icon: CheckCircle2 },
  blocked: { tone: 'bad', word: 'Held', icon: Ban },
};
type Filter = 'all' | 'dais' | 'pending' | 'blocked';
const who = (s: SeatRef | null, dais: string) => s?.label ?? dais;

export function ChitsScreen() {
  const chits = useLoad((a, c) => a.chits(c), ['chits']);
  const seats = useLoad((a, c) => a.seats(c), ['seat']);
  const [filter, setFilter] = useState<Filter>('all');
  const seatList = (seats.data ?? []).map((s) => s.seat);
  return (
    <>
      <PageHead title="Chits" line="You can read every chit. Hold one back, or deliver it." />
      <div className="run-grid">
        <div className="col">
          <Loaded load={chits} what="chits" lines={8}>
            {(all) => {
              const n = (f: Filter) => all.filter((c) => match(c, f)).length;
              const shown = all.filter((c) => match(c, filter));
              return (
                <Panel title="All chits" icon={MessageSquareText} aside={<Tag tone={n('pending') ? 'wait' : 'off'}>{n('pending')} waiting</Tag>}>
                  <Choices label="Show" size="default" value={filter} onChange={setFilter} options={[
                    { value: 'all', label: `All ${all.length}` },
                    { value: 'dais', label: `To the dais ${n('dais')}` },
                    { value: 'pending', label: `Waiting ${n('pending')}` },
                    { value: 'blocked', label: `Held ${n('blocked')}` },
                  ]} />
                  {shown.length
                    ? <ul className="flex flex-col divide-y border-y">{shown.map((c) => <ChitRow key={c.id} chit={c} all={all} />)}</ul>
                    : <Empty title="No chits here" icon={MessageSquareText} />}
                </Panel>
              );
            }}
          </Loaded>
        </div>
        <div className="col">
          <Compose seats={seatList} />
        </div>
      </div>
    </>
  );
}

function match(c: Chit, f: Filter) {
  if (f === 'all') return true;
  if (f === 'dais') return c.to === null && c.from !== null;
  return c.status === f;
}

function ChitRow({ chit, all }: { chit: Chit; all: Chit[] }) {
  const { run, pending } = useAction();
  const [replying, setReplying] = useState(false);
  const [body, setBody] = useState('');
  const st = STATUS[chit.status];
  const toDais = chit.to === null && chit.from !== null;
  const fromDais = chit.from === null;
  const parent = chit.replyTo ? all.find((c) => c.id === chit.replyTo) : null;
  const send = async () => {
    if (!chit.from) return;
    const from = chit.from;
    const ok = await run((a, c) => a.sendChit(c, from.id, body.trim(), chit.id), `Reply sent to ${from.label}`);
    if (ok) { setBody(''); setReplying(false); }
  };
  return (
    <li className={cn('flex flex-col gap-2 py-3 ps-3', toDais ? 'border-s-4 border-s-primary' : 'border-s-4 border-s-transparent')}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-semibold">{who(chit.from, 'Dais')}</span>
        <ArrowRight size={16} aria-label="to" className="text-muted-foreground" />
        <span className="font-semibold">{chit.to ? chit.to.label : fromDais ? 'All seats' : 'Dais'}</span>
        <span className="text-sm text-muted-foreground">· {timeOnly(chit.createdAt)}</span>
        <span className="ms-auto"><Tag tone={st.tone} icon={st.icon}>{st.word}</Tag></span>
      </div>
      {parent && <p className="text-sm text-muted-foreground">Reply to: “{parent.body.slice(0, 80)}{parent.body.length > 80 ? '…' : ''}”</p>}
      <p className="max-w-[70ch] whitespace-pre-line text-lg">{chit.body}</p>
      <div className="flex flex-wrap gap-2">
        {!fromDais && chit.status !== 'delivered' && (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => void run((a) => a.setChitStatus(chit.id, 'delivered'), 'Chit delivered')}><CheckCircle2 aria-hidden="true" /> Deliver</Button>
        )}
        {!fromDais && chit.status !== 'blocked' && (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => void run((a) => a.setChitStatus(chit.id, 'blocked'), 'Chit held back')}><Ban aria-hidden="true" /> Hold</Button>
        )}
        {toDais && <Button size="sm" variant="outline" onClick={() => setReplying((r) => !r)} aria-expanded={replying}><Reply aria-hidden="true" /> Reply</Button>}
      </div>
      {replying && (
        <form className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); if (body.trim()) void send(); }}>
          <Label htmlFor={`rp-${chit.id}`} className="text-base">Reply to {chit.from?.label}</Label>
          <Textarea id={`rp-${chit.id}`} rows={2} value={body} onChange={(e) => setBody(e.target.value.slice(0, MAX))} autoFocus />
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={!body.trim()}><Send aria-hidden="true" /> Send reply</Button>
            <span className="text-sm text-muted-foreground">{body.length}/{MAX}</span>
          </div>
        </form>
      )}
    </li>
  );
}

function Compose({ seats }: { seats: SeatRef[] }) {
  const { run, pending } = useAction();
  const [to, setTo] = useState('all');
  const [body, setBody] = useState('');
  const label = to === 'all' ? 'all seats' : seats.find((s) => s.id === to)?.label ?? 'the seat';
  return (
    <Panel title="Send a chit" icon={Send}>
      <form className="flex flex-col gap-3" onSubmit={async (e) => {
        e.preventDefault();
        if (!body.trim()) return;
        const ok = await run((a, c) => a.sendChit(c, to === 'all' ? null : to, body.trim()), `Sent to ${label}`);
        if (ok) setBody('');
      }}>
        <div className="flex flex-col gap-1">
          <Label className="text-base font-semibold">To</Label>
          <Pick label="Send to" value={to} onChange={(v) => setTo(v || 'all')} placeholder="All seats" options={[{ value: 'all', label: 'All seats' }, ...seats.map((s) => ({ value: s.id, label: s.label }))]} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="cm-body" className="text-base font-semibold">Note</Label>
          <Textarea id="cm-body" rows={4} value={body} onChange={(e) => setBody(e.target.value.slice(0, MAX))} placeholder="Five minutes until the vote." />
          <span className="text-sm text-muted-foreground">{body.length}/{MAX}</span>
        </div>
        <Button type="submit" size="lg" className="self-start" disabled={!body.trim()} loading={pending}><Send aria-hidden="true" /> Send to {label}</Button>
      </form>
    </Panel>
  );
}
