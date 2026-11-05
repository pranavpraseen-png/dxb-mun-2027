import { brand } from '@/shared/brand';

/** The logo slot. Until the real logo lands in brand.logoSrc, a type-only wordmark: two cuts of one family. */
export function Wordmark({ size = 'nav' }: { size?: 'nav' | 'foot' }) {
  if (brand.logoSrc) return <img className={`logo logo--${size}`} src={brand.logoSrc} alt={brand.logoAlt} />;
  const [a, b] = brand.wordmark.split(' ');
  return (
    <span className={`wordmark wordmark--${size}`} aria-label={brand.wordmark} role="img">
      <span className="wm-a" aria-hidden="true">{a}</span>
      <span className="wm-b" aria-hidden="true">{b}</span>
    </span>
  );
}
