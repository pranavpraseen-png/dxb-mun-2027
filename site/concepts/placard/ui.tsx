import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { brand } from '@/shared/brand';
import { scrollToSection } from '@/shared/scroll';

/* Height of the fixed top nav; anchor jumps land below it. */
export const NAV_H = 72;
/* In-page links go through the shared smooth scroll so every jump has the same weight. */
export const jumpTo = (id: string) => (e: { preventDefault: () => void }) => {
  e.preventDefault();
  scrollToSection(id, NAV_H);
};

/* Still mode (?still or OS reduced motion) is read once in App and shared here. */
export const StillCtx = createContext(false);
export const useStillCtx = () => useContext(StillCtx);


export function Wordmark({ className }: { className?: string }) {
  if (brand.logoSrc) return <img className={className} src={brand.logoSrc} alt={brand.logoAlt} height={32} />;
  return (
    <span className={'wordmark ' + (className ?? '')}>
      {brand.wordmark}
    </span>
  );
}

export function useMedia(query: string) {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatch(m.matches);
    on();
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [query]);
  return match;
}

/* Section headings rise out from behind an edge, like a placard being lifted. Headings only. */
export function Raise({ children, className, as = 'h2', id }: { children: ReactNode; className?: string; as?: 'h2' | 'h3'; id?: string }) {
  const still = useStillCtx();
  const Tag = as;
  return (
    <div className="raise">
      <motion.div
        initial={still ? false : { y: '105%' }}
        whileInView={{ y: '0%' }}
        viewport={{ once: true, margin: '0px 0px -12% 0px' }}
        transition={{ duration: 0.68, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <Tag className={className} id={id}>
          {children}
        </Tag>
      </motion.div>
    </div>
  );
}
