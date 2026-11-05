// Announcements (DASHBOARD-PLAN.md §3.7): post to everyone, to delegates, to chairs, or to one committee, and
// mark it urgent (urgent ones pop up on delegates' screens). The list, newest first, with remove.
import { useState } from 'react';
import { Megaphone, Send, Trash2 } from 'lucide-react';
import type { Announcement } from '@/platform/v2';
import { Button } from '../../portal/ui/coss/button';
import { Input } from '../../portal/ui/coss/input';
import { Textarea } from '../../portal/ui/coss/textarea';
import { Label } from '../../portal/ui/coss/label';
import { Switch } from '../ui/coss/switch';
import { useAction, useAdmin, useLoad } from '../lib/data';
import { ConfirmDialog } from '../ui/confirm';
import { Choice, Field, Head, Loaded, Panel, Tag, when } from '../ui/kit';

type Audience = 'all' | 'delegates' | 'chairs' | 'committee';
const AUD: { value: Audience; label: string }[] = [
  { value: 'all', label: 'Everyone' }, { value: 'delegates', label: 'All delegates' }, { value: 'chairs', label: 'All chairs' }, { value: 'committee', label: 'One committee' },
];

export function AnnouncementsScreen() {
  const list = useLoad((a) => a.announcements(), [], ['announcements']);
  return (
    <>
      <Head title="Announcements" line="Short notices. Urgent ones pop up on every screen." />
      <div className="grid w-full items-start gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Compose />
        <Panel title={`Posted${list.data ? ` · ${list.data.length}` : ''}`} icon={Megaphone}>
          <Loaded load={list} what="announcements" empty={(d) => (d.length ? null : 'Nothing posted yet.')}>
            {(d) => <ul className="flex w-full flex-col divide-y divide-border">{d.map((a) => <Item key={a.id} a={a} />)}</ul>}
          </Loaded>
        </Panel>
      </div>
    </>
  );
}

function Compose() {
  const { committees } = useAdmin();
  const { run, pending } = useAction();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [aud, setAud] = useState<Audience>('all');
  const [cid, setCid] = useState('');
  const [urgent, setUrgent] = useState(false);
  const ok = title.trim() && (aud !== 'committee' || cid);
  const post = async () => {
    const to = aud === 'committee' ? committees.find((c) => c.id === cid)?.abbr ?? 'the committee' : AUD.find((x) => x.value === aud)!.label.toLowerCase();
    const done = await run('post', (a) => a.announce({ title: title.trim(), body: body.trim() || null, urgent, audience: aud, committeeId: aud === 'committee' ? cid : null }), `Posted to ${to}${urgent ? ' (urgent)' : ''}`);
    if (done) { setTitle(''); setBody(''); setUrgent(false); }
  };
  return (
    <Panel title="New announcement" icon={Send}>
      <form className="flex w-full flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (ok) void post(); }}>
        <Field label="Title">{(id) => <Input id={id} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="A short headline" required />}</Field>
        <Field label="Details (optional)">{(id) => <Textarea id={id} rows={3} value={body} onChange={(e) => setBody(e.target.value)} maxLength={600} />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Who sees it">{(id) => <Choice id={id} value={aud === 'all' ? '' : aud} onChange={(v) => setAud((v || 'all') as Audience)} placeholder="Everyone" options={AUD.filter((x) => x.value !== 'all')} />}</Field>
          {aud === 'committee' && (
            <Field label="Committee">{(id) => <Choice id={id} value={cid} onChange={setCid} placeholder="Choose one" options={committees.map((c) => ({ value: c.id, label: `${c.abbr} · ${c.name}` }))} />}</Field>
          )}
        </div>
        <Label className="flex min-h-11 cursor-pointer items-center gap-3 text-[17px] font-semibold sm:text-[17px]">
          <Switch checked={urgent} onCheckedChange={setUrgent} />
          <span>Urgent <span className="font-normal text-muted-foreground">· pops up on screen</span></span>
        </Label>
        <Button type="submit" className="self-start max-md:w-full" disabled={!ok} loading={pending === 'post'}><Send aria-hidden="true" /> Post</Button>
      </form>
    </Panel>
  );
}

function Item({ a }: { a: Announcement }) {
  const { committees } = useAdmin();
  const { run } = useAction();
  const [del, setDel] = useState(false);
  const where = a.committeeId ? committees.find((c) => c.id === a.committeeId)?.abbr ?? 'One committee' : 'Conference-wide';
  return (
    <li className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {a.urgent && <Tag tone="problem">Urgent</Tag>}
          <p className="font-semibold">{a.title}</p>
        </div>
        {a.body && <p className="mt-0.5 line-clamp-2 text-[15px] text-muted-foreground">{a.body}</p>}
        <p className="mt-1 text-sm text-muted-foreground">{a.from === 'chair' ? 'From a chair' : 'Secretariat'} · {where} · {when(a.publishedAt)}</p>
      </div>
      <Button variant="ghost" size="icon-sm" aria-label={`Remove ${a.title}`} onClick={() => setDel(true)}><Trash2 aria-hidden="true" /></Button>
      <ConfirmDialog open={del} onOpenChange={setDel} danger title="Remove this announcement?" line={a.title} confirm="Remove"
        onConfirm={() => run('rm', (x) => x.removeAnnouncement(a.id), 'Announcement removed')} />
    </li>
  );
}

