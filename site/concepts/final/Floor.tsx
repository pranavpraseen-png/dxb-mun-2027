import { useRef } from 'react';
import { motion, useScroll, useSpring, useTransform } from 'motion/react';
import { committees } from '@/data/conference';
import { useStill } from '@/shared/hooks';
import { useMedia } from './ui';

/*
  The floor: all 19 committees as nameplates on rows of desks. As each row scrolls into view its
  nameplates are raised one after another, like a vote being called; scrolling back lowers them.
  Each nameplate is also an index button that calls that committee to the top of the deck.
*/
type PlateProps = { i: number; col: number; current: boolean; onPick: (i: number) => void };

function Plate({ i, current, onPick }: Omit<PlateProps, 'col'>) {
  const c = committees[i];
  // Lusion: a magnetic pull. Under a mouse the plate leans a few pixels towards the cursor on a spring.
  const mx = useSpring(0, { stiffness: 260, damping: 18 });
  const my = useSpring(0, { stiffness: 260, damping: 18 });
  const pull = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType !== 'mouse') return;
    const b = e.currentTarget.getBoundingClientRect();
    mx.set(((e.clientX - b.left) / b.width - 0.5) * 12);
    my.set(((e.clientY - b.top) / b.height - 0.5) * 8);
  };
  const release = () => { mx.set(0); my.set(0); };
  return (
    <motion.button
      type="button"
      style={{ x: mx, y: my, ['--len' as string]: Math.max(c.abbr.length, 3) }}
      onPointerMove={pull}
      onPointerLeave={release}
      className="plate"
      aria-pressed={current}
      aria-label={`${c.abbr}, ${c.name}`}
      onClick={() => onPick(i)}
    >
      <span className="plate__abbr" aria-hidden="true">{c.abbr}</span>
    </motion.button>
  );
}

function Raised({ i, col, current, onPick }: PlateProps) {
  const ref = useRef<HTMLLIElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'start 0.12'] });
  // Each row needs about 70% of a viewport of scroll to rise fully (owner: "scrolling is too fast").
  const lag = col * 0.04;
  const y = useTransform(scrollYProgress, [lag, 0.84 + lag], ['80%', '0%']);
  return (
    <li className="seat" ref={ref}>
      <motion.div className="seat__lift" style={{ y }}>
        <Plate i={i} current={current} onPick={onPick} />
      </motion.div>
    </li>
  );
}

export function Floor({ current, onPick }: { current: number; onPick: (i: number) => void }) {
  const still = useStill();
  const wide = useMedia('(min-width: 1024px)');
  const cols = wide ? 5 : 4; // must match .floor__grid columns in merged.css
  return (
    <div className="floor">
      <ul className="floor__grid" aria-label="All 19 committees. Choose one to bring it to the top of the deck.">
        {committees.map((c, i) =>
          still ? (
            <li key={c.abbr} className="seat">
              <div className="seat__lift"><Plate i={i} current={current === i} onPick={onPick} /></div>
            </li>
          ) : (
            <Raised key={c.abbr} i={i} col={i % cols} current={current === i} onPick={onPick} />
          ),
        )}
      </ul>
    </div>
  );
}
