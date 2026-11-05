// Team access (DASHBOARD-PLAN.md §3.9): search people, and set their role (delegate, chair, admin) and core
// level. Core secretariat only. You can't change your own access here, so nobody locks themselves out.
import { KeyRound } from 'lucide-react';
import type { Role, TeamMember } from '@/platform/v2';
import { Input } from '../../portal/ui/coss/input';
import { Label } from '../../portal/ui/coss/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/coss/table';
import { Switch } from '../ui/coss/switch';
import { useAction, useAdmin } from '../lib/data';
import { Choice, Empty, Head, Panel, Skeleton, Tag, labelCls, type Tone } from '../ui/kit';
import { CHAIR_ROLE, usePeopleSearch } from './Committees';

const ROLE: Record<Role, { label: string; tone: Tone }> = {
  delegate: { label: 'Delegate', tone: 'locked' },
  chair: { label: 'Chair', tone: 'todo' },
  admin: { label: 'Secretariat', tone: 'done' },
};

export function TeamScreen() {
  const { q, setQ, list, error } = usePeopleSearch();
  return (
    <>
      <Head title="Team access" line="Who is secretariat and who is a chair. Search anyone by email." />
      <div className="w-full max-w-md">
        <label htmlFor="team-q" className={labelCls}>Search people</label>
        <Input id="team-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or email" className="mt-1.5" />
        <p className="mt-1.5 text-sm text-muted-foreground">{q.trim() ? 'Everyone who matches.' : 'Empty search shows the chairs and secretariat.'}</p>
      </div>
      <Panel title={list ? `${list.length} ${list.length === 1 ? 'person' : 'people'}` : 'People'} icon={KeyRound} bodyClassName="p-0 pt-0 max-md:p-3">
        {error ? <div className="p-5 text-destructive">{error}</div>
          : !list ? <div className="p-5"><Skeleton lines={5} /></div>
          : list.length === 0 ? <div className="p-5"><Empty>Nobody found. They must sign in once before you can give them a role.</Empty></div>
          : (
            <>
              <div className="tbl-scroll w-full max-md:hidden">
                <Table className="text-base">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="ps-5">Person</TableHead>
                      <TableHead>Access now</TableHead>
                      <TableHead>Committees</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="pe-5">Core secretariat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((p) => <PersonRow key={p.id} p={p} />)}
                  </TableBody>
                </Table>
              </div>
              <ul className="flex w-full flex-col gap-2.5 md:hidden" aria-label="People">
                {list.map((p) => <PersonCard key={p.id} p={p} />)}
              </ul>
            </>
          )}
      </Panel>
    </>
  );
}

function useControls(p: TeamMember) {
  const { me, committees } = useAdmin();
  const { run, pending } = useAction();
  const self = p.id === me.id;
  const name = p.fullName ?? p.email;
  const chairs = p.chairs.map((c) => `${committees.find((x) => x.id === c.committeeId)?.abbr ?? '?'} ${CHAIR_ROLE[c.role].toLowerCase()}`).join(', ');
  const role = (
    <Choice label={`Role for ${name}`} value={p.role} placeholder="Role" className="w-44 max-md:w-full"
      onChange={(v) => { if (v && v !== p.role && !self) void run('role', (a) => a.setRole(p.id, v as Role, v === 'admin' ? p.isCore : false), `${name} is now ${ROLE[v as Role].label.toLowerCase()}`); }}
      options={(Object.keys(ROLE) as Role[]).map((r) => ({ value: r, label: ROLE[r].label, disabled: self }))} />
  );
  const core = (
    <Label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-base font-normal sm:text-base">
      <Switch checked={p.role === 'admin' && p.isCore} disabled={self || p.role !== 'admin' || pending === 'core'}
        onCheckedChange={(v) => void run('core', (a) => a.setRole(p.id, 'admin', v), `${name}: ${v ? 'core secretariat' : 'secretariat'}`)} />
      <span className={p.role === 'admin' ? '' : 'text-muted-foreground'}>{p.role === 'admin' ? (p.isCore ? 'Core' : 'Not core') : 'Secretariat only'}</span>
    </Label>
  );
  const tag = <Tag tone={ROLE[p.role].tone}>{p.role === 'admin' && p.isCore ? 'Core secretariat' : ROLE[p.role].label}</Tag>;
  return { self, name, chairs, role, core, tag };
}

function PersonRow({ p }: { p: TeamMember }) {
  const c = useControls(p);
  return (
    <TableRow>
      <TableCell className="ps-5">
        <p className="font-semibold">{p.fullName ?? 'No name yet'}{c.self && <span className="ms-2 text-sm font-normal text-primary">You</span>}</p>
        <p className="text-sm text-muted-foreground">{p.email}</p>
      </TableCell>
      <TableCell>{c.tag}</TableCell>
      <TableCell className="max-w-56 whitespace-normal text-[15px]">{c.chairs || <span className="text-muted-foreground">None</span>}</TableCell>
      <TableCell>{c.role}</TableCell>
      <TableCell className="pe-5">{c.core}</TableCell>
    </TableRow>
  );
}

function PersonCard({ p }: { p: TeamMember }) {
  const c = useControls(p);
  return (
    <li className="flex flex-col gap-2.5 border bg-background p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold">{p.fullName ?? 'No name yet'}{c.self && <span className="ms-2 text-sm font-normal text-primary">You</span>}</p>
          <p className="truncate text-sm text-muted-foreground">{p.email}</p>
        </div>
        {c.tag}
      </div>
      {c.chairs && <p className="text-[15px]">Chairs: {c.chairs}</p>}
      {c.role}
      {c.core}
    </li>
  );
}
