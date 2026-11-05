import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { usePortal, useStill, useView } from '@/shared/hooks';
import { Nav } from './Nav';
import { Home } from './home/Home';
import { TimerView } from './TimerView';
import { DelegatePortal } from './portals/DelegatePortal';
import { ChairPortal } from './portals/ChairPortal';

export function App() {
  const view = useView();
  const still = useStill();
  // One portal store for both portal views, so a chair decision shows up in the delegate's sent list.
  const portal = usePortal();

  useEffect(() => {
    const titles = { home: 'DXB MUN 2027', timer: 'Floor timer · DXB MUN', portal: 'Delegate portal · DXB MUN', chair: 'Chair portal · DXB MUN' };
    document.title = titles[view];
    document.documentElement.dataset.view = view;
    if (still) document.documentElement.dataset.still = '';
  }, [view, still]);

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      {view !== 'timer' && <Nav view={view} />}
      {view === 'home' && <Home still={still} />}
      {view === 'timer' && <TimerView still={still} />}
      {view === 'portal' && <DelegatePortal p={portal} still={still} />}
      {view === 'chair' && <ChairPortal p={portal} still={still} />}
      <div className="toast-dock" role="status" aria-live="polite">
        <AnimatePresence>
          {portal.toast && (
            <motion.p
              key={portal.toast}
              className="toast"
              initial={still ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={still ? { opacity: 0 } : { opacity: 0, y: 8 }}
              transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
            >
              {portal.toast}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
