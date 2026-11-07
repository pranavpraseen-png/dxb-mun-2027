// Preview harness for Alt 4 parts B + C: nav, register, wellness, contact. Each component, stacked, with a label above.
// The navs render with demo=true inside 400px framed boxes. `?only=<key>` renders one part alone (used by shots.mjs).
// Keys: nav-b nav-c register-b register-c wellness-b wellness-c contact-b contact-c.
import { createRoot } from 'react-dom/client';
import type { ReactNode } from 'react';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/jetbrains-mono';
import { NavB } from '../alt-4/parts/nav-b';
import { NavC } from '../alt-4/parts/nav-c';
import { RegisterB } from '../alt-4/parts/register-b';
import { RegisterC } from '../alt-4/parts/register-c';
import { WellnessB } from '../alt-4/parts/wellness-b';
import { WellnessC } from '../alt-4/parts/wellness-c';
import { ContactB } from '../alt-4/parts/contact-b';
import { ContactC } from '../alt-4/parts/contact-c';
import { SECTIONS } from '../alt-4/layout';

const Frame = ({ children, note }: { children: ReactNode; note: string }) => (
  <div className="h-frame">{children}<div className="h-frame-fill">{note}</div></div>
);

// B versions keep the real ids; C versions get their own ids so the page has no duplicates.
const PARTS: { key: string; name: string; node: ReactNode }[] = [
  { key: 'nav-b', name: 'Nav B · Numbered section index', node: <Frame note="Demo frame. Scroll the page: the orange rule and the active number follow."><NavB visible demo /></Frame> },
  { key: 'nav-c', name: 'Nav C · Command palette', node: <Frame note="Demo frame. Press / or Ctrl+K, or tap Go to…"><NavC visible demo /></Frame> },
  { key: 'register-b', name: 'Register B · Delegate credential', node: <RegisterB /> },
  { key: 'register-c', name: 'Register C · Sign the charter', node: <RegisterC id="register-c" /> },
  { key: 'wellness-b', name: 'Wellness B · Box breathing pacer', node: <WellnessB /> },
  { key: 'wellness-c', name: 'Wellness C · Recess switch panel', node: <WellnessC id="wellness-c" /> },
  { key: 'contact-b', name: 'Contact B · Secretariat dispatch', node: <ContactB /> },
  { key: 'contact-c', name: 'Contact C · Sign-off wordmark', node: <ContactC id="contact-c" /> },
];

const only = new URLSearchParams(location.search).get('only');
const navOnly = only === 'nav-b' || only === 'nav-c';

/** With ?only=nav-*, plain stub sections under a sticky frame, so the active state and the progress rule can be seen. */
function Stubs() {
  return (
    <>
      {SECTIONS.filter((s) => s.id !== 'home').map((s, i) => (
        <section key={s.id} id={s.id} className="h-stub">
          <span>{String(i + 1).padStart(2, '0')}</span>{s.label} (stub section)
        </section>
      ))}
    </>
  );
}

function Harness() {
  const list = only ? PARTS.filter((p) => p.key === only) : PARTS;
  return (
    <main className={navOnly ? 'is-nav-only' : undefined}>
      {list.map((p) => (
        <div key={p.key} data-part={p.key}>
          <p className="h-tag"><b>{p.key}</b>{p.name}</p>
          {p.node}
        </div>
      ))}
      {navOnly && <Stubs />}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
