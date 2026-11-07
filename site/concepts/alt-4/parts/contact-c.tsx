// NAME: Sign-off wordmark
// IDEA: Contact and resources as a few hard rows beside a live Dubai clock, then the page ends on a giant DXB MUN 27 wordmark cut off by the bottom of the screen.
// WHY: Peak–end rule: the last thing seen is the name, set huge and calm, so the page ends on identity; the local clock makes Dubai feel present and real.
// WILD: The wordmark is the floor again: the same lit bars from the hero, at rest, rippling once under your cursor as you reach the bottom.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import NumberFlow from '@number-flow/react';
import { conference, resources, tba } from '@/data/conference';
import { isStill } from '@/shared/hooks';
import { admin, chair, portal } from '../links';
import './contact-c.css';

const still = isStill();
const pad2 = (n: number) => String(n).padStart(2, '0');
const TZ = 'Asia/Dubai';
const CUT = 0.74; // how much of the letters' height shows above the page's end

/** Dubai wall-clock time from Intl, ticking on the second. */
function useDubaiTime() {
  const read = () => {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', weekday: 'long', day: 'numeric', month: 'long' }).formatToParts(new Date());
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
    return { h: Number(get('hour')), m: Number(get('minute')), s: Number(get('second')), day: `${get('weekday')} ${get('day')} ${get('month')}` };
  };
  const [t, setT] = useState(read);
  useEffect(() => {
    let id = 0;
    const loop = () => { setT(read()); id = window.setTimeout(loop, 1000 - (Date.now() % 1000) + 5); };
    id = window.setTimeout(loop, 1000 - (Date.now() % 1000) + 5);
    return () => clearTimeout(id);
  }, []);
  return t;
}

/** Set the wordmark so it spans its box exactly (measured at 100px, then scaled). */
function useSpan() {
  const ref = useRef<HTMLParagraphElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el?.parentElement) return;
    const box = el.parentElement;
    const fit = () => {
      const cs = getComputedStyle(box);
      const avail = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      el.style.fontSize = '100px';
      const w = el.scrollWidth || 1;
      const size = (100 * avail) / w;
      el.style.fontSize = size + 'px';
      // Put the cap tops on the box's top edge and end the page through the letters, from the font's real metrics.
      const c = document.createElement('canvas').getContext('2d');
      let capTop = size * 0.12, cap = size * 0.7;
      if (c) {
        c.font = `900 ${size}px "Archivo Variable"`;
        try { (c as CanvasRenderingContext2D & { fontStretch: string }).fontStretch = 'condensed'; } catch { /* older engines */ }
        const m = c.measureText('DXB MUN 27');
        const lh = parseFloat(getComputedStyle(el).lineHeight) || size * 0.8;
        const baseline = (lh - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent;
        cap = m.actualBoundingBoxAscent;
        capTop = baseline - cap;
      }
      el.style.top = -capTop + 'px';
      box.style.height = Math.round(cap * CUT) + 'px'; // the page ends here, through the letters
    };
    fit();
    document.fonts?.ready.then(fit);
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => ro.disconnect();
  }, []);
  return ref;
}

const two = { minimumIntegerDigits: 2 } as const;

export function ContactC({ id = 'contact' }: { id?: string }) {
  const resId = id === 'contact' ? 'resources' : id + '-resources';
  const t = useDubaiTime();
  const word = useSpan();

  const rows: [string, ReactNode, boolean?][] = [
    ['Email', conference.email ? <a href={'mailto:' + conference.email}>{conference.email}</a> : tba(conference.email), !conference.email],
    ['Instagram', conference.instagram ? <a href={'https://instagram.com/' + conference.instagram.replace(/^@/, '')}>{conference.instagram}</a> : tba(conference.instagram), !conference.instagram],
    ['Host', <><span className="conc-seal" aria-hidden="true">IHS</span>{conference.host}</>],
    ['City', conference.city],
  ];

  return (
    <section id={id} className="conc" aria-labelledby={id + '-h'}>
      <div className="conc-wrap">
        <header className="conc-head">
          <p className="conc-label"><span>06–07</span>Resources · Contact</p>
          <h2 className="conc-h" id={id + '-h'}>Contact.</h2>
        </header>

        <div className="conc-rows">
          <dl className="conc-dl">
            {rows.map(([k, v, pending]) => (
              <div key={k} className="conc-row">
                <dt>{k}</dt>
                <dd className={pending ? 'is-pending' : undefined}>{v}</dd>
              </div>
            ))}
          </dl>
          <div className="conc-res" id={resId} aria-labelledby={resId + '-h'}>
            <h3 className="conc-res-h" id={resId + '-h'}>Resources</h3>
            <dl className="conc-dl">
            {resources.map((r, i) => (
              <div key={r.title} className="conc-row conc-row--res">
                <dt className="conc-rn">{pad2(i + 1)}</dt>
                <dd><b>{r.title}</b><span>{r.blurb}</span></dd>
                <dd className="conc-rs">{r.href ? <a href={r.href}>Open</a> : tba(r.href)}</dd>
              </div>
            ))}
            </dl>
          </div>
        </div>

        <div className="conc-clock" role="timer" aria-label={`Time in Dubai: ${pad2(t.h)}:${pad2(t.m)}`}>
          <p className="conc-clock-k">Now in {conference.city}</p>
          <p className="conc-time" aria-hidden="true">
            {/* each pair is clipped to its line, so a rolling digit never shows its neighbours */}
            <span className="conc-d"><NumberFlow value={t.h} format={two} animated={!still} /></span>
            <span className="conc-colon">:</span>
            <span className="conc-d"><NumberFlow value={t.m} format={two} animated={!still} /></span>
            <span className="conc-colon">:</span>
            <span className="conc-d conc-sec"><NumberFlow value={t.s} format={two} animated={!still} /></span>
          </p>
          <p className="conc-clock-d">{t.day} · Gulf Standard Time, UTC+4</p>
        </div>
      </div>

      <footer className="conc-foot">
        <div className="conc-foot-in">
          <span>© {conference.edition} · {conference.kind} · Hosted by {conference.host}</span>
          <nav aria-label="Staff">
            <a href={portal}>Portal</a>
            <a href={chair}>Chair</a>
            <a href={admin}>Admin</a>
          </nav>
        </div>
        <div className="conc-mark" aria-hidden="true">
          <p className="conc-word" ref={word}>DXB MUN <span>27</span></p>
        </div>
      </footer>
    </section>
  );
}
