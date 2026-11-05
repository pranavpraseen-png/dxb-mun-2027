import { useEffect } from 'react';
import NumberFlow from '@number-flow/react';
import { Minus, Plus, Play, Pause, RotateCcw } from 'lucide-react';
import { useFloorTimer } from '@/shared/hooks';
import { DubaiClock, Wordmark } from './Chrome';

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s) % 60).padStart(2, '0')}`;
const TICKS = 120;

export default function Timer({ still }: { still: boolean }) {
  const t = useFloorTimer(60);
  const shown = Math.max(0, Math.ceil(t.left));
  const remaining = t.total ? t.left / t.total : 0;
  const mode = t.finished ? 'up' : t.running ? 'run' : t.left < t.total ? 'pause' : 'ready';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA';
      if (e.code === 'Space' && !typing && el.tagName !== 'BUTTON' && el.tagName !== 'A') { e.preventDefault(); t.toggle(); }
      else if ((e.key === 'r' || e.key === 'R') && !typing && !e.metaKey && !e.ctrlKey) { e.preventDefault(); t.reset(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [t]);

  const lead = -Math.PI / 2 + remaining * Math.PI * 2;

  return (
    <main id="main" className={'tm tm-' + mode}>
      <div className="tm-top">
        <a href="#/" className="top-brand" aria-label="DXB MUN home"><Wordmark /></a>
        <span className="mono dim tm-crumb">Debate tools / Floor timer</span>
        <DubaiClock />
        <a href="#/" className="btn btn-ghost btn-sm tm-back">Back to website</a>
      </div>

      <div className="tm-body">
        <section className="tm-dial-wrap" aria-labelledby="tm-h">
          <h1 id="tm-h" className="sr-only">Floor timer</h1>
          <div className="tm-dial">
            <svg viewBox="0 0 400 400" className="tm-svg" aria-hidden="true">
              {Array.from({ length: TICKS }, (_, i) => {
                const a = -Math.PI / 2 + (i / TICKS) * Math.PI * 2;
                const major = i % 10 === 0;
                const lit = i / TICKS < remaining - 1e-6;
                const r1 = 196, r2 = major ? 182 : 188;
                return <line key={i} x1={200 + Math.cos(a) * r1} y1={200 + Math.sin(a) * r1} x2={200 + Math.cos(a) * r2} y2={200 + Math.sin(a) * r2} className={'tk' + (major ? ' tk-major' : '') + (lit ? ' tk-lit' : '')} />;
              })}
              <circle cx="200" cy="200" r="172" className="tm-track" />
              <circle
                cx="200" cy="200" r="172" pathLength={1}
                className="tm-arc"
                strokeDasharray={`${remaining} 1`}
                transform="rotate(-90 200 200)"
              />
              {remaining > 0 && <circle cx={200 + Math.cos(lead) * 172} cy={200 + Math.sin(lead) * 172} r="5" className="tm-lead" />}
              <circle cx="200" cy="200" r="150" className="tm-inner" />
            </svg>
            <div className="tm-read">
              <span className="mono tm-label">General speakers list</span>
              <div className="tm-num" role="timer" aria-label={`Time remaining: ${t.display}`}>
                <NumberFlow value={Math.floor(shown / 60)} format={{ minimumIntegerDigits: 2 }} animated={!still} trend={-1} />
                <span className="tm-colon">:</span>
                <NumberFlow value={shown % 60} format={{ minimumIntegerDigits: 2 }} animated={!still} trend={-1} digits={{ 1: { max: 5 } }} />
              </div>
              <p className="tm-state" aria-live="assertive">{t.state}</p>
            </div>
          </div>
        </section>

        <aside className="tm-panel" aria-label="Timer controls">
          <div className="tm-actions">
            <button type="button" className="btn btn-primary btn-lg tm-go" onClick={t.toggle}>
              {t.running ? <Pause size={20} aria-hidden="true" /> : <Play size={20} aria-hidden="true" />}
              {t.running ? 'Pause' : t.finished ? 'Restart' : t.left < t.total ? 'Resume' : 'Start'}
            </button>
            <button type="button" className="btn btn-ghost btn-lg" onClick={t.reset}>
              <RotateCcw size={18} aria-hidden="true" />Reset
            </button>
          </div>

          <dl className="tm-grid">
            <div><dt className="mono">Total</dt><dd className="mono">{fmt(t.total)}</dd></div>
            <div><dt className="mono">Elapsed</dt><dd className="mono">{fmt(Math.max(0, t.total - shown))}</dd></div>
            <div><dt className="mono">Left</dt><dd className="mono">{Math.round(remaining * 100)}%</dd></div>
          </dl>

          <fieldset className="tm-field" disabled={t.running}>
            <legend className="mono">Preset</legend>
            <div className="seg">
              {t.presets.map((s) => (
                <button key={s} type="button" className="seg-b mono" aria-pressed={t.total === s} onClick={() => t.setTotal(s)}>{fmt(s)}</button>
              ))}
            </div>
          </fieldset>

          <fieldset className="tm-field" disabled={t.running}>
            <legend className="mono">Custom</legend>
            <div className="tm-custom">
              <Stepper label="Minutes" value={t.minutes} onChange={(m) => t.setTotal(m * 60 + t.seconds)} />
              <span className="tm-custom-c mono" aria-hidden="true">:</span>
              <Stepper label="Seconds" value={t.seconds} onChange={(s) => t.setTotal(t.minutes * 60 + s)} />
            </div>
          </fieldset>

          <p className="mono dim tm-keys"><kbd>Space</kbd> start or pause <kbd>R</kbd> reset</p>
        </aside>
      </div>

      {t.finished && (
        <div className="tm-up" role="alert">
          <span>Time is up.</span>
          <button type="button" className="btn btn-on-acc" onClick={t.reset}>Reset</button>
        </div>
      )}
    </main>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const clamp = (v: number) => Math.max(0, Math.min(59, v));
  const id = 'tm-' + label.toLowerCase();
  return (
    <div className="stp">
      <label htmlFor={id} className="mono dim stp-l">{label}</label>
      <div className="stp-row">
        <button type="button" className="btn btn-ghost btn-icon" aria-label={`Decrease ${label.toLowerCase()}`} onClick={() => onChange(clamp(value - 1))}><Minus size={16} aria-hidden="true" /></button>
        <input
          id={id} className="stp-in mono" inputMode="numeric" type="number" min={0} max={59}
          value={String(value).padStart(2, '0')}
          onChange={(e) => onChange(clamp(Number(e.target.value.replace(/\D/g, '')) || 0))}
          onWheel={(e) => { (e.target as HTMLInputElement).blur(); }}
        />
        <button type="button" className="btn btn-ghost btn-icon" aria-label={`Increase ${label.toLowerCase()}`} onClick={() => onChange(clamp(value + 1))}><Plus size={16} aria-hidden="true" /></button>
      </div>
    </div>
  );
}
