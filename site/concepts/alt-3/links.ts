// Where the public site hands off to the real apps.
// Deployed (VITE_DEPLOY=1) this page is served at `/`; in the preview it is served at `/concepts/alt-3/`.
const ROOT = import.meta.env.VITE_DEPLOY === '1' ? './' : '../../';

/** Delegate dashboard: delegates, advisors and chairs sign in here. */
export const portal = ROOT + 'portal/';
/** Secretariat dashboard (low-key link only). */
export const admin = ROOT + 'admin/';
/** Chair dashboard (low-key link only). */
export const chair = ROOT + 'chair/';

/** Register: after sign-in, a delegate who hasn't signed up sees the short sign-up form on Now. */
export const register = portal + '#/now';
/** Sign in: the dashboard's home route. */
export const signIn = portal + '#/now';
