// From Animate UI (https://animate-ui.com/docs/primitives/effects/magnetic), source:
// github.com/imskyleen/animate-ui apps/v1/apps/www/registry/primitives/effects/magnetic/index.tsx (MIT). See ../LIBRARY.md.
// Changes: the `asChild` Slot path was removed (we always wrap in a motion.div), and `disabled` was added for still mode.
import * as React from 'react';
import { motion, useMotionValue, useSpring, type SpringOptions, type HTMLMotionProps } from 'motion/react';

type MagneticProps = {
  children?: React.ReactNode;
  strength?: number;
  range?: number;
  springOptions?: SpringOptions;
  onlyOnHover?: boolean;
  disableOnTouch?: boolean;
  disabled?: boolean;
} & HTMLMotionProps<'div'>;

function Magnetic({
  strength = 0.5,
  range = 120,
  springOptions = { stiffness: 100, damping: 10, mass: 0.5 },
  onlyOnHover = false,
  disableOnTouch = true,
  disabled = false,
  style,
  onMouseEnter,
  onMouseLeave,
  onMouseMove,
  ...props
}: MagneticProps) {
  const localRef = React.useRef<HTMLDivElement>(null);

  const isTouchDevice = React.useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(pointer:coarse)').matches;
  }, []);

  const [active, setActive] = React.useState(!onlyOnHover);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, springOptions);
  const y = useSpring(rawY, springOptions);

  const compute = React.useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      if (!localRef.current) return;
      const { left, top, width, height } = localRef.current.getBoundingClientRect();
      const cx = left + width / 2;
      const cy = top + height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);

      if ((active || !onlyOnHover) && dist <= range) {
        const factor = (1 - dist / range) * strength;
        rawX.set(dx * factor);
        rawY.set(dy * factor);
      } else {
        rawX.set(0);
        rawY.set(0);
      }
    },
    [active, onlyOnHover, range, strength, rawX, rawY],
  );

  React.useEffect(() => {
    if (disabled || (disableOnTouch && isTouchDevice)) return;
    const handle = (e: MouseEvent) => compute(e);
    window.addEventListener('mousemove', handle);
    return () => window.removeEventListener('mousemove', handle);
  }, [compute, disableOnTouch, isTouchDevice, disabled]);

  return (
    <motion.div
      ref={localRef}
      style={{ display: 'inline-block', ...style, x, y }}
      onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
        if (onlyOnHover) setActive(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
        if (onlyOnHover) setActive(false);
        rawX.set(0);
        rawY.set(0);
        onMouseLeave?.(e);
      }}
      onMouseMove={(e: React.MouseEvent<HTMLDivElement>) => {
        if (onlyOnHover) compute(e);
        onMouseMove?.(e);
      }}
      {...props}
    />
  );
}

export { Magnetic, type MagneticProps };
