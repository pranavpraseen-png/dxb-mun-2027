// Docs and notices: the committee's files (a big + adds a file or a link) and committee announcements.
import { useState } from 'react';
import { AlertTriangle, ExternalLink, FileText, Files, Link2, Megaphone, Plus, Send, Trash2, Upload } from 'lucide-react';
import type { Announcement, FileKind, LibraryFile } from '@/platform/v2';
import { Button } from '../../portal/ui/coss/button';
import { Input } from '../../portal/ui/coss/input';
import { Label } from '../../portal/ui/coss/label';
import { Textarea } from '../../portal/ui/coss/textarea';
import { Checkbox } from '../../portal/ui/coss/checkbox';
import { useToast } from '../../portal/lib/toast';
import { useAction, useChair, useLoad, errorText } from '../lib/data';
import { Choices, Empty, Loaded, PageHead, Panel, Pick, Tag, when } from '../ui/kit';
import { FormDialog } from '../ui/form-dialog';
import { Confirm } from '../ui/confirm';

const KINDS: { value: FileKind; label: string }[] = [
  { value: 'guide', label: 'Background guide' }, { value: 'rules', label: 'Rules of procedure' }, { value: 'handbook', label: 'Handbook' },
  { value: 'schedule', label: 'Schedule' }, { value: 'map', label: 'Map' }, { value: 'research', label: 'Research' }, { value: 'other', label: 'Other' },
];
const kindWord = (k: FileKind) => KINDS.find((x) => x.value === k)?.label ?? 'Other';
const size = (b: number | null) => (b === null ? null : b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);

export function DocsScreen() {
  return (
    <>
      <PageHead title="Docs and notices" line="Files and notices for your committee only." aside={<AddFile />} />
      <div className="two-col">
        <div className="col"><FilesPanel /></div>
        <div className="col"><NoticesPanel /></div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ files */
function AddFile() {
  const { run } = useAction();
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<FileKind>('guide');
  const [mode, setMode] = useState<'file' | 'link'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState('');
  const linkOk = /^https?:\/\/\S+\.\S+/.test(link.trim());
  const ok = !!title.trim() && (mode === 'file' ? !!file : linkOk);
  return (
    <FormDialog
      title="Add a committee file"
      submit="Add file"
      canSubmit={ok}
      onOpen={() => { setTitle(''); setKind('guide'); setMode('file'); setFile(null); setLink(''); }}
      onSubmit={() => run((a, c) => a.addFile(c, mode === 'file' ? { title: title.trim(), kind, file: file! } : { title: title.trim(), kind, link: link.trim() }), 'File added')}
      trigger={<Button size="xl" className="max-md:w-full"><Plus className="size-6!" aria-hidden="true" /> Add file</Button>}
    >
      <Label htmlFor="f-title" className="text-base font-semibold">Title</Label>
      <Input id="f-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Background guide" maxLength={100} />
      <Label className="text-base font-semibold">Kind</Label>
      <Pick label="Kind" value={kind} onChange={(v) => setKind((v || 'other') as FileKind)} placeholder="Choose a kind" options={KINDS} />
      <Choices label="File or link" value={mode} onChange={setMode} options={[{ value: 'file', label: <><Upload aria-hidden="true" /> File</> }, { value: 'link', label: <><Link2 aria-hidden="true" /> Link</> }]} />
      {mode === 'file' ? (
        <>
          <Label htmlFor="f-file" className="text-base font-semibold">File</Label>
          <Input id="f-file" type="file" nativeInput onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </>
      ) : (
        <>
          <Label htmlFor="f-link" className="text-base font-semibold">Link</Label>
          <Input id="f-link" type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" aria-invalid={(!!link && !linkOk) || undefined} />
        </>
      )}
    </FormDialog>
  );
}

function FilesPanel() {
  const files = useLoad((a, c) => a.files(c), ['files']);
  return (
    <Panel title="Committee files" icon={Files}>
      <Loaded load={files} what="files" lines={5}>
        {(list) => list.length ? (
          <ul className="flex flex-col divide-y border-y">{list.map((f) => <FileRow key={f.id} f={f} />)}</ul>
        ) : <Empty title="No files yet" line="Add the background guide and rules with the + button." icon={Files} />}
      </Loaded>
    </Panel>
  );
}

function FileRow({ f }: { f: LibraryFile }) {
  const { run } = useAction();
  const { api } = useChair();
  const toast = useToast();
  const open = async () => {
    if (f.link) { window.open(f.link, '_blank', 'noopener'); return; }
    const w = window.open('', '_blank');
    try {
      const url = await api.openFile(f.id);
      if (w) { w.opener = null; w.location.href = url; } else window.open(url, '_blank', 'noopener');
    } catch (e) { w?.close(); toast(errorText(e), 'error'); }
  };
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-3">
      {f.link ? <Link2 size={20} aria-hidden="true" className="shrink-0 text-primary" /> : <FileText size={20} aria-hidden="true" className="shrink-0 text-primary" />}
      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-semibold">{f.title}</p>
        <p className="text-sm text-muted-foreground">
          {kindWord(f.kind)} · {f.scope === 'conference' ? 'Whole conference' : 'This committee'}{size(f.sizeBytes) ? ` · ${size(f.sizeBytes)}` : ''} · {when(f.addedAt, false)}
        </p>
      </div>
      <div className="flex gap-1.5">
        <Button size="sm" variant="outline" onClick={() => void open()} aria-label={`Open ${f.title}`}><ExternalLink aria-hidden="true" /> Open</Button>
        {f.canRemove && (
          <Confirm title="Remove this file?" line={f.title} confirm="Remove" danger
            onConfirm={() => run((a) => a.removeFile(f.id), 'File removed')}
            trigger={<Button size="icon-sm" variant="ghost" aria-label={`Remove ${f.title}`}><Trash2 aria-hidden="true" /></Button>} />
        )}
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ notices */
function NoticesPanel() {
  const notes = useLoad((a, c) => a.announcements(c), ['announcements']);
  const { run, pending } = useAction();
  const { committee } = useChair();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [urgent, setUrgent] = useState(false);
  return (
    <Panel title="Committee notices" icon={Megaphone}>
      <form className="flex flex-col gap-2.5" onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        const ok = await run((a, c) => a.announce(c, { title: title.trim(), body: body.trim() || null, urgent }), urgent ? 'Urgent notice posted' : 'Notice posted');
        if (ok) { setTitle(''); setBody(''); setUrgent(false); }
      }}>
        <Label htmlFor="n-title" className="text-base font-semibold">Title</Label>
        <Input id="n-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Back in the room in 5 minutes" maxLength={100} />
        <Label htmlFor="n-body" className="text-base font-semibold">Details (optional)</Label>
        <Textarea id="n-body" rows={3} value={body} onChange={(e) => setBody(e.target.value)} maxLength={600} />
        <Label className="flex min-h-11 cursor-pointer items-center gap-3 text-base font-normal">
          <Checkbox checked={urgent} onCheckedChange={(v) => setUrgent(!!v)} className="size-6 sm:size-6 [&_svg]:size-4!" />
          <span><strong>Urgent</strong>: pops up on every delegate's screen</span>
        </Label>
        <Button type="submit" size="lg" className="self-start" disabled={!title.trim()} loading={pending}><Send aria-hidden="true" /> Post to {committee.abbr}</Button>
      </form>
      <div className="border-t pt-3">
        <Loaded load={notes} what="notices" lines={4}>
          {(list) => list.length ? <ul className="flex flex-col divide-y">{list.map((a) => <Notice key={a.id} a={a} />)}</ul>
            : <Empty title="No notices yet" icon={Megaphone} />}
        </Loaded>
      </div>
    </Panel>
  );
}

function Notice({ a }: { a: Announcement }) {
  return (
    <li className="flex flex-col gap-1 py-3 first:pt-0">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-lg font-semibold">{a.title}</p>
        {a.urgent && <Tag tone="bad" icon={AlertTriangle}>Urgent</Tag>}
      </div>
      {a.body && <p className="max-w-[70ch] whitespace-pre-line text-base">{a.body}</p>}
      <p className="text-sm text-muted-foreground">{a.from === 'chair' ? 'From the dais' : 'From the secretariat'} · {when(a.publishedAt)}</p>
    </li>
  );
}
