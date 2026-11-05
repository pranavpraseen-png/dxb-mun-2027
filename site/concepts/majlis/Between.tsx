import { Check, GlassWater, PersonStanding, Wind } from 'lucide-react';
import { resources, wellness } from '@/data/conference';
import { useWellness } from '@/shared/hooks';
import { ArchFrame, Star } from './ornament';

const icons: Record<string, typeof GlassWater> = { water: GlassWater, stretch: PersonStanding, breathe: Wind };

const tools = [
  { href: '#/timer', t: 'Floor timer', d: 'A projector-sized countdown for the speakers list. Space starts and pauses, R resets.' },
  { href: '#/portal', t: 'Delegate portal', d: 'Write chits to other delegations. Your chair approves them before delivery.' },
  { href: '#/chair', t: 'Chair portal', d: 'Approve or return chits, and keep the decision log for your committee.' },
];

export function Between() {
  const w = useWellness();
  return (
    <section className="btw" aria-labelledby="btw-h">
      <div className="wrap">
        <h2 id="btw-h" className="h2">Between sessions</h2>
        <div className="btw-grid">
          <div id="wellness" className="well">
            <h3 className="h3">{wellness.title}</h3>
            <p className="well-intro">{wellness.intro}</p>
            <ul className="well-list">
              {w.items.map((it) => {
                const Icon = icons[it.id] ?? Wind;
                const on = w.checked.includes(it.id);
                return (
                  <li key={it.id}>
                    <button type="button" className={'well-btn' + (on ? ' is-on' : '')} aria-pressed={on} onClick={() => w.toggle(it.id)}>
                      <ArchFrame className="well-arch" fill lines={1} crown={0.7} />
                      <span className="well-ico"><Icon size={26} strokeWidth={1.5} aria-hidden="true" /></span>
                      <span className="well-l">{it.label}</span>
                      <span className="well-chk" aria-hidden="true">{on ? <Check size={16} strokeWidth={2.5} /> : null}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="well-status" aria-live="polite">
              {w.done ? 'All three done for today. ' : ''}{w.status}
            </p>
            <p className="well-note">{w.note}</p>
          </div>

          <div className="side">
            <div id="resources" className="res">
              <h3 className="h3">Resources</h3>
              <ul className="res-list">
                {resources.map((r) => (
                  <li key={r.title} className="res-row">
                    <div>
                      <p className="res-t">{r.href ? <a href={r.href}>{r.title}</a> : r.title}</p>
                      <p className="res-d">{r.blurb}</p>
                    </div>
                    {!r.href && <span className="tag">To be announced</span>}
                  </li>
                ))}
              </ul>
            </div>

            <div className="tools">
              <h3 className="h3">On the floor</h3>
              <ul className="tool-list">
                {tools.map((t) => (
                  <li key={t.href}>
                    <a className="tool" href={t.href}>
                      <Star size={16} className="orn tool-orn" />
                      <span className="tool-t">{t.t}</span>
                      <span className="tool-d">{t.d}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
