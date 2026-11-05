// Where the public site hands off to the real apps.
// Deployed (VITE_DEPLOY=1) this page is served at `/`; in the preview it is served at `/concepts/merged/`.
const ROOT = import.meta.env.VITE_DEPLOY === '1' ? './' : '../../';

/** Delegate dashboard: delegates, advisors and chairs sign in here. */
export const portal = ROOT + 'portal/';
/** Secretariat dashboard (low-key link only). */
export const admin = ROOT + 'admin/';

/** Register: the dashboard's apply route; after sign-in it opens the application form. */
export const register = portal + '#/apply';
/** Sign in: the dashboard's home route. */
export const signIn = portal + '#/home';
