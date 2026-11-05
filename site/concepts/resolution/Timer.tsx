import { useEffect } from 'react';
import { useFloorTimer } from '@/shared/hooks';

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function Stepper({ label, value, onChange, disabled }: { label: string; value: number; onChange: (v: number) => void; disabled: boolean }) {
  const id = 'tf-' + label.toLowerCase();
  const clamp = (v: number) => Math.max(0, Math.min(59, v));
  return (
    <div>
      <label className="t-group-label mono" htmlFor={id}>{label}</label>
      <div className="t-field">
        <button type="button" className="t-step" aria-label={`Decrease ${label.toLowerCase()}`} disabled={disabled || value <= 0} onClick={() => onChange(clamp(value - 1))}>−</button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={0}
          max={59}
          value={String(value).padStart(2, '0')}
          disabled={disabled}
          onChange={(e) => onChange(clamp(Number(e.target.value) || 0))}
        />
        <button type="button" className="t-step" aria-label={`Increase ${label.toLowerCase()}`} disabled={disabled || value >= 59} onClick={() => onChange(clamp(value + 1))}>+</button>
      </div>
    </div>
  );
}

export function TimerView() {
  const t = useFloorTimer(60);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('input, textarea, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === 'Space') { e.preventDefault(); t.toggle(); }
      else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); t.reset(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [t]);

  const fullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const chars = t.display.split('');
  const cls = 'tool timer' + (t.finished ? ' is-up' : '') + (t.running ? ' is-running' : '');

  return (
    <section className={cls} aria-labelledby="timer-h">
      <div className="wrap">
        <div className="tool-head">
          <div>
            <p className="tool-kicker mono">Debate tools, general speakers’ list</p>
            <h1 className="tool-h1" id="timer-h">Floor timer</h1>
          </div>
          <p className="mono t-keys" aria-hidden="true"><kbd>Space</kbd> start or pause <kbd>R</kbd> reset</p>
        </div>
        <div className="rule-double" aria-hidden="true" />
        <div
          className="t-bar"
          role="progressbar"
          aria-label="Time used"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(t.progress * 100)}
        >
          <i style={{ transform: `scaleX(${t.progress})` }} />
        </div>

        <div className="t-face">
          <p className="t-num" aria-hidden="true">
            {chars.map((ch, i) => (
              <span key={i} className={ch === ':' ? 'c' : 'd'}>{ch}</span>
            ))}
          </p>
          <p className="sr-only">Time remaining: {t.display}</p>
        </div>

        <div className="t-status">
          <p className="t-state" role="status" aria-live="assertive">{t.state}</p>
          <p className="mono">Set to {fmt(t.total)}</p>
        </div>

        <div className="t-controls">
          <div>
            <span className="t-group-label mono" id="presets-l">Presets</span>
            <div className="t-presets" role="group" aria-labelledby="presets-l">
              {t.presets.map((p) => (
                <button key={p} type="button" aria-pressed={t.total === p} disabled={t.running} onClick={() => t.setTotal(p)}>
                  {fmt(p)}
                </button>
              ))}
            </div>
          </div>
          <div className="t-pick">
            <Stepper label="Minutes" value={t.minutes} disabled={t.running} onChange={(m) => t.setTotal(m * 60 + t.seconds)} />
            <Stepper label="Seconds" value={t.seconds} disabled={t.running} onChange={(s) => t.setTotal(t.minutes * 60 + s)} />
          </div>
          <div className="t-actions">
            <button type="button" className="btn btn-ink t-main" onClick={t.toggle}>
              {t.running ? 'Pause' : t.finished ? 'Restart' : t.left < t.total ? 'Resume' : 'Start'}
            </button>
            <button type="button" className="btn btn-line" onClick={t.reset}>Reset</button>
            <button type="button" className="btn btn-line" onClick={fullscreen}>Full screen</button>
          </div>
        </div>
      </div>
    </section>
  );
}
