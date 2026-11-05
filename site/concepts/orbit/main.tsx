import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import 'lenis/dist/lenis.css';
import './orbit.css';
import { usePortal, useStill, useView } from '@/shared/hooks';
import { useSmoothScroll } from '@/shared/scroll';
import { NAV_H, Topbar } from './Chrome';
import Home from './Home';
import Timer from './Timer';
import { Chair, Delegate } from './Portal';

function App() {
  const view = useView();
  const still = useStill();
  const portal = usePortal(); // one store, so a chit approved as Chair shows up for the delegate
  useSmoothScroll(view === 'home', NAV_H); // shared calm scroll feel; off in still mode

  useEffect(() => {
    document.documentElement.dataset.view = view;
    document.title = view === 'timer' ? 'Floor timer · DXB MUN 2027' : view === 'portal' ? 'Delegate portal · DXB MUN 2027' : view === 'chair' ? 'Chair portal · DXB MUN 2027' : 'DXB MUN 2027';
  }, [view]);

  return (
    <>
      <a href="#main" className="skip">Skip to content</a>
      {view === 'home' && <Topbar view={view} />}
      {view === 'home' && <Home still={still} />}
      {view === 'timer' && <Timer still={still} />}
      {view === 'portal' && <Delegate p={portal} />}
      {view === 'chair' && <Chair p={portal} still={still} />}
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
