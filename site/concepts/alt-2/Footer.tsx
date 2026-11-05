import { conference } from '@/data/conference';
import { FitWord } from './FitWord';
import { admin, chair, signIn } from './links';

/* 8 · Footer (BLUEPRINT 3.8): the IHS maroon host strip, then "DXB MUN 2027" edge to edge. */
export function Footer() {
  return (
    <footer className="foot">
      <div className="host-strip">
        <span className="k">Hosted by</span>
        <b>{conference.host}</b>
        <span className="k">{conference.city}</span>
      </div>
      <div className="foot-word" aria-hidden="true"><FitWord text={conference.edition} /></div>
      <div className="foot-row k">
        <span>{conference.kind} · {conference.motto}</span>
        <nav aria-label="Dashboards" className="foot-links">
          <a href={signIn}>Sign in</a>
          <a href={chair}>Chair</a>
          <a href={admin}>Secretariat</a>
        </nav>
      </div>
    </footer>
  );
}
