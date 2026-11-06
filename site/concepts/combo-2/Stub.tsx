// Siena's cinema-ticket stub: a perforated pass with punch notches. One component, three sizes:
// the nav's Register button, the phone menu's Register, and the delegate pass in section 6.
import { conference } from '@/data/conference';
import { SECTION_LABEL, navNo, type SectionId } from './data';
import { register } from './links';

/** The nav stub: its left half names the section in view (it rolls when the section changes). */
export function NavStub({ current, className }: { current: SectionId; className?: string }) {
  return (
    <a className={'stub ' + (className ?? '')} href={register} aria-label={`Register for ${conference.edition}`}>
      <span className="stub-main" aria-hidden="true">
        <span className="stub-k">{conference.edition}</span>
        <span className="stub-roll">
          <span key={current} className="stub-now">{navNo(current)} · {SECTION_LABEL[current]}</span>
        </span>
      </span>
      <span className="stub-perf" aria-hidden="true" />
      <span className="stub-cta">Register <span aria-hidden="true">→</span></span>
    </a>
  );
}
