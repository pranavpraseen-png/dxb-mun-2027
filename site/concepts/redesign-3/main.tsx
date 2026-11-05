import { createRoot } from 'react-dom/client';
import { lazy, Suspense, useEffect } from 'react';
// Official Record (site/THEME.md): Source Serif 4 display, Public Sans text and UI, IBM Plex Mono for timecodes and codes.
import '@fontsource-variable/source-serif-4/opsz.css';
import '@fontsource-variable/source-serif-4/opsz-italic.css';
import '@fontsource-variable/public-sans';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './onair.css';
import { isStill, useStill, useView } from '@/shared/hooks';
import { useSmoothScroll } from '@/shared/scroll';
import { Bar } from './Bar';
import { Wipe } from './Wipe';
import { ColdOpen } from './ColdOpen';
import { Tracker } from './Tracker';
import { Multiview } from './Multiview';
import { Rundown } from './Rundown';
import { Desk } from './Desk';
import { SignOff } from './SignOff';
import { BAR_H } from './ui';
import { signIn } from './links';

// Motion-only starting states live under `.motion`; set it before first paint so nothing flashes.
if (!isStill()) document.documentElement.classList.add('motion');

// The old preview portals (#/portal, #/chair) now live in the real delegate dashboard.
const toDashboard = () => {
  const h = location.hash.replace(/^#\/?/, '');
  if (h === 'portal' || h === 'chair') location.replace(signIn);
};
toDashboard();
addEventListener('hashchange', toDashboard);

const TimerView = lazy(() => import('./TimerView').then((m) => ({ default: m.TimerView })));
const HOME_TITLE = 'DXB MUN 2027 · Hosted by Indian High School, Dubai';

function Home({ still }: { still: boolean }) {
  useSmoothScroll(true, BAR_H);
  return (
    <main id="main" tabIndex={-1}>
      <ColdOpen still={still} />
      <Tracker still={still} />
      <Multiview still={still} />
      <Rundown still={still} />
      <Desk />
      <SignOff />
    </main>
  );
}

function App() {
  const view = useView();
  const still = useStill();
  useEffect(() => { document.documentElement.classList.toggle('is-still', still); }, [still]);
  useEffect(() => {
    document.title = view === 'timer' ? 'Floor timer · DXB MUN 2027' : HOME_TITLE;
    document.documentElement.dataset.view = view;
  }, [view]);
  return (
    <div className="oa">
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>
      <Bar view={view} still={still} />
      {view === 'timer'
        ? <Suspense fallback={<main id="main" aria-busy="true" />}><TimerView /></Suspense>
        : <Home still={still} />}
      <Wipe />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
