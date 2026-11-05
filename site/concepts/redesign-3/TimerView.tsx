// #/timer: the projector-sized floor timer. Space starts or pauses, R resets.
import { useEffect, useState } from 'react';
import { Maximize, Minimize, Pause, Play, RotateCcw } from 'lucide-react';
import clsx from 'clsx';
import { useFloorTimer } from '@/shared/hooks';
import { fmtPreset } from './Desk';
import { Button } from '../../portal/ui/coss/button';

const CELLS = 40;

export function TimerView() {
  const t = useFloorTimer(60);
  const [full, setFull] = useState(false);
  const phase = t.finished ? 'up' : t.running ? 'run' : t.left < t.total ? 'hold' : 'ready';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('input, textarea, select')) return;
      if (e.code === 'Space') {
        if (el.closest('button, a')) return;
        e.preventDefault(); t.toggle();
      } else if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault(); t.reset();
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [t]);
  useEffect(() => {
    const on = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);
  const lit = t.total ? Math.ceil((t.left / t.total) * CELLS) : 0;

  return (
    <main id="main" tabIndex={-1} className={clsx('tv', `is-${phase}`)}>
      <div className="tv-head">
        <div>
          <p className="tv-k"><span className="k">CH 04</span> Floor timer</p>
          <h1 className="tv-title">General speakers list</h1>
        </div>
        <Button variant="outline" size="lg" onClick={() => (document.fullscreenElement ? document.exitFullscreen?.() : document.documentElement.requestFullscreen?.().catch(() => {}))}>
          {full ? <Minimize aria-hidden="true" /> : <Maximize aria-hidden="true" />}
          {full ? 'Exit full screen' : 'Full screen'}
        </Button>
      </div>
      <div className="tv-face">
        <span className="tv-tag">{{ up: 'Time', run: 'Running', hold: 'Paused', ready: 'Ready' }[phase]} · Set {fmtPreset(t.total)}</span>
        <span className="tv-digits" aria-hidden="true">{t.display}</span>
        <p className="sr-only" role="timer">Time remaining: {t.display}</p>
        <span className="tv-bar" aria-hidden="true">{Array.from({ length: CELLS }, (_, i) => <i key={i} className={clsx(i < lit && 'on')} />)}</span>
        <p className="tv-state" aria-live="assertive">{t.finished ? 'Time is up.' : t.state}</p>
      </div>
      <div className="tv-ctl">
        <Button size="xl" onClick={t.toggle} aria-keyshortcuts="Space">
          {t.running ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          {t.running ? 'Pause' : t.finished ? 'Restart' : t.left < t.total ? 'Resume' : 'Start'} <kbd>Space</kbd>
        </Button>
        <Button size="xl" variant="outline" onClick={t.reset} aria-keyshortcuts="R"><RotateCcw aria-hidden="true" /> Reset <kbd>R</kbd></Button>
        <div className="tv-presets" role="group" aria-label="Speaking time">
          {t.presets.map((p) => (
            <Button key={p} size="lg" variant="outline" disabled={t.running} aria-pressed={t.total === p} className={clsx('mt-preset', t.total === p && 'is-on')} onClick={() => t.setTotal(p)}>
              {fmtPreset(p)}
            </Button>
          ))}
        </div>
      </div>
    </main>
  );
}
