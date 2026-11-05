// Toasts: coss ui Toast (Base UI Toast, from portal/ui/coss/toast). One short line that confirms an action.
// The viewport is an aria-live region, so every toast is announced to screen readers.
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { ToastProvider as CossToastProvider, toastManager } from '../../portal/ui/coss/toast';

export type ToastTone = 'ok' | 'error' | 'info';
const TYPE = { ok: 'success', error: 'error', info: 'info' } as const;

const ToastCtx = createContext<(text: string, tone?: ToastTone) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const push = useCallback((text: string, tone: ToastTone = 'ok') => {
    toastManager.add({ title: text, type: TYPE[tone], timeout: tone === 'error' ? 7000 : 4200 });
  }, []);
  // Phones: top, clear of the bottom tab bar. Desktop: bottom right.
  const position = useMemo(() => (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches ? 'top-center' : 'bottom-right'), []);
  return (
    <ToastCtx.Provider value={push}>
      <CossToastProvider position={position} limit={3}>{children}</CossToastProvider>
    </ToastCtx.Provider>
  );
}
