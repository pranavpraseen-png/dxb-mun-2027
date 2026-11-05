// Section 8: the footer. "DXB MUN 2027" edge to edge (Outfit), the host line, and the IHS maroon strip with
// its gold rule as the host accent.
import { conference } from '@/data/conference';
import { admin, chair, signIn } from './links';
import { COORDS } from './data';
import { FitWord, go } from './ui';

export function Footer() {
  return (
    <footer className="foot">
      <div className="foot-top">
        <p className="foot-motto"><em>{conference.motto}.</em></p>
        <button type="button" className="mono foot-up" onClick={() => go('top')}>Back to top <span aria-hidden="true">↑</span></button>
      </div>
      <FitWord className="foot-word" as="div">{conference.edition}</FitWord>
      <div className="foot-row">
        <span className="mono">{conference.kind} · {conference.city}</span>
        <span className="mono">{COORDS}</span>
        <span className="mono">© {conference.year} {conference.name}</span>
      </div>
      <div className="host">
        <div className="host-in">
          <p className="host-l"><span className="mono host-k">Hosted by</span> <span className="host-n">{conference.host}</span></p>
          <nav className="host-links mono" aria-label="Sign in">
            <a href={signIn}>Delegate sign-in</a>
            <a href={chair}>Chair sign-in</a>
            <a href={admin}>Secretariat sign-in</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
