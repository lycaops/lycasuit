// Unified Supabase browser client. All four tools now share ONE project,
// ONE auth session and ONE set of credentials.
export { supabaseBrowser as supabase } from '@/lib/supabase/client'
export { supabaseBrowser as default } from '@/lib/supabase/client'
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
