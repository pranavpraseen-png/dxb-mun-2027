// Resolutions: an inbox of working papers, draft resolutions and their amendments (grouped under their
// resolution). Approve with a number (DR 1.1), return with a comment, or put it to a vote.
import { useState } from 'react';
import {
  CheckCircle2, CornerDownRight, ExternalLink, FileEdit, Gavel, Inbox, Play, ScrollText, Undo2, Vote as VoteIcon, XCircle,
} from 'lucide-react';
import type { Resolution, ResolutionStatus, Vote } from '@/platform/v2';
import { cn } from '../../portal/ui/coss/utils';
import { Button } from '../../portal/ui/coss/button';
import { Input } from '../../portal/ui/coss/input';
import { Label } from '../../portal/ui/coss/label';
import { Textarea } from '../../portal/ui/coss/textarea';
import { useAction, useLoad } from '../lib/data';
import { go } from '../lib/route';
import { Choices, Empty, Loaded, PageHead, Panel, Tag, when, type Tone } from '../ui/kit';
import { FormDialog } from '../ui/form-dialog';

const STATUS: Record<ResolutionStatus, { tone: Tone; word: string; icon: typeof Inbox }> = {
  draft: { tone: 'off', word: 'Draft', icon: FileEdit },
  submitted: { tone: 'live', word: 'To review', icon: Inbox },
  returned: { tone: 'wait', word: 'Returned', icon: Undo2 },
  approved: { tone: 'ok', word: 'Approved', icon: CheckCircle2 },
  voting: { tone: 'live', word: 'Voting', icon: VoteIcon },
  passed: { tone: 'ok', word: 'Passed', icon: CheckCircle2 },
  failed: { tone: 'bad', word: 'Failed', icon: XCircle },
};
const KIND = { working_paper: 'Working paper', draft_resolution: 'Draft resolution', amendment: 'Amendment' } as const;

type Filter = 'review' | 'approved' | 'returned' | 'decided' | 'all';
const IN: Record<Filter, ResolutionStatus[]> = {
  review: ['submitted'], approved: ['approved', 'voting'], returned: ['returned'], decided: ['passed', 'failed'],
  all: ['draft', 'submitted', 'returned', 'approved', 'voting', 'passed', 'failed'],
};

export function ResolutionsScreen() {
  const resos = useLoad((a, c) => a.resolutions(c), ['resolutions']);
  const [filter, setFilter] = useState<Filter>('review');
  return (
    <>
      <PageHead title="Resolutions" line="Working papers and amendments sent to the dais." />
      <Loaded load={resos} what="resolutions" lines={8}>
        {(all) => {
          const n = (f: Filter) => all.filter((r) => IN[f].includes(r.status)).length;
          const parents = all.filter((r) => r.kind !== 'amendment');
          const ids = new Set(parents.map((p) => p.id));
          const kids = (id: string) => all.filter((r) => r.kind === 'amendment' && r.parentId === id);
          const orphans = all.filter((r) => r.kind === 'amendment' && (!r.parentId || !ids.has(r.parentId)));
          const hit = (r: Resolution) => IN[filter].includes(r.status);
          const groups = parents.filter((p) => hit(p) || kids(p.id).some(hit));
          const lone = orphans.filter(hit);
          const numbers = all.map((r) => r.number).filter((x): x is string => !!x);
          return (
            <>
              <Choices
                label="Show" value={filter} onChange={setFilter} size="default"
                options={[
                  { value: 'review', label: `To review ${n('review')}` },
                  { value: 'approved', label: `Approved ${n('approved')}` },
                  { value: 'returned', label: `Returned ${n('returned')}` },
                  { value: 'decided', label: `Passed or failed ${n('decided')}` },
                  { value: 'all', label: `All ${all.length}` },
                ]}
              />
              {groups.length || lone.length ? (
                <div className="flex flex-col gap-4">
                  {groups.map((p) => (
                    <Panel key={p.id} title={p.number ? `${p.number} · ${p.title}` : p.title} icon={ScrollText} aside={<StatusTag r={p} />}>
                      <Item r={p} numbers={numbers} />
                      {kids(p.id).length > 0 && (
                        <div className="flex flex-col gap-3 border-t pt-3">
                          <p className="font-label text-lg font-semibold">Amendments ({kids(p.id).length})</p>
                          {kids(p.id).map((k) => (
                            <div key={k.id} className={cn('flex gap-2 border-s-2 ps-3', hit(k) ? 'border-primary' : 'border-input')}>
                              <CornerDownRight size={18} aria-hidden="true" className="mt-1 shrink-0 text-muted-foreground" />
                              <div className="flex min-w-0 flex-1 flex-col gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-semibold">{k.clause ?? 'Clause not given'}: {k.title}</p>
                                  <StatusTag r={k} />
                                </div>
                                <Item r={k} numbers={numbers} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Panel>
                  ))}
                  {lone.length > 0 && (
                    <Panel title="Other amendments" icon={CornerDownRight}>
                      {lone.map((k) => (
                        <div key={k.id} className="flex flex-col gap-2 border-b pb-3 last:border-b-0 last:pb-0">
                          <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{k.clause ?? 'Clause not given'}: {k.title}</p><StatusTag r={k} /></div>
                          <Item r={k} numbers={numbers} />
                        </div>
                      ))}
                    </Panel>
                  )}
                </div>
              ) : <Empty title="Nothing here" line={filter === 'review' ? 'New working papers show here when delegates submit them.' : 'No resolution has this status.'} icon={Inbox} />}
            </>
          );
        }}
      </Loaded>
    </>
  );
}

function StatusTag({ r }: { r: Resolution }) {
  const s = STATUS[r.status];
  return <Tag tone={s.tone} icon={s.icon}>{s.word}</Tag>;
}

/** Suggests the next number after the highest "DR 1.n" so far; the chair can change it. */
function suggest(numbers: string[]): string {
  let best: [string, number] | null = null;
  for (const n of numbers) {
    const m = /^(.*\.)(\d+)$/.exec(n.trim());
    if (m && (!best || Number(m[2]) > best[1])) best = [m[1], Number(m[2])];
  }
  return best ? `${best[0]}${best[1] + 1}` : 'DR 1.1';
}

function Item({ r, numbers }: { r: Resolution; numbers: string[] }) {
  const { run } = useAction();
  const [num, setNum] = useState('');
  const [comment, setComment] = useState('');
  const [majority, setMajority] = useState<Vote['majority']>('simple');
  const [more, setMore] = useState(false);
  const seats = (list: { label: string }[]) => (list.length ? list.map((s) => s.label).join(', ') : 'None yet');
  const long = (r.body ?? '').length > 280;

  return (
    <div className="flex flex-col gap-2.5">
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-base">
        <dt className="text-muted-foreground">Type</dt><dd>{KIND[r.kind]}</dd>
        <dt className="text-muted-foreground">From</dt><dd>{r.submittedBy?.label ?? 'Not given'} · {when(r.updatedAt)}</dd>
        {r.kind !== 'amendment' && <><dt className="text-muted-foreground">Sponsors</dt><dd>{seats(r.sponsors)}</dd></>}
        {r.kind !== 'amendment' && <><dt className="text-muted-foreground">Signatories</dt><dd>{seats(r.signatories)}</dd></>}
      </dl>
      {r.body && (
        <div className="max-w-[75ch]">
          <p className={cn('whitespace-pre-line text-base', !more && long && 'line-clamp-4')}>{r.body}</p>
          {long && <Button variant="link" className="h-auto px-0 text-base normal-case" onClick={() => setMore((m) => !m)}>{more ? 'Show less' : 'Read all'}</Button>}
        </div>
      )}
      {r.fileName && <p className="flex items-center gap-1.5 text-base text-muted-foreground"><ExternalLink size={16} aria-hidden="true" /> File: {r.fileName}</p>}
      {r.status === 'returned' && r.returnComment && (
        <p className="border-s-4 border-warning bg-muted px-3 py-2 text-base"><strong>Returned:</strong> {r.returnComment}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {r.status === 'submitted' && (
          <FormDialog
            title={r.kind === 'amendment' ? 'Approve amendment' : 'Approve and number'}
            line={r.title}
            submit="Approve"
            canSubmit={!!num.trim()}
            onOpen={() => setNum(r.number ?? (r.kind === 'amendment' ? '' : suggest(numbers)))}
            onSubmit={() => run((a) => a.approveResolution(r.id, num.trim()), `Approved as ${num.trim()}`)}
            trigger={<Button><CheckCircle2 aria-hidden="true" /> Approve</Button>}
          >
            <Label htmlFor={`num-${r.id}`} className="text-base font-semibold">Number</Label>
            <Input id={`num-${r.id}`} value={num} onChange={(e) => setNum(e.target.value)} placeholder={r.kind === 'amendment' ? 'Amendment 1' : 'DR 1.1'} maxLength={20} autoFocus />
            <p className="text-[15px] text-muted-foreground">Delegates see this number on the paper.</p>
          </FormDialog>
        )}
        {(r.status === 'submitted' || r.status === 'approved') && (
          <FormDialog
            title="Return with a comment"
            line={r.title}
            submit="Return"
            danger
            canSubmit={comment.trim().length > 1}
            onOpen={() => setComment('')}
            onSubmit={() => run((a) => a.returnResolution(r.id, comment.trim()), 'Returned to the authors')}
            trigger={<Button variant="outline"><Undo2 aria-hidden="true" /> Return</Button>}
          >
            <Label htmlFor={`ret-${r.id}`} className="text-base font-semibold">What to change</Label>
            <Textarea id={`ret-${r.id}`} rows={4} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} placeholder="Add an operative clause on funding." />
          </FormDialog>
        )}
        {r.status === 'approved' && (
          <FormDialog
            title="Put it to a vote"
            line={r.number ? `${r.number}: ${r.title}` : r.title}
            submit="Open vote"
            onOpen={() => setMajority('simple')}
            onSubmit={async () => {
              const ok = await run((a, c) => a.openVote(c, {
                target: r.kind === 'amendment' ? 'amendment' : 'resolution', targetId: r.id,
                title: r.kind === 'amendment' ? `Amendment ${r.number ?? ''} to ${r.clause ?? 'clause'}`.replace(/\s+/g, ' ') : (r.number ? `${r.number}: ${r.title}` : r.title),
                majority,
              }), 'Vote open');
              if (ok) go('floor', { tab: 'vote' });
              return ok;
            }}
            trigger={<Button variant="outline"><Play aria-hidden="true" /> Open vote</Button>}
          >
            <p className="text-base font-semibold">Majority needed</p>
            <Choices label="Majority" value={majority} onChange={setMajority} options={[{ value: 'simple', label: 'Simple majority' }, { value: 'two_thirds', label: 'Two-thirds' }]} />
          </FormDialog>
        )}
        {r.status === 'voting' && <Button variant="outline" onClick={() => go('floor', { tab: 'vote' })}><Gavel aria-hidden="true" /> Go to the vote</Button>}
      </div>
    </div>
  );
}
