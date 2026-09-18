// Supabase public credentials.
// These are public (anon / publishable) keys and safe to ship client-side.
// Values are also read from env first so production deployments can override.

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://zcdlllokrcwocepcllxa.supabase.co"

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "sb_publishable_zbZNYvLiCRieknd9FcuNBw_8fqptZp5"
