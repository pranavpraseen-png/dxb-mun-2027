// Awards rubric. Private to the dais: delegates never see this page. Gold appears here only, for honours.
// Score: pick a session, then one row per seat and a column per criterion (type 1–10, Enter moves down).
// Each row autosaves a moment after you stop typing; "Save all" saves at once. Criteria are editable.
// Ranking adds up every chair's sheets. Nominations: a seat for each award, or a custom award.
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { CheckCircle2, Hourglass, ListOrdered, Lock, Medal, Plus, RotateCcw, Save, ShieldCheck, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { DEFAULT_AWARDS, DEFAULT_CRITERIA, type Criterion, type DaisSeat, type Nomination, type RankingRow, type ScoreSheet } from '@/platform/v2';
import { cn } from '../../portal/ui/coss/utils';
import { Button } from '../../portal/ui/coss/button';
import { Input } from '../../portal/ui/coss/input';
import { Label } from '../../portal/ui/coss/label';
import { Tabs, TabsList, TabsPanel, TabsTab } from '../../portal/ui/coss/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/coss/table';
import { useAction, useChair, useLoad, errorText } from '../lib/data';
import { useToast } from '../../portal/lib/toast';
import { setParam, useRoute } from '../lib/route';
import { Empty, Loaded, PageHead, Panel, Pick, Tag, names } from '../ui/kit';

type TabId = 'score' | 'ranking' | 'nominations' | 'criteria';
const TABS: { id: TabId; label: string; icon: typeof Medal }[] = [
  { id: 'score', label: 'Score', icon: SlidersHorizontal },
  { id: 'ranking', label: 'Ranking', icon: ListOrdered },
  { id: 'nominations', label: 'Nominations', icon: Medal },
  { id: 'criteria', label: 'Criteria', icon: SlidersHorizontal },
];

export function AwardsScreen() {
  const { params } = useRoute();
  const raw = params.get('tab');
  const tab: TabId = TABS.some((t) => t.id === raw) ? (raw as TabId) : 'score';
  return (
    <>
      <PageHead
        title="Awards rubric"
        line={<span className="inline-flex items-center gap-2"><ShieldCheck size={18} aria-hidden="true" className="text-gold" /> Private to the dais. Delegates never see this page.</span>}
      />
      <Tabs value={tab} onValueChange={(v) => setParam('tab', String(v))}>
        <TabsList className="max-w-full flex-wrap max-md:w-full">
          {TABS.map((t) => (
            <TabsTab key={t.id} value={t.id} className="h-11 px-4 font-label text-lg font-semibold sm:h-11 sm:text-lg">
              <t.icon aria-hidden="true" /> {t.label}
            </TabsTab>
          ))}
        </TabsList>
        <TabsPanel value="score" className="mt-2"><ScoreTab /></TabsPanel>
        <TabsPanel value="ranking" className="mt-2"><RankingTab /></TabsPanel>
        <TabsPanel value="nominations" className="mt-2"><NominationsTab /></TabsPanel>
        <TabsPanel value="criteria" className="mt-2"><CriteriaTab /></TabsPanel>
      </Tabs>
    </>
  );
}

/* ------------------------------------------------------------------ score grid */
function ScoreTab() {
  const live = useLoad((a, c) => a.live(c), ['live']);
  const crit = useLoad((a, c) => a.criteria(c), ['scores']);
  const seats = useLoad((a, c) => a.seats(c), ['seat']);
  const current = live.data?.session?.number ?? 1;
  const [session, setSession] = useState<number | null>(null);
  const n = session ?? current;
  const sessions = Array.from({ length: Math.max(current, n, 1) }, (_, i) => i + 1);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex w-52 flex-col gap-1">
          <Label className="text-base font-semibold">Session</Label>
          <Pick label="Session" value={String(n)} onChange={(v) => v && setSession(Number(v))} placeholder="Choose a session"
            options={sessions.map((s) => ({ value: String(s), label: `Session ${s}${s === live.data?.session?.number ? ' (current)' : ''}` }))} />
        </div>
        <p className="pb-2 text-base text-muted-foreground">Type 1–{crit.data?.[0]?.max ?? 10} in each box. Enter moves down. Rows save on their own.</p>
      </div>
      <Loaded load={crit} what="the criteria" lines={6}>
        {(criteria) => (
          <Loaded load={seats} what="the seats" lines={6}>
            {(s) => <Grid key={n} session={n} criteria={criteria} seats={s} />}
          </Loaded>
        )}
      </Loaded>
    </div>
  );
}

type Row = { marks: Record<string, number>; comment: string; state: 'saved' | 'dirty' | 'saving' | 'error' | 'empty' };

function Grid({ session, criteria, seats }: { session: number; criteria: Criterion[]; seats: DaisSeat[] }) {
  const { api, committee, bump } = useChair();
  const toast = useToast();
  const sheets = useLoad((a, c) => a.scores(c, session), ['scores'], [session]);
  const [rows, setRows] = useState<Record<string, Row>>({});
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Fill from the server; never overwrite a row the chair is still typing in.
  useEffect(() => {
    if (!sheets.data) return;
    const by = new Map<string, ScoreSheet>(sheets.data.map((s) => [s.seatId, s]));
    setRows((prev) => {
      const next: Record<string, Row> = { ...prev };
      for (const d of seats) {
        const id = d.seat.id;
        if (prev[id] && (prev[id].state === 'dirty' || prev[id].state === 'saving')) continue;
        const s = by.get(id);
        next[id] = s ? { marks: { ...s.marks }, comment: s.comment ?? '', state: 'saved' } : { marks: {}, comment: '', state: 'empty' };
      }
      return next;
    });
  }, [sheets.data, seats]);
  useEffect(() => () => { Object.values(timers.current).forEach(clearTimeout); }, []);

  const save = useCallback(async (seatId: string) => {
    clearTimeout(timers.current[seatId]);
    const r = rowsRef.current[seatId];
    if (!r || (r.state !== 'dirty' && r.state !== 'error')) return true;
    setRows((p) => ({ ...p, [seatId]: { ...p[seatId], state: 'saving' } }));
    try {
      await api.saveScore(committee.id, { seatId, sessionNumber: session, marks: r.marks, comment: r.comment.trim() || null });
      setRows((p) => {
        const cur = p[seatId];
        // If the chair typed again while saving, keep it dirty so the next save picks it up.
        const same = cur && JSON.stringify(cur.marks) === JSON.stringify(r.marks) && cur.comment === r.comment;
        return { ...p, [seatId]: { ...cur, state: same ? 'saved' : 'dirty' } };
      });
      bump('scores');
      return true;
    } catch (e) {
      setRows((p) => ({ ...p, [seatId]: { ...p[seatId], state: 'error' } }));
      toast(errorText(e), 'error');
      return false;
    }
  }, [api, committee.id, session, bump, toast]);

  const schedule = (seatId: string) => {
    clearTimeout(timers.current[seatId]);
    timers.current[seatId] = setTimeout(() => void save(seatId), 900);
  };
  const edit = (seatId: string, fn: (r: Row) => Row) => {
    setRows((p) => {
      const cur = p[seatId] ?? { marks: {}, comment: '', state: 'empty' as const };
      return { ...p, [seatId]: { ...fn(cur), state: 'dirty' } };
    });
    schedule(seatId);
  };
  const setMark = (seatId: string, c: Criterion, raw: string) => {
    const v = raw.replace(/\D/g, '');
    edit(seatId, (r) => {
      const marks = { ...r.marks };
      if (!v) delete marks[c.key];
      else marks[c.key] = Math.max(1, Math.min(c.max, Number(v)));
      return { ...r, marks };
    });
  };
  const saveAll = async () => {
    const ids = Object.keys(rowsRef.current).filter((id) => ['dirty', 'error'].includes(rowsRef.current[id].state));
    if (!ids.length) { toast('Everything is saved', 'info'); return; }
    const ok = (await Promise.all(ids.map((id) => save(id)))).every(Boolean);
    if (ok) toast(`Saved ${ids.length} row${ids.length === 1 ? '' : 's'}`, 'ok');
  };

  // Enter / arrow keys move between rows in the same column.
  const onKey = (e: KeyboardEvent<HTMLInputElement>, r: number, c: number) => {
    const move = e.key === 'Enter' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
    if (!move) return;
    e.preventDefault();
    const el = document.querySelector<HTMLInputElement>(`[data-cell="${r + move}-${c}"]`);
    el?.focus(); el?.select();
  };

  const unsaved = Object.values(rows).filter((r) => r.state === 'dirty' || r.state === 'saving' || r.state === 'error').length;
  const scored = Object.values(rows).filter((r) => Object.keys(r.marks).length > 0).length;
  const maxTotal = criteria.reduce((a, c) => a + c.max, 0);

  if (sheets.error && !sheets.data) return <Loaded load={sheets} what="your scores">{() => null}</Loaded>;
  return (
    <Panel
      title={`Session ${session} · my scores`}
      icon={SlidersHorizontal}
      aside={
        <>
          {unsaved ? <Tag tone="wait" icon={Hourglass}>{unsaved} saving</Tag> : <Tag tone="ok">All saved</Tag>}
          <Button size="sm" variant="outline" onClick={() => void saveAll()}><Save aria-hidden="true" /> Save all</Button>
        </>
      }
      bodyClass="p-0 pt-0 max-md:p-0"
    >
      {!seats.length ? <div className="p-5"><Empty title="No seats yet" /></div> : (
        <Table className="rubric text-base">
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-40 text-base">Seat</TableHead>
              {criteria.map((c) => <TableHead key={c.key} className="w-20 whitespace-normal text-center text-sm leading-tight">{c.label}<span className="block text-xs text-muted-foreground">1–{c.max}</span></TableHead>)}
              <TableHead className="text-center text-base">Total</TableHead>
              <TableHead className="min-w-56 text-base">Comment</TableHead>
              <TableHead className="text-base"><span className="sr-only">Saved</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {seats.map((d, ri) => {
              const r = rows[d.seat.id] ?? { marks: {}, comment: '', state: 'empty' as const };
              const total = criteria.reduce((a, c) => a + (r.marks[c.key] ?? 0), 0);
              return (
                <TableRow key={d.seat.id}>
                  <TableCell className="whitespace-normal">
                    <span className="block font-semibold">{d.seat.label}</span>
                    <span className="block text-sm text-muted-foreground">{names(d.delegates)}</span>
                  </TableCell>
                  {criteria.map((c, ci) => (
                    <TableCell key={c.key} className="p-1.5 text-center">
                      <input
                        data-cell={`${ri}-${ci}`}
                        type="number" inputMode="numeric" min={1} max={c.max}
                        aria-label={`${d.seat.label}, ${c.label}, 1 to ${c.max}`}
                        value={r.marks[c.key] ?? ''}
                        onChange={(e) => setMark(d.seat.id, c, e.target.value)}
                        onKeyDown={(e) => onKey(e, ri, ci)}
                        onFocus={(e) => e.target.select()}
                        className="h-11 w-14 rounded-sm border border-input bg-background text-center font-mono text-xl font-medium text-foreground outline-none focus-visible:border-primary"
                      />
                    </TableCell>
                  ))}
                  <TableCell className="text-center font-mono text-lg font-medium">{total ? `${total}/${maxTotal}` : '—'}</TableCell>
                  <TableCell className="p-1.5">
                    <Input aria-label={`Comment on ${d.seat.label}`} value={r.comment} maxLength={300} placeholder="Comment"
                      onChange={(e) => edit(d.seat.id, (x) => ({ ...x, comment: e.target.value }))}
                      onBlur={() => void save(d.seat.id)} className="*:data-[slot=input]:h-11" />
                  </TableCell>
                  <TableCell><RowState state={r.state} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      <p className="px-5 pb-4 text-[15px] text-muted-foreground max-md:px-4">{scored} of {seats.length} seats scored this session. Only you see your own sheets; the ranking combines every chair.</p>
    </Panel>
  );
}

function RowState({ state }: { state: Row['state'] }) {
  if (state === 'saved') return <Tag tone="ok" icon={CheckCircle2}>Saved</Tag>;
  if (state === 'saving') return <Tag tone="wait" icon={Hourglass}>Saving</Tag>;
  if (state === 'dirty') return <Tag tone="wait" icon={Hourglass}>Not saved</Tag>;
  if (state === 'error') return <Tag tone="bad">Not saved</Tag>;
  return <span className="text-sm text-muted-foreground">Not scored</span>;
}

/* ------------------------------------------------------------------ ranking */
function RankingTab() {
  const rank = useLoad((a, c) => a.ranking(c), ['scores']);
  const crit = useLoad((a, c) => a.criteria(c), ['scores']);
  return (
    <Loaded load={rank} what="the ranking" lines={8}>
      {(rows) => <Ranking rows={rows} criteria={crit.data ?? DEFAULT_CRITERIA} />}
    </Loaded>
  );
}

function Ranking({ rows, criteria }: { rows: RankingRow[]; criteria: Criterion[] }) {
  const chairs = useMemo(() => {
    const m = new Map<string, string | null>();
    rows.forEach((r) => r.byChair.forEach((c) => m.set(c.chairId, c.chairName)));
    return [...m.entries()];
  }, [rows]);
  return (
    <Panel title="Ranking" icon={ListOrdered} aside={<Tag tone="off">{chairs.length} {chairs.length === 1 ? 'chair' : 'chairs'} scoring</Tag>} bodyClass="p-0 pt-0 max-md:p-0">
      {!rows.length ? <div className="p-5"><Empty title="No scores yet" line="Score seats on the Score tab first." icon={ListOrdered} /></div> : (
        <Table className="rubric text-base">
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-44 text-base">Seat</TableHead>
              <TableHead className="text-center text-base">Total</TableHead>
              {criteria.map((c) => <TableHead key={c.key} className="w-20 whitespace-normal text-center text-sm leading-tight">{c.label}</TableHead>)}
              <TableHead className="text-center text-sm">Sessions</TableHead>
              {chairs.map(([id, name]) => <TableHead key={id} className="whitespace-normal text-center text-sm leading-tight">{name ?? 'Chair'}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.seat.id}>
                <TableCell className="whitespace-normal">
                  <span className="flex items-center gap-2">
                    <span className={cn('inline-flex size-7 shrink-0 items-center justify-center border font-mono text-sm font-medium', i === 0 ? 'border-gold text-gold' : 'border-input text-muted-foreground')}>{i + 1}</span>
                    <span className="min-w-0">
                      <span className="block font-semibold">{r.seat.label}</span>
                      <span className="block text-sm text-muted-foreground">{names(r.delegates)}</span>
                    </span>
                  </span>
                </TableCell>
                <TableCell className="text-center font-mono text-xl font-medium">{fmt(r.total)}</TableCell>
                {criteria.map((c) => <TableCell key={c.key} className="text-center font-mono">{r.byCriterion[c.key] !== undefined ? fmt(r.byCriterion[c.key]) : '—'}</TableCell>)}
                <TableCell className="text-center font-mono">{r.sessionsScored}</TableCell>
                {chairs.map(([id]) => {
                  const c = r.byChair.find((x) => x.chairId === id);
                  return <TableCell key={id} className="text-center font-mono">{c ? fmt(c.total) : '—'}</TableCell>;
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <p className="px-5 pb-4 text-[15px] text-muted-foreground max-md:px-4">Total = average per scored session, summed over the criteria, all chairs together.</p>
    </Panel>
  );
}
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/* ------------------------------------------------------------------ nominations */
function NominationsTab() {
  const noms = useLoad((a, c) => a.nominations(c), ['scores']);
  const seats = useLoad((a, c) => a.seats(c), ['seat']);
  const rank = useLoad((a, c) => a.ranking(c), ['scores']);
  return (
    <Loaded load={noms} what="nominations" lines={6}>
      {(list) => <Nominations list={list} seats={seats.data ?? []} top={rank.data?.slice(0, 3) ?? []} />}
    </Loaded>
  );
}

function Nominations({ list, seats, top }: { list: Nomination[]; seats: DaisSeat[]; top: RankingRow[] }) {
  const custom = [...new Set(list.map((n) => n.award).filter((a) => !(DEFAULT_AWARDS as readonly string[]).includes(a)))];
  return (
    <div className="flex flex-col gap-4">
      {top.length > 0 && (
        <p className="flex flex-wrap items-center gap-2 text-base text-muted-foreground">
          <ListOrdered size={16} aria-hidden="true" /> Ranking leaders: {top.map((r, i) => `${i + 1}. ${r.seat.label} (${fmt(r.total)})`).join(' · ')}
        </p>
      )}
      <div className="two-col">
        {[...DEFAULT_AWARDS, ...custom].map((award) => <AwardCard key={award} award={award} noms={list.filter((n) => n.award === award)} seats={seats} />)}
        <CustomAward seats={seats} />
      </div>
      <p className="text-[15px] text-muted-foreground">The secretariat locks the winners. Locked nominations show a lock.</p>
    </div>
  );
}

function AwardCard({ award, noms, seats }: { award: string; noms: Nomination[]; seats: DaisSeat[] }) {
  const { run, pending } = useAction();
  const [pick, setPick] = useState('');
  const taken = new Set(noms.map((n) => n.seat.id));
  return (
    <Panel title={<span className="text-gold">{award}</span>} icon={Medal} className="border-t-2 border-t-gold" aside={<Tag tone={noms.length ? 'gold' : 'off'}>{noms.length ? `${noms.length} nominated` : 'None yet'}</Tag>}>
      {noms.length > 0 && (
        <ul className="flex flex-col divide-y border-y">
          {noms.map((n) => (
            <li key={n.id} className="flex min-h-12 items-center gap-2 py-1.5">
              <Medal size={18} aria-hidden="true" className="shrink-0 text-gold" />
              <span className="min-w-0 flex-1 truncate text-lg font-semibold">{n.seat.label}</span>
              {n.final ? <Tag tone="gold" icon={Lock}>Final</Tag> : (
                <Button size="icon-sm" variant="ghost" aria-label={`Remove ${n.seat.label} from ${award}`} onClick={() => void run((a) => a.removeNomination(n.id), 'Nomination removed')}><X aria-hidden="true" /></Button>
              )}
            </li>
          ))}
        </ul>
      )}
      <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (pick) void run((a, c) => a.nominate(c, pick, award), `Nominated for ${award}`).then((ok) => ok && setPick('')); }}>
        <div className="min-w-44 flex-1">
          <Pick label={`Seat for ${award}`} value={pick} onChange={setPick} placeholder="Choose a seat" options={seats.filter((s) => !taken.has(s.seat.id)).map((s) => ({ value: s.seat.id, label: s.seat.label }))} />
        </div>
        <Button type="submit" variant="outline" disabled={!pick || pending}><Plus aria-hidden="true" /> Nominate</Button>
      </form>
    </Panel>
  );
}

function CustomAward({ seats }: { seats: DaisSeat[] }) {
  const { run, pending } = useAction();
  const [name, setName] = useState('');
  const [pick, setPick] = useState('');
  return (
    <Panel title="Custom award" icon={Plus}>
      <form className="flex flex-col gap-2.5" onSubmit={(e) => {
        e.preventDefault();
        if (name.trim() && pick) void run((a, c) => a.nominate(c, pick, name.trim()), `Nominated for ${name.trim()}`).then((ok) => { if (ok) { setName(''); setPick(''); } });
      }}>
        <Label htmlFor="cw-name" className="text-base font-semibold">Award name</Label>
        <Input id="cw-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Best Diplomacy" maxLength={60} />
        <Label className="text-base font-semibold">Seat</Label>
        <Pick label="Seat for the custom award" value={pick} onChange={setPick} placeholder="Choose a seat" options={seats.map((s) => ({ value: s.seat.id, label: s.seat.label }))} />
        <Button type="submit" variant="outline" className="self-start" disabled={!name.trim() || !pick || pending}><Plus aria-hidden="true" /> Nominate</Button>
      </form>
    </Panel>
  );
}

/* ------------------------------------------------------------------ criteria editor */
function CriteriaTab() {
  const crit = useLoad((a, c) => a.criteria(c), ['scores']);
  return <Loaded load={crit} what="the criteria" lines={6}>{(c) => <CriteriaEditor initial={c} />}</Loaded>;
}

function slug(label: string, taken: Set<string>): string {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'criterion';
  let k = base;
  for (let i = 2; taken.has(k); i++) k = `${base}_${i}`;
  return k;
}

function CriteriaEditor({ initial }: { initial: Criterion[] }) {
  const { run, pending } = useAction();
  const [list, setList] = useState<(Criterion & { fresh?: boolean })[]>(initial);
  useEffect(() => { setList(initial); }, [initial]);
  const changed = JSON.stringify(list.map(({ key, label, max }) => ({ key, label, max }))) !== JSON.stringify(initial);
  const bad = list.some((c) => !c.label.trim() || !(c.max >= 1 && c.max <= 100)) || list.length === 0;
  const save = () => {
    const taken = new Set(list.filter((c) => !c.fresh).map((c) => c.key));
    const out = list.map((c) => {
      if (!c.fresh) return { key: c.key, label: c.label.trim(), max: c.max };
      const key = slug(c.label, taken); taken.add(key);
      return { key, label: c.label.trim(), max: c.max };
    });
    void run((a, c) => a.setCriteria(c, out), 'Criteria saved');
  };
  const set = (i: number, patch: Partial<Criterion>) => setList((l) => l.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  return (
    <Panel title="Criteria" icon={SlidersHorizontal} aside={changed ? <Tag tone="wait">Not saved</Tag> : <Tag tone="ok">Saved</Tag>}>
      <p className="text-base text-muted-foreground">Used by every chair of this committee. Each is scored 1 to its max.</p>
      <ul className="flex flex-col gap-2">
        {list.map((c, i) => (
          <li key={c.fresh ? `new-${i}` : c.key} className="flex flex-wrap items-end gap-2 border-b pb-2 last:border-b-0">
            <div className="flex min-w-48 flex-1 flex-col gap-1">
              <Label htmlFor={`cr-l-${i}`} className="text-sm text-muted-foreground">Name</Label>
              <Input id={`cr-l-${i}`} value={c.label} onChange={(e) => set(i, { label: e.target.value })} maxLength={40} aria-invalid={!c.label.trim() || undefined} />
            </div>
            <div className="flex w-24 flex-col gap-1">
              <Label htmlFor={`cr-m-${i}`} className="text-sm text-muted-foreground">Max</Label>
              <Input id={`cr-m-${i}`} type="number" min={1} max={100} inputMode="numeric" value={Number.isFinite(c.max) ? c.max : ''}
                onChange={(e) => set(i, { max: Number(e.target.value) })} className="*:data-[slot=input]:font-mono" aria-invalid={!(c.max >= 1 && c.max <= 100) || undefined} />
            </div>
            <Button variant="ghost" size="icon" aria-label={`Remove ${c.label || 'criterion'}`} onClick={() => setList((l) => l.filter((_, j) => j !== i))}><Trash2 aria-hidden="true" /></Button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setList((l) => [...l, { key: '', label: '', max: 10, fresh: true }])}><Plus aria-hidden="true" /> Add criterion</Button>
        <Button variant="outline" onClick={() => setList(DEFAULT_CRITERIA.map((c) => ({ ...c })))}><RotateCcw aria-hidden="true" /> Use the defaults</Button>
        <Button onClick={save} disabled={!changed || bad} loading={pending}><Save aria-hidden="true" /> Save criteria</Button>
      </div>
      {bad && <p className="text-base text-destructive-foreground" role="alert">Every criterion needs a name and a max from 1 to 100.</p>}
      <p className="text-[15px] text-muted-foreground">Removing a criterion hides its marks from the totals.</p>
    </Panel>
  );
}
