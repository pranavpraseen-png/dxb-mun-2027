// What every screen needs to know about this delegate: the conference phase and their seat.
// After the conference everything is read-only.
import { createContext, useContext, type ReactNode } from 'react';
import type { MySeat, Phase } from '@/platform/v2';

export type Conf = { phase: Phase; seat: MySeat; readOnly: boolean; demo: boolean };
const Ctx = createContext<Conf | null>(null);

export function ConfProvider({ value, children }: { value: Conf; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useConf(): Conf {
  const c = useContext(Ctx);
  if (!c) throw new Error('useConf outside ConfProvider');
  return c;
}

