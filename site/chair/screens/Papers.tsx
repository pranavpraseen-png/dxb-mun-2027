// Position papers: every seat's paper status (not sent, submitted, late, seen); open one, mark it seen.
import { useState } from 'react';
import { AlertTriangle, CircleDashed, ExternalLink, Eye, FileText, Inbox } from 'lucide-react';
import type { PaperRow, PaperStatus } from '@/platform/v2';
import { Button } from '../../portal/ui/coss/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/coss/table';
import { useAction, useChair, useLoad, errorText } from '../lib/data';
import { useToast } from '../../portal/lib/toast';
import { Choices, Empty, Loaded, PageHead, Panel, Tag, names, when, type Tone } from '../ui/kit';

const PAPER: Record<PaperStatus, { tone: Tone; word: string; icon: typeof Eye }> = {
  not_sent: { tone: 'off', word: 'Not sent', icon: CircleDashed },
  submitted: { tone: 'live', word: 'Submitted', icon: Inbox },
  late: { tone: 'wait', word: 'Late', icon: AlertTriangle },
  seen: { tone: 'seen', word: 'Seen', icon: Eye },
};
type Filter = 'all' | PaperStatus;

export function PapersScreen() {
  const papers = useLoad((a, c) => a.papers(c), ['papers']);
  const [filter, setFilter] = useState<Filter>('all');
  return (
    <>
      <PageHead title="Position papers" line="Open a paper, then mark it seen. Delegates see the change." />
      <Loaded load={papers} what="position papers" lines={8}>
        {(rows) => {
          const n = (s: PaperStatus) => rows.filter((r) => r.paper.status === s).length;
          const shown = filter === 'all' ? rows : rows.filter((r) => r.paper.status === filter);
          return (
            <Panel
              title="Papers by seat"
              icon={FileText}
              aside={<Tag tone="live">{n('submitted') + n('late')} to read</Tag>}
            >
              <Choices
                label="Show"
                size="default"
                value={filter}
                onChange={setFilter}
                options={[
                  { value: 'all', label: `All ${rows.length}` },
                  { value: 'submitted', label: `Submitted ${n('submitted')}` },
                  { value: 'late', label: `Late ${n('late')}` },
                  { value: 'seen', label: `Seen ${n('seen')}` },
                  { value: 'not_sent', label: `Not sent ${n('not_sent')}` },
                ]}
              />
              {shown.length ? <PaperTable rows={shown} /> : <Empty title="Nothing here" line="No seat has this status." />}
            </Panel>
          );
        }}
      </Loaded>
    </>
  );
}

function PaperTable({ rows }: { rows: PaperRow[] }) {
  const { run } = useAction();
  const { api, committee } = useChair();
  const toast = useToast();
  const open = async (seatId: string) => {
    // Open the tab first (in the click), then point it at the file, so pop-up blockers allow it.
    const w = window.open('', '_blank');
    try {
      const url = await api.openPaper(committee.id, seatId);
      if (w) { w.opener = null; w.location.href = url; } else window.open(url, '_blank', 'noopener');
    } catch (e) { w?.close(); toast(errorText(e), 'error'); }
  };
  const actions = (r: PaperRow) => {
    const has = r.paper.status !== 'not_sent';
    return (
      <>
        <Button size="sm" variant="outline" disabled={!has} onClick={() => void open(r.seat.id)} aria-label={`Open ${r.seat.label}'s paper`}>
          <ExternalLink aria-hidden="true" /> Open
        </Button>
        <Button size="sm" variant="outline" disabled={!has || r.paper.status === 'seen'}
          onClick={() => void run((a, c) => a.markPaperSeen(c, r.seat.id), `${r.seat.label}: marked seen`)} aria-label={`Mark ${r.seat.label}'s paper seen`}>
          <Eye aria-hidden="true" /> {r.paper.status === 'seen' ? 'Seen' : 'Mark seen'}
        </Button>
      </>
    );
  };
  return (
    <>
      {/* Phones: one card per seat (the table would need sideways scrolling). */}
      <ul className="flex flex-col divide-y border-y md:hidden" aria-label="Papers by seat">
        {rows.map((r) => {
          const st = PAPER[r.paper.status];
          return (
            <li key={r.seat.id} className="flex flex-col gap-2 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">{r.seat.label}</p>
                  <p className="text-sm text-muted-foreground">{names(r.delegates)}</p>
                </div>
                <Tag tone={st.tone} icon={st.icon}>{st.word}</Tag>
              </div>
              {r.paper.status !== 'not_sent' && <p className="text-sm text-muted-foreground">{r.paper.fileName ?? 'File'} · {when(r.paper.submittedAt)}</p>}
              <div className="flex flex-wrap gap-2">{actions(r)}</div>
            </li>
          );
        })}
      </ul>
      <Table className="text-base max-md:hidden">
        <TableHeader>
          <TableRow>
            <TableHead className="text-base">Seat</TableHead>
            <TableHead className="text-base">Delegates</TableHead>
            <TableHead className="text-base">Status</TableHead>
            <TableHead className="text-base max-lg:hidden">Submitted</TableHead>
            <TableHead className="text-base max-xl:hidden">File</TableHead>
            <TableHead className="text-right text-base"><span className="sr-only">Actions</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const st = PAPER[r.paper.status];
            const has = r.paper.status !== 'not_sent';
            return (
              <TableRow key={r.seat.id}>
                <TableCell className="whitespace-normal font-semibold">{r.seat.label}</TableCell>
                <TableCell className="whitespace-normal text-muted-foreground">{names(r.delegates)}</TableCell>
                <TableCell><Tag tone={st.tone} icon={st.icon}>{st.word}</Tag></TableCell>
                <TableCell className="max-lg:hidden">{has ? when(r.paper.submittedAt) : '—'}</TableCell>
                <TableCell className="max-w-56 truncate text-muted-foreground max-xl:hidden">{r.paper.fileName ?? '—'}</TableCell>
                <TableCell className="text-right"><div className="flex justify-end gap-1.5">{actions(r)}</div></TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
}
