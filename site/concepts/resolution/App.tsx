import { lazy, Suspense, useEffect } from 'react';
import { usePortal, useView } from '@/shared/hooks';
import { Masthead } from './Masthead';
import { Home } from './Home';
import { useRuleReveal } from './util';

// The tools are split out of the homepage bundle.
const TimerView = lazy(() => import('./Timer').then((m) => ({ default: m.TimerView })));
const DelegatePortal = lazy(() => import('./Portals').then((m) => ({ default: m.DelegatePortal })));
const ChairPortal = lazy(() => import('./Portals').then((m) => ({ default: m.ChairPortal })));

const TITLES = {
  home: 'DXB MUN 2027: Diplomacy around us',
  timer: 'Floor timer, DXB MUN 2027',
  portal: 'Delegate portal, DXB MUN 2027',
  chair: 'Chair portal, DXB MUN 2027',
} as const;

export function App() {
  const view = useView();
  // One store for both portals, so approving as chair updates the delegate's sent list.
  const portal = usePortal();

  useEffect(() => { document.title = TITLES[view]; }, [view]);
  useRuleReveal(view);

  return (
    <>
      <a
        className="skip"
        href="#main"
        onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}
      >
        Skip to content
      </a>
      <Masthead view={view} />
      <main id="main" tabIndex={-1} style={{ outline: 'none' }}>
        {view === 'home' && <Home />}
        <Suspense fallback={<div className="tool" />}>
          {view === 'timer' && <TimerView />}
          {view === 'portal' && <DelegatePortal p={portal} />}
          {view === 'chair' && <ChairPortal p={portal} />}
        </Suspense>
      </main>
      <div className="toast-zone" role="status" aria-live="polite">
        {portal.toast && <p key={portal.toast} className="toast">{portal.toast}</p>}
      </div>
    </>
  );
}
