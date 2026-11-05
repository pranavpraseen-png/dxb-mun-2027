import { createRoot } from 'react-dom/client';
import { lazy, Suspense, useEffect } from 'react';
// Official Record (site/THEME.md): Source Serif 4 display, Public Sans text, IBM Plex Mono codes and numbers.
import '@fontsource-variable/source-serif-4/opsz.css';
import '@fontsource-variable/source-serif-4/opsz-italic.css';
import '@fontsource-variable/public-sans';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './redesign2.css';
import { isStill, useStill, useView } from '@/shared/hooks';
import { Masthead } from './Masthead';
import { Home } from './Home';
import { signIn } from './links';

// Motion-only starting states live under `.motion`; set it before first paint so nothing flashes.
if (!isStill()) document.documentElement.classList.add('motion');

// The old preview portals (#/portal, #/chair) now live in the real delegate dashboard.
const toDashboard = () => {
  const h = location.hash.replace(/^#\/?/, '');
  if (h === 'portal' || h === 'chair') location.replace(signIn);
};
toDashboard();
window.addEventListener('hashchange', toDashboard);

const Timer = lazy(() => import('./Timer').then((m) => ({ default: m.Timer })));

const HOME_TITLE = 'DXB MUN 2027 · Hosted by Indian High School, Dubai';

function App() {
  const view = useView();
  const still = useStill();
  useEffect(() => { document.documentElement.classList.toggle('is-still', still); }, [still]);
  useEffect(() => {
    document.title = view === 'timer' ? 'Floor timer · DXB MUN 2027' : HOME_TITLE;
    document.documentElement.dataset.view = view;
  }, [view]);

  return (
    <>
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>
        Skip to content
      </a>
      <Masthead view={view} />
      {view === 'timer'
        ? <Suspense fallback={<main id="main" className="loading" aria-busy="true" />}><Timer /></Suspense>
        : view === 'home' ? <Home /> : <main id="main" className="loading" aria-busy="true" />}
    </>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
