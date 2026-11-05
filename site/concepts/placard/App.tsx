import { useEffect } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useStill, useView, usePortal } from '@/shared/hooks';
import { conference } from '@/data/conference';
import { StillCtx } from './ui';
import { Nav } from './Nav';
import { Home } from './Home';
import { Timer } from './Timer';
import { DelegatePortal, ChairPortal } from './Portal';

const TITLES = {
  home: conference.edition,
  timer: 'Floor timer, ' + conference.edition,
  portal: 'Delegate portal, ' + conference.edition,
  chair: 'Chair portal, ' + conference.edition,
} as const;

export function App() {
  const still = useStill();
  const view = useView();
  // One store for both portals, so a chit approved as chair shows up for the delegate.
  const portal = usePortal();

  useEffect(() => {
    document.title = TITLES[view];
    document.documentElement.dataset.view = view;
  }, [view]);
  useEffect(() => {
    document.documentElement.classList.toggle('is-still', still);
  }, [still]);

  return (
    <StillCtx.Provider value={still}>
      <MotionConfig reducedMotion={still ? 'always' : 'never'}>
        <a className="skip" href="#main">Skip to content</a>
        {view !== 'timer' && <Nav view={view} />}
        {view === 'home' && <Home />}
        {view === 'timer' && <Timer />}
        {view === 'portal' && <DelegatePortal p={portal} />}
        {view === 'chair' && <ChairPortal p={portal} />}
        <div className="toast-dock" role="status" aria-live="polite">
          <AnimatePresence>
            {portal.toast && (
              <motion.p
                key={portal.toast}
                className="toast"
                initial={still ? false : { y: 40, rotate: -4, opacity: 0 }}
                animate={{ y: 0, rotate: -1.5, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 520, damping: 26 }}
              >
                {portal.toast}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </MotionConfig>
    </StillCtx.Provider>
  );
}
