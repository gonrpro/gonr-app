/**
 * Supabase Admin Client — lazy-loaded to avoid build-time errors.
 * Uses service role key for server-side writes (bypasses RLS).
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _admin: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient | null {
  if (_admin) return _admin
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) {
    console.warn('[supabase/admin] Missing SUPABASE_URL or SERVICE_KEY — cache disabled')
    return null
  }
  _admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  return _admin
}
