import { useEffect, useState } from 'react';
import { Maximize, Minimize, Pause, Play, RotateCcw } from 'lucide-react';
import clsx from 'clsx';
import { useFloorTimer } from '@/shared/hooks';
import { SevenSeg } from './ui';
// Library components: coss ui (Button, Label from the dashboard's copy; Toggle Group and Number Field copied into ./ui). See LIBRARY.md.
import { Button } from '../../portal/ui/coss/button';
import { Label } from '../../portal/ui/coss/label';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { NumberField, NumberFieldDecrement, NumberFieldGroup, NumberFieldIncrement, NumberFieldInput } from './ui/number-field';

const CELLS = 40;
/** Theming for the coss controls on the projector screen (sizes only; colours come from the tokens). */
const XL = 'h-[68px] px-8 text-[32px] [&_svg]:size-7 max-[720px]:flex-1 max-[720px]:px-4 max-[720px]:text-[26px]';
const PRESET = 'h-[52px] min-w-[68px] rounded-[2px] px-2.5 font-mono text-xl sm:h-[52px] sm:text-xl data-pressed:bg-paper data-pressed:text-ink dark:data-pressed:bg-paper';
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
        <Button variant="outline" size="lg" className="clock-full" onClick={toggleFull}>
          {full ? <Minimize aria-hidden="true" /> : <Maximize aria-hidden="true" />}
          {full ? 'Exit full screen' : 'Full screen'}
        </Button>
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
          <Button size="xl" className={XL} onClick={t.toggle} aria-keyshortcuts="Space">
            {t.running ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
            {t.running ? 'Pause' : t.finished ? 'Restart' : t.left < t.total ? 'Resume' : 'Start'}
            <kbd>Space</kbd>
          </Button>
          <Button size="xl" variant="outline" className={XL} onClick={t.reset} aria-keyshortcuts="R">
            <RotateCcw aria-hidden="true" /> Reset <kbd>R</kbd>
          </Button>
        </div>

        <fieldset className="clock-set" disabled={t.running}>
          <legend>Speaking time</legend>
          <ToggleGroup
            className="clock-presets"
            variant="outline"
            aria-label="Speaking time presets"
            value={[String(t.total)]}
            onValueChange={(v) => { if (v[0]) t.setTotal(Number(v[0])); }}
          >
            {t.presets.map((p) => (
              <ToggleGroupItem key={p} value={String(p)} className={PRESET}>
                {fmtPreset(p)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
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
      <Label htmlFor={id} className="stepper-label">{label}</Label>
      <NumberField id={id} value={value} min={0} max={59} format={{ minimumIntegerDigits: 2 }} onValueChange={(v) => onChange(v ?? 0)} className="w-auto">
        <NumberFieldGroup className="h-[52px] w-[148px] min-[721px]:w-[164px] rounded-[2px] border-g3 bg-background shadow-none before:hidden dark:bg-background">
          <NumberFieldDecrement aria-label={`${label} down`} className="w-11 min-[721px]:w-12 rounded-none border-e border-g3 [&_svg]:size-5" />
          <NumberFieldInput className="h-full font-mono text-2xl leading-none sm:h-full sm:leading-none" />
          <NumberFieldIncrement aria-label={`${label} up`} className="w-11 min-[721px]:w-12 rounded-none border-s border-g3 [&_svg]:size-5" />
        </NumberFieldGroup>
      </NumberField>
    </div>
  );
}
