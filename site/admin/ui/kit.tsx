// The secretariat kit: thin, themed compositions of coss ui components (portal/ui/coss, admin/ui/coss).
// One status language, always colour + icon + word:
//   UN blue = our move, green = done, amber = waiting, grey = closed / not yet, red = a problem.
// Hand-written here: typography (page heading) and the DXB MUN wordmark / IHS host mark (admin.css).
import { useId, type ComponentType, type ReactNode } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Hourglass, Info, Lock, Radio, RotateCw, type LucideProps } from 'lucide-react';
import { brand } from '@/shared/brand';
import { Badge } from '../../portal/ui/coss/badge';
import { Button } from '../../portal/ui/coss/button';
import { Card, CardAction, CardHeader, CardPanel, CardTitle } from '../../portal/ui/coss/card';
import { Skeleton as CossSkeleton } from '../../portal/ui/coss/skeleton';
import { Empty as CossEmpty, EmptyDescription, EmptyMedia } from '../../portal/ui/coss/empty';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '../../portal/ui/coss/alert';
import { Field as CossField, FieldDescription, FieldLabel } from '../../portal/ui/coss/field';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '../../portal/ui/coss/select';
import { cn } from '../../portal/ui/coss/utils';
import { errorText, useAdmin } from '../lib/data';

/* ------------------------------------------------------------------ status */
export type Tone = 'todo' | 'done' | 'waiting' | 'locked' | 'problem' | 'live';
export const TONE_ICON: Record<Tone, ComponentType<LucideProps>> = {
  todo: ArrowRight, done: CheckCircle2, waiting: Hourglass, locked: Lock, problem: AlertTriangle, live: Radio,
};
const TONE_BADGE = { todo: 'info', done: 'success', waiting: 'warning', locked: 'outline', problem: 'error', live: 'success' } as const;

/** Status badge (coss Badge), sized for dense tables: icon + word, so colour is never the only signal. */
export function Tag({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
  const Icon = TONE_ICON[tone];
  return (
    <Badge
      variant={TONE_BADGE[tone]}
      className={cn(
        'h-7 gap-1.5 px-2 font-label text-[15px] font-semibold sm:h-7 sm:text-[15px] [&_svg]:size-4! [&_svg]:opacity-100!',
        tone === 'locked' && 'border-input text-muted-foreground',
        tone === 'todo' && 'border-info-line',
        (tone === 'done' || tone === 'live') && 'border-success-line',
        tone === 'waiting' && 'border-warning-line',
        tone === 'problem' && 'border-destructive-line',
        className,
      )}
    >
      <Icon aria-hidden="true" strokeWidth={2.4} />
      {children}
    </Badge>
  );
}

/** "To be announced": the one way an unknown value is shown. */
export const TBA = 'To be announced';
export function Tba({ className }: { className?: string }) {
  return <span className={cn('text-muted-foreground italic', className)}>{TBA}</span>;
}

/* ------------------------------------------------------------------ brand */
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

/* ------------------------------------------------------------------ page heading */
export function SampleTag() {
  return <Badge variant="outline" size="lg" className="h-7 border-dashed px-2 text-sm font-normal text-muted-foreground sm:text-sm">Sample data</Badge>;
}

export function Head({ title, line, aside }: { title: string; line?: ReactNode; aside?: ReactNode }) {
  const { api } = useAdmin();
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="font-heading font-wide text-[42px] font-extrabold leading-[1.05] max-md:text-[34px] tracking-[-0.02em]" tabIndex={-1}>{title}</h1>
        {(line || api.mode === 'demo') && (
          <p className="mt-1.5 flex flex-wrap items-center gap-2 text-lg text-muted-foreground max-md:text-base">
            {line && <span>{line}</span>}
            {api.mode === 'demo' && <SampleTag />}
          </p>
        )}
      </div>
      {aside && <div className="flex flex-wrap items-center gap-2.5 max-md:w-full max-md:*:flex-1">{aside}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ panel (coss Card) */
export function Panel({
  title, icon: Icon, aside, children, className, bodyClassName,
}: {
  title: ReactNode; icon?: ComponentType<LucideProps>; aside?: ReactNode;
  children: ReactNode; className?: string; bodyClassName?: string;
}) {
  const hid = useId();
  return (
    <Card render={<section />} aria-labelledby={hid} className={cn('min-w-0 rounded-sm shadow-none before:hidden', className)}>
      <CardHeader className="flex min-h-14 flex-wrap items-center gap-2.5 border-b px-5 py-2.5 max-md:min-h-13 max-md:px-4">
        {Icon && <Icon size={20} aria-hidden="true" className="shrink-0 text-primary" />}
        <CardTitle render={<h2 id={hid} />} className="font-heading text-[22px] font-semibold leading-[1.05] tracking-[-0.01em]">{title}</CardTitle>
        {aside && <CardAction className="ms-auto self-center">{aside}</CardAction>}
      </CardHeader>
      <CardPanel className={cn('flex flex-col items-start gap-3.5 p-5 pt-4.5 max-md:p-4 *:max-w-full', bodyClassName)}>{children}</CardPanel>
    </Card>
  );
}

/* ------------------------------------------------------------------ states */
export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex w-full flex-col gap-3" aria-busy="true">
      <span className="sr-only">Loading</span>
      {Array.from({ length: lines }, (_, i) => <CossSkeleton key={i} className="h-4" style={{ width: `${92 - ((i * 23) % 40)}%` }} />)}
    </div>
  );
}

export function Empty({ children, icon: Icon = Info }: { children: ReactNode; icon?: ComponentType<LucideProps> }) {
  return (
    <CossEmpty className="w-full flex-row items-center justify-start gap-3 p-0 text-left md:py-0">
      <EmptyMedia variant="icon" className="mb-0 size-10 text-muted-foreground [&_svg]:size-5"><Icon aria-hidden="true" /></EmptyMedia>
      <EmptyDescription className="text-[17px] text-muted-foreground">{children}</EmptyDescription>
    </CossEmpty>
  );
}

export function ErrorBox({ error, onRetry, what = 'this' }: { error: unknown; onRetry: () => void; what?: string }) {
  return (
    <Alert variant="error" className="rounded-sm text-base">
      <AlertTriangle aria-hidden="true" />
      <AlertTitle className="font-semibold">Could not load {what}.</AlertTitle>
      <AlertDescription className="text-muted-foreground">{errorText(error)}</AlertDescription>
      <AlertAction><Button variant="outline" size="sm" onClick={onRetry}><RotateCw aria-hidden="true" /> Try again</Button></AlertAction>
    </Alert>
  );
}

/** Loading / error / empty / data, in one place. */
export function Loaded<T>({ load, what, empty, lines = 4, pad, children }: {
  load: { data: T | undefined; error: unknown; reload: () => void }; what: string;
  empty?: (d: T) => ReactNode | null; lines?: number; pad?: boolean; children: (d: T) => ReactNode;
}) {
  const box = (n: ReactNode) => (pad ? <div className="w-full p-5 max-md:p-1">{n}</div> : n);
  if (load.error && load.data === undefined) return box(<ErrorBox error={load.error} what={what} onRetry={load.reload} />);
  if (load.data === undefined) return box(<Skeleton lines={lines} />);
  const e = empty?.(load.data);
  if (e) return box(<Empty>{e}</Empty>);
  return <>{children(load.data)}</>;
}

/* ------------------------------------------------------------------ form bits (coss Field, Select) */
export const labelCls = 'block text-[17px] font-semibold sm:text-[17px]';

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: (id: string, describedBy?: string) => ReactNode; className?: string }) {
  const id = useId();
  const hid = hint ? `${id}-h` : undefined;
  return (
    <CossField className={cn('w-full gap-1.5', className)}>
      <FieldLabel htmlFor={id} className={labelCls}>{label}</FieldLabel>
      {hint && <FieldDescription id={hid} className="text-[15px] text-muted-foreground">{hint}</FieldDescription>}
      {children(id, hid)}
    </CossField>
  );
}

export type Option = { value: string; label: string; disabled?: boolean };

/** coss Select: a listbox with keyboard support. `value` '' means nothing chosen. */
export function Choice({ id, value, onChange, options, placeholder, label, className }: {
  id?: string; value: string; onChange: (v: string) => void; options: Option[]; placeholder: string; label?: string; className?: string;
}) {
  const items = [{ value: '', label: placeholder }, ...options];
  return (
    <Select items={items} value={value} onValueChange={(v) => onChange((v as string | null) ?? '')}>
      <SelectTrigger id={id} aria-label={label} className={cn('min-h-11 text-base sm:min-h-11 sm:text-base', className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectPopup className="max-h-[min(var(--available-height),24rem)]">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} disabled={o.disabled} className="min-h-11 text-base sm:min-h-10 sm:text-base">{o.label}</SelectItem>
        ))}
      </SelectPopup>
    </Select>
  );
}

/** A row of filters above a list. */
export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex w-full flex-wrap items-end gap-2.5 max-md:*:w-full', className)}>{children}</div>;
}

/** A small number with a label (Live overview, counts). */
export function Stat({ n, label, tone }: { n: ReactNode; label: string; tone?: 'warning' | 'success' | 'primary' }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="font-mono text-[13px] font-medium uppercase text-muted-foreground tracking-[0.08em]">{label}</span>
      <span className={cn('font-figures text-[22px] leading-none font-bold', tone === 'warning' && 'text-warning', tone === 'success' && 'text-success', tone === 'primary' && 'text-foreground')}>{n}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ time (Dubai, UTC+4, no daylight saving) */
const TZ = 'Asia/Dubai';
export function when(iso: string | null | undefined, opts: { time?: boolean; date?: boolean } = { time: true, date: true }): string {
  if (!iso) return TBA;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return TBA;
  const { time = true, date = true } = opts;
  return d.toLocaleString('en-GB', {
    ...(date ? { weekday: 'short', day: 'numeric', month: 'short' } : {}),
    ...(time ? { hour: '2-digit', minute: '2-digit' } : {}),
    timeZone: TZ,
  });
}
/** ISO → value for <input type="datetime-local">, in Dubai time. */
export function toDubaiInput(iso: string | null): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  return new Date(t + 4 * 3600_000).toISOString().slice(0, 16);
}
/** <input type="datetime-local"> value (Dubai time) → ISO. Empty → null ("To be announced"). */
export function fromDubaiInput(v: string): string | null {
  if (!v) return null;
  const t = Date.parse(`${v}:00+04:00`);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

/** m:ss (or h:mm:ss) for a number of seconds. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
}
