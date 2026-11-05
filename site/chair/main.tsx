// Chair (dais) dashboard entry: sign-in (the shared SignIn screen), the chair gate, then the screens.
// Spec: site/DASHBOARD-PLAN.md, section 2. Data only from '@/platform/v2'.
import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import { ArrowRight, LogOut, ShieldAlert } from 'lucide-react';
// Official Record (THEME.md): Source Serif 4 for headings, Public Sans for UI and text, IBM Plex Mono for figures.
import '@fontsource-variable/source-serif-4/opsz.css';
import '@fontsource-variable/source-serif-4/opsz-italic.css';
import '@fontsource-variable/public-sans';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './chair.css';
import '../portal/portal.css';
import { getChairApi, type ChairCommittee, type Me } from '@/platform/v2';
import { ToastProvider } from '../portal/lib/toast';
import { SignIn } from '../portal/screens/SignIn';
import { Button } from '../portal/ui/coss/button';
import { ChairProvider } from './lib/data';
import { useRoute, type Page } from './lib/route';
import { Shell } from './Shell';
import { ErrorBox, HostMark, Skeleton, Wordmark } from './ui/kit';
import { RunScreen } from './screens/Run';
import { FloorScreen } from './screens/Floor';
import { PapersScreen } from './screens/Papers';
import { ResolutionsScreen } from './screens/Resolutions';
import { ChitsScreen } from './screens/Chits';
import { AwardsScreen } from './screens/Awards';
import { DocsScreen } from './screens/Docs';

const api = getChairApi();
document.documentElement.classList.add('dark');

const TITLES: Record<Page, string> = {
  run: 'Run session', floor: 'Roll call and votes', papers: 'Position papers', resolutions: 'Resolutions',
  chits: 'Chits', awards: 'Awards rubric', docs: 'Docs and notices',
};

function App() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => api.onAuth(setSignedIn), []);
  if (signedIn === null) return <div className="boot" aria-busy="true"><span className="sr-only">Loading</span></div>;
  return (
    <ToastProvider>
      {signedIn ? <Gate /> : (
        <SignIn
          api={api}
          title="Chair dashboard"
          showScenarios={false}
          tagline="Timer, roll call, votes and resolutions for your committee, from the dais."
        />
      )}
    </ToastProvider>
  );
}

/** Loads who you are and your committees; only chairs (and admins) get in. */
function Gate() {
  const [state, setState] = useState<{ me?: Me; committees?: ChairCommittee[]; error?: unknown; n: number }>({ n: 0 });
  useEffect(() => {
    let alive = true;
    Promise.all([api.me(), api.myCommittees()]).then(
      ([me, committees]) => { if (alive) setState((s) => ({ ...s, me, committees, error: undefined })); },
      (error) => { if (alive) setState((s) => ({ ...s, error })); },
    );
    return () => { alive = false; };
  }, [state.n]);
  if (state.error) return <div className="chair-main mx-auto"><ErrorBox error={state.error} what="your account" onRetry={() => setState((s) => ({ ...s, error: undefined, n: s.n + 1 }))} /></div>;
  if (!state.me || !state.committees) return <div className="chair-main mx-auto"><Skeleton lines={5} /></div>;
  if (state.committees.length === 0) return <NoAccess email={state.me.email} />;
  return (
    <ChairProvider api={api} me={state.me} committees={state.committees}>
      <Shell><Screens /></Shell>
    </ChairProvider>
  );
}

function Screens() {
  const { page } = useRoute();
  useEffect(() => { document.title = `${TITLES[page]} · Chair · DXB MUN 2027`; }, [page]);
  return (
    <>
      {page === 'run' && <RunScreen />}
      {page === 'floor' && <FloorScreen />}
      {page === 'papers' && <PapersScreen />}
      {page === 'resolutions' && <ResolutionsScreen />}
      {page === 'chits' && <ChitsScreen />}
      {page === 'awards' && <AwardsScreen />}
      {page === 'docs' && <DocsScreen />}
    </>
  );
}

function NoAccess({ email }: { email: string }) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-15 items-center gap-3 border-b px-7 max-md:px-4"><Wordmark /></header>
      <main id="main" className="grid flex-1 place-items-center px-4 py-10">
        <section className="flex w-full max-w-[520px] flex-col gap-4 border bg-card p-7 max-md:p-5" aria-labelledby="na-t">
          <ShieldAlert size={32} aria-hidden="true" className="text-muted-foreground" />
          <h1 id="na-t" className="font-heading text-[40px] font-semibold leading-[1.05] tracking-[-0.02em]">This area is for committee chairs</h1>
          <p className="text-lg text-muted-foreground">You're signed in as <strong className="break-all text-foreground">{email}</strong>.</p>
          <p className="text-lg text-muted-foreground">No committee is linked to this account yet. The secretariat adds chairs.</p>
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
