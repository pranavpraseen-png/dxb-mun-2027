import { useState } from 'react';
import { committees, conference, type Committee } from '@/data/conference';
import { pad2, useMedia } from './util';

function Placard({ c, i }: { c: Committee; i: number }) {
  return (
    <figure className="placard" aria-label={`Placard: ${c.name}`}>
      <div className="pl-card">
        <div className="pl-top mono">
          <span>No. {pad2(i + 1)} of {committees.length}</span>
          <span>Annex I</span>
        </div>
        <div key={c.abbr} className="pl-body">
          <p className="pl-abbr" style={{ '--len': Math.max(c.abbr.length, 2) } as React.CSSProperties}>{c.abbr}</p>
          <p className="pl-name">{c.name}</p>
        </div>
        <div className="pl-foot mono">
          <span>{conference.edition}</span>
          <span>{conference.city}</span>
        </div>
      </div>
      {/* the tent placard's legs and the table edge it stands on */}
      <svg className="pl-legs" viewBox="0 0 100 26" preserveAspectRatio="none" aria-hidden="true">
        <path d="M4 0 L1 22 M96 0 L99 22 M0 22 H100" />
      </svg>
    </figure>
  );
}

export function Committees() {
  const mobile = useMedia('(max-width: 899px)');
  const [active, setActive] = useState(0);

  return (
    <section className="sec" id="committees" aria-labelledby="committees-h">
      <div className="wrap">
        <div className="rule" data-rule aria-hidden="true" />
        <header className="grid12 annex-head">
          <p className="annex-no mono">Annex I</p>
          <h2 className="annex-title" id="committees-h">Committees</h2>
          <p className="annex-note">
            All {committees.length} committees, in conference order.{' '}
            {mobile ? 'Tap a code to see its placard.' : 'Hover or focus a row to see its placard.'}
          </p>
        </header>
        <div className="grid12 cmt-wrap">
          <ol className="cmt-list">
            {committees.map((c, i) => (
              <li className="cmt-row" key={c.abbr}>
                <button
                  type="button"
                  className="cmt-btn"
                  data-active={active === i ? '' : undefined}
                  aria-pressed={active === i}
                  aria-controls="cmt-placard"
                  aria-label={`${c.abbr}, ${c.name}`}
                  onMouseEnter={() => !mobile && setActive(i)}
                  onFocus={() => !mobile && setActive(i)}
                  onClick={() => setActive(i)}
                >
                  <span className="c-no" aria-hidden="true">{pad2(i + 1)}</span>
                  <span className="c-abbr">{c.abbr}</span>
                  <span className="c-name">{c.name}</span>
                </button>
              </li>
            ))}
          </ol>
          <div className="cmt-stage">
            <div className="cmt-sticky" id="cmt-placard" aria-live="polite">
              <Placard c={committees[active]} i={active} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
