// Status shown three ways at once: colour, icon and word (coss ui Badge, outlined).
// Every status in the v2 dashboard maps to one entry here, so the same word always has the same look.
import type { ComponentType, ReactNode } from 'react';
import {
  Ban, CircleCheck, CircleX, Clock, Eye, FileX, Hourglass, Lock, Megaphone, Mic, PenLine, RotateCcw, Send, Vote,
  type LucideProps,
} from 'lucide-react';
import type { Chit, PaperStatus, ResolutionStatus, Speaker } from '@/platform/v2';
import { Badge } from './coss/badge';
import { cn } from './coss/utils';

export type StatusTone = 'action' | 'success' | 'warning' | 'muted' | 'danger';
const VARIANT = { action: 'info', success: 'success', warning: 'warning', muted: 'outline', danger: 'error' } as const;
const BORDER: Record<StatusTone, string> = {
  action: 'border-info-line',
  success: 'border-success-line',
  warning: 'border-warning-line',
  muted: 'border-input text-muted-foreground',
  danger: 'border-destructive-line',
};

export type StatusDef = { tone: StatusTone; icon: ComponentType<LucideProps>; word: string };

export function Status({ s, children, className }: { s: StatusDef; children?: ReactNode; className?: string }) {
  const Icon = s.icon;
  return (
    <Badge
      size="lg"
      variant={VARIANT[s.tone]}
      className={cn(
        'h-7 gap-1.5 px-2 font-label text-[15px] font-semibold sm:h-7 sm:text-[15px] [&_svg]:size-4! [&_svg]:opacity-100!',
        BORDER[s.tone], className,
      )}
    >
      <Icon aria-hidden="true" strokeWidth={2.4} />
      {children ?? s.word}
    </Badge>
  );
}

export const PAPER: Record<PaperStatus, StatusDef> = {
  not_sent: { tone: 'warning', icon: FileX, word: 'Not sent' },
  submitted: { tone: 'success', icon: CircleCheck, word: 'Submitted' },
  late: { tone: 'danger', icon: Clock, word: 'Late' },
  seen: { tone: 'success', icon: Eye, word: 'Seen by chair' },
};

export const RESOLUTION: Record<ResolutionStatus, StatusDef> = {
  draft: { tone: 'muted', icon: PenLine, word: 'Draft' },
  submitted: { tone: 'warning', icon: Hourglass, word: 'With the chair' },
  returned: { tone: 'danger', icon: RotateCcw, word: 'Returned' },
  approved: { tone: 'success', icon: CircleCheck, word: 'Approved' },
  voting: { tone: 'action', icon: Vote, word: 'Voting' },
  passed: { tone: 'success', icon: CircleCheck, word: 'Passed' },
  failed: { tone: 'danger', icon: CircleX, word: 'Failed' },
};

export const CHIT: Record<Chit['status'], StatusDef> = {
  pending: { tone: 'warning', icon: Hourglass, word: 'With the dais' },
  delivered: { tone: 'success', icon: Send, word: 'Delivered' },
  blocked: { tone: 'danger', icon: Ban, word: 'Held by the dais' },
};

export const SPEAKER: Record<Speaker['status'], StatusDef> = {
  speaking: { tone: 'action', icon: Mic, word: 'Speaking' },
  waiting: { tone: 'warning', icon: Hourglass, word: 'Waiting' },
  done: { tone: 'muted', icon: CircleCheck, word: 'Done' },
};

export const LOCKED: StatusDef = { tone: 'muted', icon: Lock, word: 'Not open' };
export const URGENT: StatusDef = { tone: 'danger', icon: Megaphone, word: 'Urgent' };
