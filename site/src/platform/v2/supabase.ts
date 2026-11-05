// Live (Supabase) adapters for the v2 contract. Shared pieces: ./supabase-core.ts.
// Schema they expect: supabase/migrations/0001_init.sql + 0004_conference_day.sql.
export { createSupabaseDelegateApi } from './supabase-delegate';
export { createSupabaseChairApi } from './supabase-chair';
export { createSupabaseSecretariatApi } from './supabase-secretariat';
