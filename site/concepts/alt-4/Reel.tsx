// The reel: a Pixel-product-page moment between the hero and About.
// The section is pinned for ~2 screens. While you scroll through it, the 3D floor behind it turns (Stage.tsx reads the
// same progress from `.fl-reel` and orbits the camera around the wordmark), and one big statement fills in word by word,
// dim to white, numbers in UN blue. Then the floor sits down and About slides over it.
// Still / reduced motion: no pin, the statement is fully filled.
import { useEffect, useRef } from 'react';
import { stats, conference } from '@/data/conference';

const days = stats.find((s) => s.label === 'Days')?.value ?? 3;
const words = (s: string, num = false) => s.split(' ').map((w) => ({ w, num }));
// About (next section) already lists committees, days and sessions; the reel says something About doesn't.
// 193 = UN member states, each with a seat in the General Assembly.
const TEXT = [
  ...words('193', true), ...words('nations have a seat at the United Nations. For'),
  ...words(String(days), true), ...words(`days in ${conference.city},`),
  ...words('one of them is'), ...words('yours.', true),
];

export function Reel() {
  const ref = useRef<HTMLElement>(null);
  const spans = useRef<HTMLSpanElement[]>([]);
  const step = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const still = document.documentElement.classList.contains('still');
    if (still) { spans.current.forEach((s) => s.style.setProperty('--f', '1')); return; }
    let raf = 0, last = -1;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const r = el.getBoundingClientRect();
      const k = Math.max(0, Math.min(1, -r.top / Math.max(1, r.height - innerHeight)));
      if (Math.abs(k - last) < 0.0005) return;
      last = k;
      // Words fill between 6% and 82% of the pin; each word takes about two words' worth of scroll to fill.
      const p = ((k - 0.06) / 0.76) * (TEXT.length + 1.5);
      spans.current.forEach((s, i) => s.style.setProperty('--f', String(Math.max(0, Math.min(1, (p - i) / 1.5)))));
      if (step.current) step.current.textContent = String(Math.min(3, 1 + Math.floor(k * 3))).padStart(2, '0');
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section ref={ref} className="fl-reel" aria-label="DXB MUN in one line">
      <div className="fl-reel-pin">
        <p className="fl-reel-k mono" aria-hidden="true"><span ref={step}>01</span> / 03 · The session in one line</p>
        <p className="fl-reel-text">
          {TEXT.map((t, i) => (
            <span key={i} ref={(s) => { if (s) spans.current[i] = s; }} className={t.num ? 'is-num' : undefined}>{t.w} </span>
          ))}
        </p>
      </div>
    </section>
  );
}
