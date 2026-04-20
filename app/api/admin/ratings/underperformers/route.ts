// app/api/admin/ratings/underperformers/route.ts
// TASK-052 Stage C — founder-only admin endpoint.
// Returns cards where the community user_* signal is under a configured
// threshold (worked_pct < 70 OR avg_stars < 3.5) so the pro team has a
// triage queue for rewrites.
//
// Gate: session email must appear in FOUNDER_EMAILS. No other auth surface.

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

const WORKED_THRESHOLD = 70
const STARS_THRESHOLD  = 3.5
const MIN_USER_COUNT   = 5  // only surface cards with enough signal to act on

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
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    )
    const { data } = await supabase.auth.getUser()
    return data.user?.email?.toLowerCase() ?? null
  } catch {
    return null
  }
}

export async function GET() {
  const email = await getSessionEmail()
  if (!email || !FOUNDER_EMAILS.includes(email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('card_ratings_agg')
      .select('card_id, user_count, user_avg_stars, user_worked_pct, seeded_count, seed_sources')
      .gte('user_count', MIN_USER_COUNT)

    if (error) {
      console.warn('[admin/ratings/underperformers] error:', error.message)
      return NextResponse.json({ error: 'read_failed' }, { status: 500 })
    }

    const underperformers = (data ?? [])
      .filter((row) => {
        const stars = Number(row.user_avg_stars ?? 0)
        const pct   = Number(row.user_worked_pct ?? 0)
        return pct < WORKED_THRESHOLD || stars < STARS_THRESHOLD
      })
      .sort((a, b) => {
        // Worst-first — lowest worked_pct, then lowest avg_stars.
        const pa = Number(a.user_worked_pct ?? 0)
        const pb = Number(b.user_worked_pct ?? 0)
        if (pa !== pb) return pa - pb
        return Number(a.user_avg_stars ?? 0) - Number(b.user_avg_stars ?? 0)
      })

    return NextResponse.json({
      thresholds: { worked_pct: WORKED_THRESHOLD, avg_stars: STARS_THRESHOLD, min_user_count: MIN_USER_COUNT },
      count: underperformers.length,
      cards: underperformers,
    })
  } catch (err) {
    console.warn('[admin/ratings/underperformers] exception:', err)
    return NextResponse.json({ error: 'read_failed' }, { status: 500 })
  }
}
