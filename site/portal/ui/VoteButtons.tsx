// Yes / No / Abstain (coss ui Button, as toggle buttons). Big placards: light on dark, orange once chosen.
import { Check, Minus, X } from 'lucide-react';
import type { VoteChoice } from '@/platform/v2';
import { Button } from './coss/button';
import { cn } from './coss/utils';

export const VOTE_WORD: Record<VoteChoice, string> = { yes: 'Yes', no: 'No', abstain: 'Abstain' };
const ICON = { yes: Check, no: X, abstain: Minus } as const;

export function VoteButtons({
  mine, onVote, pending, label, noAbstain, disabled, compact,
}: { mine: VoteChoice | null; onVote: (c: VoteChoice) => void; pending: boolean; label: string; noAbstain?: boolean; disabled?: boolean; compact?: boolean }) {
  return (
    <div className={cn('mt-1 grid w-full gap-3 max-md:grid-cols-1 max-md:gap-2.5', compact ? 'grid-cols-1 gap-2' : 'grid-cols-3')} role="group" aria-label={label}>
      {(['yes', 'no', 'abstain'] as const).map((c) => {
        const Icon = ICON[c];
        const on = mine === c;
        const off = c === 'abstain' && noAbstain;
        return (
          <Button
            key={c}
            variant="outline"
            className={cn(
              'h-22 gap-3 rounded-none border-2 border-foreground bg-foreground text-[38px] tracking-[0.03em] text-background shadow-none before:hidden max-md:h-17 max-md:text-[32px]',
              'hover:border-primary hover:bg-foreground dark:bg-foreground dark:hover:bg-foreground [&_svg]:size-8! [&_svg]:opacity-100!',
              // Night Lab: opaque placards. Ink at rest, an orange edge on hover; once locked, the others drop to raised + muted.
              'dash:bg-foreground dash:hover:border-primary dash:hover:bg-foreground dash:disabled:border-line dash:disabled:bg-raised',
              compact && 'h-15 text-[28px] max-md:h-15 max-md:text-[28px] [&_svg]:size-6!',
              on && 'border-primary bg-primary text-primary-foreground dark:bg-primary dash:bg-primary dash:disabled:border-primary dash:disabled:bg-primary dash:disabled:text-primary-foreground',
            )}
            aria-pressed={on}
            disabled={pending || !!mine || off || disabled}
            title={off ? 'You answered "present and voting", so you cannot abstain.' : undefined}
            onClick={() => onVote(c)}
          >
            <Icon aria-hidden="true" strokeWidth={2.6} />
            <span>{VOTE_WORD[c]}</span>
          </Button>
        );
      })}
    </div>
  );
}
