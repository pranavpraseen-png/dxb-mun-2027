// The chair dashboard's kit: thin, themed compositions of coss ui components (see chair/LIBRARY.md).
// Hand-written here: typography (page heading) and small formatting helpers. No colours of its own.
import { useId, type ComponentType, type ReactNode } from 'react';
import {
  AlertTriangle, ArrowRight, CheckCircle2, Circle, Eye, Hourglass, Info, Medal, RotateCw, type LucideProps,
} from 'lucide-react';
import { brand } from '@/shared/brand';
import { cn } from '../../portal/ui/coss/utils';
import { Badge } from '../../portal/ui/coss/badge';
import { Button } from '../../portal/ui/coss/button';
import { Card, CardAction, CardHeader, CardPanel, CardTitle } from '../../portal/ui/coss/card';
import { Skeleton as CossSkeleton } from '../../portal/ui/coss/skeleton';
import { Empty as CossEmpty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../../portal/ui/coss/empty';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '../../portal/ui/coss/alert';
import { SegmentedControl, SegmentedControlItem } from '../../portal/ui/coss/segmented-control';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '../../portal/ui/coss/select';
import { errorText } from '../lib/data';

export const TBA = 'To be announced';

/* ------------------------------------------------------------------ status: colour + icon + word */
// blue = live / your move, green = done or yes, amber = waiting, grey = not yet, red = a problem or no, gold = honours.
export type Tone = 'live' | 'ok' | 'wait' | 'off' | 'bad' | 'seen' | 'gold';
const TONE_ICON: Record<Tone, ComponentType<LucideProps>> = {
  live: ArrowRight, ok: CheckCircle2, wait: Hourglass, off: Circle, bad: AlertTriangle, seen: Eye, gold: Medal,
};
const TONE_BADGE = { live: 'info', ok: 'success', wait: 'warning', off: 'outline', bad: 'error', seen: 'success', gold: 'outline' } as const;

export function Tag({ tone, children, icon, className }: { tone: Tone; children: ReactNode; icon?: ComponentType<LucideProps>; className?: string }) {
  const Icon = icon ?? TONE_ICON[tone];
  return (
    <Badge
      size="lg"
      variant={TONE_BADGE[tone]}
      className={cn(
        'h-7 shrink-0 gap-1.5 px-2 font-label text-[15px] font-semibold sm:h-7 sm:text-[15px] [&_svg]:size-4! [&_svg]:opacity-100!',
        tone === 'off' && 'border-input text-muted-foreground',
        tone === 'live' && 'border-info-line',
        (tone === 'ok' || tone === 'seen') && 'border-success-line',
        tone === 'wait' && 'border-warning-line',
        tone === 'bad' && 'border-destructive-line',
        tone === 'gold' && 'border-gold text-gold',
        className,
      )}
    >
      <Icon aria-hidden="true" strokeWidth={2.4} />
      {children}
    </Badge>
  );
}

/* ------------------------------------------------------------------ brand marks (classes from portal.css) */
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
export function HostMark({ className }: { className?: string }) {
  return (
    <span className={cn('host', className)}>
      <span className="host__k">Hosted by</span>
      <span className="host__v">Indian High School</span>
    </span>
  );
}

/* ------------------------------------------------------------------ page heading and panels */
export function PageHead({ title, line, aside }: { title: string; line?: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="font-heading text-[42px] font-semibold leading-[1.05] max-md:text-[34px] tracking-[-0.02em]" tabIndex={-1}>{title}</h1>
        {line && <p className="mt-1.5 text-lg text-muted-foreground max-md:text-base">{line}</p>}
      </div>
      {aside && <div className="flex flex-wrap items-center gap-2.5 max-md:w-full">{aside}</div>}
    </div>
  );
}

export function Panel({
  id, title, icon: Icon, aside, children, className, bodyClass,
}: {
  id?: string; title: ReactNode; icon?: ComponentType<LucideProps>; aside?: ReactNode;
  children: ReactNode; className?: string; bodyClass?: string;
}) {
  const hid = useId();
  return (
    <Card render={<section />} id={id} aria-labelledby={hid} className={cn('min-w-0 rounded-sm shadow-none before:hidden', className)}>
      <CardHeader className="flex min-h-14 flex-row flex-wrap items-center gap-2.5 border-b px-5 py-2.5 max-md:px-4">
        {Icon && <Icon size={20} aria-hidden="true" className="shrink-0 text-primary" />}
        <CardTitle render={<h2 id={hid} />} className="font-heading text-2xl font-semibold leading-[1.05] max-md:text-[22px] tracking-[-0.01em]">{title}</CardTitle>
        {aside && <CardAction className="ms-auto flex flex-wrap items-center gap-2 self-center">{aside}</CardAction>}
      </CardHeader>
      <CardPanel className={cn('flex flex-col gap-3.5 p-5 pt-4.5 max-md:p-4', bodyClass)}>{children}</CardPanel>
    </Card>
  );
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex w-full flex-col gap-2.5" aria-busy="true">
      <span className="sr-only">Loading</span>
      {Array.from({ length: lines }, (_, i) => <CossSkeleton key={i} className={cn('h-6 rounded-sm', i === lines - 1 && 'w-2/3')} />)}
    </div>
  );
}

export function Empty({ title, line, icon: Icon = Info }: { title: string; line?: string; icon?: ComponentType<LucideProps> }) {
  return (
    <CossEmpty className="w-full rounded-sm border border-dashed p-6 md:p-6">
      <EmptyHeader>
        <EmptyMedia variant="icon"><Icon aria-hidden="true" /></EmptyMedia>
        <EmptyTitle className="font-heading text-xl font-semibold">{title}</EmptyTitle>
        {line && <EmptyDescription className="text-base">{line}</EmptyDescription>}
      </EmptyHeader>
    </CossEmpty>
  );
}

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

/** Loading / error / data, in one line per panel. */
export function Loaded<T>({ load, what, lines, children }: { load: { data: T | undefined; error: unknown; reload: () => void }; what: string; lines?: number; children: (d: T) => ReactNode }) {
  if (load.error && load.data === undefined) return <ErrorBox error={load.error} onRetry={load.reload} what={what} />;
  if (load.data === undefined) return <Skeleton lines={lines} />;
  return <>{children(load.data)}</>;
}

/** A row of pressable choices (coss Segmented Control, buttons with aria-pressed). */
export function Choices<T extends string>({
  value, onChange, options, label, className, size = 'lg', disabled,
}: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; label: string; className?: string; size?: 'sm' | 'default' | 'lg'; disabled?: boolean }) {
  return (
    <SegmentedControl role="group" aria-label={label} size={size} className={cn('max-w-full flex-wrap justify-start', className)}>
      {options.map((o) => (
        <SegmentedControlItem
          key={o.value}
          aria-pressed={o.value === value}
          data-pressed={o.value === value ? '' : undefined}
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className="h-10 px-3 font-label text-[17px] font-semibold sm:h-10 sm:text-[17px]"
        >
          {o.label}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  );
}

/** coss Select (Base UI listbox). `value` '' = nothing chosen (shows the placeholder). */
export function Pick({
  id, value, onChange, options, placeholder, label, className, disabled,
}: { id?: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder: string; label?: string; className?: string; disabled?: boolean }) {
  const items = [{ value: '', label: placeholder }, ...options];
  return (
    <Select items={items} value={value} onValueChange={(v) => onChange((v as string | null) ?? '')} disabled={disabled}>
      <SelectTrigger id={id} aria-label={label} className={cn('min-h-11 min-w-0 text-[17px] sm:min-h-11 sm:text-[17px]', className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectPopup className="max-h-[min(var(--available-height),24rem)]">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="min-h-11 text-base sm:min-h-10 sm:text-base">{o.label}</SelectItem>
        ))}
      </SelectPopup>
    </Select>
  );
}

/* ------------------------------------------------------------------ formatting */
/** 75 → "1:15", 3725 → "1:02:05". */
export function clock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
}

/** "45", "0:45", "1:30", "1:02:05", "90s", "2m", "1m30s" → seconds. null if it cannot be read. */
export function parseLength(raw: string): number | null {
  const v = raw.trim().toLowerCase().replace(/\s+/g, '');
  if (!v) return null;
  if (/^\d+(:\d{1,2}){0,2}$/.test(v)) {
    const parts = v.split(':').map(Number);
    if (parts.slice(1).some((p) => p > 59)) return null;
    return parts.reduce((acc, p) => acc * 60 + p, 0);
  }
  const m = /^(?:(\d+)h)?(?:(\d+)m(?:in)?)?(?:(\d+)s(?:ec)?)?$/.exec(v);
  if (m && (m[1] || m[2] || m[3])) return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
  return null;
}

export function when(iso: string | null | undefined, withTime = true): string {
  if (!iso) return TBA;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return TBA;
  return withTime
    ? d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
export function timeOnly(iso: string | null | undefined): string {
  if (!iso) return TBA;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? TBA : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export const names = (delegates: string[]) => (delegates.length ? delegates.join(' and ') : 'Seat not filled');

/** True when a key press is inside a text field, so shortcuts leave typing alone. */
export function typing(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.getAttribute('role') === 'combobox' || el.getAttribute('role') === 'listbox';
}
