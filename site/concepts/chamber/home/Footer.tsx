import { conference, tba } from '@/data/conference';
import { scrollToY } from '../motion';

export function Footer() {
  const contact = [
    { k: 'Email', v: conference.email },
    { k: 'Instagram', v: conference.instagram },
    { k: 'Registration', v: conference.registerUrl },
    { k: 'Venue', v: conference.venue },
  ];
  return (
    <footer id="contact" className="foot" aria-labelledby="foot-h">
      <div className="wrap">
        <div className="foot-grid">
          <h2 id="foot-h" className="foot-h">Contact</h2>
          <dl className="foot-dl">
            {contact.map((c) => (
              <div key={c.k}>
                <dt>{c.k}</dt>
                <dd>
                  {c.v && c.k === 'Registration' ? <a href={c.v}>Register</a> : c.v && c.k === 'Email' ? <a href={'mailto:' + c.v}>{c.v}</a> : tba(c.v)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="foot-word" aria-hidden="true">
          <span className="fw-a">DXB</span>
          <span className="fw-b">MUN</span>
        </p>
        <div className="foot-row">
          <span>© {conference.year} {conference.name}. {conference.motto}.</span>
          <a href="#home" className="foot-top" onClick={(e) => { e.preventDefault(); scrollToY(0); }}>Back to top</a>
        </div>
      </div>
    </footer>
  );
}
