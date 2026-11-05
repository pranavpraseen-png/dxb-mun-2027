// From Animate UI (https://animate-ui.com/docs/primitives/texts/rolling, MIT, imskyleen/animate-ui
// apps/v1/apps/www/registry/primitives/texts/rolling). Changed: its `useIsInView` hook is replaced by a `play` prop
// (the camera stop decides when it rolls), and `replay` re-runs it. See LIBRARY.md.
import * as React from 'react';
import { motion, type Transition } from 'motion/react';

const formatCharacter = (char: string) => (char === ' ' ? ' ' : char);

const CHAR_STYLE: React.CSSProperties = {
  position: 'absolute',
  display: 'inline-block',
  backfaceVisibility: 'hidden',
};

type RollingTextProps = Omit<React.ComponentProps<'span'>, 'children'> & {
  text: string;
  transition?: Transition;
  delay?: number;
  play?: boolean;
};

function RollingText({
  text,
  play = true,
  transition = { duration: 0.5, delay: 0.1, ease: 'easeOut' },
  delay = 0,
  ...props
}: RollingTextProps) {
  const parts = React.useMemo(() => text.split(/(\s+)/), [text]);
  const stepDelay = transition?.delay ?? 0;

  let charIdx = 0;

  return (
    <span data-slot="rolling-text" {...props}>
      {parts.map((part, wi) => {
        if (/^\s+$/.test(part)) {
          return <span key={`space-${wi}`}>{part}</span>;
        }

        const chars = Array.from(part);
        return (
          <span key={`word-${wi}`} style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
            {chars.map((char, ci) => {
              const thisIdx = charIdx++;
              const charDelay = delay / 1000 + thisIdx * stepDelay;
              return (
                <span
                  key={`c-${wi}-${ci}`}
                  style={{
                    position: 'relative',
                    display: 'inline-block',
                    perspective: '9999999px',
                    transformStyle: 'preserve-3d',
                    width: 'auto',
                  }}
                  aria-hidden="true"
                >
                  <motion.span
                    style={{ ...CHAR_STYLE, transformOrigin: '50% 25%' }}
                    initial={{ rotateX: 0 }}
                    animate={play ? { rotateX: 90 } : { rotateX: 0 }}
                    transition={{ ...transition, delay: charDelay }}
                  >
                    {formatCharacter(char)}
                  </motion.span>
                  <motion.span
                    style={{ ...CHAR_STYLE, transformOrigin: '50% 100%' }}
                    initial={{ rotateX: 90 }}
                    animate={play ? { rotateX: 0 } : { rotateX: 90 }}
                    transition={{ ...transition, delay: charDelay + 0.3 }}
                  >
                    {formatCharacter(char)}
                  </motion.span>
                  <span style={{ visibility: 'hidden' }}>{formatCharacter(char)}</span>
                </span>
              );
            })}
          </span>
        );
      })}

      <span className="sr-only">{text}</span>
    </span>
  );
}

export { RollingText, type RollingTextProps };
