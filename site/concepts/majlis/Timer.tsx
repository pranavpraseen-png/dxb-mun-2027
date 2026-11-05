import { useEffect } from 'react';
import { Minus, Pause, Play, Plus, RotateCcw } from 'lucide-react';
import { useFloorTimer } from '@/shared/hooks';
import { ArchFrame, Star } from './ornament';

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function Stepper({ label, value, onChange, disabled }: { label: string; value: number; onChange: (n: number) => void; disabled: boolean }) {
  const id = 'st-' + label.toLowerCase();
  const clamp = (n: number) => Math.max(0, Math.min(59, Number.isFinite(n) ? n : 0));
  return (
    <div className="stp">
      <label htmlFor={id} className="stp-l">{label}</label>
      <div className="stp-row">
        <button type="button" className="stp-b" onClick={() => onChange(clamp(value - 1))} disabled={disabled || value <= 0} aria-label={`One less ${label.toLowerCase().replace(/s$/, '')}`}>
          <Minus size={18} aria-hidden="true" />
        </button>
        <input id={id} className="stp-i" type="number" inputMode="numeric" min={0} max={59} value={value} disabled={disabled}
          onChange={(e) => onChange(clamp(parseInt(e.target.value, 10)))} />
        <button type="button" className="stp-b" onClick={() => onChange(clamp(value + 1))} disabled={disabled || value >= 59} aria-label={`One more ${label.toLowerCase().replace(/s$/, '')}`}>
          <Plus size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function Timer({ still }: { still: boolean }) {
  const t = useFloorTimer(60);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const tag = el.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
      if (e.key === ' ' && !typing && tag !== 'BUTTON' && tag !== 'A') { e.preventDefault(); t.toggle(); }
      else if ((e.key === 'r' || e.key === 'R') && !typing && !e.metaKey && !e.ctrlKey) { e.preventDefault(); t.reset(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [t]);

  const mode = t.finished ? 'up' : t.running ? 'run' : t.left < t.total ? 'pause' : 'ready';

  return (
    <div className={'tmr tmr-' + mode + (still ? ' is-still' : '')}>
      <div className="tmr-head wrap">
        <h1 className="tmr-h">Floor timer</h1>
        <p className="tmr-sub">General speakers list</p>
      </div>

      <div className="tmr-stage">
        <ArchFrame className="tmr-arch" lines={3} gap={10} crown={0.42} />
        <div className="tmr-inner">
          <Star size={34} className="orn tmr-star" />
          <p className="tmr-state" aria-live="assertive" aria-atomic="true">{t.state}</p>
          <p className="tmr-num" role="timer" aria-label={`Time remaining ${t.mm} minutes ${t.ss} seconds`}>
            <span>{t.mm}</span><span className="tmr-colon">:</span><span>{t.ss}</span>
          </p>
          <div className="tmr-bar" aria-hidden="true"><span style={{ transform: `scaleX(${1 - t.progress})` }} /></div>
        </div>
      </div>

      <div className="tmr-ctl wrap">
        <div className="tmr-main">
          <button type="button" className="btn btn-brass tmr-go" onClick={t.toggle}>
            {t.running ? <Pause size={20} aria-hidden="true" /> : <Play size={20} aria-hidden="true" />}
            {t.running ? 'Pause' : t.finished ? 'Start again' : t.left < t.total ? 'Resume' : 'Start'}
          </button>
          <button type="button" className="btn btn-line tmr-reset" onClick={t.reset}>
            <RotateCcw size={18} aria-hidden="true" /> Reset
          </button>
        </div>

        <fieldset className="tmr-set" disabled={t.running}>
          <legend className="tmr-legend">Speaking time</legend>
          <div className="tmr-presets" role="group" aria-label="Presets">
            {t.presets.map((p) => (
              <button key={p} type="button" className="chip" aria-pressed={t.total === p} onClick={() => t.setTotal(p)}>{fmt(p)}</button>
            ))}
          </div>
          <div className="tmr-pick">
            <Stepper label="Minutes" value={t.minutes} disabled={t.running} onChange={(m) => t.setTotal(m * 60 + t.seconds)} />
            <span className="tmr-pick-c" aria-hidden="true">:</span>
            <Stepper label="Seconds" value={t.seconds} disabled={t.running} onChange={(s) => t.setTotal(t.minutes * 60 + s)} />
          </div>
        </fieldset>
      </div>
      <p className="tmr-keys wrap"><kbd>Space</kbd> starts and pauses. <kbd>R</kbd> resets.</p>
    </div>
  );
}
