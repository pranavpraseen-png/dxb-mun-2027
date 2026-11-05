// From Cult UI (https://www.cult-ui.com/docs/components/direction-aware-tabs), source:
// github.com/nolly-studio/cult-ui apps/www/registry/default/ui/direction-aware-tabs.tsx (MIT). See ../LIBRARY.md.
// Changes for DXB MUN:
// - `react-use-measure` is replaced by a ResizeObserver (same height animation, one dependency fewer).
// - The blur filter in the variants was dropped (the brief allows only transform/opacity/clip-path), and the travel is
//   in % so the panel never pokes past the viewport.
// - Square corners, our tokens; tabs get role="tab"/aria-selected, arrow-key roving and a two-line label.
// - `still` skips the slide.
import { useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { cn } from '../../../portal/ui/coss/utils';

type Tab = {
  id: number;
  label: ReactNode;
  sub?: ReactNode;
  content: ReactNode;
};

interface DirectionAwareTabsProps {
  tabs: Tab[];
  className?: string;
  listClassName?: string;
  label: string;
  still?: boolean;
  onChange?: (id: number) => void;
}

function useHeight() {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    setHeight(el.offsetHeight);
    return () => ro.disconnect();
  }, []);
  return [ref, height] as const;
}

function DirectionAwareTabs({ tabs, className, listClassName, label, still = false, onChange }: DirectionAwareTabsProps) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? 0);
  const [direction, setDirection] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [ref, height] = useHeight();
  const btns = useRef<(HTMLButtonElement | null)[]>([]);

  const content = useMemo(() => tabs.find((tab) => tab.id === activeTab)?.content || null, [activeTab, tabs]);

  const handleTabClick = (newTabId: number) => {
    if (newTabId !== activeTab && !isAnimating) {
      setDirection(newTabId > activeTab ? 1 : -1);
      setActiveTab(newTabId);
      onChange?.(newTabId);
    }
  };

  const onKey = (e: KeyboardEvent, i: number) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (i + d + tabs.length) % tabs.length;
    btns.current[n]?.focus();
    handleTabClick(tabs[n].id);
  };

  const variants = {
    initial: (direction: number) => ({ x: `${18 * direction}%`, opacity: 0 }),
    active: { x: '0%', opacity: 1 },
    exit: (direction: number) => ({ x: `${-18 * direction}%`, opacity: 0 }),
  };

  return (
    <div className={cn('flex w-full flex-col', className)}>
      <div role="tablist" aria-label={label} className={cn('flex gap-1', listClassName)}>
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            ref={(el) => { btns.current[i] = el; }}
            role="tab"
            type="button"
            id={`dat-tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls="dat-panel"
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => handleTabClick(tab.id)}
            onKeyDown={(e) => onKey(e, i)}
            className="dat-tab"
            data-active={activeTab === tab.id || undefined}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            {activeTab === tab.id && (
              <motion.span
                layoutId={still ? undefined : 'dat-bubble'}
                className="dat-bubble"
                transition={{ type: 'spring', bounce: 0.19, duration: 0.4 }}
              />
            )}
            <span className="dat-label">{tab.label}</span>
            {tab.sub && <span className="dat-sub">{tab.sub}</span>}
          </button>
        ))}
      </div>
      <MotionConfig transition={{ duration: 0.4, type: 'spring', bounce: 0.15 }}>
        <motion.div
          id="dat-panel"
          role="tabpanel"
          aria-labelledby={`dat-tab-${activeTab}`}
          className="relative w-full overflow-hidden"
          initial={false}
          animate={still || !height ? undefined : { height }}
        >
          <div ref={ref}>
            <AnimatePresence custom={direction} mode="popLayout" initial={false} onExitComplete={() => setIsAnimating(false)}>
              <motion.div
                key={activeTab}
                variants={still ? undefined : variants}
                initial="initial"
                animate="active"
                exit="exit"
                custom={direction}
                onAnimationStart={() => setIsAnimating(true)}
                onAnimationComplete={() => setIsAnimating(false)}
              >
                {content}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </MotionConfig>
    </div>
  );
}
export { DirectionAwareTabs };
