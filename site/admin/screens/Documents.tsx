// Documents (DASHBOARD-PLAN.md §3.6): a big + to add conference-wide or committee files, or links (the
// handbook, rules of procedure, the schedule PDF, the venue map, background guides).
import { useMemo, useRef, useState } from 'react';
import { ExternalLink, FileText, FolderOpen, Link2, Plus, Trash2 } from 'lucide-react';
import type { FileKind, LibraryFile } from '@/platform/v2';
import { Button } from '../../portal/ui/coss/button';
import { Input } from '../../portal/ui/coss/input';
import { SegmentedControl, SegmentedControlItem } from '../../portal/ui/coss/segmented-control';
import { cn } from '../../portal/ui/coss/utils';
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle, DialogTrigger } from '../ui/coss/dialog';
import { errorText, useAction, useAdmin, useLoad } from '../lib/data';
import { useToast } from '../lib/toast';
import { ConfirmDialog } from '../ui/confirm';
import { Choice, Empty, Field, Head, Loaded, Panel, labelCls, when } from '../ui/kit';

const KIND: Record<FileKind, string> = {
  handbook: 'Delegate handbook', rules: 'Rules of procedure', guide: 'Background guide', schedule: 'Schedule',
  map: 'Venue map', research: 'Research', other: 'Other',
};
const size = (b: number | null) => (b == null ? null : b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);

export function DocumentsScreen() {
  const { committees } = useAdmin();
  const files = useLoad((a) => a.files(), [], ['files']);
  const groups = useMemo(() => {
    const list = files.data ?? [];
    const out: { key: string; title: string; items: LibraryFile[] }[] = [{ key: 'conf', title: 'Conference-wide', items: list.filter((f) => !f.committeeId) }];
    for (const c of committees) {
      const items = list.filter((f) => f.committeeId === c.id);
      if (items.length) out.push({ key: c.id, title: `${c.abbr} · ${c.name}`, items });
    }
    return out;
  }, [files.data, committees]);
  return (
    <>
      <Head title="Documents" line="Files and links every delegate, or one committee, can open." aside={<AddFile />} />
      <Loaded load={files} what="the documents">
        {() => (
          <div className="grid w-full items-start gap-4 lg:grid-cols-2">
            {groups.map((g) => <Group key={g.key} title={g.title} items={g.items} />)}
          </div>
        )}
      </Loaded>
    </>
  );
}

function Group({ title, items }: { title: string; items: LibraryFile[] }) {
  const { api } = useAdmin();
  const toast = useToast();
  const { run } = useAction();
  const [del, setDel] = useState<LibraryFile | null>(null);
  const open = async (f: LibraryFile) => {
    try { const url = await api.openFile(f.id); window.open(url, '_blank', 'noopener'); } catch (e) { toast(errorText(e), 'error'); }
  };
  return (
    <Panel title={title} icon={FolderOpen} aside={<span className="font-mono text-sm text-muted-foreground">{items.length}</span>}>
      {items.length === 0 ? <Empty>Nothing here yet. Use the + to add the handbook, rules or map.</Empty> : (
        <ul className="flex w-full flex-col divide-y divide-border">
          {items.map((f) => (
            <li key={f.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              {f.link ? <Link2 size={20} aria-hidden="true" className="shrink-0 text-primary" /> : <FileText size={20} aria-hidden="true" className="shrink-0 text-primary" />}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{f.title}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {KIND[f.kind]} · {f.link ? 'Link' : [f.fileName, size(f.sizeBytes)].filter(Boolean).join(', ')} · {when(f.addedAt, { time: false })}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => void open(f)} aria-label={`Open ${f.title}`}><ExternalLink aria-hidden="true" /><span className="max-sm:hidden">Open</span></Button>
              {f.canRemove && <Button variant="ghost" size="icon-sm" aria-label={`Remove ${f.title}`} onClick={() => setDel(f)}><Trash2 aria-hidden="true" /></Button>}
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog open={!!del} onOpenChange={(o) => { if (!o) setDel(null); }} danger
        title={`Remove “${del?.title ?? ''}”?`} line="Delegates and chairs can no longer open it." confirm="Remove"
        onConfirm={() => del && run('rm', (a) => a.removeFile(del.id), `Removed ${del.title}`)} />
    </Panel>
  );
}

function AddFile() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="xl" className="max-md:w-full" />}>
        <Plus aria-hidden="true" className="size-7!" strokeWidth={2.6} /> Add file or link
      </DialogTrigger>
      {open && <AddForm onClose={() => setOpen(false)} />}
    </Dialog>
  );
}

function AddForm({ onClose }: { onClose: () => void }) {
  const { committees } = useAdmin();
  const { run, pending } = useAction();
  const [mode, setMode] = useState<'file' | 'link'>('file');
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<FileKind>('handbook');
  const [cid, setCid] = useState('');
  const [link, setLink] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const linkOk = /^https?:\/\/\S+\.\S+/.test(link.trim());
  const ok = title.trim() && (mode === 'file' ? !!file : linkOk);
  const save = async () => {
    const where = cid ? committees.find((c) => c.id === cid)?.abbr ?? 'the committee' : 'everyone';
    const done = await run('add', (a) => a.addFile({ title: title.trim(), kind, committeeId: cid || null, ...(mode === 'file' ? { file: file! } : { link: link.trim() }) }), `Added “${title.trim()}” for ${where}`);
    if (done) onClose();
  };
  return (
    <DialogPopup className="rounded-sm">
      <form className="contents" onSubmit={(e) => { e.preventDefault(); if (ok) void save(); }}>
        <DialogHeader>
          <DialogTitle className="font-heading text-[28px] font-semibold leading-[1.1] tracking-[-0.01em]">Add a document</DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">Upload a file, or paste a link.</DialogDescription>
        </DialogHeader>
        <DialogPanel className="flex flex-col gap-4">
          <SegmentedControl aria-label="File or link" className="grid w-full grid-cols-2 rounded-none">
            {(['file', 'link'] as const).map((m) => (
              <SegmentedControlItem key={m} render={<button type="button" aria-pressed={mode === m} onClick={() => setMode(m)} />}
                className={cn('h-11 font-label text-lg font-semibold sm:h-11 sm:text-lg', mode === m && 'bg-card! text-foreground!')}>
                {m === 'file' ? <><FileText aria-hidden="true" /> File</> : <><Link2 aria-hidden="true" /> Link</>}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
          {mode === 'file' ? (
            <div className="flex flex-col gap-1.5">
              <span className={labelCls}>File</span>
              <input ref={fileRef} type="file" className="sr-only" id="doc-file" accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg"
                onChange={(e) => { const f = e.target.files?.[0] ?? null; setFile(f); if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, '')); }} />
              <Button variant="outline" className="justify-start" onClick={() => fileRef.current?.click()}>
                <FileText aria-hidden="true" /> <span className="truncate">{file ? file.name : 'Choose a file'}</span>
              </Button>
            </div>
          ) : (
            <Field label="Link" hint="A full address, starting with https://">
              {(id, by) => <Input id={id} aria-describedby={by} type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" />}
            </Field>
          )}
          <Field label="Title">{(id) => <Input id={id} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Delegate handbook" required />}</Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kind">{(id) => <Choice id={id} value={kind} onChange={(v) => setKind((v || 'other') as FileKind)} placeholder="Kind" options={(Object.keys(KIND) as FileKind[]).map((k) => ({ value: k, label: KIND[k] }))} />}</Field>
            <Field label="For">{(id) => <Choice id={id} value={cid} onChange={setCid} placeholder="Everyone (conference-wide)" options={committees.map((c) => ({ value: c.id, label: `${c.abbr} only` }))} />}</Field>
          </div>
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button type="submit" disabled={!ok} loading={pending === 'add'}><Plus aria-hidden="true" /> Add</Button>
        </DialogFooter>
      </form>
    </DialogPopup>
  );
}
