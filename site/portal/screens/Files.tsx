// Files: Conference, Committee, Mine and Shared with me. The big + adds a file or a link (title, kind,
// optional sharing to seats), in a coss ui Sheet. Every file opens in a new tab.
import { useState } from 'react';
import { ExternalLink, FolderOpen, Landmark, Link2, Plus, Share2, Trash2, Upload, UserRound, Users } from 'lucide-react';
import type { FileKind, FileScope, LibraryFile, SeatRef } from '@/platform/v2';
import { errorText, useAction, useApi, useLoad } from '../lib/data';
import { useConf } from '../lib/conf';
import { useToast } from '../lib/toast';
import { dayOf, openInNewTab, sizeText } from '../lib/format';
import { Empty, ErrorBox, Field, FieldError, PageHead, Panel, Row, Rows, SampleTag, ScreenSkeleton, Stack } from '../ui/kit';
import { Choice, TextInput } from '../ui/controls';
import { Button } from '../ui/coss/button';
import { Badge } from '../ui/coss/badge';
import { Sheet, SheetFooter, SheetHeader, SheetPanel, SheetPopup, SheetTitle } from '../ui/coss/sheet';
import { DropZone } from '../ui/DropZone';
import { SeatPicker } from '../ui/SeatPicker';

const KINDS: { id: FileKind; label: string }[] = [
  { id: 'research', label: 'Research' },
  { id: 'guide', label: 'Background guide' },
  { id: 'rules', label: 'Rules of procedure' },
  { id: 'handbook', label: 'Handbook' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'map', label: 'Map' },
  { id: 'other', label: 'Other' },
];
const KIND_LABEL = Object.fromEntries(KINDS.map((k) => [k.id, k.label])) as Record<FileKind, string>;
const GROUPS: { scope: FileScope; title: string; icon: typeof FolderOpen; empty: string }[] = [
  { scope: 'conference', title: 'Conference', icon: FolderOpen, empty: 'No conference files yet.' },
  { scope: 'committee', title: 'Committee', icon: Landmark, empty: 'Your chairs have not added files yet.' },
  { scope: 'mine', title: 'Mine', icon: UserRound, empty: 'Tap + to add research or a bloc draft.' },
  { scope: 'shared_with_me', title: 'Shared with me', icon: Users, empty: 'Nothing shared with you yet.' },
];

export function FilesScreen() {
  const { readOnly, demo } = useConf();
  const q = useLoad(async (a) => Promise.all([a.files(), a.committeeSeats()]), ['files']);
  const [adding, setAdding] = useState(false);
  const [sharing, setSharing] = useState<LibraryFile | null>(null);
  if (!q.data) {
    return (
      <>
        <PageHead title="Files" />
        {q.error ? <ErrorBox error={q.error} onRetry={q.reload} what="files" /> : <ScreenSkeleton panels={3} />}
      </>
    );
  }
  const [files, seats] = q.data;
  return (
    <>
      <PageHead
        title="Files"
        line="Guides, rules and your own research. Your files are private unless you share them."
        aside={!readOnly && (
          <Button size="xl" onClick={() => setAdding(true)} className="max-md:hidden">
            <Plus aria-hidden="true" className="size-7!" strokeWidth={3} /> Add file or link
          </Button>
        )}
      />
      <div className="grid-2">
        {GROUPS.map((g) => {
          const list = files.filter((f) => f.scope === g.scope);
          return (
            <Panel key={g.scope} title={g.title} icon={g.icon} aside={demo && list.length ? <SampleTag /> : list.length ? <span className="font-mono text-muted-foreground">{list.length}</span> : undefined}>
              {list.length === 0 ? <Empty>{g.empty}</Empty> : (
                <Rows label={`${g.title} files`}>
                  {list.map((f) => <FileRow key={f.id} f={f} onShare={g.scope === 'mine' && !readOnly ? () => setSharing(f) : undefined} />)}
                </Rows>
              )}
            </Panel>
          );
        })}
      </div>

      {!readOnly && (
        <Button
          size="icon-xl" aria-label="Add a file or link" onClick={() => setAdding(true)}
          className="fixed right-4 bottom-[calc(88px+env(safe-area-inset-bottom,0px))] z-30 size-16 rounded-full border-2 border-background md:hidden"
        >
          <Plus aria-hidden="true" className="size-9!" strokeWidth={3} />
        </Button>
      )}
      <AddSheet open={adding} onOpenChange={setAdding} seats={seats} />
      <ShareSheet file={sharing} onClose={() => setSharing(null)} seats={seats} />
    </>
  );
}

function FileRow({ f, onShare }: { f: LibraryFile; onShare?: () => void }) {
  const api = useApi();
  const toast = useToast();
  const { readOnly } = useConf();
  const { run, pending } = useAction();
  const meta = [KIND_LABEL[f.kind], f.link ? 'Link' : f.fileName, sizeText(f.sizeBytes), dayOf(f.addedAt)].filter(Boolean).join(' · ');
  const open = () => void openInNewTab(() => api.openFile(f.id)).catch((e) => toast(errorText(e), 'error'));
  return (
    <Row className="flex-col items-stretch gap-2 py-3.5">
      <div className="flex min-w-0 items-start gap-3">
        {f.link ? <Link2 aria-hidden="true" className="mt-1 size-5 shrink-0 text-primary" /> : <FolderOpen aria-hidden="true" className="mt-1 size-5 shrink-0 text-primary" />}
        <div className="min-w-0 flex-1">
          <p className="break-words text-lg font-semibold leading-snug">{f.title}</p>
          <p className="break-all text-[15px] text-muted-foreground">{meta}</p>
          {f.addedBy && f.scope !== 'mine' && <p className="text-[15px] text-muted-foreground">Added by {f.addedBy}</p>}
          {f.scope === 'mine' && (
            <p className="text-[15px] text-muted-foreground">
              {f.sharedWith.length ? <>Shared with {f.sharedWith.map((s) => s.label).join(', ')}</> : 'Private'}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 ps-8">
        <Button size="sm" variant="outline" onClick={open}><ExternalLink aria-hidden="true" /> Open</Button>
        {onShare && <Button size="sm" variant="outline" onClick={onShare}><Share2 aria-hidden="true" /> Share</Button>}
        {f.canRemove && !readOnly && (
          <Button size="sm" variant="ghost" loading={pending} onClick={() => void run((a) => a.removeFile(f.id), 'File removed')}>
            <Trash2 aria-hidden="true" /> Remove
          </Button>
        )}
      </div>
      {f.sharedWith.length > 0 && f.scope === 'mine' && (
        <div className="flex flex-wrap gap-1.5 ps-8">
          {f.sharedWith.map((s) => <Badge key={s.id} variant="secondary">{s.label}</Badge>)}
        </div>
      )}
    </Row>
  );
}

function AddSheet({ open, onOpenChange, seats }: { open: boolean; onOpenChange: (o: boolean) => void; seats: SeatRef[] }) {
  const { seat } = useConf();
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<FileKind>('research');
  const [how, setHow] = useState<'file' | 'link'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState('');
  const [share, setShare] = useState<string[]>([]);
  const [err, setErr] = useState<Record<string, string>>({});
  const { run, pending } = useAction();
  const reset = () => { setTitle(''); setKind('research'); setHow('file'); setFile(null); setLink(''); setShare([]); setErr({}); };

  const add = async () => {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = 'Give it a title.';
    if (how === 'file' && !file) next.file = 'Choose a file.';
    if (how === 'link' && !/^https?:\/\/\S+\.\S+/.test(link.trim())) next.link = 'Paste a full link, starting with https://';
    setErr(next);
    if (Object.keys(next).length) return;
    const ok = await run(
      (a) => a.addFile({ title: title.trim(), kind, ...(how === 'file' ? { file: file! } : { link: link.trim() }), shareWithSeatIds: share.length ? share : undefined }),
      'File added',
    );
    if (ok) { reset(); onOpenChange(false); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetPopup side="right" className="max-w-lg max-md:max-w-none">
        <SheetHeader className="pe-14"><SheetTitle className="font-heading text-[30px] font-semibold tracking-[-0.01em]">Add a file or link</SheetTitle></SheetHeader>
        <SheetPanel className="pt-1!">
          <form id="add-file" onSubmit={(e) => { e.preventDefault(); void add(); }} noValidate>
            <Stack>
              <Field label="Title" error={err.title}>
                {(id, by) => <TextInput id={id} aria-describedby={by} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Water security research" aria-invalid={!!err.title || undefined} />}
              </Field>
              <Field label="Kind">
                {(id) => <Choice id={id} label="Kind" value={kind} onChange={(v) => setKind((v || 'research') as FileKind)} placeholder="Choose a kind" options={KINDS.map((k) => ({ value: k.id, label: k.label }))} />}
              </Field>
              <div className="flex gap-2" role="group" aria-label="File or link">
                <Button type="button" variant={how === 'file' ? 'default' : 'outline'} aria-pressed={how === 'file'} onClick={() => setHow('file')}><Upload aria-hidden="true" /> File</Button>
                <Button type="button" variant={how === 'link' ? 'default' : 'outline'} aria-pressed={how === 'link'} onClick={() => setHow('link')}><Link2 aria-hidden="true" /> Link</Button>
              </div>
              {how === 'file' ? (
                <div className="flex w-full flex-col gap-1.5">
                  <DropZone compact chosen={file} label="Drop the file here" onFile={(f) => { setFile(f); setErr((x) => ({ ...x, file: '' })); if (!title) setTitle(f.name.replace(/\.[^.]+$/, '')); }}
                    validate={(f) => (f.size > 10 * 1024 * 1024 ? 'The file is over 10 MB.' : null)} />
                  {err.file && <FieldError alert>{err.file}</FieldError>}
                </div>
              ) : (
                <Field label="Link" error={err.link}>
                  {(id, by) => <TextInput id={id} aria-describedby={by} type="url" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" aria-invalid={!!err.link || undefined} />}
                </Field>
              )}
              <SeatPicker label="Share with (optional)" seats={seats.filter((s) => s.id !== seat.seat.id)} value={share} onChange={setShare} />
            </Stack>
          </form>
        </SheetPanel>
        <SheetFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="add-file" size="lg" loading={pending}><Plus aria-hidden="true" /> Add</Button>
        </SheetFooter>
      </SheetPopup>
    </Sheet>
  );
}

function ShareSheet({ file, onClose, seats }: { file: LibraryFile | null; onClose: () => void; seats: SeatRef[] }) {
  const { seat } = useConf();
  const [ids, setIds] = useState<string[]>([]);
  const [forId, setForId] = useState<string | null>(null);
  const { run, pending } = useAction();
  if (file && forId !== file.id) { setForId(file.id); setIds(file.sharedWith.map((s) => s.id)); }
  return (
    <Sheet open={!!file} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetPopup side="right" className="max-w-lg max-md:max-w-none">
        <SheetHeader className="pe-14"><SheetTitle className="font-heading text-[30px] font-semibold tracking-[-0.01em]">Share</SheetTitle></SheetHeader>
        <SheetPanel className="flex flex-col gap-3 pt-1!">
          <p className="text-lg font-semibold">{file?.title}</p>
          <SeatPicker label="Share with" seats={seats.filter((s) => s.id !== seat.seat.id)} value={ids} onChange={setIds} />
        </SheetPanel>
        <SheetFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button size="lg" loading={pending} onClick={() => void run((a) => a.shareFile(file!.id, ids), ids.length ? 'Sharing updated' : 'File is private again').then((ok) => ok && onClose())}>
            <Share2 aria-hidden="true" /> Save sharing
          </Button>
        </SheetFooter>
      </SheetPopup>
    </Sheet>
  );
}
