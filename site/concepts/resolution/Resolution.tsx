import { Fragment, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { conference, wellness } from '@/data/conference';
import { useStill } from '@/shared/hooks';
import { SCROLL_FEEL } from '@/shared/scroll';

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Every clause states a fact from conference.ts, in the format of a draft resolution.
const water = wellness.items.map((i) => i.label.toLowerCase());
const preamble = [
  { lead: 'Recalling', rest: `that ${conference.name} is a ${conference.kind} conference held in ${conference.city},` },
  { lead: 'Noting with appreciation', rest: `that ${conference.host} is the host of ${conference.edition},` },
  { lead: 'Guided by', rest: `its motto, “${conference.motto}”,` },
  { lead: 'Bearing in mind', rest: 'that the dates and the venue are yet to be announced,' },
];
const operative = [
  { lead: 'Decides', rest: 'that the conference shall run over three days, with six committee sessions;' },
  { lead: 'Establishes', rest: 'nineteen committees, from the Indian Prime Minister’s Cabinet to the North Atlantic Treaty Organization, listed in Annex I;', note: { href: '#committees', ref: 'Annex I', label: 'Committees' } },
  { lead: 'Adopts', rest: 'the schedule for each of the three days, set out in Annex II;', note: { href: '#schedule', ref: 'Annex II', label: 'Schedule' } },
  { lead: 'Encourages', rest: `every delegate to take a quick reset between sessions: ${water[0]}, ${water[1]} and ${water[2]};`, note: { href: '#wellness', ref: 'Annex III', label: 'Quick reset' } },
  { lead: 'Requests', rest: 'that chits between delegations pass through the delegate portal and reach the Chair for approval before delivery;', note: { href: '#/portal', ref: 'Portal', label: 'Delegate portal' } },
  { lead: 'Decides', rest: 'to remain actively seized of the matter.' },
];

const Words = ({ text }: { text: string }) => (
  <>
    {text.split(' ').map((w, i) => (
      <Fragment key={i}>{i > 0 && ' '}<span className="w">{w}</span></Fragment>
    ))}
  </>
);

export function Resolution() {
  const root = useRef<HTMLElement>(null);
  const still = useStill();

  useGSAP(
    () => {
      if (still) return;
      const clauses = gsap.utils.toArray<HTMLElement>('[data-clause]');
      clauses.forEach((cl) => {
        const words = cl.querySelectorAll('.w');
        const no = cl.querySelector('.cl-no');
        const tl = gsap.timeline({
          scrollTrigger: { trigger: cl.querySelector('.cl-text'), start: 'top 96%', end: 'top 34%', scrub: SCROLL_FEEL.scrub },
        });
        if (no) tl.fromTo(no, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.25, ease: 'none' }, 0);
        // Each word goes from a pencil-faint ghost to full ink, in reading order.
        tl.fromTo(words, { opacity: 0.13 }, { opacity: 1, duration: 0.18, stagger: 0.05, ease: 'none' }, 0);
        const note = cl.querySelector('.cl-note');
        if (note) tl.fromTo(note, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3, ease: 'none' }, '>-0.2');
      });
      // Instrument Serif arrives after first layout; re-measure once it has.
      document.fonts?.ready.then(() => ScrollTrigger.refresh());
      gsap.fromTo(
        '.reading-rule i',
        { scaleY: 0 },
        { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.clauses', start: 'top 70%', end: 'bottom 40%', scrub: SCROLL_FEEL.scrub } },
      );
    },
    { scope: root, dependencies: [still] },
  );

  return (
    <section className="sec res" id="about" ref={root} aria-labelledby="about-h">
      <div className="wrap">
        <div className="rule" data-rule aria-hidden="true" />
        <div className="grid12 res-body" style={{ paddingTop: 18 }}>
          <h2 className="res-h" id="about-h">About the conference</h2>
          <p className="res-subject">{conference.edition},</p>

          <div className="clauses">
            <span className="reading-rule" aria-hidden="true"><i /></span>
            {preamble.map((c) => (
              <p className="clause cl-pre" key={c.lead} data-clause>
                <span className="cl-text"><em><Words text={c.lead} /></em> <Words text={c.rest} /></span>
              </p>
            ))}
            <div className="cl-break" aria-hidden="true"><div className="rule" /></div>
            <ol className="clause" style={{ display: 'contents' }}>
              {operative.map((c, i) => (
                <li className="clause cl-op" key={i} data-clause>
                  <span className="cl-no" aria-hidden="true">{i + 1}.</span>
                  <span className="cl-text"><em><Words text={c.lead} /></em> <Words text={c.rest} /></span>
                  {c.note && (
                    <span className="cl-note">
                      <a href={c.note.href}>
                        <span className="mono">See {c.note.ref}</span>
                        <span>{c.note.label}</span>
                      </a>
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
