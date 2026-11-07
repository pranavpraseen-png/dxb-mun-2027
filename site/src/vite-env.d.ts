/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL. When this and the anon key are set, the portal uses the live data layer. */
  readonly VITE_SUPABASE_URL?: string;
  /** '1': dashboards open without sign-in, on sample data (see src/platform/v2/index.ts). */
  readonly VITE_NO_LOGIN?: string;
  /** Sign-in buttons to show, comma-separated: 'google', 'microsoft'. Only once they are set up in Supabase. */
  readonly VITE_AUTH_PROVIDERS?: string;
  /** Cloudflare Turnstile site key (public). Set it only after the secret is in Supabase Auth > Attack Protection. */
  readonly VITE_TURNSTILE_SITE_KEY?: string;
  /** Supabase anon (public) key. Safe in the browser: Row Level Security guards the data. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
