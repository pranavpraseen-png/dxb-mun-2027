import NumberFlow from '@number-flow/react';
import { GlassWater, PersonStanding, Wind, type LucideIcon } from 'lucide-react';
import { wellness } from '@/data/conference';
import { useWellness } from '@/shared/hooks';

const icons: Record<string, LucideIcon> = { water: GlassWater, stretch: PersonStanding, breathe: Wind };

/** A tactile check-in: three physical keys that sink and light when pressed. */
export function Wellness({ still }: { still: boolean }) {
  const w = useWellness();

  const press = (id: string) => {
    w.toggle(id);
    if (!still && 'vibrate' in navigator) navigator.vibrate?.(12);
  };

  return (
    <section id="wellness" className="well" aria-labelledby="well-h">
      <div className="wrap well-grid">
        <div className="well-copy">
          <h2 id="well-h" className="h2">Delegate wellness</h2>
          <h3 className="well-title">{wellness.title}</h3>
          <p className="well-intro">{wellness.intro}</p>
          <p className="well-tally" aria-hidden="true">
            <NumberFlow value={w.checked.length} animated={!still} className="well-tally-n" />
            <span className="well-tally-of">of {w.items.length}</span>
          </p>
          <p className="well-status" role="status" aria-live="polite">
            {w.done ? `${w.status} All three done.` : w.status}
          </p>
          <p className="well-note">{w.note}</p>
        </div>

        <ul className="keys" aria-label="Daily wellness check-in">
          {w.items.map((it) => {
            const on = w.checked.includes(it.id);
            const Icon = icons[it.id] ?? Wind;
            return (
              <li key={it.id}>
                <button type="button" className="key" aria-pressed={on} onClick={() => press(it.id)}>
                  <span className="key-well" aria-hidden="true" />
                  <span className="key-cap">
                    <span className="key-lit" aria-hidden="true" />
                    <span className="key-top">
                      <Icon className="key-icon" size={30} strokeWidth={1.6} aria-hidden="true" />
                      <span className="key-lamp" aria-hidden="true"><i /></span>
                    </span>
                    <span className="key-label">{it.label}</span>
                    <span className="key-state" aria-hidden="true">{on ? 'Done' : 'Tap when done'}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
