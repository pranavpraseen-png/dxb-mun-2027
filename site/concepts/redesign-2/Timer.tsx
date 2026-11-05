import { useEffect } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import clsx from 'clsx';
import { useFloorTimer } from '@/shared/hooks';
import { Button } from '../../portal/ui/coss/button';

const BIG = 'h-16 sm:h-16 rounded-[2px] px-8 text-[18px] sm:text-[18px] font-semibold tracking-[0.14em] [&_svg]:size-6 max-[720px]:flex-1 max-[720px]:px-4';
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** The floor timer, set like a title card: huge serif numerals, a hairline that runs out, one main action. */
export function Timer() {
  const t = useFloorTimer(60);
  const phase = t.finished ? 'up' : t.running ? 'run' : t.left < t.total ? 'hold' : 'ready';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('input, textarea, select')) return;
      if (e.code === 'Space') { if (el.closest('button, a')) return; e.preventDefault(); t.toggle(); }
      else if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); t.reset(); }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [t]);

  return (
    <main id="main" tabIndex={-1} className={clsx('timer', `is-${phase}`)}>
      <p className="timer-k"><span className="kicker-n">VII</span><span className="kicker-rule" aria-hidden="true" />Floor timer</p>
      <p className="timer-n" role="timer" aria-live="off" aria-label={`${t.mm} minutes ${t.ss} seconds left`}>
        {t.mm}<span className="timer-colon">:</span>{t.ss}
      </p>
      <div className="timer-bar" aria-hidden="true"><span style={{ transform: `scaleX(${1 - t.progress})` }} /></div>
      <p className="timer-state" aria-live="polite">{t.state}</p>
      <div className="timer-main">
        <Button className={BIG} onClick={t.toggle}>{t.running ? <><Pause aria-hidden="true" /> Pause</> : <><Play aria-hidden="true" /> Start</>}</Button>
        <Button variant="outline" className={BIG} onClick={t.reset}><RotateCcw aria-hidden="true" /> Reset</Button>
      </div>
      <div className="timer-presets" role="group" aria-label="Speaking time">
        {t.presets.map((s) => (
          <Button key={s} variant="outline" aria-pressed={t.total === s} disabled={t.running}
            className={clsx('h-12 min-w-[76px] rounded-[2px] font-mono text-[17px] font-normal tracking-normal sm:h-12 sm:text-[17px]', t.total === s && 'is-picked')}
            onClick={() => t.setTotal(s)}>
            {fmt(s)}
          </Button>
        ))}
      </div>
      <p className="timer-keys">Space starts and pauses. R resets.</p>
      <a className="timer-back" href="#/">Back to the website</a>
    </main>
  );
}
