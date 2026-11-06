// The vote board, docked at the bottom of the screen: it is the scroll indicator.
// FOR = share of the floor read, AGAINST = share still ahead, ABSTAIN = motions jumped past without stopping.
import NumberFlow from '@number-flow/react';
import { isStill } from '@/shared/hooks';
import { MOTIONS, cellFills, jumpTo, useFloor } from './floor';

const still = isStill();

export function Tally() {
  const f = useFloor();
  const m = MOTIONS[f.active];
  const result = f.forPct >= 99 ? 'Adopted' : f.forPct > 50 ? 'Carried' : 'In debate';
  return (
    <aside className="tally" aria-label="Vote board: where you are on the page">
      <div className="t-now">
        <span className="t-m">M{m.n}</span>
        <span className="t-name">{m.label}</span>
        <span className="t-motion">{m.motion}</span>
      </div>
      <ol className="t-cells">
        {MOTIONS.slice(1).map((x, k) => {
          const i = k + 1;
          return (
            <li key={x.id}>
              <button
                type="button"
                className={'t-cell' + (i === f.active ? ' is-now' : '') + (f.skipped[i] ? ' is-abs' : '')}
                onClick={() => jumpTo(x.id)}
                aria-label={`Motion ${x.n}: ${x.label}`}
                aria-current={i === f.active ? 'true' : undefined}
              >
                <em className="t-bar"><i ref={(el) => { cellFills[i] = el; }} /></em>
                <span>{x.n}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="t-votes" aria-live="off">
        <span className="t-v t-for"><small>For</small><NumberFlow value={f.forPct} animated={!still} /></span>
        <span className="t-v t-against"><small>Against</small><NumberFlow value={100 - f.forPct} animated={!still} /></span>
        <span className="t-v t-abs"><small>Abstain</small><NumberFlow value={f.abstain} animated={!still} /></span>
        <span className="t-result">{result}</span>
      </div>
    </aside>
  );
}
