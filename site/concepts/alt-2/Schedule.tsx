import { useEffect, useMemo, useRef, useState } from 'react';
import NumberFlow from '@number-flow/react';
import { schedule, stats } from '@/data/conference';
import { gsap } from './motion';

/*
  5 · Schedule: a ruler with a playhead (BLUEPRINT 3.5, Anime.js).
  Desktop: the three days sit on one horizontal mono ruler (09 → 19:30, numbered ticks every 30 minutes).
  The stage is pinned and a maroon playhead scrubs across the day as you scroll; the slot under it inverts,
  and the readout below names it for each day. Phone and still mode: the same slots as three hairline tables.
  Every time and duration is exactly as published in conference.ts; only the positions are computed.
*/
const toMin = (s: string) => {
  const m = s.trim().match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return 0;
  let h = +m[1] % 12;
  if (m[3].toUpperCase() === 'PM') h += 12;
  return h * 60 + +m[2];
};
const durMin = (s: string) => {
  const h = s.match(/(\d+)\s*hour/), mm = s.match(/(\d+)\s*minute/);
  return (h ? +h[1] * 60 : 0) + (mm ? +mm[1] : 0);
};
const kindOf = (name: string) => (/Committee Session/.test(name) ? 'session' : /Break|Lunch|Socials/.test(name) ? 'pause' : 'event');

const DAYS = schedule.map((d) => ({
  ...d,
  slots: d.slots.map((s) => {
    const [a, b] = s.time.split('–');
    const start = toMin(a);
    const end = b ? toMin(b) : start + durMin(s.duration);
    return { ...s, start, end, kind: kindOf(s.name) };
  }),
}));
const T0 = Math.min(...DAYS.flatMap((d) => d.slots.map((s) => s.start)));
const T1 = Math.max(...DAYS.flatMap((d) => d.slots.map((s) => s.end)));
const SPAN = T1 - T0;
const x = (t: number) => ((t - T0) / SPAN) * 100;
const clock = (t: number) => {
  const h = Math.floor(t / 60), m = Math.round(t % 60);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};
const TICKS = Array.from({ length: Math.floor(SPAN / 30) + 1 }, (_, i) => T0 + i * 30);

export function Schedule({ still }: { still: boolean }) {
  const sec = useRef<HTMLElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const [t, setT] = useState(T0);

  useEffect(() => {
    if (still) return;
    const el = sec.current!;
    const proxy = { p: 0 };
    let last = -1;
    const tween = gsap.to(proxy, {
      p: 1, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top top', end: 'bottom bottom', scrub: 0.5 },
      onUpdate: () => {
        const now = T0 + proxy.p * SPAN;
        if (head.current) head.current.style.left = `${x(now)}%`;
        const q = Math.round(now / 5) * 5;
        if (q !== last) { last = q; setT(q); }
      },
    });
    return () => { tween.scrollTrigger?.kill(); tween.kill(); };
  }, [still]);

  const current = useMemo(() => DAYS.map((d) => {
    const s = d.slots.find((s) => t >= s.start && t < s.end);
    if (s) return { s, txt: s.name };
    if (t < d.slots[0].start) return { s: null, txt: `Starts ${d.slots[0].time.split('–')[0].trim()}` };
    return { s: null, txt: 'After dispersal' };
  }), [t]);

  return (
    <section ref={sec} id="schedule" className={'sec sched' + (still ? ' sched--still' : '')} aria-labelledby="sc-h">
      <div className="sched-stage">
        <header className="sec-head">
          <span className="k" data-slice>03 — Schedule</span>
          <h2 id="sc-h" className="sec-h">
            <span className="sec-num" aria-hidden="true">{stats[1].value}</span>
            <span className="sr-only">{stats[1].value} </span>
            <span data-rise>days</span>
          </h2>
          <p className="k sec-sub" data-slice>{stats[2].value} committee sessions · times as published</p>
        </header>

        {/* desktop ruler */}
        <div className="ruler" aria-hidden="true">
          <div className="ruler-ticks">
            {TICKS.map((tk) => (
              <span key={tk} className={'tick' + (tk % 60 === 0 ? ' tick--h' : '')} style={{ left: `${x(tk)}%` }}>
                {tk % 60 === 0 && <b>{String(Math.floor(tk / 60)).padStart(2, '0')}</b>}
              </span>
            ))}
          </div>
          <div className="ruler-rows">
            {DAYS.map((d, di) => (
              <div key={d.day} className="rrow">
                <span className="k rrow-day">{d.label}</span>
                <div className="rrow-track">
                  {d.slots.map((s) => (
                    <span key={s.name + s.start}
                      className={`slot slot--${s.kind}` + (!still && current[di].s === s ? ' is-live' : '')}
                      style={{ left: `${x(s.start)}%`, width: `${x(s.end) - x(s.start)}%` }}>
                      <b>{s.name}</b>
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {!still && (
              <div className="ph-layer">
                <div className={'playhead' + (x(t) > 72 ? ' ph-left' : '')} ref={head}><span className="k">{clock(t)}</span></div>
              </div>
            )}
          </div>
          {!still && (
            <div className="readout">
              {DAYS.map((d, di) => (
                <p key={d.day} className="ro">
                  <span className="k">{d.label}</span>
                  <b>{current[di].txt}</b>
                  <span className="k">{current[di].s ? `${current[di].s!.time} · ${current[di].s!.duration}` : '—'}</span>
                </p>
              ))}
            </div>
          )}
          <p className="legend k">
            <span><i className="lg lg--session" /> Committee session</span>
            <span><i className="lg lg--event" /> Ceremony, briefing, registration</span>
            <span><i className="lg lg--pause" /> Break, lunch, socials</span>
          </p>
        </div>

        {/* phone + still: the readable tables (on desktop still mode they sit under the ruler) */}
        <div className="days">
          {DAYS.map((d) => (
            <div key={d.day} className="day">
              <h3 className="day-h"><span className="k">Day</span> <NumberFlow value={d.day} format={{ minimumIntegerDigits: 2 }} /></h3>
              <ol className="day-list">
                {d.slots.map((s) => (
                  <li key={s.name + s.start} className={'dl dl--' + s.kind}>
                    <span className="k dl-t">{s.time}</span>
                    <b className="dl-n">{s.name}</b>
                    <span className="k dl-d">{s.duration}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
