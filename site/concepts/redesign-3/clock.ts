import { useEffect, useState } from 'react';

const fmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Dubai', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
});
const dayFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dubai', weekday: 'short', day: '2-digit', month: 'short' });

/** Live wall-clock time in Dubai (Asia/Dubai, UTC+4, no daylight saving). */
export function useDubaiTime() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let t = 0;
    const tick = () => {
      setNow(new Date());
      t = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    };
    t = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    return () => clearTimeout(t);
  }, []);
  const parts = fmt.formatToParts(now);
  const get = (k: string) => parts.find((p) => p.type === k)?.value ?? '00';
  return { hh: get('hour'), mm: get('minute'), ss: get('second'), day: dayFmt.format(now), iso: now.toISOString() };
}
