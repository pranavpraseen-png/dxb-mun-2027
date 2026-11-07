// Secretariat dashboard entry: sign-in (the shared portal SignIn), the admin gate, then the ten pages.
// Spec: site/DASHBOARD-PLAN.md §3. Data: getSecretariatApi() from '@/platform/v2' only.
import { createRoot } from 'react-dom/client';
import { useEffect, useState, type ReactElement } from 'react';
import { ArrowRight, LogOut, ShieldAlert } from 'lucide-react';
// T1 type (BLUEPRINT.md section 6): Mona Sans (weight + width axes) for UI, text and titles; Geist Mono for timers,
// codes, numbers and small labels; Instrument Serif italic for the motto only.
import '@fontsource-variable/mona-sans/wdth.css';
import '@fontsource-variable/geist-mono';
import '@fontsource/instrument-serif/400-italic.css';
import './admin.css';
import { getSecretariatApi, openWithoutLogin, type Me } from '@/platform/v2';
import { SignIn } from '../portal/screens/SignIn';
import { SecretariatCheck } from '../portal/screens/SecondStep';
import { Button } from '../portal/ui/coss/button';
import { ToastProvider } from './lib/toast';
import { AdminProvider, useAdmin } from './lib/data';
import { PAGE_TITLE, useRoute, type Page } from './lib/route';
import { Shell, placesFor } from './Shell';
import { ErrorBox, HostMark, Skeleton, Wordmark } from './ui/kit';
import { LiveScreen } from './screens/Live';
import { ApplicantsScreen } from './screens/Applicants';
import { SeatsScreen } from './screens/Seats';
import { CommitteesScreen } from './screens/Committees';
import { AwardsScreen } from './screens/Awards';
import { ScheduleScreen } from './screens/Schedule';
import { DeadlinesScreen } from './screens/Deadlines';
import { AnnouncementsScreen } from './screens/Announcements';
import { DocumentsScreen } from './screens/Documents';
import { CheckinScreen } from './screens/Checkin';
import { TeamScreen } from './screens/Team';

const api = getSecretariatApi();
openWithoutLogin('secretariat');
document.documentElement.classList.add('dark');

function App() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => api.onAuth(setSignedIn), []);
  if (signedIn === null) return <div className="boot" aria-busy="true"><span className="sr-only">Loading</span></div>;
  return (
    <ToastProvider>
      {signedIn ? <SecretariatCheck api={api}><Gate /></SecretariatCheck> : (
        <SignIn
          api={api}
          title="Secretariat dashboard"
          tagline="Committees, seats, the schedule and every room, live, in one place."
        />
      )}
    </ToastProvider>
  );
}

/** Loads who you are; only role = admin gets in. */
function Gate() {
  const [state, setState] = useState<{ me?: Me; error?: unknown; n: number }>({ n: 0 });
  useEffect(() => {
    let alive = true;
    api.me().then((me) => { if (alive) setState((s) => ({ ...s, me, error: undefined })); }, (error) => { if (alive) setState((s) => ({ ...s, error })); });
    return () => { alive = false; };
  }, [state.n]);
  if (state.error) return <div className="admin-main mx-auto"><ErrorBox error={state.error} what="your account" onRetry={() => setState((s) => ({ ...s, error: undefined, n: s.n + 1 }))} /></div>;
  if (!state.me) return <div className="admin-main mx-auto"><Skeleton lines={4} /></div>;
  if (state.me.role !== 'admin') return <NoAccess email={state.me.email} />;
  return (
    <AdminProvider api={api} me={state.me}>
      <Shell><Screens /></Shell>
    </AdminProvider>
  );
}

const SCREENS: Record<Page, () => ReactElement> = {
  live: LiveScreen, applicants: ApplicantsScreen, seats: SeatsScreen, committees: CommitteesScreen, awards: AwardsScreen,
  schedule: ScheduleScreen, deadlines: DeadlinesScreen, announcements: AnnouncementsScreen, documents: DocumentsScreen,
  checkin: CheckinScreen, team: TeamScreen,
};

function Screens() {
  const { me } = useAdmin();
  const { page } = useRoute();
  const allowed = placesFor(me).flatMap((p) => p.pages.map((x) => x.id));
  const shown: Page = allowed.includes(page) ? page : 'live';
  useEffect(() => { document.title = `${PAGE_TITLE[shown]} · Secretariat · DXB MUN 2027`; window.scrollTo(0, 0); }, [shown]);
  const S = SCREENS[shown];
  return <S key={shown} />;
}

function NoAccess({ email }: { email: string }) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-15 items-center gap-3 border-b px-7 max-md:px-4"><Wordmark /></header>
      <main id="main" className="grid flex-1 place-items-center px-4 py-10">
        <section className="flex w-full max-w-[520px] flex-col gap-4 border bg-card p-7 max-md:p-5" aria-labelledby="na-t">
          <ShieldAlert size={32} aria-hidden="true" className="text-muted-foreground" />
          <h1 id="na-t" className="font-heading font-wide text-[40px] font-extrabold leading-[1.05] tracking-[-0.02em]">This area is for the DXB MUN secretariat</h1>
          <p className="text-lg text-muted-foreground">You're signed in as <strong className="break-all text-foreground">{email}</strong>.</p>
          <div className="flex flex-wrap gap-2.5">
            <Button render={<a href="../portal/" />} size="lg">Go to the delegate dashboard <ArrowRight aria-hidden="true" /></Button>
            <Button variant="outline" size="lg" onClick={() => void api.signOut()}><LogOut aria-hidden="true" /> Sign out</Button>
          </div>
          <HostMark className="mt-2 self-start" />
        </section>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
