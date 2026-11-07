// NAME: Recess switch panel
// IDEA: Three big hardware switches (Water, Stretch, Breathe) that snap up with a mechanical overshoot, a lit indicator and a click, over a daily status line.
// WHY: Tangible, satisfying feedback (a goal-gradient you can see fill 0 → 3) turns a dull checklist into a tiny reward loop people want to complete.
// WILD: A recess lever: pull one big lever down and all three snap on in sequence while a 5-minute recess clock starts on the committee screen.
import { useRef } from 'react';
import { Switch } from '@base-ui/react/switch';
import { wellness } from '@/data/conference';
import { isStill, useWellness } from '@/shared/hooks';
import './wellness-c.css';

const still = isStill();
const pad2 = (n: number) => String(n).padStart(2, '0');

/** A short mechanical click: a filtered noise burst plus a low thump, about 30 ms. Made on first use (a user gesture). */
let ctx: AudioContext | null = null;
function click(on: boolean) {
  if (still) return;
  try {
    ctx ??= new AudioContext();
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * 0.03);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 6);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = on ? 3200 : 2400; bp.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.value = 0.35;
    src.connect(bp).connect(g).connect(ctx.destination);
    src.start(t);
    const o = ctx.createOscillator();
    const og = ctx.createGain();
    o.frequency.setValueAtTime(on ? 180 : 140, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.04);
    og.gain.setValueAtTime(0.25, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    o.connect(og).connect(ctx.destination);
    o.start(t); o.stop(t + 0.06);
  } catch { /* no audio: the switch still works */ }
}

export function WellnessC({ id = 'wellness' }: { id?: string }) {
  const w = useWellness();
  const units = useRef<(HTMLLabelElement | null)[]>([]);
  const n = w.checked.length;
  const today = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  const flip = (itemId: string, i: number, next: boolean) => {
    w.toggle(itemId);
    click(next);
    const el = units.current[i];
    if (!still && el) el.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(2px)' }, { transform: 'translateY(0)' }], { duration: 90, easing: 'steps(2, end)' });
  };

  return (
    <section id={id} className={'wellc' + (w.done ? ' is-done' : '') + (still ? ' is-still' : '')} aria-labelledby={id + '-h'}>
      <div className="wellc-wrap">
        <header className="wellc-head">
          <p className="wellc-label"><span>05</span>Wellness</p>
          <h2 className="wellc-h" id={id + '-h'}>{wellness.title}.</h2>
          <p className="wellc-sub">{wellness.intro}</p>
        </header>

        <div className="wellc-panel">
          <div className="wellc-panel-top" aria-hidden="true">
            <span>Recess panel</span>
            <span>{pad2(n)} / {pad2(w.items.length)}</span>
          </div>
          <div className="wellc-units">
            {w.items.map((it, i) => {
              const on = w.checked.includes(it.id);
              return (
                <label key={it.id} className={'wellc-unit' + (on ? ' is-on' : '')} ref={(el) => { units.current[i] = el; }}>
                  <span className="wellc-unit-top">
                    <span className="wellc-unit-n">{pad2(i + 1)}</span>
                    <span className="wellc-led" aria-hidden="true" />
                  </span>
                  <span className="wellc-throw">
                    <Switch.Root className="wellc-switch" checked={on} onCheckedChange={(next) => flip(it.id, i, next)}>
                      <Switch.Thumb className="wellc-thumb"><i /><i /><i /></Switch.Thumb>
                    </Switch.Root>
                    <span className="wellc-marks" aria-hidden="true"><span>On</span><span>Off</span></span>
                  </span>
                  <span className="wellc-unit-l">{it.label}</span>
                  <span className="wellc-unit-s" aria-hidden="true">{on ? 'Done today' : 'Not yet'}</span>
                </label>
              );
            })}
          </div>
          <div className="wellc-gauge" aria-hidden="true">
            {w.items.map((it, i) => <span key={it.id} className={i < n ? 'is-on' : ''} />)}
          </div>
        </div>

        <p className="wellc-status" aria-live="polite">
          <span className="wellc-status-k">Recess · {today}</span>
          <span className="wellc-status-v">{w.done ? 'All three done. Back to the floor.' : w.status}</span>
          <span className="wellc-status-n">{w.note}</span>
        </p>
      </div>
    </section>
  );
}
