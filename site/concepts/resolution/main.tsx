import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import '@fontsource-variable/inter-tight';
import '@fontsource-variable/jetbrains-mono';
import './resolution.css';
import { createRoot } from 'react-dom/client';
import { isStill } from '@/shared/hooks';
import { App } from './App';

// Motion-only initial states live under `.motion`; set it before first paint so nothing flashes.
if (!isStill()) document.documentElement.classList.add('motion');

createRoot(document.getElementById('root')!).render(<App />);
