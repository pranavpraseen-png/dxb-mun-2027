// Alt 3 · One Stage. The whole homepage is one fixed WebGL stage; reduced motion, `?still` or no WebGL get the
// calm static page instead (same facts, no motion).
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/mona-sans/wdth.css';
import '@fontsource-variable/geist-mono';
import '@fontsource/instrument-serif/400-italic.css';
import './alt3.css';
import { isStill } from '@/shared/hooks';
import { Static } from './Static';
import { Stage } from './Stage';
import { Chrome } from './Chrome';

const hasWebGL = () => {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
};

const still = isStill() || !hasWebGL();
document.documentElement.classList.add(still ? 'is-static' : 'is-stage');

createRoot(document.getElementById('root')!).render(
  still ? <Static /> : <Stage fallback={<Static />}><Chrome /></Stage>,
);
