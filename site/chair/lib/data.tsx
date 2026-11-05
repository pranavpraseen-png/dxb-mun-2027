// The chair dashboard's data glue: one ChairApi, the chosen committee, live updates per topic, and two
// hooks every screen uses: useLoad (fetch + refetch when a topic changes) and useAction (run + toast).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ChairApi, ChairCommittee, Me, Topic } from '@/platform/v2';
import { useToast } from '../../portal/lib/toast';

type Versions = Partial<Record<Topic, number>>;
type Ctx = {
  api: ChairApi; me: Me; committees: ChairCommittee[];
  committee: ChairCommittee; setCommittee: (id: string) => void;
  versions: Versions; bump: (t: Topic | 'all') => void;
};
const C = createContext<Ctx | null>(null);

const ALL: Topic[] = ['live', 'roll', 'speakers', 'votes', 'resolutions', 'chits', 'files', 'announcements', 'schedule', 'phase', 'seat', 'papers', 'scores'];
const KEY = 'dxbmun.chair.committee';

function readSaved(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function ChairProvider({ api, me, committees, children }: { api: ChairApi; me: Me; committees: ChairCommittee[]; children: ReactNode }) {
  const [cid, setCid] = useState<string>(() => {
    const saved = readSaved();
    return committees.find((c) => c.id === saved)?.id ?? committees[0].id;
  });
  const [versions, setVersions] = useState<Versions>({});
  const bump = useCallback((t: Topic | 'all') => {
    setVersions((v) => {
      const next = { ...v };
      for (const k of t === 'all' ? ALL : [t]) next[k] = (next[k] ?? 0) + 1;
      return next;
    });
  }, []);
  useEffect(() => api.subscribe(cid, (what) => bump(what)), [api, cid, bump]);
  const setCommittee = useCallback((id: string) => {
    setCid(id);
    try { localStorage.setItem(KEY, id); } catch { /* private window: fine */ }
  }, []);
  const committee = committees.find((c) => c.id === cid) ?? committees[0];
  const value = useMemo(() => ({ api, me, committees, committee, setCommittee, versions, bump }), [api, me, committees, committee, setCommittee, versions, bump]);
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useChair(): Ctx {
  const v = useContext(C);
  if (!v) throw new Error('useChair outside ChairProvider');
  return v;
}

export type Load<T> = { data: T | undefined; error: unknown; loading: boolean; reload: () => void };

/** Fetches with the current committee id; refetches when the committee or one of `topics` changes. Keeps old data while refetching. */
export function useLoad<T>(fn: (api: ChairApi, c: string) => Promise<T>, topics: Topic[], deps: unknown[] = []): Load<T> {
  const { api, committee, versions } = useChair();
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<{ data: T | undefined; error: unknown; loading: boolean; for: string }>({ data: undefined, error: undefined, loading: true, for: committee.id });
  const key = topics.map((t) => versions[t] ?? 0).join('.');
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => {
    let alive = true;
    setState((s) => (s.for === committee.id ? { ...s, loading: true } : { data: undefined, error: undefined, loading: true, for: committee.id }));
    fnRef.current(api, committee.id).then(
      (data) => { if (alive) setState({ data, error: undefined, loading: false, for: committee.id }); },
      (error) => { if (alive) setState((s) => ({ ...s, error, loading: false })); },
    );
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, committee.id, key, nonce, ...deps]);
  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data: state.data, error: state.error, loading: state.loading, reload };
}

/** Plain words for an error, never a stack trace. */
export function errorText(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === 'string') return e;
  return 'Something went wrong.';
}

/** Runs an action: optional success toast, refreshes every screen, errors in plain words. Returns true when it worked. */
export function useAction() {
  const { api, committee, bump } = useChair();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const run = useCallback(
    async (fn: (api: ChairApi, c: string) => Promise<unknown>, success?: string): Promise<boolean> => {
      setPending(true);
      try {
        await fn(api, committee.id);
        if (success) toast(success, 'ok');
        bump('all');
        return true;
      } catch (e) {
        toast(errorText(e), 'error');
        return false;
      } finally {
        setPending(false);
      }
    },
    [api, committee.id, bump, toast],
  );
  return { run, pending };
}

/** A clock that ticks while `on` (4 times a second, so a countdown never skips a second). */
export function useNow(on: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    if (!on) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [on]);
  return now;
}
