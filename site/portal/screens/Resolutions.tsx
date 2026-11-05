// Resolutions: my working papers, the ones I sponsor or sign, and every approved draft in my committee.
//   #/resolutions               the list, with status (colour + icon + word) and any return comment
//   #/resolutions/new           write or upload a working paper, pick sponsors and signatories, draft or submit
//   #/resolutions/edit/<id>     edit my draft (or a returned one)
//   #/resolutions/amend/<id>    an amendment to an approved resolution, naming a clause
import { useState, type FormEvent } from 'react';
import { ArrowLeft, FilePlus2, MessageSquareWarning, PenLine, ScrollText, Send, Save, Upload, Users } from 'lucide-react';
import type { DelegateApi, Resolution, SeatRef } from '@/platform/v2';
import { useAction, useLoad } from '../lib/data';
import { useConf } from '../lib/conf';
import { go, href, useRoute } from '../lib/route';
import { dayTime } from '../lib/format';
import { Empty, ErrorBox, Field, FieldError, PageHead, Panel, Plain, Row, Rows, ScreenSkeleton, Stack, Sub, You } from '../ui/kit';
import { TextArea, TextInput } from '../ui/controls';
import { Button } from '../ui/coss/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/coss/alert';
import { cn } from '../ui/coss/utils';
import { RESOLUTION, Status } from '../ui/status';
import { SeatPicker } from '../ui/SeatPicker';
import { DropZone } from '../ui/DropZone';

async function loadAll(a: DelegateApi) {
  const [resolutions, seats] = await Promise.all([a.resolutions(), a.committeeSeats()]);
  return { resolutions, seats };
}

const KIND = { working_paper: 'Working paper', draft_resolution: 'Draft resolution', amendment: 'Amendment' } as const;
const editable = (r: Resolution) => r.mine && (r.status === 'draft' || r.status === 'returned');
const amendable = (r: Resolution) => r.kind !== 'amendment' && (r.status === 'approved' || r.status === 'voting');

export function ResolutionsScreen() {
  const route = useRoute();
  const q = useLoad(loadAll, ['resolutions']);
  const [mode, id] = route.parts;
  if (!q.data) {
    return (
      <>
        <PageHead title="Resolutions" />
        {q.error ? <ErrorBox error={q.error} onRetry={q.reload} what="resolutions" /> : <ScreenSkeleton panels={2} />}
      </>
    );
  }
  const { resolutions, seats } = q.data;
  if (mode === 'new') return <Editor key="new" seats={seats} />;
  if (mode === 'edit') {
    const r = resolutions.find((x) => x.id === id);
    return r && editable(r) ? <Editor key={r.id} seats={seats} existing={r} /> : <Missing />;
  }
  if (mode === 'amend') {
    const p = resolutions.find((x) => x.id === id);
    return p && amendable(p) ? <Editor key={`a-${p.id}`} seats={seats} parent={p} /> : <Missing />;
  }
  return <List resolutions={resolutions} />;
}

function Missing() {
  return (
    <>
      <PageHead title="Resolutions" />
      <Panel title="Not found" icon={ScrollText}>
        <Plain muted>This paper can't be opened or edited.</Plain>
        <Button variant="outline" render={<a href={href('resolutions')} />}><ArrowLeft aria-hidden="true" /> All resolutions</Button>
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ list */
function List({ resolutions }: { resolutions: Resolution[] }) {
  const { readOnly, seat } = useConf();
  const mine = resolutions.filter((r) => r.mine);
  const backing = resolutions.filter((r) => !r.mine && [...r.sponsors, ...r.signatories].some((s) => s.id === seat.seat.id));
  const rest = resolutions.filter((r) => !mine.includes(r) && !backing.includes(r));
  return (
    <>
      <PageHead
        title="Resolutions"
        line="Working papers, draft resolutions and amendments."
        aside={!readOnly && <Button size="xl" render={<a href={href('resolutions', 'new')} />}><FilePlus2 aria-hidden="true" /> New working paper</Button>}
      />
      <Group title="Mine" icon={PenLine} list={mine} empty="You haven't started a paper yet." />
      {backing.length > 0 && <Group title="I sponsor or sign" icon={Users} list={backing} empty="" />}
      <Group title="In my committee" icon={ScrollText} list={rest} empty="No other approved drafts yet." />
    </>
  );
}

function Group({ title, icon, list, empty }: { title: string; icon: typeof ScrollText; list: Resolution[]; empty: string }) {
  return (
    <Panel title={title} icon={icon} aside={list.length ? <span className="font-mono text-muted-foreground">{list.length}</span> : undefined}>
      {list.length === 0 ? <Empty>{empty}</Empty> : (
        <Rows label={title}>
          {list.map((r) => <ResolutionRow key={r.id} r={r} />)}
        </Rows>
      )}
    </Panel>
  );
}

function ResolutionRow({ r }: { r: Resolution }) {
  const { readOnly } = useConf();
  const names = (l: SeatRef[]) => l.map((s) => s.label).join(', ');
  return (
    <Row className="flex-col items-stretch gap-2 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <Status s={RESOLUTION[r.status]} />
        {r.number && <span className="font-mono text-[17px] font-medium text-foreground">{r.number}</span>}
        <span className="font-mono text-sm font-medium uppercase text-muted-foreground tracking-[0.08em]">{KIND[r.kind]}{r.clause ? ` · ${r.clause}` : ''}</span>
      </div>
      <p className="text-xl font-semibold leading-snug">{r.title}{r.mine && <You>Mine</You>}</p>
      {r.status === 'returned' && r.returnComment && (
        <Alert variant="error" className="rounded-sm">
          <MessageSquareWarning aria-hidden="true" />
          <AlertTitle className="font-semibold">The chair returned it</AlertTitle>
          <AlertDescription className="text-base text-foreground">{r.returnComment}</AlertDescription>
        </Alert>
      )}
      <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-[16px]">
        <dt className="text-muted-foreground">Sponsors</dt><dd>{names(r.sponsors) || '—'}</dd>
        {r.signatories.length > 0 && <><dt className="text-muted-foreground">Signatories</dt><dd>{names(r.signatories)}</dd></>}
        {r.fileName && <><dt className="text-muted-foreground">File</dt><dd className="break-all">{r.fileName}</dd></>}
        <dt className="text-muted-foreground">Updated</dt><dd>{dayTime(r.updatedAt)}</dd>
      </dl>
      {r.body && (
        <details className="group">
          <summary className="min-h-11 cursor-pointer content-center font-label text-lg font-semibold text-foreground underline decoration-primary decoration-2 underline-offset-[6px]">Read the text</summary>
          <p className="whitespace-pre-wrap border-s-2 ps-3 text-[17px]">{r.body}</p>
        </details>
      )}
      <div className="flex flex-wrap gap-2">
        {!readOnly && editable(r) && <Button size="sm" render={<a href={href('resolutions', 'edit', r.id)} />}><PenLine aria-hidden="true" /> Edit</Button>}
        {!readOnly && amendable(r) && <Button variant="outline" size="sm" render={<a href={href('resolutions', 'amend', r.id)} />}><PenLine aria-hidden="true" /> Amend a clause</Button>}
      </div>
    </Row>
  );
}

/* ------------------------------------------------------------------ editor */
function Editor({ seats, existing, parent }: { seats: SeatRef[]; existing?: Resolution; parent?: Resolution }) {
  const { seat } = useConf();
  const myId = seat.seat.id;
  const others = seats.filter((s) => s.id !== myId);
  const amendment = !!parent || existing?.kind === 'amendment';
  const [title, setTitle] = useState(existing?.title ?? (parent ? `Amendment to ${parent.number ?? parent.title}` : ''));
  const [clause, setClause] = useState(existing?.clause ?? '');
  const [how, setHow] = useState<'write' | 'file'>(existing?.fileName && !existing.body ? 'file' : 'write');
  const [body, setBody] = useState(existing?.body ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [sponsors, setSponsors] = useState<string[]>(existing?.sponsors.map((s) => s.id).filter((x) => x !== myId) ?? []);
  const [signatories, setSignatories] = useState<string[]>(existing?.signatories.map((s) => s.id) ?? []);
  const [err, setErr] = useState<Record<string, string>>({});
  const { run, pending } = useAction();

  const save = async (submit: boolean, e?: FormEvent) => {
    e?.preventDefault();
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = 'Give it a title.';
    if (amendment && !clause.trim()) next.clause = 'Name the clause, for example "Operative 3".';
    if (submit && how === 'write' && !body.trim()) next.body = 'Write the text before you submit.';
    if (submit && how === 'file' && !file && !existing?.fileName) next.file = 'Choose a file before you submit.';
    setErr(next);
    if (Object.keys(next).length) return;
    const ok = await run(
      (a) => a.saveResolution({
        id: existing?.id,
        kind: existing?.kind ?? (parent ? 'amendment' : 'working_paper'),
        title: title.trim(),
        body: how === 'write' ? body : undefined,
        file: how === 'file' ? file ?? undefined : undefined,
        parentId: parent?.id ?? existing?.parentId ?? undefined,
        clause: amendment ? clause.trim() : undefined,
        sponsorSeatIds: sponsors,
        signatorySeatIds: signatories,
        submit,
      }),
      submit ? 'Sent to the chair' : 'Draft saved',
    );
    if (ok) go('resolutions');
  };

  const heading = existing ? 'Edit paper' : parent ? 'Amendment' : 'New working paper';
  return (
    <>
      <PageHead
        title={heading}
        line={parent ? `To ${parent.number ?? parent.title}` : 'Write it or upload a file, then add your co-sponsors.'}
        aside={<Button variant="outline" render={<a href={href('resolutions')} />}><ArrowLeft aria-hidden="true" /> Back</Button>}
      />
      {existing?.status === 'returned' && existing.returnComment && (
        <Alert variant="error" className="rounded-sm">
          <MessageSquareWarning aria-hidden="true" />
          <AlertTitle className="font-semibold">The chair returned it</AlertTitle>
          <AlertDescription className="text-base text-foreground">{existing.returnComment}</AlertDescription>
        </Alert>
      )}
      <form onSubmit={(e) => void save(true, e)} noValidate className="grid-2 grid-2--wide-left">
        <div className="col">
          <Panel title="The paper" icon={ScrollText}>
            <Stack>
              <Field label="Title" error={err.title}>
                {(id, by) => <TextInput id={id} aria-describedby={by} value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} aria-invalid={!!err.title || undefined} />}
              </Field>
              {amendment && (
                <Field label="Which clause?" hint='For example "Operative 3" or "Preambulatory 2"' error={err.clause}>
                  {(id, by) => <TextInput id={id} aria-describedby={by} value={clause} maxLength={60} className="max-w-80" onChange={(e) => setClause(e.target.value)} aria-invalid={!!err.clause || undefined} />}
                </Field>
              )}
              <div className="flex w-full flex-col gap-2">
                <Sub>Text</Sub>
                <div className="flex gap-2" role="group" aria-label="How to add the text">
                  <Button type="button" variant={how === 'write' ? 'default' : 'outline'} aria-pressed={how === 'write'} onClick={() => setHow('write')}><PenLine aria-hidden="true" /> Write</Button>
                  <Button type="button" variant={how === 'file' ? 'default' : 'outline'} aria-pressed={how === 'file'} onClick={() => setHow('file')}><Upload aria-hidden="true" /> Upload a file</Button>
                </div>
              </div>
              {how === 'write' ? (
                <Field label={amendment ? 'The new wording' : 'Clauses'} labelHidden={false} error={err.body}>
                  {(id, by) => <TextArea id={id} aria-describedby={by} rows={14} value={body} onChange={(e) => setBody(e.target.value)} className="font-mono *:data-[slot=textarea]:min-h-72! max-md:*:data-[slot=textarea]:min-h-52!" placeholder={amendment ? 'Strike … and replace with …' : 'Preambulatory clauses, then operative clauses'} aria-invalid={!!err.body || undefined} />}
                </Field>
              ) : (
                <div className="flex w-full flex-col gap-1.5">
                  <DropZone accept=".pdf,.docx" compact chosen={file} label="Drop the file here" onFile={(f) => { setFile(f); setErr((x) => ({ ...x, file: '' })); }}
                    validate={(f) => (/\.(pdf|docx)$/i.test(f.name) ? (f.size > 10 * 1024 * 1024 ? 'The file is over 10 MB.' : null) : 'Use a PDF or DOCX file.')} />
                  {!file && existing?.fileName && <Plain muted>Current file: {existing.fileName}</Plain>}
                  {err.file && <FieldError alert>{err.file}</FieldError>}
                </div>
              )}
            </Stack>
          </Panel>
        </div>
        <div className="col">
          <Panel title="Co-sponsors" icon={Users}>
            <Plain muted><strong className="text-foreground">{seat.seat.label}</strong> (you) is always a sponsor.</Plain>
            <SeatPicker label="Sponsors" seats={others} value={sponsors} onChange={(v) => { setSponsors(v); setSignatories((s) => s.filter((x) => !v.includes(x))); }} />
            <SeatPicker label="Signatories" seats={others} value={signatories} onChange={setSignatories} disabledIds={sponsors} disabledWhy="sponsor" />
          </Panel>
          <div className={cn('flex flex-wrap gap-2.5 max-md:flex-col')}>
            <Button type="submit" size="xl" loading={pending} className="max-md:w-full"><Send aria-hidden="true" /> Submit to the chair</Button>
            <Button type="button" variant="outline" size="xl" disabled={pending} onClick={() => void save(false)} className="max-md:w-full"><Save aria-hidden="true" /> Save as draft</Button>
          </div>
        </div>
      </form>
    </>
  );
}
