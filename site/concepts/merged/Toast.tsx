import { AnimatePresence, motion } from 'motion/react';
import { useStill } from '@/shared/hooks';

/* ================================================================ toast (lower-third) */
export function Toast({ message }: { message: string | null }) {
  const still = useStill();
  return (
    <div className="toast-host" role="status" aria-live="polite">
      <AnimatePresence>
        {message && (
          <motion.div
            key={message}
            className="toast"
            initial={still ? false : { x: '-110%' }}
            animate={{ x: 0, transition: { duration: 0.32, ease: [0.2, 0.9, 0.2, 1] } }}
            exit={still ? undefined : { x: '-110%', transition: { duration: 0.2 } }}
          >
            <span className="toast-k">Update</span>
            <span className="toast-v">{message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
