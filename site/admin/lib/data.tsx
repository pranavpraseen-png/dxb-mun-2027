// Data plumbing for the secretariat dashboard: the SecretariatApi (from '@/platform/v2') and the signed-in
// admin in context, a loader that re-fetches after every action and on the live topics it names, and an
// action helper that toasts and refreshes.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Committee, Me, SecretariatApi, Topic } from '@/platform/v2';
import { useToast } from './toast';

export function errorText(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === 'string') return e;
  return 'Something went wrong.';
}

type Ctx = {
  api: SecretariatApi; me: Me; committees: Committee[];
  version: number; topics: Partial<Record<Topic, number>>; bump: () => void;
};
const AdminCtx = createContext<Ctx | null>(null);

export function AdminProvider({ api, me, children }: { api: SecretariatApi; me: Me; children: ReactNode }) {
  const [version, setVersion] = useState(0);
  const [topics, setTopics] = useState<Partial<Record<Topic, number>>>({});
  const [committees, setCommittees] = useState<Committee[]>([]);
  const bump = useCallback(() => setVersion((v) => v + 1), []);
  // Live updates from other tabs and dashboards: count each topic, so loaders re-fetch only what changed.
  useEffect(() => api.subscribe((t) => setTopics((s) => ({ ...s, [t]: (s[t] ?? 0) + 1 }))), [api]);
  useEffect(() => {
    let alive = true;
    api.committees().then((c) => { if (alive) setCommittees(c); }, () => {});
    return () => { alive = false; };
  }, [api, version, topics.seat, topics.live]);
  return <AdminCtx.Provider value={{ api, me, committees, version, topics, bump }}>{children}</AdminCtx.Provider>;
}

export function useAdmin(): Ctx {
  const c = useContext(AdminCtx);
  if (!c) throw new Error('useAdmin outside AdminProvider');
  return c;
}

export type Load<T> = { data: T | undefined; error: unknown; loading: boolean; reload: () => void };

/** Loads data. Re-runs after any action, when deps change, and when one of `live` topics fires.
 *  Keeps the last data while re-loading, so screens never flicker. */
export function useLoad<T>(fn: (api: SecretariatApi) => Promise<T>, deps: unknown[] = [], live: Topic[] = []): Load<T> {
  const { api, version, topics } = useAdmin();
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<{ data: T | undefined; error: unknown; loading: boolean }>({ data: undefined, error: null, loading: true });
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const liveKey = live.map((t) => topics[t] ?? 0).join('.');
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fnRef.current(api).then(
      (data) => { if (alive) setState({ data, error: null, loading: false }); },
      (error) => { if (alive) setState((s) => ({ data: s.data, error, loading: false })); },
    );
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, version, nonce, liveKey, ...deps]);
  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}

/** Runs an action: a success toast, then every screen re-loads. Errors become a red toast. Returns true on success. */
export function useAction() {
  const { api, bump } = useAdmin();
  const toast = useToast();
  const [pending, setPending] = useState<string | null>(null);
  const run = useCallback(
    async <R,>(key: string, fn: (api: SecretariatApi) => Promise<R>, success: string | ((r: R) => string)): Promise<boolean> => {
      setPending(key);
      try {
        const r = await fn(api);
        toast(typeof success === 'function' ? success(r) : success, 'ok');
        bump();
        return true;
      } catch (e) {
        toast(errorText(e), 'error');
        return false;
      } finally {
        setPending(null);
      }
    },
    [api, bump, toast],
  );
  return { run, pending };
}

/** The current time, updated every `ms` (for ticking timers). */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
