import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import './showcase.css';

// The current round (2026-11-05): the approved Night Lab build, three alternatives, and the Night Lab dashboards.
type Item = { id: string; name: string; tag: string; line: string; app?: string; mark: string };
const concepts: Item[] = [
  { id: 'night-lab', mark: '★', name: 'Night Lab', tag: 'Approved build', line: 'Wireframe globe turning to Dubai, the motto, a cream nameplate wall, the schedule ruler, a ticket-style Register.', app: './concepts/night-lab/index.html' },
  { id: 'alt-1', mark: '01', name: 'Terminal Paper', tag: 'Alt 1', line: 'Light paper, deep ink, one blue.', app: './concepts/alt-1/index.html' },
  { id: 'alt-2', mark: '02', name: 'Poster', tag: 'Alt 2', line: 'Cream, black and IHS maroon, with huge type.', app: './concepts/alt-2/index.html' },
  { id: 'alt-3', mark: '03', name: 'One Stage', tag: 'Alt 3', line: 'Night Lab colours, one 3D camera moving through six scenes.', app: './concepts/alt-3/index.html' },
  { id: 'alt-4', mark: '04', name: 'Assembly', tag: 'Alt 4', line: 'Navy and UN blue: a live 3D General Assembly hall of 193 seats you fly through.', app: './concepts/alt-4/index.html' },
  { id: 'alt-5', mark: '05', name: 'Motion', tag: 'Alt 5', line: 'Black, off-white and signal orange: giant type that stretches as you move, colour-block wipes.', app: './concepts/alt-5/index.html' },
  { id: 'alt-6', mark: '06', name: 'Dispatch', tag: 'Alt 6', line: 'Ink and paper: a 1-bit dithered field your cursor carves open, facts as diplomatic cables.', app: './concepts/alt-6/index.html' },
  { id: 'dash-delegate', mark: '▣', name: 'Delegate dashboard', tag: 'Demo', line: 'Any email, code 123456.', app: './portal/index.html#/now' },
  { id: 'dash-chair', mark: '▣', name: 'Chair dashboard', tag: 'Demo', line: 'An email containing “chair”, code 123456.', app: './chair/index.html' },
  { id: 'dash-admin', mark: '▣', name: 'Secretariat dashboard', tag: 'Demo', line: 'An email containing “admin”, code 123456.', app: './admin/index.html' },
];

const read = (k: string, d: string) => { try { return localStorage.getItem('showcase:' + k) || d; } catch { return d; } };
const save = (k: string, v: string) => { try { localStorage.setItem('showcase:' + k, v); } catch { /* ignore */ } };

function Showcase() {
  const [id, setId] = useState(() => read('id', 'night-lab'));
  const [device, setDevice] = useState(() => read('device', 'desktop'));
  const [nav, setNav] = useState(false);
  const [full, setFull] = useState(false);
  useEffect(() => save('id', id), [id]);
  useEffect(() => save('device', device), [device]);
  const c = concepts.find((x) => x.id === id) ?? concepts[0];
  const src = c.app ?? `./concepts/${c.id}/index.html`;

  return (
    <div className={'sc' + (full ? ' full' : '')}>
      <aside className={'side' + (nav ? ' open' : '')}>
        <div className="brand">
          <b>DXB MUN 2027</b>
          <span>Design concepts · preview</span>
        </div>
        <ol className="list">
          {concepts.map((x) => (
            <li key={x.id}>
              <button type="button" aria-current={x.id === id} onClick={() => { setId(x.id); setNav(false); }}>
                <span className="num">{x.mark}</span>
                <span className="txt">
                  <span className="nm">{x.name} <em>{x.tag}</em></span>
                  <span className="ln">{x.line}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
        <p className="foot">Previews only: the live site has not changed. Dashboards use sample data. Facts come from the current site; unknown details show “To be announced”.</p>
      </aside>

      <main className="stage">
        <header className="bar">
          <button type="button" className="menu" onClick={() => setNav((v) => !v)} aria-expanded={nav}>Concepts</button>
          <div className="seg" role="group" aria-label="Device">
            {['desktop', 'phone'].map((d) => (
              <button key={d} type="button" aria-pressed={device === d} onClick={() => setDevice(d)}>{d === 'desktop' ? 'Desktop' : 'Phone'}</button>
            ))}
          </div>
          <button type="button" className="open" onClick={() => setFull(true)}>Full screen</button>
        </header>
        <div className={'frame ' + device}>
          <iframe key={c.id + device} title={`${c.name} concept`} src={src} />
        </div>
        {full && <button type="button" className="exit" onClick={() => setFull(false)}>Exit full screen</button>}
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Showcase />);
