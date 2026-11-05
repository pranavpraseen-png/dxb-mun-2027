import { useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Minus, Pause, Play, Plus, RotateCcw } from 'lucide-react';
import { useFloorTimer, viewHref } from '@/shared/hooks';
import { Wordmark, useStillCtx } from './ui';

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function Stepper({ label, value, onChange, disabled }: { label: string; value: number; onChange: (v: number) => void; disabled: boolean }) {
  const id = 'step-' + label.toLowerCase();
  const clamp = (v: number) => Math.max(0, Math.min(59, Number.isFinite(v) ? v : 0));
  return (
    <div className="stepper">
      <label htmlFor={id}>{label}</label>
      <div className="stepper__row">
        <button type="button" className="sq-btn" aria-label={`One ${label.toLowerCase().replace(/s$/, '')} less`} disabled={disabled || value <= 0} onClick={() => onChange(clamp(value - 1))}>
          <Minus size={22} aria-hidden="true" />
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={0}
          max={59}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(clamp(parseInt(e.target.value, 10)))}
        />
        <button type="button" className="sq-btn" aria-label={`One ${label.toLowerCase().replace(/s$/, '')} more`} disabled={disabled || value >= 59} onClick={() => onChange(clamp(value + 1))}>
          <Plus size={22} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function Timer() {
  const t = useFloorTimer(60);
  const still = useStillCtx();
  const phase = t.finished ? 'up' : t.running ? 'running' : t.left < t.total ? 'paused' : 'ready';

  // Space starts and pauses, R resets. Typing in a field or pressing a focused button keeps its own meaning.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('input, textarea, select, [contenteditable]') || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code === 'Space' || e.key === ' ') {
        if (el.closest('button, a')) return;
        e.preventDefault();
        t.toggle();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        t.reset();
      }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [t]);

  return (
    <main id="main" className={`timer phase-${phase}`}>
      <div className="timer__flash" aria-hidden="true" />
      <header className="tbar">
        <a className="btn btn--ghost btn--sm" href={viewHref('home')}>
          <ArrowLeft size={18} aria-hidden="true" /> Back to site
        </a>
        <Wordmark className="tbar__mark" />
        <p className="tbar__keys">
          <kbd>Space</kbd> start or pause <kbd>R</kbd> reset
        </p>
      </header>

      <div className="timer__head">
        <h1 className="timer__title">Floor timer</h1>
        <p className="timer__ctx">General speakers list</p>
      </div>

      <div className="tstage">
        <motion.div
          className="tcard"
          initial={false}
          animate={{ rotateX: t.finished ? 180 : 0 }}
          transition={still ? { duration: 0 } : { type: 'spring', stiffness: 140, damping: 16 }}
        >
          <div className="tcard__face tcard__front" aria-hidden={t.finished}>
            <p className="tcard__band">{t.state}</p>
            <p className="tcard__digits" role="timer" aria-label={`Time remaining ${t.display}`}>
              <span className="blk blk--mm">{t.mm}</span>
              <span className="tcard__colon" aria-hidden="true">:</span>
              <span className="blk blk--ss">{t.ss}</span>
            </p>
            <div className="tcard__bar" aria-hidden="true">
              <span style={{ transform: `scaleX(${t.progress})` }} />
            </div>
          </div>
          <div className="tcard__face tcard__back" aria-hidden={!t.finished}>
            <p className="tcard__up">Time is up</p>
            <p className="tcard__upsub">00:00 of {fmt(t.total)}. Press R to reset.</p>
          </div>
        </motion.div>
      </div>

      <p className="sr-only" aria-live="assertive">{t.state}</p>

      <div className="tctl">
        <div className="tctl__main">
          <button type="button" className={'big-btn' + (t.running ? ' big-btn--pause' : '')} onClick={t.toggle}>
            {t.running ? <Pause size={28} aria-hidden="true" /> : <Play size={28} aria-hidden="true" />}
            {t.running ? 'Pause' : t.finished ? 'Start again' : phase === 'paused' ? 'Resume' : 'Start'}
          </button>
          <button type="button" className="big-btn big-btn--paper" onClick={t.reset}>
            <RotateCcw size={26} aria-hidden="true" /> Reset
          </button>
        </div>
        <div className="tctl__set">
          <div className="presets" role="group" aria-label="Preset durations">
            {t.presets.map((p) => (
              <button key={p} type="button" className="preset" aria-pressed={t.total === p} disabled={t.running} onClick={() => t.setTotal(p)}>
                {fmt(p)}
              </button>
            ))}
          </div>
          <div className="steppers">
            <Stepper label="Minutes" value={t.minutes} disabled={t.running} onChange={(m) => t.setTotal(m * 60 + t.seconds)} />
            <Stepper label="Seconds" value={t.seconds} disabled={t.running} onChange={(s) => t.setTotal(t.minutes * 60 + s)} />
          </div>
        </div>
      </div>
    </main>
  );
}
