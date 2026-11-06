// Section 5: the schedule on a horizontal mono ruler with a playhead (Anime.js' scrub ruler). The playhead
// stays in the centre and the ruler slides under it as you scroll (transform only). Numbered hour ticks;
// the slot under the playhead is read out large. Every slot is also listed in full below.
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import NumberFlow from '@number-flow/react';
import { conference, tba } from '@/data/conference';
import { DAY_GAP, DAY_SPAN, DAY_START, RULER, dayX, hh, schedule, stats } from './data';
import { ScrollTrigger, gsap, still } from './motion';
import { useMedia } from './ui';

const FIRST = RULER[0].x0, LAST = RULER[RULER.length - 1].x1;
const fmt = (m: number) => {
  const h24 = Math.floor(m / 60), mm = Math.round(m % 60);
  const ap = h24 >= 12 ? 'PM' : 'AM';
  const h = ((h24 + 11) % 12) + 1;
  return `${h}:${String(mm).padStart(2, '0')} ${ap}`;
};

function Ruler({ ppm }: { ppm: number }) {
  const ticks = useMemo(() => {
    const out: { x: number; major: boolean; label?: string }[] = [];
    schedule.forEach((_, di) => {
      for (let m = 0; m <= DAY_SPAN; m += 30) {
        const abs = DAY_START + m;
        out.push({ x: (dayX(di) + m) * ppm, major: abs % 60 === 0, label: abs % 60 === 0 ? hh(abs) : undefined });
      }
    });
    return out;
  }, [ppm]);
  return (
    <div className="ruler-strip" style={{ width: Math.round((schedule.length * DAY_SPAN + (schedule.length - 1) * DAY_GAP) * ppm), transform: `translate3d(${(-FIRST * ppm).toFixed(1)}px, 0, 0)` }}>
      {schedule.map((d, di) => (
        <span key={d.day} className="r-day mono" style={{ transform: `translateX(${Math.round(dayX(di) * ppm)}px)` }}>{d.label}</span>
      ))}
      <div className="r-track">
        {RULER.map((s) => (
          <span
            key={s.idx}
            className={`r-slot k-${s.kind}`}
            style={{ left: Math.round(s.x0 * ppm), width: Math.max(2, Math.round((s.x1 - s.x0) * ppm) - 2) }}
          >
            <span className="r-slot-t">{s.name}</span>
          </span>
        ))}
      </div>
      <div className="r-ticks" aria-hidden="true">
        {ticks.map((t, i) => (
          <i key={i} className={t.major ? 'tk tk-major' : 'tk'} style={{ transform: `translateX(${Math.round(t.x)}px)` }}>
            {t.label && <b className="mono">{t.label}</b>}
          </i>
        ))}
      </div>
    </div>
  );
}

function Readout({ i }: { i: number }) {
  const s = RULER[i];
  return (
    <div className="sch-read" aria-live="polite">
      <p className="mono sch-day">
        <span className="sch-nw">Day <NumberFlow value={s.day} format={{ minimumIntegerDigits: 2 }} /> / {String(schedule.length).padStart(2, '0')}</span>
      </p>
      <p className="sch-name"><span key={s.idx} className="sch-name-in">{s.name}</span></p>
      <p className="mono sch-time">{s.time} <span className="sch-dur">· {s.duration}</span></p>
    </div>
  );
}

function Table() {
  return (
    <div className="sch-table">
      {schedule.map((d) => (
        <div key={d.day} className="sch-col">
          <p className="mono sch-col-h">{d.label}</p>
          <ol>
            {d.slots.map((s) => (
              <li key={s.name + s.time}><span className="mono">{s.time}</span><span>{s.name}</span></li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}

export function Schedule() {
  const phone = useMedia('(max-width: 767px)');
  const ppm = phone ? 1.5 : 2.4;
  const sec = useRef<HTMLElement>(null);
  const [cur, setCur] = useState(0);

  useLayoutEffect(() => {
    const el = sec.current;
    if (!el || still) return;
    const strip = el.querySelector<HTMLElement>('.ruler-strip');
    const head = el.querySelector<HTMLElement>('.ph-time');
    let last = -1;
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        id: 'schedule', trigger: el, start: 'top top', end: () => '+=' + Math.round(window.innerHeight * (phone ? 1.6 : 1.9)),
        pin: true, scrub: true,
        onUpdate: (st) => {
          const x = FIRST + (LAST - FIRST) * st.progress; // ruler minutes
          if (strip) strip.style.transform = `translate3d(${(-x * ppm).toFixed(1)}px, 0, 0)`;
          let i = 0;
          for (let k = 0; k < RULER.length; k++) if (RULER[k].x0 <= x + 0.01) i = k;
          if (i !== last) { last = i; setCur(i); }
          if (head) {
            const di = Math.min(schedule.length - 1, Math.max(0, Math.floor(x / (DAY_SPAN + DAY_GAP))));
            const local = Math.min(DAY_SPAN, x - dayX(di)) + DAY_START;
            head.textContent = `D${di + 1} · ${fmt(local)}`;
          }
        },
      });
    }, el);
    return () => ctx.revert();
  }, [phone, ppm]);

  return (
    <section id="schedule" className={'sch' + (still ? ' is-still' : '')} ref={sec} aria-labelledby="sch-h">
      <header className="sec-top">
        <p className="mono"><span className="acc">03</span> / Schedule</p>
        <p className="mono">Dates: {tba(conference.dates)}</p>
      </header>
      <h2 id="sch-h" className="sch-h">
        <NumberFlow value={stats[1].value} /> days. <NumberFlow value={stats[2].value} /> <em>committee</em> sessions.
      </h2>
      <Readout i={cur} />
      <div className="ruler" aria-hidden="true">
        <div className="ruler-win">
          <Ruler ppm={ppm} />
        </div>
        <div className="playhead"><span className="ph-time mono">D1 · {fmt(RULER[0].start)}</span><i /></div>
      </div>
      {still && <Table />}
      {!still && <p className="sr">Full schedule: {schedule.map((d) => `${d.label}: ${d.slots.map((s) => `${s.time} ${s.name}`).join('; ')}`).join('. ')}</p>}
    </section>
  );
}
