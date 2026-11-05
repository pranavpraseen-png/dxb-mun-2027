import { createRoot } from 'react-dom/client';
import { Component, lazy, Suspense, useCallback, useEffect, useState, type ReactNode } from 'react';
// Official Record (site/THEME.md): Source Serif 4 display, Public Sans text and UI, IBM Plex Mono codes and numbers.
import '@fontsource-variable/source-serif-4/opsz.css';
import '@fontsource-variable/source-serif-4/opsz-italic.css';
import '@fontsource-variable/public-sans';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './assembly.css';
import { isStill } from '@/shared/hooks';
import { TopBar } from './TopBar';
import { Home } from './Home';
import { rig } from './store';
import { fontsReady } from './textures';
import { signIn } from './links';

// The old preview portals (#/portal, #/chair) live in the real delegate dashboard.
if (/^#\/?(portal|chair)/.test(location.hash)) location.replace(signIn);

const hasGL = (() => {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
})();
const wantsStill = isStill();
rig.still = wantsStill || !hasGL;
rig.lite = window.matchMedia('(max-width: 767px), (pointer: coarse) and (max-width: 1100px)').matches;
const setNarrow = () => { rig.narrow = window.innerWidth / window.innerHeight < 0.9; };
setNarrow();
document.documentElement.classList.add(rig.still ? 'is-still' : 'is-motion');
if (rig.lite) document.documentElement.classList.add('is-lite');
if (!hasGL) document.documentElement.classList.add('gl-off');
// Pointer parallax and the nameplates' lean (mouse and pen only; touch scrolls).
window.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch') return;
  rig.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  rig.pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
}, { passive: true });

// Read-only handle for the screenshot script (shots.mjs).
(window as unknown as { __assembly: unknown }).__assembly = { rig };

const World = lazy(() => import('./World'));

/** If the 3D stage throws (no context, shader failure), keep the page and show the flat backdrop. */
class StageBoundary extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFail(); }
  render() { return this.state.failed ? null : this.props.children; }
}

const setGl = (alive: boolean) => {
  rig.glAlive = alive;
  document.documentElement.classList.toggle('gl-off', !alive);
};

function Stage() {
  const [ready, setReady] = useState(false);
  const [gone, setGone] = useState(false);
  const [gen, setGen] = useState(0); // remount key after a restored context
  useEffect(() => { fontsReady().then(() => setReady(true)); }, []);
  useEffect(() => { if (ready && hasGL && !rig.still) setGl(true); }, [ready]);
  const onLost = useCallback(() => setGl(false), []);
  const onRestored = useCallback(() => { setGen((g) => g + 1); setGl(true); }, []);
  const onFail = useCallback(() => setGl(false), []);
  return (
    <div className="stage" aria-hidden="true">
      {/* the flat backdrop: always underneath, visible whenever WebGL is missing, starting or lost */}
      <div className="stage-fallback"><i className="fb-globe" /><i className="fb-stars" /></div>
      {hasGL && ready && !gone && (
        <StageBoundary key={gen} onFail={onFail}>
          <Suspense fallback={null}>
            <World still={rig.still} onPostersDone={() => setGone(true)} onLost={onLost} onRestored={onRestored} />
          </Suspense>
        </StageBoundary>
      )}
    </div>
  );
}

function App() {
  const [narrow, setN] = useState(rig.narrow);
  useEffect(() => {
    const on = () => { setNarrow(); setN(rig.narrow); };
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return (
    <>
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>
      <Stage />
      <div id="veil" className="veil" aria-hidden="true" />
      <TopBar />
      <Home still={rig.still} narrow={narrow} />
    </>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
