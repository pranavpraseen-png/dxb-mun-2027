// CH 07, Contact: the sign-off. A full IHS-maroon colour block with the contact roll, then the slim footer.
import { ArrowUp } from 'lucide-react';
import { conference } from '@/data/conference';
import { getLenis } from '@/shared/scroll';
import { chOf } from './data';
import { DubaiClock, Tba, Wordmark } from './ui';
import { admin, chair, register } from './links';
import { Button } from '../../portal/ui/coss/button';

const rows: [string, string | null][] = [
  ['Email', conference.email],
  ['Instagram', conference.instagram],
  ['Venue', conference.venue],
  ['Dates', conference.dates],
];

export function SignOff() {
  return (
    <>
      <section id="contact" className="signoff" aria-labelledby="contact-title">
        <div className="signoff-in">
          <div className="signoff-head">
            <p className="signoff-ch">CH {chOf('contact')} · Sign-off</p>
            <h2 id="contact-title" className="signoff-title">Contact</h2>
            <p className="signoff-dek">Details go live here once confirmed.</p>
          </div>
          <dl className="roll">
            {rows.map(([k, v]) => (
              <div key={k} className="roll-row"><dt>{k}</dt><dd><Tba value={v} /></dd></div>
            ))}
            <div className="roll-row">
              <dt>Registration</dt>
              <dd><a className="roll-link" href={conference.registerUrl ?? register}>Delegate dashboard</a></dd>
            </div>
          </dl>
        </div>
        <p className="host-line"><i aria-hidden="true" /><span className="k">Hosted by</span> {conference.host}, {conference.city}</p>
      </section>
      <footer className="foot">
        <Wordmark />
        <p className="foot-m">{conference.motto}. © {conference.year} {conference.name}.</p>
        <DubaiClock />
        <nav className="foot-links" aria-label="Staff">
          <a href={chair}>Chair sign-in</a>
          <a href={admin}>Secretariat sign-in</a>
        </nav>
        <Button
          variant="outline"
          render={<a href="#home" />}
          onClick={(e) => { e.preventDefault(); const l = getLenis(); if (l) l.scrollTo(0, { duration: 1.4 }); else scrollTo({ top: 0 }); }}
        >
          <ArrowUp aria-hidden="true" /> Back to top
        </Button>
      </footer>
    </>
  );
}
