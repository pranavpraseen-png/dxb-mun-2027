import { useEffect, useRef, useState } from 'react';
import NumberFlow from '@number-flow/react';
import { conference, stats, tba } from '@/data/conference';
import { ArchFrame, Star } from './ornament';

export function About({ still }: { still: boolean }) {
  const ref = useRef<HTMLDListElement>(null);
  const [shown, setShown] = useState(still);
  useEffect(() => {
    if (still || !ref.current) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.6 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [still]);

  const particulars: { k: string; v: React.ReactNode; tbaVal?: boolean }[] = [
    { k: 'Host', v: conference.host },
    { k: 'City', v: <>{conference.city} <span className="ar-inline" lang="ar" dir="rtl">دبي</span></> },
    { k: 'Dates', v: tba(conference.dates), tbaVal: !conference.dates },
    { k: 'Venue', v: tba(conference.venue), tbaVal: !conference.venue },
    {
      k: 'Registration',
      v: conference.registerUrl ? <a href={conference.registerUrl}>Register</a> : tba(conference.registerUrl),
      tbaVal: !conference.registerUrl,
    },
  ];

  return (
    <section id="about" className="about" aria-labelledby="about-h">
      <div className="wrap about-grid">
        <div className="about-text">
          <h2 id="about-h" className="about-motto">{conference.motto}</h2>
          <p className="about-p">
            {conference.edition} is a {conference.kind} conference in {conference.city}, hosted by {conference.host}.
            Nineteen committees meet over three days, from the opening ceremony to the closing one.
          </p>
          <dl ref={ref} className="frieze">
            {stats.map((s, i) => (
              <div key={s.label} className="frieze-item">
                <dt className="frieze-l">{i > 0 && <Star size={14} className="orn frieze-orn" />}{s.label}</dt>
                <dd className="frieze-v">
                  {s.value === 2027
                    ? <NumberFlow value={s.value} animated={false} format={{ useGrouping: false }} />
                    : <NumberFlow value={shown ? s.value : 0} animated={!still} transformTiming={{ duration: 1400, easing: 'cubic-bezier(.2,.7,.2,1)' }} />}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <aside className="invite" aria-labelledby="invite-h">
          <ArchFrame className="invite-arch" fill lines={3} gap={7} crown={0.56} />
          <div className="invite-body">
            <Star size={22} className="orn invite-star" />
            <h3 id="invite-h" className="invite-h">The particulars</h3>
            <dl className="invite-list">
              {particulars.map((p) => (
                <div key={p.k} className="invite-row">
                  <dt>{p.k}</dt>
                  <dd className={p.tbaVal ? 'is-tba' : undefined}>{p.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </aside>
      </div>

    </section>
  );
}
