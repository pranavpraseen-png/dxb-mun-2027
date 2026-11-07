// Delegate dashboard (v2 contract). Sign in, then: sign up (if new), "Waiting for your seat" (if applied),
// or the dashboard with seven places. Data comes only from '@/platform/v2'.
import { createRoot } from 'react-dom/client';
import { useEffect, useRef, useState } from 'react';
// T1 type (BLUEPRINT.md section 6): Mona Sans (weight + width axes) for UI, text and titles; Geist Mono for timers,
// codes, numbers and small labels; Instrument Serif italic for the motto only.
import '@fontsource-variable/mona-sans/wdth.css';
import '@fontsource-variable/geist-mono';
import '@fontsource/instrument-serif/400-italic.css';
import './theme.css';
import './portal.css';
import { getDelegateApi, openWithoutLogin, type DelegateApi } from '@/platform/v2';
import { DataProvider, useApi, useBump, useLoad } from './lib/data';
import { ToastProvider, useToast } from './lib/toast';
import { ConfProvider, useConf } from './lib/conf';
import { useRoute, type Place } from './lib/route';
import { useArrival } from './lib/arrive';
import { Shell, PLACES } from './Shell';
import { SignIn } from './screens/SignIn';
import { SignUpScreen, WaitingScreen } from './screens/SignUp';
import { NowScreen } from './screens/Now';
import { SpeakersScreen } from './screens/Speakers';
import { ResolutionsScreen } from './screens/Resolutions';
import { PaperScreen } from './screens/Paper';
import { NotesScreen } from './screens/Notes';
import { FilesScreen } from './screens/Files';
import { ScheduleScreen } from './screens/Schedule';
import { ErrorBox, ScreenSkeleton } from './ui/kit';
import { readSeenChits } from './screens/Notes';

const api = getDelegateApi();
openWithoutLogin('delegate');
// The dashboard is dark only: coss ui reads its dark variants from this class.
document.documentElement.classList.add('dark');

function App() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => api.onAuth(setSignedIn), []);
  if (signedIn === null) return <div className="boot" aria-busy="true"><span className="sr-only">Loading</span></div>;
  return (
    <ToastProvider>
      {signedIn ? (
        <DataProvider api={api}>
          <LiveWatcher />
          <Gate />
        </DataProvider>
      ) : (
        <SignIn api={api} />
      )}
    </ToastProvider>
  );
}

async function loadGate(a: DelegateApi) {
  const [phase, seat, registration, me] = await Promise.all([a.phase(), a.seat(), a.registration(), a.me()]);
  return { phase, seat, registration, me };
}

/** Decides what a signed-in delegate sees: sign-up, waiting, or the dashboard. */
function Gate() {
  const q = useLoad(loadGate, ['phase', 'seat']);
  if (!q.data) {
    return (
      <main id="main" className="main mx-auto" tabIndex={-1}>
        {q.error ? <ErrorBox error={q.error} onRetry={q.reload} what="your dashboard" /> : <ScreenSkeleton panels={2} />}
      </main>
    );
  }
  const { phase, seat, registration, me } = q.data;
  if (!seat) {
    document.title = `${registration ? 'Waiting for your seat' : 'Sign up'} · DXB MUN 2027`;
    return registration ? <WaitingScreen registration={registration} /> : <SignUpScreen me={me} />;
  }
  return (
    <ConfProvider value={{ phase, seat, readOnly: phase === 'after', demo: api.mode === 'demo' }}>
      <Dashboard />
    </ConfProvider>
  );
}

async function loadBadges(a: DelegateApi, phase: string): Promise<Partial<Record<Place, string>>> {
  if (phase !== 'live') return {};
  const [roll, votes, chits] = await Promise.all([a.rollCall(), a.votes(), a.chits()]);
  const out: Partial<Record<Place, string>> = {};
  const mine = roll.rows[0]?.status ?? null;
  if (roll.open && !mine) out.now = 'roll call open';
  else if (votes.some((v) => v.status === 'open' && !v.myVote)) out.now = 'vote open';
  const seen = readSeenChits();
  const fresh = chits.filter((c) => c.direction === 'in' && !seen.has(c.id)).length;
  if (fresh) out.notes = `${fresh} new chit${fresh === 1 ? '' : 's'}`;
  return out;
}

function Dashboard() {
  const route = useRoute();
  const { phase } = useConf();
  const badges = useLoad((x) => loadBadges(x, phase), ['roll', 'votes', 'chits'], [phase]);
  const label = PLACES.find((p) => p.id === route.page)?.label ?? 'Now';
  useEffect(() => { document.title = `${label} · DXB MUN 2027`; }, [label]);
  return (
    <Shell api={api} badges={badges.data ?? {}}>
      <Screen page={route.page} />
    </Shell>
  );
}

function Screen({ page }: { page: Place }) {
  useArrival(true);
  switch (page) {
    case 'now': return <NowScreen />;
    case 'speakers': return <SpeakersScreen />;
    case 'resolutions': return <ResolutionsScreen />;
    case 'paper': return <PaperScreen />;
    case 'notes': return <NotesScreen />;
    case 'files': return <FilesScreen />;
    case 'schedule': return <ScheduleScreen />;
  }
}

/**
 * Live updates: every change from subscribe() refreshes the matching lists. The important ones (a new chit,
 * roll call or a vote opening, an urgent announcement) also pop up as a toast, which is an aria-live region.
 */
function LiveWatcher() {
  const a = useApi();
  const bump = useBump();
  const toast = useToast();
  const seen = useRef<{ chits: Set<string> | null; votes: Set<string> | null; roll: boolean | null; ann: Set<string> | null }>({
    chits: null, votes: null, roll: null, ann: null,
  });

  useEffect(() => {
    let alive = true;
    const first = <T,>(prev: T | null) => prev === null;
    const checkChits = async () => {
      if ((await a.phase()) !== 'live') return;
      const cs = (await a.chits()).filter((c) => c.direction === 'in');
      if (!alive) return;
      const prev = seen.current.chits;
      if (!first(prev)) for (const c of cs) if (!prev!.has(c.id)) toast(`New chit from ${c.from?.label ?? 'the dais'}`, 'info');
      seen.current.chits = new Set(cs.map((c) => c.id));
    };
    const checkVotes = async () => {
      if ((await a.phase()) !== 'live') return;
      const vs = (await a.votes()).filter((v) => v.status === 'open');
      if (!alive) return;
      const prev = seen.current.votes;
      if (!first(prev)) for (const v of vs) if (!prev!.has(v.id)) toast(`Vote open: ${v.title}`, 'info');
      seen.current.votes = new Set(vs.map((v) => v.id));
    };
    const checkRoll = async () => {
      if ((await a.phase()) !== 'live') return;
      const r = await a.rollCall();
      if (!alive) return;
      if (seen.current.roll === false && r.open) toast('Roll call is open. Answer on Now.', 'info');
      seen.current.roll = r.open;
    };
    const checkAnn = async () => {
      const list = await a.announcements();
      if (!alive) return;
      const prev = seen.current.ann;
      if (!first(prev)) for (const n of list) if (!prev!.has(n.id)) toast(n.urgent ? `Urgent: ${n.title}` : `Announcement: ${n.title}`, n.urgent ? 'error' : 'info');
      seen.current.ann = new Set(list.map((n) => n.id));
    };
    const quiet = (p: Promise<unknown>) => void p.catch(() => {});
    quiet(checkChits()); quiet(checkVotes()); quiet(checkRoll()); quiet(checkAnn());
    const off = a.subscribe((what) => {
      if (what === 'phase' || what === 'seat') bump('all'); else bump(what);
      if (what === 'chits') quiet(checkChits());
      if (what === 'votes') quiet(checkVotes());
      if (what === 'roll') quiet(checkRoll());
      if (what === 'announcements') quiet(checkAnn());
      if (what === 'phase') { quiet(checkChits()); quiet(checkVotes()); quiet(checkRoll()); }
    });
    return () => { alive = false; off(); };
  }, [a, bump, toast]);
  return null;
}

createRoot(document.getElementById('root')!).render(<App />);
