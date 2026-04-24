// app/api/admin/review-queue/route.ts
// Founder-only read surface for the solve_review_queue table.
// Three views in one response:
//   recent         — last 50 entries (anything, any tier)
//   pro_misses     — last 50 Spotter/Operator queries that hit no canonical card
//   top_uncovered  — aggregated stain × surface combos with matched_card_key IS NULL
//                    over the last 30 days, sorted by frequency (authoring priority)
//
// Gate: session email in FOUNDER_EMAILS. Any other caller → 403.
// Graceful: if the solve_review_queue table doesn't exist yet (migration
// not applied in the Supabase dashboard), return a 200 with empty arrays
// and `_tableMissing: true` so the UI can show an onboarding hint.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const FOUNDER_EMAILS = [
  'tyler@gonr.pro',
  'tyler@nexshift.co',
  'twfyke@me.com',
  'eval@gonr.app',
  'jeff@cleanersupply.com',
]

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase admin credentials not configured')
  return createClient(url, key)
}

async function getSessionEmail(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )
    const { data } = await supabase.auth.getUser()
    return data.user?.email?.toLowerCase() ?? null
  } catch {
    return null
  }
}

type QueueRow = {
  id: string
  created_at: string
  query_raw: string | null
  stain: string | null
  surface: string | null
  tier_requested: string | null
  matched_card_key: string | null
  used_ai_fallback: boolean
  user_id: string | null
  session_id: string | null
  resolved_at: string | null
  promoted_card_key: string | null
}

type UncoveredAgg = {
  stain: string | null
  surface: string | null
  count: number
  last_seen: string
  pro_tier_count: number
}

export async function GET() {
  const email = await getSessionEmail()
  if (!email || !FOUNDER_EMAILS.includes(email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  try {
    const supabase = getSupabaseAdmin()

    // Recent — last 50, any tier
    const recent = await supabase
      .from('solve_review_queue')
      .select('id,created_at,query_raw,stain,surface,tier_requested,matched_card_key,used_ai_fallback,user_id,session_id,resolved_at,promoted_card_key')
      .order('created_at', { ascending: false })
      .limit(50)

    // Graceful: table might not exist yet if the migration hasn't been applied.
    if (recent.error && (recent.error.code === 'PGRST205' || /does not exist|schema cache/i.test(recent.error.message))) {
      return NextResponse.json({
        recent: [],
        proMisses: [],
        topUncovered: [],
        _tableMissing: true,
        _migrationPath: 'supabase/migrations/20260424_solve_review_queue.sql',
      })
    }

    if (recent.error) throw recent.error

    // Pro-tier misses — Spotter/Operator hit the gate
    const proMisses = await supabase
      .from('solve_review_queue')
      .select('id,created_at,query_raw,stain,surface,tier_requested,matched_card_key,used_ai_fallback')
      .in('tier_requested', ['spotter', 'operator'])
      .is('matched_card_key', null)
      .order('created_at', { ascending: false })
      .limit(50)

    if (proMisses.error) throw proMisses.error

    // Top uncovered combos over last 30 days. Aggregate client-side — PostgREST
    // doesn't have GROUP BY; we pull raw rows and fold into a map.
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const uncovered = await supabase
      .from('solve_review_queue')
      .select('stain,surface,tier_requested,created_at,used_ai_fallback,matched_card_key')
      .is('matched_card_key', null)
      .gte('created_at', thirtyDaysAgo)
      .limit(5000)

    if (uncovered.error) throw uncovered.error

    const aggMap = new Map<string, UncoveredAgg>()
    for (const row of (uncovered.data ?? []) as Array<Partial<QueueRow> & { created_at: string; tier_requested: string | null }>) {
      const key = `${row.stain ?? ''}||${row.surface ?? ''}`
      const existing = aggMap.get(key)
      const isProTier = row.tier_requested === 'spotter' || row.tier_requested === 'operator'
      if (existing) {
        existing.count += 1
        if (row.created_at > existing.last_seen) existing.last_seen = row.created_at
        if (isProTier) existing.pro_tier_count += 1
      } else {
        aggMap.set(key, {
          stain: row.stain ?? null,
          surface: row.surface ?? null,
          count: 1,
          last_seen: row.created_at,
          pro_tier_count: isProTier ? 1 : 0,
        })
      }
    }

    // Sort: pro-tier frequency first, then total frequency, then recency.
    const topUncovered = [...aggMap.values()]
      .sort((a, b) =>
        b.pro_tier_count - a.pro_tier_count ||
        b.count - a.count ||
        (b.last_seen > a.last_seen ? 1 : -1)
      )
      .slice(0, 30)

    return NextResponse.json({
      recent: recent.data ?? [],
      proMisses: proMisses.data ?? [],
      topUncovered,
    })
  } catch (err) {
    console.error('[admin/review-queue] load failed:', err)
    return NextResponse.json({ error: 'load_failed' }, { status: 500 })
  }
}
