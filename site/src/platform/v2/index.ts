// Entry point for the three v2 dashboards: `import { getDelegateApi } from '@/platform/v2'`.
// With VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY set, the getters return the live (Supabase) adapters;
// otherwise the demo adapters over one shared in-browser store (see demo-store.ts).
//
// Demo sign-in: any email, code 123456. The email picks the role:
//   contains "chair" → chair of UNSC ("vice" in it → Sample Vice Chair); contains "admin" or "sec" → core secretariat;
//   anything else → a delegate (delegate2@… to delegate20@… are the other sample delegates; any other email is
//   Sample Delegate 1, France in UNSC, whose state the ?demo=new|applied|seated|live|after scenario sets).
import type { ChairApi, DelegateApi, SecretariatApi } from './contract';
import { createDemoChairApi } from './demo-chair';
import { createDemoDelegateApi } from './demo-delegate';
import { createDemoSecretariatApi } from './demo-secretariat';
import { createSupabaseChairApi, createSupabaseDelegateApi, createSupabaseSecretariatApi } from './supabase';
import { signInWithoutCode } from './demo-common';
import { DEMO_EMAILS } from './demo-seed';

export * from './contract';
export { DEMO_CODE } from './demo-common';
export { DEMO_EMAILS } from './demo-seed';
export { currentDemoScenario, demoScenarios, resetDemoData, type DemoScenario } from './demo-store';

/**
 * No-login mode (VITE_NO_LOGIN=1, set by scripts/deploy.mjs). Owner, 2026-11-07: "for now leave the dashboard w/o login".
 * The dashboards open straight in, on the sample data (the live database needs a signed-in user, so it is not used),
 * and the sign-out buttons are hidden. Remove the flag to bring sign-in and the live data back.
 */
export const NO_LOGIN = import.meta.env.VITE_NO_LOGIN === '1';

/** In no-login mode, sign this tab in as the sample person for `role` before the dashboard renders. */
export function openWithoutLogin(role: 'delegate' | 'chair' | 'secretariat') {
  if (NO_LOGIN) signInWithoutCode(DEMO_EMAILS[role]);
}

function liveConfig(): { url: string; key: string } | null {
  if (NO_LOGIN) return null;
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  return url && key ? { url, key } : null;
}

/** True when the dashboards run on the sample (demo) data. */
export function isDemo(): boolean {
  return liveConfig() === null;
}

let delegate: DelegateApi | null = null;
let chair: ChairApi | null = null;
let secretariat: SecretariatApi | null = null;

export function getDelegateApi(): DelegateApi {
  if (!delegate) { const live = liveConfig(); delegate = live ? createSupabaseDelegateApi(live.url, live.key) : createDemoDelegateApi(); }
  return delegate;
}
export function getChairApi(): ChairApi {
  if (!chair) { const live = liveConfig(); chair = live ? createSupabaseChairApi(live.url, live.key) : createDemoChairApi(); }
  return chair;
}
export function getSecretariatApi(): SecretariatApi {
  if (!secretariat) { const live = liveConfig(); secretariat = live ? createSupabaseSecretariatApi(live.url, live.key) : createDemoSecretariatApi(); }
  return secretariat;
}
