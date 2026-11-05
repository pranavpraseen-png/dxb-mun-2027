// Committees and chairs (DASHBOARD-PLAN.md §3.3): add or edit a committee (abbr, name, room), and give each
// one its chairs (search the team by email; chair, vice chair or rapporteur).
import { useEffect, useState } from 'react';
import { Landmark, Pencil, Plus, Search, UserPlus, X } from 'lucide-react';
import type { ChairRole, Committee, TeamMember } from '@/platform/v2';
import { Button } from '../../portal/ui/coss/button';
import { Input } from '../../portal/ui/coss/input';
import { cn } from '../../portal/ui/coss/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/coss/table';
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from '../ui/coss/dialog';
import { errorText, useAction, useAdmin, useLoad } from '../lib/data';
import { Choice, Empty, Field, Head, Panel, Skeleton, TBA, Tag, Tba } from '../ui/kit';

export const CHAIR_ROLE: Record<ChairRole, string> = { chair: 'Chair', vice_chair: 'Vice chair', rapporteur: 'Rapporteur' };
type Chair = { person: TeamMember; role: ChairRole };

export function CommitteesScreen() {
  const { committees } = useAdmin();
  const team = useLoad((a) => a.team(''), [], ['seat']);
  const [edit, setEdit] = useState<Committee | 'new' | null>(null);
  const [addTo, setAddTo] = useState<Committee | null>(null);
  const chairsOf = (cid: string): Chair[] =>
    (team.data ?? []).flatMap((p) => p.chairs.filter((c) => c.committeeId === cid).map((c) => ({ person: p, role: c.role })))
      .sort((a, b) => Object.keys(CHAIR_ROLE).indexOf(a.role) - Object.keys(CHAIR_ROLE).indexOf(b.role));

  return (
    <>
      <Head title="Committees and chairs" line={`${committees.length} committees. Give each one a room and its chairs.`}
        aside={<Button onClick={() => setEdit('new')}><Plus aria-hidden="true" /> Add committee</Button>} />
      <Panel title="Committees" icon={Landmark} bodyClassName="p-0 pt-0 max-md:p-3">
        {!committees.length ? <div className="p-5"><Empty>No committees yet. Add the first one.</Empty></div>
          : !team.data ? <div className="p-5"><Skeleton lines={6} /></div> : (
          <>
            <div className="w-full max-md:hidden">
              <Table className="text-base">
                <TableHeader>
                  <TableRow>
                    <TableHead className="ps-5">Committee</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Seats filled</TableHead>
                    <TableHead>Chairs</TableHead>
                    <TableHead className="pe-5 text-right"><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {committees.map((c) => (
                    <TableRow key={c.id} className="align-top">
                      <TableCell className="ps-5">
                        <p className="font-mono text-xl font-medium leading-none">{c.abbr}</p>
                        <p className="mt-1 max-w-72 whitespace-normal text-sm text-muted-foreground">{c.name}</p>
                      </TableCell>
                      <TableCell>{c.room ?? <Tba />}</TableCell>
                      <TableCell className="font-mono">{c.filled}<span className="text-muted-foreground"> / {c.seats}</span></TableCell>
                      <TableCell><Chairs list={chairsOf(c.id)} committee={c} onAdd={() => setAddTo(c)} /></TableCell>
                      <TableCell className="pe-5 text-right">
                        <Button variant="outline" size="sm" onClick={() => setEdit(c)} aria-label={`Edit ${c.abbr}`}><Pencil aria-hidden="true" /> Edit</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ul className="flex w-full flex-col gap-2.5 md:hidden" aria-label="Committees">
              {committees.map((c) => (
                <li key={c.id} className="flex flex-col gap-2.5 border bg-background p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-2xl font-medium leading-none">{c.abbr}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{c.name}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setEdit(c)} aria-label={`Edit ${c.abbr}`}><Pencil aria-hidden="true" /> Edit</Button>
                  </div>
                  <p className="text-[15px]">Room: {c.room ?? <Tba />} · <span className="font-mono">{c.filled}/{c.seats}</span> seats filled</p>
                  <Chairs list={chairsOf(c.id)} committee={c} onAdd={() => setAddTo(c)} />
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>
      <CommitteeDialog value={edit} onClose={() => setEdit(null)} />
      <AddChairDialog committee={addTo} onClose={() => setAddTo(null)} />
    </>
  );
}

function Chairs({ list, committee, onAdd }: { list: Chair[]; committee: Committee; onAdd: () => void }) {
  const { run, pending } = useAction();
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {list.length === 0 && <Tag tone="waiting">No chairs</Tag>}
      {list.map(({ person, role }) => (
        <span key={person.id} className="inline-flex items-center gap-1 border border-input py-0.5 ps-2 text-[15px]">
          <span className="font-semibold">{person.fullName ?? person.email}</span>
          <span className="text-muted-foreground">· {CHAIR_ROLE[role]}</span>
          <Button variant="ghost" size="icon-xs" className="size-8 sm:size-8" aria-label={`Remove ${person.fullName ?? person.email} as ${CHAIR_ROLE[role]} of ${committee.abbr}`}
            loading={pending === person.id}
            onClick={() => void run(person.id, (a) => a.removeChair(committee.id, person.id), `${person.fullName ?? person.email} removed from ${committee.abbr}`)}>
            <X aria-hidden="true" />
          </Button>
        </span>
      ))}
      <Button variant="ghost" size="sm" onClick={onAdd}><UserPlus aria-hidden="true" /> Add chair</Button>
    </div>
  );
}

function CommitteeDialog({ value, onClose }: { value: Committee | 'new' | null; onClose: () => void }) {
  return (
    <Dialog open={value !== null} onOpenChange={(o) => { if (!o) onClose(); }}>
      {value !== null && <CommitteeForm key={value === 'new' ? 'new' : value.id} c={value === 'new' ? null : value} onClose={onClose} />}
    </Dialog>
  );
}

function CommitteeForm({ c, onClose }: { c: Committee | null; onClose: () => void }) {
  const { run, pending } = useAction();
  const [abbr, setAbbr] = useState(c?.abbr ?? '');
  const [name, setName] = useState(c?.name ?? '');
  const [room, setRoom] = useState(c?.room ?? '');
  const ok = abbr.trim() && name.trim();
  const save = async () => {
    const done = await run('save', (a) => a.saveCommittee({ id: c?.id, abbr: abbr.trim(), name: name.trim(), room: room.trim() || null }), c ? `${abbr.trim()} saved` : `${abbr.trim()} added`);
    if (done) onClose();
  };
  return (
    <DialogPopup className="rounded-sm">
      <form onSubmit={(e) => { e.preventDefault(); if (ok) void save(); }} className="contents">
        <DialogHeader>
          <DialogTitle className="font-heading text-[28px] font-semibold leading-[1.1] tracking-[-0.01em]">{c ? `Edit ${c.abbr}` : 'Add committee'}</DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">An empty room shows as "{TBA}".</DialogDescription>
        </DialogHeader>
        <DialogPanel className="flex flex-col gap-4">
          <Field label="Short name">{(id) => <Input id={id} value={abbr} onChange={(e) => setAbbr(e.target.value.toUpperCase())} placeholder="UNSC" maxLength={12} required />}</Field>
          <Field label="Full name">{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} placeholder="United Nations Security Council" required />}</Field>
          <Field label="Room">{(id) => <Input id={id} value={room} onChange={(e) => setRoom(e.target.value)} placeholder={TBA} />}</Field>
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button type="submit" disabled={!ok} loading={pending === 'save'}>{c ? 'Save' : 'Add committee'}</Button>
        </DialogFooter>
      </form>
    </DialogPopup>
  );
}

function AddChairDialog({ committee, onClose }: { committee: Committee | null; onClose: () => void }) {
  return (
    <Dialog open={!!committee} onOpenChange={(o) => { if (!o) onClose(); }}>
      {committee && <AddChairBody key={committee.id} committee={committee} onClose={onClose} />}
    </Dialog>
  );
}

/** Search people by email or name (debounced), pick one, choose the dais role. */
export function usePeopleSearch() {
  const { api } = useAdmin();
  const [q, setQ] = useState('');
  const [res, setRes] = useState<{ list: TeamMember[] | null; error: string | null }>({ list: null, error: null });
  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      api.team(q.trim()).then((list) => { if (alive) setRes({ list, error: null }); }, (e) => { if (alive) setRes({ list: [], error: errorText(e) }); });
    }, 220);
    return () => { alive = false; clearTimeout(t); };
  }, [api, q]);
  return { q, setQ, ...res };
}

function AddChairBody({ committee, onClose }: { committee: Committee; onClose: () => void }) {
  const { run, pending } = useAction();
  const { q, setQ, list, error } = usePeopleSearch();
  const [pick, setPick] = useState<TeamMember | null>(null);
  const [role, setRole] = useState<ChairRole>('chair');
  const add = async () => {
    if (!pick) return;
    const done = await run('add', async (a) => {
      // A delegate who becomes a chair gets the chair role; admins keep theirs.
      if (pick.role === 'delegate') await a.setRole(pick.id, 'chair');
      await a.addChair(committee.id, pick.id, role);
    }, `${pick.fullName ?? pick.email} is now ${CHAIR_ROLE[role]} of ${committee.abbr}`);
    if (done) onClose();
  };
  return (
    <DialogPopup className="rounded-sm">
      <DialogHeader>
        <DialogTitle className="font-heading text-[28px] font-semibold leading-[1.1] tracking-[-0.01em]">Add a chair to {committee.abbr}</DialogTitle>
        <DialogDescription className="text-base text-muted-foreground">Search by email or name. They must have signed in once.</DialogDescription>
      </DialogHeader>
      <DialogPanel className="flex flex-col gap-4">
        <Field label="Search people">
          {(id) => <Input id={id} type="search" autoFocus value={q} onChange={(e) => { setQ(e.target.value); setPick(null); }} placeholder="name@school.ae" />}
        </Field>
        <div className="flex max-h-64 w-full flex-col overflow-auto border" role="listbox" aria-label="People">
          {error ? <p className="p-3 text-destructive">{error}</p>
            : !list ? <div className="p-3"><Skeleton lines={3} /></div>
            : list.length === 0 ? <p className="flex items-center gap-2 p-3 text-muted-foreground"><Search size={16} aria-hidden="true" /> Nobody found.</p>
            : list.slice(0, 30).map((p) => (
              <button key={p.id} type="button" role="option" aria-selected={pick?.id === p.id} onClick={() => setPick(p)}
                className={cn('flex min-h-12 w-full flex-col items-start border-b px-3 py-2 text-left last:border-b-0 hover:bg-accent', pick?.id === p.id && 'bg-muted bg-[linear-gradient(var(--primary),var(--primary))] bg-[length:4px_100%] bg-no-repeat')}>
                <span className="font-semibold">{p.fullName ?? 'No name yet'}</span>
                <span className="text-sm text-muted-foreground">{p.email} · {p.role === 'admin' ? 'Secretariat' : p.role === 'chair' ? 'Chair' : 'Delegate'}</span>
              </button>
            ))}
        </div>
        <Field label="Role on the dais">
          {(id) => <Choice id={id} value={role} onChange={(v) => setRole((v || 'chair') as ChairRole)} placeholder="Role"
            options={(Object.keys(CHAIR_ROLE) as ChairRole[]).map((r) => ({ value: r, label: CHAIR_ROLE[r] }))} />}
        </Field>
      </DialogPanel>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <Button disabled={!pick} loading={pending === 'add'} onClick={() => void add()}><UserPlus aria-hidden="true" /> Add {pick ? (pick.fullName ?? pick.email) : 'chair'}</Button>
      </DialogFooter>
    </DialogPopup>
  );
}
