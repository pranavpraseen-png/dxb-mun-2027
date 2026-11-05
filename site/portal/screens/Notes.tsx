// Notes, two tabs (coss ui Tabs):
//   Chits     short notes to another seat or the dais (300 characters), an inbox and a sent list, reply,
//             and a "Held by the dais" state when the chair blocks one. The dais can read every chit.
//   My notes  a private notepad for mid-session: one box, a tag (POI, Doubt, Speech point, General),
//             Enter saves. Tick a note off once used; filter by tag.
import { useEffect, useMemo, useRef, useState } from 'react';
import { CornerUpLeft, Inbox, NotebookPen, Plus, Send, Trash2, X } from 'lucide-react';
import type { Chit, MyNote, NoteTag, SeatRef } from '@/platform/v2';
import { useAction, useLoad } from '../lib/data';
import { useConf } from '../lib/conf';
import { go, useRoute } from '../lib/route';
import { dayTime, timeOf } from '../lib/format';
import { Counter, Empty, ErrorBox, Field, PageHead, Panel, Plain, Row, Rows, SampleTag, ScreenSkeleton } from '../ui/kit';
import { Choice, CheckRow, TextArea } from '../ui/controls';
import { Button } from '../ui/coss/button';
import { Input } from '../ui/coss/input';
import { Badge } from '../ui/coss/badge';
import { Tabs, TabsList, TabsPanel, TabsTab } from '../ui/coss/tabs';
import { cn } from '../ui/coss/utils';
import { CHIT, Status } from '../ui/status';

/* ------------------------------------------------------------------ seen chits (per-browser convenience) */
const SEEN = 'dxbmun.v2.seenChits';
export function readSeenChits(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN) ?? '[]') as string[]); } catch { return new Set(); }
}
function markChitsSeen(ids: string[]) {
  try { localStorage.setItem(SEEN, JSON.stringify([...new Set([...readSeenChits(), ...ids])].slice(-500))); } catch { /* fine */ }
}

const TAB_CLS = 'h-12 grow-0 gap-2 rounded-none px-4 font-label text-xl font-semibold text-muted-foreground hover:bg-transparent! hover:text-foreground data-active:text-foreground sm:h-12 sm:text-xl';

export function NotesScreen() {
  const route = useRoute();
  const tab = route.section === 'mine' ? 'mine' : 'chits';
  return (
    <>
      <PageHead title="Notes" line={tab === 'chits' ? 'Chits to other seats and the dais. The dais can read every chit.' : 'Private. Only you can see these.'} />
      <Tabs value={tab} onValueChange={(v) => go('notes', String(v))} className="w-full gap-4">
        <TabsList variant="underline" aria-label="Notes" className="w-full justify-start border-b p-0 data-[orientation=horizontal]:py-0">
          <TabsTab value="chits" className={TAB_CLS}><Send aria-hidden="true" className="size-5!" /> Chits</TabsTab>
          <TabsTab value="mine" className={TAB_CLS}><NotebookPen aria-hidden="true" className="size-5!" /> My notes</TabsTab>
        </TabsList>
        <TabsPanel value="chits">{tab === 'chits' && <ChitsTab />}</TabsPanel>
        <TabsPanel value="mine">{tab === 'mine' && <MyNotesTab />}</TabsPanel>
      </Tabs>
    </>
  );
}

/* ------------------------------------------------------------------ chits */
const DAIS = '__dais';
const MAX = 300;

function ChitsTab() {
  const { seat, readOnly, demo } = useConf();
  const q = useLoad(async (a) => Promise.all([a.chits(), a.committeeSeats()]), ['chits']);
  const [box, setBox] = useState<'in' | 'out'>('in');
  const [to, setTo] = useState('');
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<Chit | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const { run, pending } = useAction();
  const text = useRef<HTMLTextAreaElement>(null);

  const chits = q.data?.[0];
  useEffect(() => { if (chits) markChitsSeen(chits.filter((c) => c.direction === 'in').map((c) => c.id)); }, [chits]);

  if (!q.data) return q.error ? <ErrorBox error={q.error} onRetry={q.reload} what="chits" /> : <ScreenSkeleton panels={2} />;
  const [all, seats] = q.data;
  const others: SeatRef[] = seats.filter((s) => s.id !== seat.seat.id);
  const inbox = all.filter((c) => c.direction === 'in');
  const sent = all.filter((c) => c.direction === 'out');
  const over = body.length > MAX;

  const reply = (c: Chit) => {
    setReplyTo(c);
    setTo(c.from ? c.from.id : DAIS);
    setTimeout(() => text.current?.focus(), 0);
  };
  const send = async () => {
    if (!to) { setErr('Choose who it is for.'); return; }
    if (!body.trim()) { setErr('Write something first.'); return; }
    if (over) { setErr(`Keep it to ${MAX} characters.`); return; }
    setErr(null);
    const ok = await run((a) => a.sendChit(to === DAIS ? null : to, body.trim(), replyTo?.id), 'Chit sent');
    if (ok) { setBody(''); setReplyTo(null); setBox('out'); }
  };

  return (
    <div className="grid-2">
      <div className="col">
        <Panel title={replyTo ? 'Reply' : 'New chit'} icon={Send}>
          {readOnly ? <Plain muted>The conference has ended. Chits are closed.</Plain> : (
            <form className="flex w-full flex-col gap-3.5" onSubmit={(e) => { e.preventDefault(); void send(); }} noValidate>
              {replyTo && (
                <div className="flex w-full items-start gap-2 border-s-4 border-primary bg-muted px-3 py-2">
                  <CornerUpLeft aria-hidden="true" className="mt-1 size-4 shrink-0 text-primary" />
                  <p className="min-w-0 flex-1 text-[16px]"><span className="text-muted-foreground">Replying to {replyTo.from?.label ?? 'the dais'}:</span> {replyTo.body}</p>
                  <Button type="button" variant="ghost" size="icon" aria-label="Cancel reply" onClick={() => setReplyTo(null)}><X aria-hidden="true" /></Button>
                </div>
              )}
              <Field label="To">
                {(id) => (
                  <Choice
                    id={id} label="To" value={to} onChange={(v) => { setTo(v); setErr(null); }} placeholder="Choose a seat or the dais"
                    options={[{ value: DAIS, label: 'The dais (your chairs)' }, ...others.map((s) => ({ value: s.id, label: s.label }))]}
                  />
                )}
              </Field>
              <Field label="Message">
                {(id) => (
                  <TextArea
                    id={id} ref={text} rows={4} value={body} aria-describedby={`${id}-count`}
                    onChange={(e) => { setBody(e.target.value); setErr(null); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void send(); } }}
                    aria-invalid={over || undefined}
                    placeholder="Short and polite"
                  />
                )}
              </Field>
              <div className="flex w-full flex-wrap items-center justify-between gap-2">
                <Counter value={body} max={MAX} />
                <Button type="submit" size="lg" loading={pending} disabled={!body.trim() || over}><Send aria-hidden="true" /> Send</Button>
              </div>
              {err && <p role="alert" className="font-semibold text-destructive">{err}</p>}
            </form>
          )}
        </Panel>
      </div>
      <div className="col">
        <Panel title="Chits" icon={Inbox} aside={demo && all.length ? <SampleTag /> : undefined}>
          <Tabs value={box} onValueChange={(v) => setBox(v as 'in' | 'out')} className="w-full gap-3">
            <TabsList variant="underline" aria-label="Chit folders" className="w-full justify-start border-b p-0 data-[orientation=horizontal]:py-0">
              <TabsTab value="in" className={cn(TAB_CLS, 'text-lg sm:text-lg')}>Inbox <span className="font-mono text-base">{inbox.length}</span></TabsTab>
              <TabsTab value="out" className={cn(TAB_CLS, 'text-lg sm:text-lg')}>Sent <span className="font-mono text-base">{sent.length}</span></TabsTab>
            </TabsList>
            <TabsPanel value="in">
              {inbox.length === 0 ? <Empty>No chits yet.</Empty> : (
                <Rows label="Inbox">{inbox.map((c) => <ChitRow key={c.id} c={c} all={all} onReply={readOnly ? undefined : () => reply(c)} />)}</Rows>
              )}
            </TabsPanel>
            <TabsPanel value="out">
              {sent.length === 0 ? <Empty>You haven't sent a chit.</Empty> : (
                <Rows label="Sent">{sent.map((c) => <ChitRow key={c.id} c={c} all={all} />)}</Rows>
              )}
            </TabsPanel>
          </Tabs>
        </Panel>
      </div>
    </div>
  );
}

function ChitRow({ c, all, onReply }: { c: Chit; all: Chit[]; onReply?: () => void }) {
  const who = c.direction === 'in' ? `From ${c.from?.label ?? 'the dais'}` : `To ${c.to?.label ?? 'the dais'}`;
  const parent = c.replyTo ? all.find((x) => x.id === c.replyTo) : null;
  return (
    <Row className="flex-col items-stretch gap-1.5 py-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-label text-lg font-semibold">{who}</span>
        <span className="font-mono text-[14px] text-muted-foreground">{timeOf(c.createdAt)}</span>
        {(c.direction === 'out' || c.status === 'blocked') && <Status s={CHIT[c.status]} className="ms-auto" />}
      </div>
      {parent && <p className="truncate border-s-2 ps-2 text-[15px] text-muted-foreground">Re: {parent.body}</p>}
      <p className={cn('whitespace-pre-wrap break-words text-[17px]', c.status === 'blocked' && 'text-muted-foreground')}>{c.body}</p>
      {onReply && c.status !== 'blocked' && (
        <Button variant="outline" size="sm" className="self-start" onClick={onReply}><CornerUpLeft aria-hidden="true" /> Reply</Button>
      )}
    </Row>
  );
}

/* ------------------------------------------------------------------ my notes */
const TAGS: { id: NoteTag; label: string }[] = [
  { id: 'poi', label: 'POI' },
  { id: 'doubt', label: 'Doubt' },
  { id: 'speech', label: 'Speech point' },
  { id: 'general', label: 'General' },
];
const TAG_LABEL = Object.fromEntries(TAGS.map((t) => [t.id, t.label])) as Record<NoteTag, string>;

function Chip({ on, onClick, children, count }: { on: boolean; onClick: () => void; children: string; count?: number }) {
  return (
    <Button type="button" size="sm" variant={on ? 'default' : 'outline'} aria-pressed={on} onClick={onClick} className="rounded-full px-3.5">
      {children}{count !== undefined && <span className="font-mono text-sm">{count}</span>}
    </Button>
  );
}

function MyNotesTab() {
  const { readOnly } = useConf();
  const q = useLoad((a) => a.myNotes());
  const [body, setBody] = useState('');
  const [tag, setTag] = useState<NoteTag>('general');
  const [filter, setFilter] = useState<NoteTag | 'all'>('all');
  const { run, pending } = useAction();
  const box = useRef<HTMLInputElement>(null);
  // Desktop: the box is ready to type in. Phones: no auto-focus, so the keyboard doesn't cover the list.
  useEffect(() => { if (!readOnly && window.matchMedia('(min-width: 768px)').matches) box.current?.focus(); }, [readOnly]);

  const notes = q.data ?? [];
  const shown = useMemo(() => {
    const f = filter === 'all' ? notes : notes.filter((n) => n.tag === filter);
    return [...f.filter((n) => !n.done), ...f.filter((n) => n.done)];
  }, [notes, filter]);

  const save = async () => {
    const v = body.trim();
    if (!v || pending) return;
    const ok = await run((a) => a.saveNote({ body: v, tag }), null);
    if (ok) { setBody(''); box.current?.focus(); }
  };

  return (
    <div className="flex flex-col gap-5">
      {!readOnly && (
        <Panel title="Quick note" icon={Plus}>
          <form className="flex w-full flex-col gap-3" onSubmit={(e) => { e.preventDefault(); void save(); }}>
            <div className="flex w-full gap-2 max-md:flex-col">
              <Input
                ref={box} value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000}
                aria-label="New note" placeholder="Type, then press Enter"
                className="flex-1 *:data-[slot=input]:h-14 *:data-[slot=input]:text-xl"
              />
              <Button type="submit" size="xl" loading={pending} disabled={!body.trim()} className="max-md:w-full"><Plus aria-hidden="true" /> Save</Button>
            </div>
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Tag for the new note">
              {TAGS.map((t) => <Chip key={t.id} on={tag === t.id} onClick={() => { setTag(t.id); box.current?.focus(); }}>{t.label}</Chip>)}
            </div>
          </form>
        </Panel>
      )}
      <Panel title="My notes" icon={NotebookPen} aside={<span className="font-mono text-muted-foreground">{notes.filter((n) => !n.done).length} open</span>}>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Show notes tagged">
          <Chip on={filter === 'all'} onClick={() => setFilter('all')} count={notes.length}>All</Chip>
          {TAGS.map((t) => <Chip key={t.id} on={filter === t.id} onClick={() => setFilter(t.id)} count={notes.filter((n) => n.tag === t.id).length}>{t.label}</Chip>)}
        </div>
        {!q.data ? (q.error ? <ErrorBox error={q.error} onRetry={q.reload} what="your notes" /> : <ScreenSkeleton panels={1} />) : shown.length === 0 ? (
          <Empty>{notes.length ? 'No notes with this tag.' : 'No notes yet. Type one above and press Enter.'}</Empty>
        ) : (
          <Rows label="My notes">{shown.map((n) => <NoteRow key={n.id} n={n} />)}</Rows>
        )}
      </Panel>
    </div>
  );
}

function NoteRow({ n }: { n: MyNote }) {
  const { readOnly } = useConf();
  const { run, pending } = useAction();
  return (
    <Row className="items-start gap-2 py-2.5">
      <CheckRow
        checked={n.done} disabled={readOnly || pending}
        onChange={(v) => void run((a) => a.setNoteDone(n.id, v), null)}
        className="min-w-0 flex-1 py-1"
      >
        <span className="flex flex-col gap-1">
          <span className={cn('break-words text-[18px]', n.done && 'text-muted-foreground line-through')}>{n.body}</span>
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="h-6 px-1.5 font-label text-[13px] font-semibold uppercase sm:h-6 sm:text-[13px] tracking-[0.06em]">{TAG_LABEL[n.tag]}</Badge>
            <span className="font-mono text-[14px] text-muted-foreground">{dayTime(n.createdAt)}</span>
            <span className="sr-only">{n.done ? 'Done' : 'Not done'}</span>
          </span>
        </span>
      </CheckRow>
      {!readOnly && (
        <Button variant="ghost" size="icon" aria-label={`Delete note: ${n.body.slice(0, 40)}`} disabled={pending} onClick={() => void run((a) => a.deleteNote(n.id), 'Note deleted')}>
          <Trash2 aria-hidden="true" />
        </Button>
      )}
    </Row>
  );
}
