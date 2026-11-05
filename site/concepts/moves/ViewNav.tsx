// Live 07 · View Transitions API: the nav ink (view-transition-name: mv-ink) slides to the new tab and the new
// panel (mv-panel) wipes in with clip-path, both animated by the browser from snapshots. The root cross-fade is
// switched off in moves.css. Without the API, or with reduced motion, the tab simply switches.
import { useState } from 'react';
import { flushSync } from 'react-dom';
import { committees, stats } from '@/data/conference';
import { Demo, STILL } from './kit';

const TABS = [
  { id: 'home', label: 'Home', verb: 'Welcomes', rest: 'you to DXB MUN 2027.' },
  { id: 'about', label: 'About', verb: 'Is hosted', rest: 'by Indian High School, Dubai.' },
  { id: 'committees', label: 'Committees', verb: 'Establishes', rest: `${committees.length} committees, from ${committees[0].abbr} to ${committees[committees.length - 1].abbr}.` },
  { id: 'schedule', label: 'Schedule', verb: 'Meets', rest: `over ${stats[1].value} days and ${stats[2].value} committee sessions.` },
  { id: 'contact', label: 'Contact', verb: 'Notes', rest: 'that contact details are to be announced.' },
] as const;

type DocVT = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };

export function ViewNav() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('home');
  const [dir, setDir] = useState<'fwd' | 'back'>('fwd');
  const cur = TABS.find((t) => t.id === tab)!;

  const go = (id: typeof tab) => {
    if (id === tab) return;
    const d = TABS.findIndex((t) => t.id === id) > TABS.findIndex((t) => t.id === tab) ? 'fwd' : 'back';
    const doc = document as DocVT;
    const apply = () => { flushSync(() => { setDir(d); setTab(id); }); };
    if (STILL || !doc.startViewTransition) { apply(); return; }
    document.documentElement.dataset.vtDir = d;
    doc.startViewTransition(apply);
  };

  return (
    <Demo id="demo-vt" n={7} likeLabel="View-Transition nav"
      title="The nav hands off to the browser"
      caption="Tap a section. The ink slides and the next panel wipes in, all by the View Transitions API."
      credit={[{ label: 'Chrome: View Transitions', url: 'https://developer.chrome.com/docs/web-platform/view-transitions' }, { label: 'view-transitions.chrome.dev', url: 'https://view-transitions.chrome.dev/' }]}>
      <div className="vt" data-dir={dir}>
        <nav className="vt-nav" aria-label="Demo sections">
          <span className="vt-brand">DXB MUN 2027</span>
          <ul>
            {TABS.map((t) => (
              <li key={t.id}>
                <button type="button" aria-current={t.id === tab ? 'page' : undefined} onClick={() => go(t.id)}>
                  {t.label}
                  {t.id === tab && <span className="vt-ink" aria-hidden="true" />}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="vt-panel" key={tab}>
          <p className="vt-label">{cur.label}</p>
          <p className="vt-clause"><em>{cur.verb}</em> {cur.rest}</p>
        </div>
      </div>
    </Demo>
  );
}
