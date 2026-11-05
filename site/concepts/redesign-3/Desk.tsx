// CH 04–06, the desk: one TitanGate-style bordered grid of three equal modules (timer, quick reset, resources).
import { Maximize2, Pause, Play, RotateCcw } from 'lucide-react';
import NumberFlow from '@number-flow/react';
import clsx from 'clsx';
import { resources, wellness } from '@/data/conference';
import { useFloorTimer, useWellness } from '@/shared/hooks';
import { chOf } from './data';
import { Tba } from './ui';
import { register, signIn } from './links';
// Library: coss ui (read-only imports). See LIBRARY.md.
import { Button } from '../../portal/ui/coss/button';
import { Checkbox } from '../../portal/ui/coss/checkbox';

const CELLS = 30;
export const fmtPreset = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function ModHead({ id, title }: { id: string; title: string }) {
  return (
    <div className="mod-head">
      <span className="mod-ch">CH {chOf(id)}</span>
      <h2 className="mod-title" id={`${id}-title`}>{title}</h2>
    </div>
  );
}

function TimerMod() {
  const t = useFloorTimer(60);
  const lit = t.total ? Math.ceil((t.left / t.total) * CELLS) : 0;
  const phase = t.finished ? 'up' : t.running ? 'run' : t.left < t.total ? 'hold' : 'ready';
  return (
    <section id="timer" className={clsx('mod mod--timer', `is-${phase}`)} aria-labelledby="timer-title">
      <ModHead id="timer" title="Floor timer" />
      <div className="mt-face">
        <span className="mt-digits" role="timer" aria-label={`Time remaining ${t.display}`}>
          <NumberFlow value={Number(t.mm)} format={{ minimumIntegerDigits: 2 }} />
          <span className="mt-colon">:</span>
          <NumberFlow value={Number(t.ss)} format={{ minimumIntegerDigits: 2 }} />
        </span>
        <span className="mt-bar" aria-hidden="true">
          {Array.from({ length: CELLS }, (_, i) => <i key={i} className={clsx(i < lit && 'on')} />)}
        </span>
        <p className="mt-state" aria-live="polite">{t.state}</p>
      </div>
      <div className="mt-presets" role="group" aria-label="Speaking time">
        {t.presets.map((p) => (
          <Button key={p} size="sm" variant="outline" disabled={t.running} aria-pressed={t.total === p} className={clsx('mt-preset', t.total === p && 'is-on')} onClick={() => t.setTotal(p)}>
            {fmtPreset(p)}
          </Button>
        ))}
      </div>
      <div className="mt-ctl">
        <Button size="lg" onClick={t.toggle}>
          {t.running ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          {t.running ? 'Pause' : t.left < t.total && !t.finished ? 'Resume' : 'Start'}
        </Button>
        <Button size="lg" variant="outline" onClick={t.reset}><RotateCcw aria-hidden="true" /> Reset</Button>
        <Button size="lg" variant="ghost" render={<a href="#/timer" />}><Maximize2 aria-hidden="true" /> Full screen</Button>
      </div>
    </section>
  );
}

function WellnessMod() {
  const w = useWellness();
  return (
    <section id="wellness" className="mod mod--well" aria-labelledby="wellness-title">
      <ModHead id="wellness" title={wellness.title} />
      <p className="mod-dek">{wellness.intro}</p>
      <ul className="well">
        {w.items.map((it) => {
          const on = w.checked.includes(it.id);
          return (
            <li key={it.id}>
              <label className={clsx('well-row', on && 'is-on')}>
                <Checkbox checked={on} onCheckedChange={() => w.toggle(it.id)} className="size-7 rounded-[2px] sm:size-7 [&_svg]:size-4.5" />
                <span className="well-l">{it.label}</span>
                <span className="well-s">{on ? 'Done' : '—'}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <p className="well-count" aria-live="polite">
        <span className="well-n"><NumberFlow value={w.checked.length} /><span>/{w.items.length}</span></span>
        <span>{w.status}</span>
      </p>
      <p className="mod-note">{w.note}</p>
    </section>
  );
}

function ResourcesMod() {
  return (
    <section id="resources" className="mod mod--res" aria-labelledby="resources-title">
      <ModHead id="resources" title="Resources" />
      <ul className="res">
        {resources.map((r) => (
          <li key={r.title} className="res-row">
            <p className="res-t">{r.title}</p>
            <p className="res-b">{r.blurb}</p>
            {r.href ? <Button variant="outline" size="sm" render={<a href={r.href} />}>Open</Button> : <p className="res-tba"><span className="k">Link</span> <Tba value={null} /></p>}
          </li>
        ))}
      </ul>
      <div className="res-cta">
        <Button size="lg" render={<a href={register} />}>Register</Button>
        <Button size="lg" variant="outline" render={<a href={signIn} />}>Sign in</Button>
      </div>
      <p className="mod-note">Delegates, advisors and chairs use the delegate dashboard.</p>
    </section>
  );
}

export function Desk() {
  return (
    <div className="sec desk" aria-label="Timer, quick reset and resources">
      <div className="desk-grid">
        <TimerMod />
        <WellnessMod />
        <ResourcesMod />
      </div>
    </div>
  );
}
