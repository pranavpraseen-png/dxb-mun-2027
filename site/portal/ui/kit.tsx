// The dashboard's kit: thin, themed compositions of library components (coss ui, Base CN).
// See portal/LIBRARY.md for where each piece comes from. Hand-written here: only typography
// (page heading, hint line) and the DXB MUN nameplate, our signature element.
import { useId, type ComponentType, type ReactNode } from 'react';
import {
  AlertTriangle, ArrowRight, CheckCircle2, Hourglass, Info, Lock, RotateCw, type LucideProps,
} from 'lucide-react';
import { brand } from '@/shared/brand';
import { errorText } from '../lib/data';
import { cn } from './coss/utils';
import { Badge } from './coss/badge';
import { Button } from './coss/button';
import { Card, CardAction, CardHeader, CardPanel, CardTitle } from './coss/card';
import { Skeleton as CossSkeleton } from './coss/skeleton';
import { Empty as CossEmpty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from './coss/empty';
import { Alert, AlertAction, AlertDescription, AlertTitle } from './coss/alert';
import { Field as CossField, FieldDescription, FieldLabel } from './coss/field';
import { Item, ItemGroup } from './basecn/item';

/* ------------------------------------------------------------------ status: one colour language */
// UN blue = your turn, green = done, amber = waiting on someone else, grey = locked, red = a problem.
export type Tone = 'todo' | 'done' | 'waiting' | 'locked' | 'problem';
export const TONE_ICON: Record<Tone, ComponentType<LucideProps>> = {
  todo: ArrowRight, done: CheckCircle2, waiting: Hourglass, locked: Lock, problem: AlertTriangle,
};
export const TONE_WORD: Record<Tone, string> = {
  todo: 'Your turn', done: 'Done', waiting: 'Waiting', locked: 'Not yet', problem: 'Problem',
};
const TONE_BADGE = { todo: 'info', done: 'success', waiting: 'warning', locked: 'outline', problem: 'error' } as const;

/** Status badge (coss Badge): icon + word, so colour is never the only signal. */
export function Tag({ tone, children }: { tone: Tone; children?: ReactNode }) {
  const Icon = TONE_ICON[tone];
  return (
    <Badge
      size="lg"
      variant={TONE_BADGE[tone]}
      className={cn(
        // Outlined, on the card colour: tinted fills would drop UN blue below 4.5:1.
        'h-7 gap-1.5 px-2 font-label text-[15px] font-semibold sm:h-7 sm:text-[15px] [&_svg]:size-4! [&_svg]:opacity-100!',
        tone === 'locked' && 'border-input text-muted-foreground',
        tone === 'todo' && 'border-info-line',
        tone === 'done' && 'border-success-line',
        tone === 'waiting' && 'border-warning-line',
        tone === 'problem' && 'border-destructive-line',
      )}
    >
      <Icon aria-hidden="true" strokeWidth={2.4} />
      {children ?? TONE_WORD[tone]}
    </Badge>
  );
}

/* ------------------------------------------------------------------ wordmark (logo slot) */
export function Wordmark() {
  if (brand.logoSrc) return <img className="logo" src={brand.logoSrc} alt={brand.logoAlt} />;
  const [a, b] = brand.wordmark.split(' ');
  return (
    <span className="wm" aria-label={brand.wordmark}>
      <span className="wm-a" aria-hidden="true">{a}</span>
      <span className="wm-b" aria-hidden="true">{b}</span>
    </span>
  );
}

/** "Hosted by Indian High School": the host mark (IHS maroon, white and cream text, a thin gold rule). */
export function HostMark({ className }: { className?: string }) {
  return (
    <span className={cn('host', className)}>
      <span className="host__k">Hosted by</span>
      <span className="host__v">Indian High School</span>
    </span>
  );
}

/* ------------------------------------------------------------------ page heading (typography) */
export function PageHead({ title, line, aside }: { title: string; line?: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="font-heading font-wide text-[46px] font-extrabold leading-[1.05] max-md:text-[36px] tracking-[-0.02em]" tabIndex={-1}>{title}</h1>
        {line && <p className="phead__line mt-1.5 text-lg text-muted-foreground max-md:text-base">{line}</p>}
      </div>
      {aside && <div className="flex items-center gap-2.5 max-md:w-full max-md:*:w-full">{aside}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ panel (coss Card) */
export function Panel({
  id, title, icon: Icon, aside, children, className, tone,
}: {
  id?: string; title: ReactNode; icon?: ComponentType<LucideProps>; aside?: ReactNode;
  children: ReactNode; className?: string; tone?: Tone;
}) {
  const hid = useId();
  return (
    <Card
      render={<section />}
      id={id}
      aria-labelledby={hid}
      className={cn('min-w-0 rounded-sm shadow-none before:hidden', tone === 'todo' && 'border-l-4 border-l-primary', className)}
    >
      <CardHeader className="flex min-h-14 items-center gap-2.5 border-b px-5 py-2.5 max-md:min-h-13 max-md:px-4">
        {Icon && <Icon size={20} aria-hidden="true" className="shrink-0 text-primary" />}
        <CardTitle render={<h2 id={hid} tabIndex={-1} />} className="font-heading text-2xl font-semibold leading-[1.05] max-md:text-[22px] tracking-[-0.01em]">{title}</CardTitle>
        {aside && <CardAction className="ms-auto self-center">{aside}</CardAction>}
      </CardHeader>
      <CardPanel className="flex flex-col items-start gap-3.5 p-5 pt-4.5 max-md:p-4 *:max-w-full">{children}</CardPanel>
    </Card>
  );
}

/* ------------------------------------------------------------------ designed states */
export function Skeleton({ lines = 3, tall = false }: { lines?: number; tall?: boolean }) {
  return (
    <div className="flex w-full flex-col gap-3" aria-hidden="true">
      {tall && <CossSkeleton className="h-24 w-full" />}
      {Array.from({ length: lines }, (_, i) => (
        <CossSkeleton key={i} className="h-4" style={{ width: `${92 - ((i * 23) % 40)}%` }} />
      ))}
    </div>
  );
}

/** Loading placeholder for a whole screen: skeleton cards, with a hidden "Loading" for screen readers. */
export function ScreenSkeleton({ panels = 3 }: { panels?: number }) {
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      <span className="sr-only">Loading</span>
      {Array.from({ length: panels }, (_, i) => (
        <Card key={i} className="rounded-sm p-5 shadow-none before:hidden"><Skeleton lines={i === 0 ? 2 : 3} tall={i === 0} /></Card>
      ))}
    </div>
  );
}

/** Empty state (coss Empty), laid out as one compact row inside a card. */
export function Empty({ children, icon: Icon = Info }: { children: ReactNode; icon?: ComponentType<LucideProps> }) {
  return (
    <CossEmpty className="w-full flex-row items-center justify-start gap-3 p-0 text-left md:py-0">
      <EmptyMedia variant="icon" className="mb-0 size-10 text-muted-foreground [&_svg]:size-5"><Icon aria-hidden="true" /></EmptyMedia>
      <EmptyDescription className="text-[17px] text-muted-foreground">{children}</EmptyDescription>
    </CossEmpty>
  );
}

/** Locked state (coss Empty with a lock): "Opens on conference day". */
export function Locked({ title = 'Opens on conference day', line }: { title?: string; line?: string }) {
  return (
    <CossEmpty className="w-full flex-row items-center justify-start gap-4 p-0 text-left md:py-0">
      <EmptyMedia variant="icon" className="mb-0 size-12 text-muted-foreground [&_svg]:size-6"><Lock aria-hidden="true" /></EmptyMedia>
      <EmptyHeader className="items-start text-left">
        <EmptyTitle className="font-heading text-[22px] font-semibold leading-tight tracking-[-0.01em]">{title}</EmptyTitle>
        {line && <EmptyDescription className="text-base text-muted-foreground">{line}</EmptyDescription>}
      </EmptyHeader>
    </CossEmpty>
  );
}

/** Error with retry (coss Alert). */
export function ErrorBox({ error, onRetry, what = 'this' }: { error: unknown; onRetry: () => void; what?: string }) {
  return (
    <Alert variant="error" className="rounded-sm text-base">
      <AlertTriangle aria-hidden="true" />
      <AlertTitle className="font-semibold">Could not load {what}.</AlertTitle>
      <AlertDescription className="text-muted-foreground">{errorText(error)}</AlertDescription>
      <AlertAction>
        <Button variant="outline" size="sm" onClick={onRetry}><RotateCw aria-hidden="true" /> Try again</Button>
      </AlertAction>
    </Alert>
  );
}

/** A plain-language hint for an MUN term (one line of text). */
export function Hint({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-base leading-snug text-muted-foreground">
      <Info size={16} aria-hidden="true" className="mt-[3px] shrink-0 text-primary" /><span>{children}</span>
    </p>
  );
}

/** "Sample data": shown wherever demo content appears (coss Badge, outline). */
export function SampleTag() {
  return <Badge variant="outline" size="lg" className="h-7 border-dashed px-2 text-sm font-normal text-muted-foreground sm:text-sm">Sample data</Badge>;
}

/* ------------------------------------------------------------------ nameplate: our signature (hand-made) */
export function Nameplate({ seat, abbr, name, label = 'Your seat' }: { seat: string; abbr: string; name: string; label?: string }) {
  const len = Math.max(seat.length, 4);
  return (
    <figure className="plate" aria-label={`${label}: ${seat}, ${abbr}, ${name}`}>
      <span className="plate__k" aria-hidden="true">{label}</span>
      <span className="plate__seat" style={{ ['--len' as string]: len }} aria-hidden="true">{seat}</span>
      <span className="plate__fold" aria-hidden="true">
        <span className="plate__abbr">{abbr}</span>
        <span className="plate__name">{name}</span>
      </span>
    </figure>
  );
}

export function NoPlate({ line = 'The secretariat gives out seats after applications close.' }: { line?: string }) {
  return (
    <div className="plate plate--empty">
      <span className="plate__k">Your seat</span>
      <span className="plate__none">Not allocated yet</span>
      <span className="plate__line">{line}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ form field (coss Field) */
export const fieldLabelClass = 'text-[17px] font-semibold sm:text-[17px]';

export function Field({
  label, hint, children, id, error, labelHidden,
}: {
  label: string; hint?: string; children: (id: string, describedBy?: string) => ReactNode;
  id?: string; error?: string | null; labelHidden?: boolean;
}) {
  const auto = useId();
  const fid = id ?? auto;
  const hid = hint ? `${fid}-hint` : undefined;
  const eid = error ? `${fid}-err` : undefined;
  const by = [hid, eid].filter(Boolean).join(' ') || undefined;
  return (
    <CossField className="w-full gap-1.5" invalid={!!error}>
      <FieldLabel className={labelHidden ? 'sr-only' : fieldLabelClass}>{label}</FieldLabel>
      {hint && <FieldDescription id={hid} className="text-[15px] text-muted-foreground">{hint}</FieldDescription>}
      {children(fid, by)}
      {error && <FieldError id={eid}>{error}</FieldError>}
    </CossField>
  );
}

/** Character counter that turns amber near the limit and red over it. */
export function Counter({ value, max, id }: { value: string; max: number; id?: string }) {
  const left = max - value.length;
  return (
    <p id={id} className={cn('font-mono text-sm text-muted-foreground', left < 50 && 'text-warning', left < 0 && 'text-destructive')} aria-live={left < 50 ? 'polite' : 'off'}>
      {left >= 0 ? `${left} characters left` : `${-left} over the limit`}
    </p>
  );
}

/** Sentence case for values that arrive lowercase, like motion kinds ("moderated caucus"). */
export const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Formats an ISO time as a short, plain date (Dubai time). */
export function when(iso: string | null | undefined, withTime = false): string {
  if (!iso) return 'To be announced';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'To be announced';
  return d.toLocaleString('en-GB', {
    day: 'numeric', month: 'short', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : { year: 'numeric' }),
    timeZone: 'Asia/Dubai',
  });
}

/** A form error line (red, with an icon): under a field, or for the whole form with role="alert". */
export function FieldError({ id, children, alert }: { id?: string; children: ReactNode; alert?: boolean }) {
  return (
    <p id={id} role={alert ? 'alert' : undefined} className="flex items-center gap-1.5 text-base font-semibold text-destructive">
      <AlertTriangle size={16} aria-hidden="true" className="shrink-0" />{children}
    </p>
  );
}

/* ------------------------------------------------------------------ lists (Base CN Item) */
/** A divided list of rows (Base CN ItemGroup, which is role="list"). */
export function Rows({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  return <ItemGroup aria-label={label} className={cn('w-full divide-y divide-border', className)}>{children}</ItemGroup>;
}
/** One row (Base CN Item). `mine` marks your own row: a UN-blue edge on a lighter band.
 *  With `href` the whole row is a link (the Item renders as <a>, inside the list item). */
export function Row({ children, className, mine, href }: { children: ReactNode; className?: string; mine?: boolean; href?: string }) {
  const cls = cn(
    'flex-nowrap items-start gap-3.5 rounded-none px-0 py-3 text-[17px]',
    !href && 'first:pt-0 last:pb-0',
    mine && 'bg-muted px-3 bg-[linear-gradient(var(--primary),var(--primary))] bg-[length:4px_100%] bg-no-repeat first:pt-3 last:pb-3',
    className,
  );
  if (href) {
    return (
      <div role="listitem">
        <Item render={<a href={href} />} className={cls}>{children}</Item>
      </div>
    );
  }
  return <Item role="listitem" className={cls}>{children}</Item>;
}

/** "You" / "Yours": a small UN-blue marker on your own row (coss Badge). */
export function You({ children = 'You' }: { children?: ReactNode }) {
  return <Badge className="ms-2 h-6 px-1.5 align-[2px] font-mono text-sm font-medium uppercase sm:h-6 sm:text-sm tracking-[0.08em]">{children}</Badge>;
}

/** Label/value pairs, as a description list. */
export function Facts({ items }: { items: [ReactNode, ReactNode, string?][] }) {
  return (
    <dl className="grid w-full grid-cols-[max-content_minmax(0,1fr)] gap-x-5 max-md:grid-cols-1">
      {items.map(([k, v, cls], i) => {
        const last = i === items.length - 1;
        return (
          <div key={i} className="contents">
            <dt className={cn('border-b py-2.5 font-mono text-sm font-medium uppercase text-muted-foreground max-md:border-b-0 max-md:pb-0 tracking-[0.08em]', i === 0 && 'pt-0', last && 'md:border-b-0 md:pb-0')}>{k}</dt>
            <dd className={cn('min-w-0 border-b py-2.5 text-[17px] max-md:pt-0.5', i === 0 && 'md:pt-0', last && 'border-b-0 pb-0', cls)}>{v}</dd>
          </div>
        );
      })}
    </dl>
  );
}

/** A small heading inside a card. */
export function Sub({ icon: Icon, children }: { icon?: ComponentType<LucideProps>; children: ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 font-mono text-[14px] font-medium uppercase text-muted-foreground tracking-[0.08em]">
      {Icon && <Icon size={18} aria-hidden="true" className="text-primary" />}{children}
    </h3>
  );
}

/** Body text inside a card. */
export function Plain({ children, muted, className }: { children: ReactNode; muted?: boolean; className?: string }) {
  return <p className={cn('text-[17px]', muted && 'text-muted-foreground', className)}>{children}</p>;
}

/** A row of buttons. */
export function Actions({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-wrap items-center gap-2.5', className)}>{children}</div>;
}

/** A plain form wrapper: fields stacked with even spacing. */
export function Stack({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex w-full flex-col items-start gap-4.5 max-md:gap-3.5', className)}>{children}</div>;
}
