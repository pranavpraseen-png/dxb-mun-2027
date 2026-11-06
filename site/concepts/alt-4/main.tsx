// Alt 4 · Assembly. A real-time General Assembly hall behind the page; reduced motion, `?still`, no WebGL or a
// WebGL crash get the calm page instead (same sections, static SVG drawings, no motion).
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/public-sans/wght.css';
import '@fontsource-variable/jetbrains-mono/wght.css';
import './assembly.css';
import { isStill } from '@/shared/hooks';
import { Hall } from './Hall';
import { Page } from './Page';

const hasWebGL = () => {
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2');
  } catch {
    return false;
  }
};

const still = isStill() || !hasWebGL();
document.documentElement.classList.add(still ? 'is-still' : 'is-gl');

createRoot(document.getElementById('root')!).render(
  still ? <Page still /> : <Hall fallback={<Page still />}><Page still={false} /></Hall>,
);
