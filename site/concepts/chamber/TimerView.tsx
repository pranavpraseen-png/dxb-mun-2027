import { useEffect, useState } from 'react';
import NumberFlow, { NumberFlowGroup } from '@number-flow/react';
import { Maximize2, Minimize2, Minus, Pause, Play, Plus, RotateCcw } from 'lucide-react';
import clsx from 'clsx';
import { useFloorTimer, viewHref } from '@/shared/hooks';
import { Wordmark } from './Wordmark';

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const isField = (t: EventTarget | null) => t instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);

/** Projector-grade keynote countdown. Space starts and pauses, R resets. */
export function TimerView({ still }: { still: boolean }) {
  const t = useFloorTimer(60);
  const [full, setFull] = useState(false);
  const state = t.finished ? 'up' : t.running ? 'running' : t.left < t.total ? 'paused' : 'ready';
  const warn = t.running && t.left <= 10;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (isField(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) t.toggle(); }
      else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); t.reset(); }
    };
    // Stop a focused button from also firing on Space release.
    const up = (e: KeyboardEvent) => { if (e.code === 'Space' && !isField(e.target)) e.preventDefault(); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [t.toggle, t.reset]);

  useEffect(() => {
    const on = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);
  const toggleFull = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const setMin = (m: number) => t.setTotal(Math.max(0, Math.min(59, m)) * 60 + t.seconds);
  const setSec = (s: number) => t.setTotal(t.minutes * 60 + Math.max(0, Math.min(59, s)));

  return (
    <div className={clsx('tm', `tm--${state}`, warn && 'tm--warn')}>
      <div className="tm-up" aria-hidden="true" />
      <header className="tm-bar">
        <a className="tm-mark" href={viewHref('home')} aria-label="DXB MUN home"><Wordmark /></a>
        <h1 className="tm-h1">Floor timer</h1>
        <div className="tm-bar-r">
          <button type="button" className="tm-ghost" onClick={toggleFull} aria-pressed={full}>
            {full ? <Minimize2 size={18} aria-hidden="true" /> : <Maximize2 size={18} aria-hidden="true" />}
            <span>{full ? 'Exit full screen' : 'Full screen'}</span>
          </button>
          <a className="tm-ghost" href={viewHref('home')}>Back to site</a>
        </div>
      </header>

      <main id="main" className="tm-main">
        <p className="tm-kicker">General speakers list</p>
        <div className="tm-digits" role="timer" aria-label={`Time remaining ${t.display}`}>
          <NumberFlowGroup>
            <NumberFlow value={+t.mm} format={{ minimumIntegerDigits: 2 }} animated={!still} className="tm-n" />
            <span className="tm-colon" aria-hidden="true">:</span>
            <NumberFlow value={+t.ss} format={{ minimumIntegerDigits: 2 }} animated={!still} className="tm-n" />
          </NumberFlowGroup>
        </div>
        <p className="tm-state" role="status" aria-live="polite">{t.state}</p>
      </main>

      <div className="tm-progress" aria-hidden="true">
        <i style={{ transform: `scaleX(${1 - t.progress})` }} />
      </div>

      <footer className="tm-deck">
        <div className="tm-group">
          <span className="tm-glabel" id="tm-presets">Presets</span>
          <div className="tm-presets" role="group" aria-labelledby="tm-presets">
            {t.presets.map((p) => (
              <button key={p} type="button" className="tm-preset" aria-pressed={t.total === p} disabled={t.running} onClick={() => t.setTotal(p)}>
                {fmt(p)}
              </button>
            ))}
          </div>
        </div>

        <div className="tm-group">
          <span className="tm-glabel">Set time</span>
          <div className="tm-pick">
            <Stepper label="Minutes" value={t.minutes} step={1} disabled={t.running} onChange={setMin} />
            <span className="tm-pick-colon" aria-hidden="true">:</span>
            <Stepper label="Seconds" value={t.seconds} step={5} disabled={t.running} onChange={setSec} />
          </div>
        </div>

        <div className="tm-group tm-group--go">
          <button type="button" className="tm-go" onClick={t.toggle}>
            {t.running ? <Pause size={22} aria-hidden="true" /> : <Play size={22} aria-hidden="true" />}
            {t.running ? 'Pause' : t.left < t.total && !t.finished ? 'Resume' : 'Start'}
          </button>
          <button type="button" className="tm-reset" onClick={t.reset}>
            <RotateCcw size={20} aria-hidden="true" /> Reset
          </button>
          <p className="tm-keys"><kbd>Space</kbd> start or pause <kbd>R</kbd> reset</p>
        </div>
      </footer>
    </div>
  );
}

function Stepper({ label, value, step, disabled, onChange }: { label: string; value: number; step: number; disabled: boolean; onChange: (n: number) => void }) {
  const id = 'tm-' + label.toLowerCase();
  return (
    <div className="stp">
      <button type="button" className="stp-b" aria-label={`${label}: minus ${step}`} disabled={disabled || value <= 0} onClick={() => onChange(value - step)}>
        <Minus size={18} aria-hidden="true" />
      </button>
      <label className="sr-only" htmlFor={id}>{label}</label>
      <input
        id={id}
        className="stp-in"
        type="number"
        inputMode="numeric"
        min={0}
        max={59}
        value={String(value).padStart(2, '0')}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        onFocus={(e) => e.target.select()}
      />
      <button type="button" className="stp-b" aria-label={`${label}: plus ${step}`} disabled={disabled || value >= 59} onClick={() => onChange(value + step)}>
        <Plus size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
