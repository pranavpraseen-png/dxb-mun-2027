// Live 03 · Resolution clauses: GSAP SplitText cuts each clause into lines inside hard clips (mask: "lines")
// and each line rises as it enters. Beside them, three NumberFlow counters are scrubbed by the same scroll.
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import NumberFlow from '@number-flow/react';
import { stats } from '@/data/conference';
import { Demo, STILL } from './kit';

gsap.registerPlugin(ScrollTrigger, SplitText);

const committees = stats[0].value; // 19
const days = stats[1].value; // 3
const sessions = stats[2].value; // 6

export function Clauses() {
  const list = useRef<HTMLOListElement>(null);
  const [p, setP] = useState(STILL ? 1 : 0);

  useEffect(() => {
    if (STILL || !list.current) return;
    const splits: SplitText[] = [];
    list.current.querySelectorAll<HTMLElement>('.clause-text').forEach((el) => {
      splits.push(SplitText.create(el, {
        type: 'lines', mask: 'lines', linesClass: 'cl-line', autoSplit: true,
        onSplit: (self) => gsap.from(self.lines, {
          yPercent: 108, duration: 0.9, ease: 'power4.out', stagger: 0.09,
          scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none reverse' },
        }),
      }));
    });
    const st = ScrollTrigger.create({
      trigger: list.current, start: 'top 80%', end: 'bottom 55%', scrub: true,
      onUpdate: (s) => setP(Math.round(s.progress * 100) / 100),
    });
    return () => { st.kill(); splits.forEach((s) => s.revert()); };
  }, []);

  const n = (v: number) => Math.round(v * Math.min(1, p * 1.15));

  return (
    <Demo id="demo-clauses" n={3} likeLabel="Clause line masks and counter"
      title="Clauses rise through line masks"
      caption="Every fact as a clause. Each line slides out of its own clip; the numbers roll with your scroll."
      credit={[{ label: 'GSAP SplitText', url: 'https://gsap.com/docs/v3/Plugins/SplitText/' }, { label: 'NumberFlow', url: 'https://number-flow.barvian.me/' }, { label: 'Codrops 2025', url: 'https://tympanus.net/codrops/2025/05/14/from-splittext-to-morphsvg-5-creative-demos-using-free-gsap-plugins/' }]}>
      <div className="clauses">
        <dl className="counters" aria-label="The conference in numbers">
          <div className="ctr ctr-big"><dt>Committees</dt><dd><NumberFlow value={n(committees)} animated={!STILL} /></dd></div>
          <div className="ctr"><dt>Days</dt><dd><NumberFlow value={n(days)} animated={!STILL} /></dd></div>
          <div className="ctr"><dt>Committee sessions</dt><dd><NumberFlow value={n(sessions)} animated={!STILL} /></dd></div>
        </dl>
        <div className="resolution">
          <p className="preamble">DXB MUN 2027,</p>
          <ol ref={list} className="clause-list">
            <li><span className="clause-no">1.</span><p className="clause-text"><em>Convenes</em> {committees} committees in Dubai,</p></li>
            <li><span className="clause-no">2.</span><p className="clause-text"><em>Meets</em> over {days} days and {sessions} committee sessions,</p></li>
            <li><span className="clause-no">3.</span><p className="clause-text"><em>Welcomes</em> every delegate to its host, Indian High School,</p></li>
            <li><span className="clause-no">4.</span><p className="clause-text"><em>Affirms</em> that diplomacy is around us.</p></li>
          </ol>
        </div>
      </div>
    </Demo>
  );
}
