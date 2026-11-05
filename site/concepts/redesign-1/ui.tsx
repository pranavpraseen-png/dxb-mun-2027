import clsx from 'clsx';
import { brand } from '@/shared/brand';
import { useDubaiTime } from './clock';

/** Logo slot: the real logo when brand.logoSrc is set, otherwise a type-only wordmark. */
export function Wordmark({ className }: { className?: string }) {
  if (brand.logoSrc) return <img className={clsx('logo', className)} src={brand.logoSrc} alt={brand.logoAlt} />;
  const [a, b] = brand.wordmark.split(' ');
  return (
    <span className={clsx('wm', className)}>
      <span className="wm-sq" aria-hidden="true" />
      <span className="wm-a">{a}</span>
      <span className="wm-b">{b}</span>
    </span>
  );
}

export function Tba({ value }: { value: string | null }) {
  return value ? <>{value}</> : <span className="tba">To be announced</span>;
}

/** Live wall-clock time in Dubai (Asia/Dubai, UTC+4). */
export function DubaiClock({ label = true }: { label?: boolean }) {
  const t = useDubaiTime();
  return (
    <span className="dclock" title="Local time in Dubai (GST, UTC+4)">
      {label && <span className="dclock-l">Dubai</span>}
      <time dateTime={t.iso} aria-label={`Dubai time ${t.hh}:${t.mm}`}>
        {t.hh}:{t.mm}:<span className="dclock-s">{t.ss}</span>
      </time>
      <span className="dclock-z">GST</span>
    </span>
  );
}
