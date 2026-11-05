import { createRoot } from 'react-dom/client';
import { lazy, Suspense, useEffect } from 'react';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import './night.css';
import { isStill, useStill, useView } from '@/shared/hooks';
import { TopBar } from './TopBar';
import { Home } from './Home';
import { signIn } from './links';

// Motion-only starting states live under `.motion`; set it before first paint so nothing flashes.
if (!isStill()) document.documentElement.classList.add('motion');

// The old preview portals (#/portal, #/chair) now live in the real delegate dashboard.
const toDashboard = () => {
  const h = location.hash.replace(/^#\/?/, '');
  if (h === 'portal' || h === 'chair') { location.replace(signIn); return true; }
  return false;
};
toDashboard();
window.addEventListener('hashchange', toDashboard);

// The timer is split out so the home page loads only what it needs.
const TimerView = lazy(() => import('./TimerView').then((m) => ({ default: m.TimerView })));

const HOME_TITLE = 'DXB MUN 2027 · Hosted by Indian High School, Dubai';
const TITLES = {
  home: HOME_TITLE,
  timer: 'Floor timer · DXB MUN 2027',
  portal: HOME_TITLE,
  chair: HOME_TITLE,
} as const;

function App() {
  const view = useView();
  const still = useStill();

  useEffect(() => {
    document.documentElement.classList.toggle('is-still', still);
  }, [still]);

  useEffect(() => {
    document.title = TITLES[view];
    document.documentElement.dataset.view = view;
  }, [view]);

  return (
    <>
      <a
        className="skip"
        href="#main"
        onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}
      >
        Skip to content
      </a>
      <TopBar view={view} />
      {view === 'home' && <Home />}
      <Suspense fallback={<main id="main" className="loading" aria-busy="true" />}>
        {view === 'timer' && <TimerView />}
      </Suspense>
      {(view === 'portal' || view === 'chair') && <main id="main" className="loading" aria-busy="true" />}
    </>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
