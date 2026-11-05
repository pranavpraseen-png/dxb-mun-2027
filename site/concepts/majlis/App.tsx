import { AnimatePresence, motion } from 'motion/react';
import { usePortal, useStill, useView } from '@/shared/hooks';
import { Header } from './Header';
import { Home } from './Home';
import { lazy, Suspense } from 'react';

// The working tools load on demand, so the home page ships less script.
const Timer = lazy(() => import('./Timer').then((m) => ({ default: m.Timer })));
const Delegate = lazy(() => import('./Portal').then((m) => ({ default: m.Delegate })));
const ChairView = lazy(() => import('./Chair').then((m) => ({ default: m.ChairView })));
import { Star } from './ornament';

export function App() {
  const view = useView();
  const still = useStill();
  // One store for both portals, so a chair decision shows up in the delegate's sent list.
  const portal = usePortal();

  return (
    <div className={'app view-' + view + (still ? ' still' : '')}>
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>
      <Header view={view} />
      <main id="main" tabIndex={-1}>
        {view === 'home' && <Home still={still} />}
        <Suspense fallback={<div className="loading" />}>
          {view === 'timer' && <Timer still={still} />}
          {view === 'portal' && <Delegate p={portal} />}
          {view === 'chair' && <ChairView p={portal} still={still} />}
        </Suspense>
      </main>

      <div className="toast-zone" role="status" aria-live="polite">
        <AnimatePresence>
          {portal.toast && (
            <motion.div
              key={portal.toast}
              className="toast"
              initial={still ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
            >
              <Star size={14} className="orn" />
              {portal.toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
