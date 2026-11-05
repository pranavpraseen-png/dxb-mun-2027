// Delegates (DASHBOARD-PLAN.md §3.2): the applicant list with search and filters (status, committee), each
// applicant's three choices, and an assign-seat picker. A dense table on desktop, cards on phones.
import { useMemo, useState } from 'react';
import { Armchair, Ellipsis, Undo2, UserMinus, UserX, X } from 'lucide-react';
import type { Applicant, Committee, Registration, Seat } from '@/platform/v2';
import { Button } from '../../portal/ui/coss/button';
import { Input } from '../../portal/ui/coss/input';
import { Menu, MenuItem, MenuPopup, MenuTrigger } from '../../portal/ui/coss/menu';
import { cn } from '../../portal/ui/coss/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/coss/table';
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from '../ui/coss/dialog';
import { useAction, useAdmin, useLoad } from '../lib/data';
import { setParam, useRoute } from '../lib/route';
import { Choice, Field, Head, Loaded, Panel, Tag, Toolbar, labelCls, type Tone } from '../ui/kit';

type Status = Registration['status'];
export const STATUS: Record<Status, { tone: Tone; word: string }> = {
  applied: { tone: 'todo', word: 'Needs a seat' },
  allocated: { tone: 'done', word: 'Seated' },
  withdrawn: { tone: 'locked', word: 'Withdrawn' },
  rejected: { tone: 'locked', word: 'Rejected' },
};

export function ApplicantsScreen() {
  const { committees } = useAdmin();
  const { params } = useRoute();
  const apps = useLoad((a) => a.applicants(), [], ['seat']);
  const q = params.get('q') ?? '';
  const status = params.get('status') ?? '';
  const cid = params.get('committee') ?? '';
  const [assign, setAssign] = useState<Applicant | null>(null);

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (apps.data ?? []).filter((a) =>
      (!t || a.fullName.toLowerCase().includes(t) || a.person.email.toLowerCase().includes(t) || a.schoolName.toLowerCase().includes(t))
      && (!status || a.status === status)
      && (!cid || a.seat?.committeeId === cid || a.choices.some((c) => c.id === cid)));
  }, [apps.data, q, status, cid]);
  const all = apps.data ?? [];
  const needs = all.filter((a) => a.status === 'applied').length;
  const any = q || status || cid;

  return (
    <>
      <Head title="Delegates" line={apps.data ? `${all.length} signed up · ${needs} need a seat` : 'Who signed up, and where they sit.'} />
      <Toolbar>
        <div className="w-80 max-md:w-full">
          <label htmlFor="ap-q" className={`block ${labelCls}`}>Search</label>
          <Input id="ap-q" type="search" value={q} onChange={(e) => setParam('q', e.target.value)} placeholder="Name, email or school" className="mt-1.5" />
        </div>
        <div className="w-52 max-md:w-full">
          <span className={`block ${labelCls}`}>Status</span>
          <div className="mt-1.5"><Choice label="Status" value={status} onChange={(v) => setParam('status', v)} placeholder="Any status" options={(Object.keys(STATUS) as Status[]).map((s) => ({ value: s, label: STATUS[s].word }))} /></div>
        </div>
        <div className="w-64 max-md:w-full">
          <span className={`block ${labelCls}`}>Committee</span>
          <div className="mt-1.5"><Choice label="Committee" value={cid} onChange={(v) => setParam('committee', v)} placeholder="Any committee" options={committees.map((c) => ({ value: c.id, label: `${c.abbr} · ${c.name}` }))} /></div>
        </div>
        {any && <Button variant="ghost" onClick={() => { setParam('q', ''); setParam('status', ''); setParam('committee', ''); }}><X aria-hidden="true" /> Clear</Button>}
      </Toolbar>
      <Panel title={`${rows.length} shown`} icon={Armchair} bodyClassName="p-0 pt-0 max-md:p-3">
        <Loaded pad load={apps} what="the delegates" empty={() => (rows.length ? null : all.length ? 'Nobody matches these filters.' : 'Nobody has signed up yet.')}>
          {() => <><DelegatesTable rows={rows} cid={cid} onAssign={setAssign} /><DelegatesCards rows={rows} cid={cid} onAssign={setAssign} /></>}
        </Loaded>
      </Panel>
      <AssignDialog applicant={assign} onClose={() => setAssign(null)} />
    </>
  );
}

export function Choices({ a, cid }: { a: Applicant; cid?: string }) {
  if (!a.choices.length) return <span className="text-sm text-muted-foreground">None given</span>;
  return (
    <span className="flex flex-wrap gap-1.5 font-mono text-sm lg:flex-nowrap" aria-label="Committee choices, in order">
      {a.choices.map((c, i) => (
        <span key={c.id} title={c.name} className={cn('border px-1.5 py-0.5', c.id === cid || c.id === a.seat?.committeeId ? 'border-primary text-foreground' : 'border-input text-muted-foreground')}>
          {i + 1} {c.abbr}
        </span>
      ))}
    </span>
  );
}

function seatText(a: Applicant, committees: Committee[]) {
  if (!a.seat) return null;
  const abbr = committees.find((c) => c.id === a.seat!.committeeId)?.abbr ?? '';
  return `${a.seat.label}${abbr ? ` · ${abbr}` : ''}`;
}

function RowActions({ a, onAssign }: { a: Applicant; onAssign: (a: Applicant) => void }) {
  const { run, pending } = useAction();
  const closed = a.status === 'withdrawn' || a.status === 'rejected';
  return (
    <div className="flex items-center justify-end gap-1.5">
      {!closed && (
        <Button variant="outline" size="sm" className={a.seat ? '' : 'border-primary text-foreground'} onClick={() => onAssign(a)}>
          <Armchair aria-hidden="true" /> {a.seat ? 'Change seat' : 'Assign seat'}
        </Button>
      )}
      <Menu>
        <MenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`More for ${a.fullName}`} loading={pending === 'st'} />}><Ellipsis aria-hidden="true" /></MenuTrigger>
        <MenuPopup align="end" className="min-w-52">
          {closed ? (
            <MenuItem className="min-h-11" onClick={() => void run('st', (x) => x.setApplicantStatus(a.registrationId, 'applied'), `${a.fullName}: back on the list`)}><Undo2 aria-hidden="true" /> Back on the list</MenuItem>
          ) : (
            <>
              {a.seat && <MenuItem className="min-h-11" onClick={() => void run('st', (x) => x.assignSeat(a.registrationId, null), `${a.fullName}: seat removed`)}><UserMinus aria-hidden="true" /> Remove from seat</MenuItem>}
              <MenuItem className="min-h-11" onClick={() => void run('st', (x) => x.setApplicantStatus(a.registrationId, 'withdrawn'), `${a.fullName}: withdrawn`)}><Undo2 aria-hidden="true" /> Mark withdrawn</MenuItem>
              <MenuItem className="min-h-11" variant="destructive" onClick={() => void run('st', (x) => x.setApplicantStatus(a.registrationId, 'rejected'), `${a.fullName}: rejected`)}><UserX aria-hidden="true" /> Reject</MenuItem>
            </>
          )}
        </MenuPopup>
      </Menu>
    </div>
  );
}

function DelegatesTable({ rows, cid, onAssign }: { rows: Applicant[]; cid: string; onAssign: (a: Applicant) => void }) {
  const { committees } = useAdmin();
  return (
    <div className="tbl-scroll w-full max-md:hidden">
      <Table className="text-base">
        <TableHeader>
          <TableRow>
            <TableHead className="ps-5">Name</TableHead>
            <TableHead>School</TableHead>
            <TableHead>Choices</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Seat</TableHead>
            <TableHead>Desk</TableHead>
            <TableHead className="pe-5 text-right"><span className="sr-only">Actions</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((a) => (
            <TableRow key={a.registrationId}>
              <TableCell className="ps-5">
                <p className="font-semibold">{a.fullName}</p>
                <p className="text-sm text-muted-foreground">{a.person.email}</p>
              </TableCell>
              <TableCell className="max-w-56 whitespace-normal">{a.schoolName}<p className="text-sm text-muted-foreground">Grade {a.grade}</p></TableCell>
              <TableCell><Choices a={a} cid={cid} /></TableCell>
              <TableCell><Tag tone={STATUS[a.status].tone}>{STATUS[a.status].word}</Tag></TableCell>
              <TableCell>{seatText(a, committees) ?? <span className="text-muted-foreground">No seat</span>}</TableCell>
              <TableCell>{a.checkedIn ? <Tag tone="done">Checked in</Tag> : <span className="text-sm text-muted-foreground">Not yet</span>}</TableCell>
              <TableCell className="pe-5"><RowActions a={a} onAssign={onAssign} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function DelegatesCards({ rows, cid, onAssign }: { rows: Applicant[]; cid: string; onAssign: (a: Applicant) => void }) {
  const { committees } = useAdmin();
  return (
    <ul className="flex w-full flex-col gap-2.5 md:hidden" aria-label="Delegates">
      {rows.map((a) => (
        <li key={a.registrationId} className="flex flex-col gap-2 border bg-background p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold">{a.fullName}</p>
              <p className="truncate text-sm text-muted-foreground">{a.schoolName} · Grade {a.grade}</p>
            </div>
            <Tag tone={STATUS[a.status].tone}>{STATUS[a.status].word}</Tag>
          </div>
          <Choices a={a} cid={cid} />
          <p className="text-[15px]">{seatText(a, committees) ?? <span className="text-muted-foreground">No seat</span>}{a.checkedIn && <span className="ms-2 text-success">· Checked in</span>}</p>
          <RowActions a={a} onAssign={onAssign} />
        </li>
      ))}
    </ul>
  );
}

/** The assign-seat picker: committee (their first choice by default), then a free seat. */
function AssignDialog({ applicant, onClose }: { applicant: Applicant | null; onClose: () => void }) {
  return (
    <Dialog open={!!applicant} onOpenChange={(o) => { if (!o) onClose(); }}>
      {applicant && <AssignBody key={applicant.registrationId} a={applicant} onClose={onClose} />}
    </Dialog>
  );
}

function AssignBody({ a, onClose }: { a: Applicant; onClose: () => void }) {
  const { committees } = useAdmin();
  const { run, pending } = useAction();
  // Start on their highest choice that still has a free seat.
  const open = a.choices.find((c) => { const x = committees.find((y) => y.id === c.id); return x && x.filled < x.seats; });
  const [cid, setCid] = useState(a.seat?.committeeId ?? open?.id ?? a.choices[0]?.id ?? committees[0]?.id ?? '');
  const [seat, setSeat] = useState(a.seat?.id ?? '');
  const seats = useLoad((x) => (cid ? x.seats(cid) : Promise.resolve([] as Seat[])), [cid]);
  const options = (seats.data ?? []).map((s) => {
    const mine = s.holders.some((h) => h.registrationId === a.registrationId);
    const full = s.holders.length >= s.capacity && !mine;
    const fill = s.capacity > 1 ? ` (${s.holders.length} of 2)` : '';
    return { value: s.id, label: `${s.label}${full ? ' · full' : fill}`, disabled: full };
  });
  const free = options.filter((o) => !o.disabled).length;
  const committee = committees.find((c) => c.id === cid);
  const chosen = seats.data?.find((s) => s.id === seat);
  return (
    <DialogPopup className="rounded-sm">
      <DialogHeader>
        <DialogTitle className="font-heading text-[28px] font-semibold leading-[1.1] tracking-[-0.01em]">Seat for {a.fullName}</DialogTitle>
        <DialogDescription className="text-base text-muted-foreground">{a.schoolName} · Grade {a.grade}</DialogDescription>
      </DialogHeader>
      <DialogPanel className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5"><span className={labelCls}>Their choices</span><Choices a={a} cid={cid} /></div>
        <Field label="Committee">
          {(id) => <Choice id={id} value={cid} onChange={(v) => { setCid(v); setSeat(''); }} placeholder="Choose a committee"
            options={committees.map((c) => {
              const rank = a.choices.findIndex((x) => x.id === c.id);
              return { value: c.id, label: `${c.abbr} · ${c.name}${rank >= 0 ? ` (choice ${rank + 1})` : ''}` };
            })} />}
        </Field>
        <Field label="Seat" hint={seats.data ? (seats.data.length ? `${free} of ${seats.data.length} seats free in ${committee?.abbr ?? 'this committee'}` : 'No seats yet. Add them on the Seats tab.') : undefined}>
          {(id, by) => <Choice id={id} label={by ? undefined : 'Seat'} value={seat} onChange={setSeat} placeholder={seats.data?.length ? 'Choose a seat' : 'No seats'} options={options} />}
        </Field>
        {a.seat && a.seat.committeeId !== cid && <p className="text-[15px] text-warning">They're seated in another committee. Assigning moves them.</p>}
      </DialogPanel>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <Button disabled={!seat || seat === a.seat?.id} loading={pending === 'as'}
          onClick={async () => {
            const ok = await run('as', (x) => x.assignSeat(a.registrationId, seat), `${a.fullName} → ${chosen?.label ?? 'seat'} · ${committee?.abbr ?? ''}`);
            if (ok) onClose();
          }}>
          <Armchair aria-hidden="true" /> Assign seat
        </Button>
      </DialogFooter>
    </DialogPopup>
  );
}
