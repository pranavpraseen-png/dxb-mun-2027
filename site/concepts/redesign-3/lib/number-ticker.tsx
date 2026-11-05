// From Magic UI (https://magicui.design/docs/components/number-ticker), source:
// github.com/magicuidesign/magicui apps/www/registry/magicui/number-ticker.tsx (MIT). See ../LIBRARY.md.
// Changes: `cn` from the coss utils; the colour classes were dropped (the parent sets the colour); `useGrouping` and a
// `start` gate were added so the tracker can hold the readout until the globe locks; `still` renders the final value.
import { useEffect, useRef, type ComponentPropsWithoutRef } from 'react';
import { useInView, useMotionValue, useSpring } from 'motion/react';
import { cn } from '../../../portal/ui/coss/utils';

interface NumberTickerProps extends ComponentPropsWithoutRef<'span'> {
  value: number;
  startValue?: number;
  direction?: 'up' | 'down';
  delay?: number;
  decimalPlaces?: number;
  useGrouping?: boolean;
  /** Extra gate on top of "in view": the count starts only when this is true. */
  start?: boolean;
  still?: boolean;
}

export function NumberTicker({
  value,
  startValue = 0,
  direction = 'up',
  delay = 0,
  className,
  decimalPlaces = 0,
  useGrouping = false,
  start = true,
  still = false,
  ...props
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(direction === 'down' ? value : startValue);
  const springValue = useSpring(motionValue, {
    damping: 60,
    stiffness: 100,
  });
  const isInView = useInView(ref, { once: true, margin: '0px' });
  const fmt = (n: number) =>
    Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
      useGrouping,
    }).format(Number(n.toFixed(decimalPlaces)));

  useEffect(() => {
    if (still) return;
    let timer: ReturnType<typeof setTimeout> | null = null;

    if (isInView && start) {
      timer = setTimeout(() => {
        motionValue.set(direction === 'down' ? startValue : value);
      }, delay * 1000);
    }

    return () => {
      if (timer !== null) {
        clearTimeout(timer);
      }
    };
  }, [motionValue, isInView, delay, value, direction, startValue, start, still]);

  useEffect(
    () =>
      springValue.on('change', (latest) => {
        if (ref.current) ref.current.textContent = fmt(latest);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [springValue, decimalPlaces],
  );

  return (
    <span ref={ref} className={cn('inline-block tabular-nums', className)} {...props}>
      {fmt(still ? value : direction === 'down' ? value : startValue)}
    </span>
  );
}
