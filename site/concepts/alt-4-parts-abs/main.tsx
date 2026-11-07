// Preview harness: the B and C options for About, Committees and Schedule (Alt 4 · The Floor), stacked,
// each under a label, so they can be screenshotted and compared. Not a page of the site.
import { createRoot } from 'react-dom/client';
import type { ComponentType } from 'react';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/jetbrains-mono';
import { AboutB } from '../alt-4/parts/about-b';
import { AboutC } from '../alt-4/parts/about-c';
import { CommitteesB } from '../alt-4/parts/committees-b';
import { CommitteesC } from '../alt-4/parts/committees-c';
import { ScheduleB } from '../alt-4/parts/schedule-b';
import { ScheduleC } from '../alt-4/parts/schedule-c';

const css = `
:root{
  --ground:#03060C; --surface:#08111E; --line:#16243A; --ink:#F2F5F9; --muted:#8C99AD;
  --un:#009EDB; --signal:#E5591C; --brown:#2A1A12; --maroon:#600E0E; --gold:#FFB606;
  color-scheme:dark;
}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--ground);color:var(--ink);font-family:'Archivo Variable',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.hx-label{position:relative;z-index:2;display:flex;gap:16px;align-items:baseline;margin:0;padding:14px clamp(20px,4vw,56px);
  border-top:1px solid var(--signal);border-bottom:1px solid var(--line);background:var(--ground);
  font:500 12px/1.2 'JetBrains Mono Variable',ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.hx-label b{color:var(--ink);font-weight:700}
`;

const parts: [string, string, string, ComponentType<{ id?: string }>][] = [
  ['about-b', 'About · B', 'The preamble', AboutB],
  ['about-c', 'About · C', 'The flap board', AboutC],
  ['committees-b', 'Committees · B', 'Nameplate rail', CommitteesB],
  ['committees-c', 'Committees · C', 'Roll call', CommitteesC],
  ['schedule-b', 'Schedule · B', 'One clock', ScheduleB],
  ['schedule-c', 'Schedule · C', 'Now boarding', ScheduleC],
];

function Harness() {
  return (
    <>
      <style>{css}</style>
      <main>
        {parts.map(([id, part, name, C]) => (
          <div key={id} data-part={id}>
            <p className="hx-label"><b>{part}</b><span>{name}</span></p>
            <C id={id} />
          </div>
        ))}
      </main>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
