/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL. When this and the anon key are set, the portal uses the live data layer. */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase anon (public) key. Safe in the browser: Row Level Security guards the data. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
