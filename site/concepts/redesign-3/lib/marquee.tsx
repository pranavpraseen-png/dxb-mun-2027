// From Magic UI (https://magicui.design/docs/components/marquee), source:
// github.com/magicuidesign/magicui apps/www/registry/magicui/marquee.tsx (MIT). See ../LIBRARY.md.
// Changes: `cn` comes from the coss utils; the `animate-marquee` keyframes live in onair.css (Magic UI ships them as
// Tailwind theme tokens); `aria-hidden` on the repeated copies so a screen reader hears the ticker once.
import { type ComponentPropsWithoutRef } from 'react';
import { cn } from '../../../portal/ui/coss/utils';

interface MarqueeProps extends ComponentPropsWithoutRef<'div'> {
  /** Optional CSS class name to apply custom styles */
  className?: string;
  /** Whether to reverse the animation direction */
  reverse?: boolean;
  /** Whether to pause the animation on hover */
  pauseOnHover?: boolean;
  /** Content to be displayed in the marquee */
  children: React.ReactNode;
  /** Whether to animate vertically instead of horizontally */
  vertical?: boolean;
  /** Number of times to repeat the content */
  repeat?: number;
}

export function Marquee({
  className,
  reverse = false,
  pauseOnHover = false,
  children,
  vertical = false,
  repeat = 4,
  ...props
}: MarqueeProps) {
  return (
    <div
      {...props}
      className={cn(
        'group flex gap-(--gap) overflow-hidden p-2 [--duration:40s] [--gap:1rem]',
        {
          'flex-row': !vertical,
          'flex-col': vertical,
        },
        className,
      )}
    >
      {Array(repeat)
        .fill(0)
        .map((_, i) => (
          <div
            key={i}
            aria-hidden={i > 0 || undefined}
            className={cn('flex shrink-0 justify-around gap-(--gap)', {
              'animate-marquee flex-row': !vertical,
              'animate-marquee-vertical flex-col': vertical,
              'group-hover:[animation-play-state:paused]': pauseOnHover,
              '[animation-direction:reverse]': reverse,
            })}
          >
            {children}
          </div>
        ))}
    </div>
  );
}
