import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { animate, motion, useMotionValue, useTransform, type PanInfo } from 'motion/react';
import NumberFlow from '@number-flow/react';
import { ArrowLeft, ArrowRight, Shuffle } from 'lucide-react';
import { committees, conference } from '@/data/conference';
import { useMedia, useStillCtx } from './ui';

/* Each depth in the pile has its own hand-placed offset, so the stack reads as a fanned pile, not a smear. */
const FAN = [
  { x: 0, y: 0, r: 0 },
  { x: -12, y: 12, r: -2.5 },
  { x: 14, y: 22, r: 2 },
  { x: -6, y: 30, r: -4 },
  { x: 0, y: 36, r: 0 },
];

const VISIBLE = 5; // cards rendered in the stack; the rest wait offstage
const pad2 = { minimumIntegerDigits: 2 } as const;

type Throw = { n: number; dir: 1 | -1 };
type Enter = { id: number; n: number; from: 'left' | 'below' };

/* One placard. The outer layer settles into its place in the stack; the inner layer is what you grab. */
function Card({
  i, depth, still, freeDrag, throwReq, enter, onThrown, onGrab,
}: {
  i: number; depth: number; still: boolean; freeDrag: boolean;
  throwReq: Throw | null; enter: Enter | null; onThrown: () => void; onGrab: (on: boolean) => void;
}) {
  const c = committees[i];
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-360, 0, 360], [-20, 0, 20]);
  const isTop = depth === 0;
  const flying = useRef(false);

  const fly = (vx: number, vy: number) => {
    if (flying.current) return;
    flying.current = true;
    const mag = Math.hypot(vx, vy) || 1;
    const dist = Math.max(window.innerWidth * 0.9, 900);
    const ease = [0.25, 0.1, 0.4, 1] as const;
    animate(y, (vy / mag) * dist * 0.5 - 60, { duration: 0.42, ease });
    animate(x, (vx / mag) * dist, { duration: 0.42, ease }).then(() => {
      flying.current = false;
      onThrown();
    });
  };

  // Buttons and arrow keys throw the top card the same way a flick does.
  const lastThrow = useRef(0);
  useEffect(() => {
    if (!isTop || !throwReq || throwReq.n === lastThrow.current) return;
    lastThrow.current = throwReq.n;
    fly(throwReq.dir * 1400, -260);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [throwReq, isTop]);

  // A card brought back to the top flies in instead of popping in.
  useLayoutEffect(() => {
    if (!enter || enter.id !== i || still) return;
    if (enter.from === 'left') { x.set(-Math.max(window.innerWidth * 0.7, 600)); y.set(-120); }
    else { y.set(520); }
    const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;
    animate(x, 0, spring);
    animate(y, 0, spring);
  }, [enter, i, still, x, y]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    onGrab(false);
    const { offset, velocity } = info;
    const far = Math.abs(offset.x) > 130 || Math.abs(offset.y) > 170;
    const fast = Math.hypot(velocity.x, velocity.y) > 650;
    if (far || fast) {
      const vx = Math.abs(velocity.x) > 200 ? velocity.x : offset.x;
      const vy = Math.abs(velocity.y) > 200 ? velocity.y : offset.y;
      fly(vx, freeDrag ? vy : -Math.abs(vx) * 0.15);
    } else {
      // Not thrown hard enough: spring back onto the stack.
      const spring = { type: 'spring', stiffness: 520, damping: 22, velocity: 0 } as const;
      animate(x, 0, { ...spring, velocity: velocity.x });
      animate(y, 0, { ...spring, velocity: velocity.y });
    }
  };

  const len = Math.max(c.abbr.length, 2);
  return (
    <motion.div
      className="deck__slot"
      style={{ zIndex: 50 - depth }}
      initial={false}
      animate={{
        x: FAN[depth].x,
        y: FAN[depth].y,
        scale: 1 - depth * 0.035,
        rotate: FAN[depth].r,
        opacity: depth >= VISIBLE - 1 ? 0 : 1,
      }}
      transition={still ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 26 }}
      aria-hidden={!isTop}
    >
      <motion.div
        className={`placard placard--deck`}
        style={{ x, y, rotate, ['--len' as string]: len }}
        drag={isTop && !still ? (freeDrag ? true : 'x') : false}
        dragMomentum={false}
        whileDrag={{ scale: 1.04 }}
        onDragStart={() => onGrab(true)}
        onDragEnd={onDragEnd}
      >
        <span className="placard__no">
          Committee {String(i + 1).padStart(2, '0')} of {committees.length}
        </span>
        <span className="placard__abbr">{c.abbr}</span>
        <span className="placard__name">{c.name}</span>
        <span className="placard__fold" aria-hidden="true">
          {conference.edition}
        </span>
      </motion.div>
    </motion.div>
  );
}

export function Deck({ jump, onTop }: { jump: { i: number; n: number } | null; onTop: (i: number) => void }) {
  const still = useStillCtx();
  const freeDrag = useMedia('(pointer: fine)');
  const [order, setOrder] = useState(() => committees.map((_, i) => i));
  const [throwReq, setThrowReq] = useState<Throw | null>(null);
  const [enter, setEnter] = useState<Enter | null>(null);
  const [grabbing, setGrabbing] = useState(false);
  const busy = useRef(false);
  const top = order[0];

  const sendTopToBack = () => {
    busy.current = false;
    // Clear one-shot requests in the same batch, so the next top card doesn't inherit them.
    setThrowReq(null);
    setEnter(null);
    setOrder((o) => [...o.slice(1), o[0]]);
  };
  const next = () => {
    if (still) return setOrder((o) => [...o.slice(1), o[0]]);
    if (busy.current) return;
    busy.current = true;
    setThrowReq({ n: Date.now(), dir: 1 });
  };
  const prev = () => {
    if (busy.current) return;
    const back = order[order.length - 1];
    setEnter({ id: back, n: Date.now(), from: 'left' });
    setOrder((o) => [o[o.length - 1], ...o.slice(0, -1)]);
  };
  const bringToTop = (k: number) => {
    if (busy.current || k === order[0]) return;
    if (!still) setEnter({ id: k, n: Date.now(), from: 'below' });
    setOrder((o) => {
      const at = o.indexOf(k);
      return [...o.slice(at), ...o.slice(0, at)];
    });
  };
  const shuffle = () => {
    let k = top;
    while (k === top) k = Math.floor(Math.random() * committees.length);
    bringToTop(k);
  };
  // The floor index below can call any committee to the top of the deck.
  const lastJump = useRef(0);
  useEffect(() => {
    if (!jump || jump.n === lastJump.current) return;
    lastJump.current = jump.n;
    bringToTop(jump.i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jump]);
  useEffect(() => { onTop(top); }, [top, onTop]);
  // Safety: never let a lost animation lock the controls.
  useEffect(() => {
    if (!throwReq) return;
    const t = setTimeout(() => { busy.current = false; }, 900);
    return () => clearTimeout(t);
  }, [throwReq]);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); next(); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); prev(); }
  };

  const current = committees[top];
  return (
    <div className="deck">
      <div
        className={'deck__stage' + (grabbing ? ' is-grabbing' : '') + (still ? '' : ' is-live')}
        tabIndex={0}
        role="group"
        aria-roledescription="placard deck"
        aria-label="Committee placards. Use the arrow keys to flip through."
        onKeyDown={onKey}
      >
        {order.slice(0, VISIBLE).map((i, depth) => (
          <Card
            key={committees[i].abbr}
            i={i}
            depth={depth}
            still={still}
            freeDrag={freeDrag}
            throwReq={throwReq}
            enter={enter}
            onThrown={sendTopToBack}
            onGrab={setGrabbing}
          />
        )).reverse()}
      </div>
      <p className="sr-only" aria-live="polite">
        {current.abbr}, {current.name}. {top + 1} of {committees.length}.
      </p>
      <div className="deck__controls">
        <button type="button" className="round-btn" onClick={prev} aria-label="Previous committee">
          <ArrowLeft size={24} aria-hidden="true" />
        </button>
        <p className="deck__count" aria-hidden="true">
          <NumberFlow value={top + 1} format={pad2} animated={!still} />
          <span className="deck__of">/ {committees.length}</span>
        </p>
        <button type="button" className="round-btn" onClick={next} aria-label="Next committee">
          <ArrowRight size={24} aria-hidden="true" />
        </button>
        <button type="button" className="btn btn--ghost" onClick={shuffle}>
          <Shuffle size={18} aria-hidden="true" /> Shuffle
        </button>
      </div>
      <p className="deck__hint">{freeDrag ? 'Drag a placard aside for the next one.' : 'Swipe a placard aside for the next one.'} Arrow keys also work.</p>
    </div>
  );
}
