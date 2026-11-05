// Live 08 · A magnetic Register button: inside a pull zone the button leans toward the pointer on a spring and its
// label leans a little further (two layers, like Motion Primitives' Magnetic and React Bits' Magnet). On hover the
// label rolls to a second line and the fill changes to another opaque token. Mouse and pen only: off on touch.
import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { Demo, FINE_POINTER, STILL, register, signIn } from './kit';

const SPRING = { stiffness: 220, damping: 18, mass: 0.6 };

export function Magnetic() {
  const zone = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLAnchorElement>(null);
  const mx = useMotionValue(0), my = useMotionValue(0);
  const x = useSpring(mx, SPRING), y = useSpring(my, SPRING);
  const lx = useTransform(x, (v) => v * 0.45), ly = useTransform(y, (v) => v * 0.45);
  const on = FINE_POINTER && !STILL;

  const move = (e: React.PointerEvent) => {
    if (!on || e.pointerType === 'touch') return;
    const r = btn.current!.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const reach = 140;
    const d = Math.hypot(dx, dy);
    const pull = d < reach ? 0.3 : 0;
    const cap = (v: number) => Math.max(-24, Math.min(24, v));
    mx.set(cap(dx * pull)); my.set(cap(dy * pull));
  };
  const leave = () => { mx.set(0); my.set(0); };

  return (
    <Demo id="demo-magnetic" n={8} likeLabel="Magnetic Register"
      title="Register pulls you in"
      caption="Bring the cursor near. The one action on the page leans toward you, then rolls its label."
      credit={[{ label: 'Motion Primitives Magnetic', url: 'https://motion-primitives.com/docs/magnetic' }, { label: 'React Bits Magnet', url: 'https://reactbits.dev/animations/magnet' }, { label: 'motion', url: 'https://motion.dev/' }]}>
      <div ref={zone} className="mag-zone" onPointerMove={move} onPointerLeave={leave}>
        <p className="mag-line"><em>Invites</em> delegates to DXB MUN 2027.</p>
        <div className="mag-row">
          <motion.a ref={btn} href={register} className="mag-btn" style={on ? { x, y } : undefined}>
            <motion.span className="mag-roll" style={on ? { x: lx, y: ly } : undefined}>
              <span className="mag-a">Register</span>
              <span className="mag-b" aria-hidden="true">Register ↗</span>
            </motion.span>
          </motion.a>
          <a href={signIn} className="mag-ghost">Sign in</a>
        </div>
        <p className="mag-note">{on ? 'Mouse or pen: the pull is on.' : 'Touch screen or reduced motion: the pull is off, the button stays put.'}</p>
      </div>
    </Demo>
  );
}
