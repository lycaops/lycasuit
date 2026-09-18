import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env"

// A single shared browser client. All four tools (Field IQ, Contracts,
// Incentive Statement, Market Assistance) use this one instance, so a single
// login carries across the whole suite and the session is never duplicated.
let _client: SupabaseClient | null = null

export function getBrowserClient(): SupabaseClient {
  if (!_client) {
    _client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  return _client
}

/** Kept for backwards compatibility with existing Contract Management code. */
export function createClient() {
  return getBrowserClient()
}

/** Lazily-resolved singleton used by the three ported SPA tools. */
export const supabaseBrowser: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    const client = getBrowserClient() as unknown as Record<string | symbol, unknown>
    const value = client[prop]
    return typeof value === "function"
      ? (value as (...a: unknown[]) => unknown).bind(client)
      : value
  },
})

export default supabaseBrowser
