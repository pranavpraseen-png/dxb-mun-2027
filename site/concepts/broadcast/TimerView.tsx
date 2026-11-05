import { useEffect, useState } from 'react';
import { Maximize, Minimize, Minus, Pause, Play, Plus, RotateCcw } from 'lucide-react';
import clsx from 'clsx';
import { useFloorTimer } from '@/shared/hooks';
import { SevenSeg } from './ui';

const CELLS = 40;
const fmtPreset = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export function TimerView() {
  const t = useFloorTimer(60);
  const [full, setFull] = useState(false);
  const phase = t.finished ? 'up' : t.running ? 'run' : t.left < t.total ? 'hold' : 'ready';
  const tag = { up: 'Time', run: 'Running', hold: 'Paused', ready: 'Ready' }[phase];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('input, textarea, select')) return;
      if (e.code === 'Space' || e.key === ' ') {
        if (el.closest('button, a')) return; // the focused control handles Space itself
        e.preventDefault(); t.toggle();
      } else if (e.key === 'r' || e.key === 'R') {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        e.preventDefault(); t.reset();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [t]);

  useEffect(() => {
    const on = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);
  const toggleFull = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const lit = t.total ? Math.ceil((t.left / t.total) * CELLS) : 0;
  const setMin = (m: number) => t.setTotal(Math.max(0, Math.min(59, m)) * 60 + t.seconds);
  const setSec = (s: number) => t.setTotal(t.minutes * 60 + Math.max(0, Math.min(59, s)));

  return (
    <main id="main" tabIndex={-1} className={clsx('clock', `is-${phase}`)}>
      <div className="clock-head">
        <div>
          <h1 className="clock-title">Floor timer</h1>
          <p className="clock-sub">General speakers list</p>
        </div>
        <button type="button" className="btn btn--ghost" onClick={toggleFull}>
          {full ? <Minimize size={20} aria-hidden="true" /> : <Maximize size={20} aria-hidden="true" />}
          {full ? 'Exit full screen' : 'Full screen'}
        </button>
      </div>

      <div className="clock-face">
        <div className="clock-tags" aria-hidden="true">
          <span className="clock-tag">{tag}</span>
          <span className="clock-total">Set {fmtPreset(t.total)}</span>
        </div>
        <SevenSeg text={t.display} className="clock-digits" />
        <p className="sr-only" role="timer" aria-live="off">Time remaining: {t.display}</p>
        <div className="clock-bar" aria-hidden="true">
          {Array.from({ length: CELLS }, (_, i) => <span key={i} className={clsx(i < lit && 'on')} />)}
        </div>
        <p className="clock-state" aria-live="assertive">{t.finished ? 'Time is up.' : t.state}</p>
      </div>

      <div className="clock-controls">
        <div className="clock-main">
          <button type="button" className="btn btn--lime btn--xl" onClick={t.toggle} aria-keyshortcuts="Space">
            {t.running ? <Pause size={28} aria-hidden="true" /> : <Play size={28} aria-hidden="true" />}
            {t.running ? 'Pause' : t.finished ? 'Restart' : t.left < t.total ? 'Resume' : 'Start'}
            <kbd>Space</kbd>
          </button>
          <button type="button" className="btn btn--xl btn--ghost" onClick={t.reset} aria-keyshortcuts="R">
            <RotateCcw size={24} aria-hidden="true" /> Reset <kbd>R</kbd>
          </button>
        </div>

        <fieldset className="clock-set" disabled={t.running}>
          <legend>Speaking time</legend>
          <div className="clock-presets">
            {t.presets.map((p) => (
              <button key={p} type="button" className={clsx('preset', t.total === p && 'is-on')} aria-pressed={t.total === p} onClick={() => t.setTotal(p)}>
                {fmtPreset(p)}
              </button>
            ))}
          </div>
          <div className="clock-custom">
            <Stepper label="Minutes" value={t.minutes} onChange={setMin} />
            <span className="clock-colon" aria-hidden="true">:</span>
            <Stepper label="Seconds" value={t.seconds} onChange={setSec} />
          </div>
        </fieldset>
      </div>
    </main>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const id = 'st-' + label.toLowerCase();
  return (
    <div className="stepper">
      <label htmlFor={id}>{label}</label>
      <div className="stepper-row">
        <button type="button" aria-label={`${label} down`} onClick={() => onChange(value - 1)}><Minus size={20} aria-hidden="true" /></button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={0}
          max={59}
          value={String(value).padStart(2, '0')}
          onChange={(e) => onChange(parseInt(e.target.value || '0', 10))}
        />
        <button type="button" aria-label={`${label} up`} onClick={() => onChange(value + 1)}><Plus size={20} aria-hidden="true" /></button>
      </div>
    </div>
  );
}
