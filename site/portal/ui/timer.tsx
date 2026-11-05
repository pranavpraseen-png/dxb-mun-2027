// The committee timer, computed from the shared Timer row exactly as the contract says, ticking every second.
// BigTimer: huge mono digits for the Now page (readable across a room). SlimTimer: the top-bar version.
// Under 10 s the digits turn warning colour, at 0 destructive colour, always with an icon and a word too.
import { CircleAlert, Hourglass, Mic, Pause, Play, TimerOff } from 'lucide-react';
import type { Timer } from '@/platform/v2';
import { clockText, clockWords, remainingOf, timerTone, useNow, type TimerTone } from '../lib/clock';
import { href } from '../lib/route';
import { cn } from './coss/utils';
import { Status, type StatusDef } from './status';

const KIND: Record<Timer['kind'], string> = { speech: 'Speech', caucus: 'Caucus', session: 'Session', other: 'Timer' };
const TONE_TEXT: Record<TimerTone, string> = { normal: 'text-foreground', warning: 'text-warning', over: 'text-destructive' };

function stateOf(t: Timer, tone: TimerTone): StatusDef {
  if (tone === 'over') return { tone: 'danger', icon: TimerOff, word: "Time's up" };
  if (tone === 'warning' && t.running) return { tone: 'warning', icon: CircleAlert, word: 'Under 10 s' };
  if (t.running) return { tone: 'action', icon: Play, word: 'Running' };
  return { tone: 'muted', icon: Pause, word: t.remainingSeconds === t.durationSeconds ? 'Ready' : 'Paused' };
}

/** True when nothing has ever been loaded into the timer. */
export const timerEmpty = (t: Timer) => !t.running && t.durationSeconds <= 0 && t.remainingSeconds <= 0;

export function BigTimer({ timer: t, mySeatId }: { timer: Timer; mySeatId: string | null }) {
  const now = useNow();
  const left = remainingOf(t, now);
  const tone = timerTone(left);
  const text = clockText(left);
  const me = !!t.speaker && t.speaker.id === mySeatId;
  const empty = timerEmpty(t);
  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="font-label text-[15px] font-semibold uppercase text-muted-foreground tracking-[0.06em]">{KIND[t.kind]}</span>
        {!empty && <Status s={stateOf(t, tone)} />}
        {me && <Status s={{ tone: 'action', icon: Mic, word: "You're speaking" }} />}
      </div>
      {empty ? (
        <p className="flex items-center gap-3 font-heading text-[40px] font-semibold leading-[1.1] text-muted-foreground max-md:text-[32px] tracking-[-0.02em]">
          <Hourglass aria-hidden="true" className="size-9" /> No timer running
        </p>
      ) : (
        <div className="w-full min-w-0 [container-type:inline-size]">
          <p
            className={cn('timer-fit font-mono font-medium leading-[0.9] tabular-nums tracking-[-0.02em]', TONE_TEXT[tone])}
            style={{ ['--fit' as string]: `calc(100cqi / ${(text.length * 0.62).toFixed(2)})` }}
            role="timer"
            aria-live="off"
            aria-label={`${clockWords(left)} left`}
          >
            {text}
          </p>
        </div>
      )}
      {t.speaker && (
        <p className="flex items-center gap-2 font-heading text-[34px] font-semibold leading-[1.1] max-md:text-[28px] tracking-[-0.02em]">
          <Mic aria-hidden="true" className="size-7 shrink-0 text-primary" /> <span className="min-w-0 break-words">{t.speaker.label}</span>
        </p>
      )}
      {t.label && t.label !== t.speaker?.label && <p className="text-xl text-muted-foreground max-md:text-lg">{t.label}</p>}
    </div>
  );
}

/** Top-bar timer, on every page during the live phase. Taps through to Now. */
export function SlimTimer({ timer: t, className }: { timer: Timer; className?: string }) {
  const now = useNow();
  if (timerEmpty(t)) return null;
  const left = remainingOf(t, now);
  const tone = timerTone(left);
  const s = stateOf(t, tone);
  const Icon = s.icon;
  const who = t.speaker?.label ?? t.label ?? KIND[t.kind];
  return (
    <a
      href={href('now')}
      className={cn('inline-flex h-11 min-w-0 shrink items-center gap-2 border border-input px-2.5 no-underline hover:border-primary', className)}
      aria-label={`Timer: ${clockWords(left)} left, ${s.word}, ${who}. Open Now`}
    >
      <Icon aria-hidden="true" className={cn('size-4.5 shrink-0', tone === 'normal' ? (t.running ? 'text-primary' : 'text-muted-foreground') : TONE_TEXT[tone])} />
      <span className={cn('font-mono text-[22px] font-medium tabular-nums leading-none', TONE_TEXT[tone])}>{clockText(left)}</span>
      <span className="min-w-0 truncate text-[15px] text-muted-foreground">{who}</span>
    </a>
  );
}
