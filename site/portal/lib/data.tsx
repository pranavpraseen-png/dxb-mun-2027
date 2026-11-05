// Data plumbing for the delegate dashboard (v2 contract): the API in context, a loader hook that re-fetches
// when a live topic changes, and an action helper that shows a toast and refreshes every screen.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { DelegateApi, Topic } from '@/platform/v2';
import { useToast } from './toast';

export type { Topic };
type Versions = Partial<Record<Topic | 'all', number>>;

const ApiCtx = createContext<DelegateApi | null>(null);
const VersionCtx = createContext<Versions>({});
const BumpCtx = createContext<(t: Topic | 'all') => void>(() => {});

export function DataProvider({ api, children }: { api: DelegateApi; children: ReactNode }) {
  const [v, setV] = useState<Versions>({});
  const bump = useCallback((t: Topic | 'all') => setV((p) => ({ ...p, [t]: (p[t] ?? 0) + 1 })), []);
  return (
    <ApiCtx.Provider value={api}>
      <BumpCtx.Provider value={bump}>
        <VersionCtx.Provider value={v}>{children}</VersionCtx.Provider>
      </BumpCtx.Provider>
    </ApiCtx.Provider>
  );
}

export function useApi(): DelegateApi {
  const api = useContext(ApiCtx);
  if (!api) throw new Error('useApi outside DataProvider');
  return api;
}
export const useBump = () => useContext(BumpCtx);

export type Load<T> = { data: T | undefined; error: unknown; loading: boolean; reload: () => void };

/**
 * Loads data from the API. Re-runs after any action (the "all" version) and when one of the
 * live topics changes. Keeps the last data while re-loading, so screens never flash back to skeletons.
 */
export function useLoad<T>(fn: (api: DelegateApi) => Promise<T>, topics: Topic[] = [], deps: unknown[] = []): Load<T> {
  const api = useApi();
  const v = useContext(VersionCtx);
  const key = [v.all ?? 0, ...topics.map((t) => v[t] ?? 0)].join('.');
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<{ data: T | undefined; error: unknown; loading: boolean }>({ data: undefined, error: null, loading: true });
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fnRef.current(api).then(
      (data) => { if (alive) setState({ data, error: null, loading: false }); },
      (error) => { if (alive) setState((s) => ({ data: s.data, error, loading: false })); },
    );
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, key, nonce, ...deps]);
  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}

/** Plain words for an error, never a stack trace. */
export function errorText(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === 'string') return e;
  return 'Something went wrong.';
}

/**
 * Runs an action: shows a success toast, refreshes every screen's data, and reports errors in plain words.
 * Returns true when the action worked.
 */
export function useAction() {
  const api = useApi();
  const bump = useBump();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const run = useCallback(
    async (fn: (api: DelegateApi) => Promise<unknown>, success: string | null): Promise<boolean> => {
      setPending(true);
      try {
        await fn(api);
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
    [api, bump, toast],
  );
  return { run, pending };
}
