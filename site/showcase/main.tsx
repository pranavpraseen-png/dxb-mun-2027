import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import './showcase.css';

// The concept round: one flagship + five alternatives. Pick one, or combine.
type Item = { id: string; name: string; tag: string; line: string; app?: string };
const concepts: Item[] = [
  { id: 'dashboard', name: 'Delegate dashboard', tag: 'New · demo', line: 'Sign in with any email, code 123456. Switch scenarios top right: new, allocated, live, after.', app: './portal/index.html' },
  { id: 'merged', name: 'Merged', tag: 'Your mix', line: 'Live’s opening, Orbit’s globe zooming to Dubai, facts as a short resolution, committees as placards.' },
  { id: 'chamber', name: 'Chamber', tag: 'Flagship', line: 'Cinematic keynote on deep navy. The photo pulls back into a placard.' },
  { id: 'resolution', name: 'Resolution', tag: 'Alt 1', line: 'An official UN document set in reverse, written as a draft resolution.' },
  { id: 'placard', name: 'Placard', tag: 'Alt 2', line: 'Formal UN nameplates on navy. Flick through the committee deck.' },
  { id: 'orbit', name: 'Orbit', tag: 'Alt 3', line: 'Precise data and diplomacy. A globe that turns to Dubai.' },
  { id: 'majlis', name: 'Majlis', tag: 'Alt 4', line: 'A diplomatic hall at night. A mashrabiya screen opens onto the conference.' },
  { id: 'broadcast', name: 'Live', tag: 'Alt 5', line: 'A world-news broadcast package. Committees as channels, the timer as a shot clock.' },
];
const views = [
  { id: '/', label: 'Home' },
  { id: '/timer', label: 'Timer' },
  { id: '/portal', label: 'Delegate' },
  { id: '/chair', label: 'Chair' },
];

const read = (k: string, d: string) => { try { return localStorage.getItem('showcase:' + k) || d; } catch { return d; } };
const save = (k: string, v: string) => { try { localStorage.setItem('showcase:' + k, v); } catch { /* ignore */ } };

function Showcase() {
  const [id, setId] = useState(() => read("id", "dashboard"));
  const [view, setView] = useState(() => read('view', '/'));
  const [device, setDevice] = useState(() => read('device', 'desktop'));
  const [nav, setNav] = useState(false);
  const [full, setFull] = useState(false);
  useEffect(() => save('id', id), [id]);
  useEffect(() => save('view', view), [view]);
  useEffect(() => save('device', device), [device]);
  const c = concepts.find((x) => x.id === id) ?? concepts[0];
  const src = c.app ?? `./concepts/${c.id}/index.html#${view}`;

  return (
    <div className={'sc' + (full ? ' full' : '')}>
      <aside className={'side' + (nav ? ' open' : '')}>
        <div className="brand">
          <b>DXB MUN 2027</b>
          <span>Design concepts · preview</span>
        </div>
        <ol className="list">
          {concepts.map((x, i) => (
            <li key={x.id}>
              <button type="button" aria-current={x.id === id} onClick={() => { setId(x.id); setNav(false); }}>
                <span className="num">{x.app ? "▣" : x.id === "merged" ? "★" : String(i - 2).padStart(2, "0")}</span>
                <span className="txt">
                  <span className="nm">{x.name} <em>{x.tag}</em></span>
                  <span className="ln">{x.line}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
        <p className="foot">Each concept has the homepage, floor timer, and delegate and chair portals (sample data). Facts come from the current site only; unknown details show “To be announced”.</p>
      </aside>

      <main className="stage">
        <header className="bar">
          <button type="button" className="menu" onClick={() => setNav((v) => !v)} aria-expanded={nav}>Concepts</button>
          <div className="seg" role="group" aria-label="View" hidden={!!c.app}>
            {views.map((v) => (
              <button key={v.id} type="button" aria-pressed={view === v.id} onClick={() => setView(v.id)}>{v.label}</button>
            ))}
          </div>
          <div className="seg" role="group" aria-label="Device">
            {['desktop', 'phone'].map((d) => (
              <button key={d} type="button" aria-pressed={device === d} onClick={() => setDevice(d)}>{d === 'desktop' ? 'Desktop' : 'Phone'}</button>
            ))}
          </div>
          <button type="button" className="open" onClick={() => setFull(true)}>Full screen</button>
        </header>
        <div className={'frame ' + device}>
          <iframe key={c.id + view + device} title={`${c.name} concept`} src={src} />
        </div>
        {full && <button type="button" className="exit" onClick={() => setFull(false)}>Exit full screen</button>}
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Showcase />);
