import { createRoot } from 'react-dom/client';
import { lazy, Suspense, useEffect } from 'react';
import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/barlow-condensed/800.css';
import '@fontsource-variable/geist-mono';
import './broadcast.css';
import { usePortal, useStill, useView } from '@/shared/hooks';
import { TopBar } from './TopBar';
import { Home } from './Home';
import { Toast } from './Toast';

// The tools are split out so the home page loads only what it needs.
const TimerView = lazy(() => import('./TimerView').then((m) => ({ default: m.TimerView })));
const DelegateView = lazy(() => import('./Portals').then((m) => ({ default: m.DelegateView })));
const ChairView = lazy(() => import('./Portals').then((m) => ({ default: m.ChairView })));

function App() {
  const view = useView();
  const still = useStill();
  const portal = usePortal();

  useEffect(() => {
    document.documentElement.classList.toggle('is-still', still);
  }, [still]);

  useEffect(() => {
    const titles = { home: 'DXB MUN 2027', timer: 'Floor timer · DXB MUN 2027', portal: 'Delegate portal · DXB MUN 2027', chair: 'Chair portal · DXB MUN 2027' };
    document.title = titles[view];
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
        {view === 'portal' && <DelegateView p={portal} />}
        {view === 'chair' && <ChairView p={portal} />}
      </Suspense>
      <Toast message={portal.toast} />
    </>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
