// Section 7: Wellness, Resources and Contact as short index rows in a hairline table, numbered with the nav's own numbers (05–07), so a row and its nav link always agree.
// Hover inverts a row (a clip-path wipe of an inverted copy). Each row opens in place (Base UI Accordion);
// the wellness check-in is Base UI Checkbox with the live site's storage rules (shared useWellness hook).
import { Accordion } from '@base-ui/react/accordion';
import { Checkbox } from '@base-ui/react/checkbox';
import { conference, resources, tba } from '@/data/conference';
import { useWellness } from '@/shared/hooks';
import { navNo } from './data';
import { register } from './links';
import { deskStore, useDesk } from './store';
import { still } from './motion';

type Row = { id: 'wellness' | 'resources' | 'contact'; no: string; title: string; summary: string };
const ROWS: Row[] = [
  { id: 'wellness', no: navNo('wellness'), title: 'Wellness', summary: 'Quick reset · water, stretch, breathe' },
  { id: 'resources', no: navNo('resources'), title: 'Resources', summary: `${resources[0].title} · link ${tba(resources[0].href).toLowerCase()}` },
  { id: 'contact', no: navNo('contact'), title: 'Contact', summary: `Email, Instagram, venue · ${tba(conference.email).toLowerCase()}` },
];

function RowHead({ r }: { r: Row }) {
  const inner = (
    <>
      <span className="dr-no mono">{r.no}</span>
      <span className="dr-t">{r.title}</span>
      <span className="dr-s mono">{r.summary}</span>
      <span className="dr-x" aria-hidden="true"><i /><i /></span>
    </>
  );
  return (
    <>
      <span className="dr-face">{inner}</span>
      <span className="dr-inv" aria-hidden="true">{inner}</span>
    </>
  );
}

function Wellness() {
  const w = useWellness();
  return (
    <div className="dp dp-well">
      <p className="dp-lead">Take a moment between sessions.</p>
      <ul className="well">
        {w.items.map((it) => {
          const on = w.checked.includes(it.id);
          return (
            <li key={it.id}>
              <label className={'well-row' + (on ? ' is-on' : '')}>
                <Checkbox.Root className="cb" checked={on} onCheckedChange={() => w.toggle(it.id)}>
                  <Checkbox.Indicator className="cb-i">
                    <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5 6.5 12 13 4.5" /></svg>
                  </Checkbox.Indicator>
                </Checkbox.Root>
                <span className="well-l">{it.label}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <p className="mono dp-note" aria-live="polite">{w.status} {w.note}</p>
    </div>
  );
}

function Resources() {
  return (
    <div className="dp">
      <ul className="dp-list">
        {resources.map((r) => (
          <li key={r.title}>
            <span className="dp-k">{r.title}</span>
            <span className="dp-v">{r.blurb}</span>
            {r.href ? <a className="mono dp-a" href={r.href}>Open →</a> : <span className="mono dp-tba">Link {tba(r.href).toLowerCase()}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Contact() {
  const rows: [string, string | null][] = [['Email', conference.email], ['Instagram', conference.instagram], ['Venue', conference.venue], ['Dates', conference.dates]];
  return (
    <div className="dp">
      <dl className="dp-dl">
        {rows.map(([k, v]) => (
          <div key={k}><dt className="mono">{k}</dt><dd className={v ? '' : 'is-tba'}>{tba(v)}</dd></div>
        ))}
        <div><dt className="mono">Host</dt><dd>{conference.host}, {conference.city}</dd></div>
        <div><dt className="mono">Registration</dt><dd><a href={conference.registerUrl ?? register}>Delegate dashboard →</a></dd></div>
      </dl>
    </div>
  );
}

export function Desk() {
  const chosen = useDesk();
  // still / reduced motion: every row open, so every fact is visible without a click
  const open = still ? ROWS.map((r) => r.id) : chosen;
  return (
    <section className="desk" aria-label="Wellness, resources and contact">
      <Accordion.Root className="desk-t" value={open} onValueChange={(v) => deskStore.set(v as string[])} multiple={still}>
        {ROWS.map((r) => (
          <Accordion.Item key={r.id} value={r.id} className="dr" id={r.id}>
            <Accordion.Header className="dr-h">
              <Accordion.Trigger className="dr-btn"><RowHead r={r} /></Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Panel className="dr-p">
              {r.id === 'wellness' && <Wellness />}
              {r.id === 'resources' && <Resources />}
              {r.id === 'contact' && <Contact />}
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </section>
  );
}
