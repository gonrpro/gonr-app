// app/api/ratings/aggregate/route.ts
// TASK-052 Stage A — read a card's public rating aggregate.
// Public numbers include only source='user' rows (card_ratings_agg view).
// Seeded counts surface separately for the "GONR Lab tested" badge logic.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const PUBLIC_DISPLAY_MIN = 5 // spec threshold: show aggregates only when user_count >= 5

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase admin credentials not configured')
  return createClient(url, key)
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const cardId = (url.searchParams.get('card_id') ?? '').trim()
  if (!cardId) return NextResponse.json({ error: 'card_id_required' }, { status: 400 })
  if (cardId.length > 200) return NextResponse.json({ error: 'card_id_too_long' }, { status: 400 })

  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('card_ratings_agg')
      .select('card_id, user_count, user_avg_stars, user_worked_pct, seeded_count, seed_sources')
      .eq('card_id', cardId)
      .maybeSingle()

    if (error) {
      console.warn('[ratings/aggregate] read error:', error.message)
      return NextResponse.json({ error: 'read_failed' }, { status: 500 })
    }

    const user_count      = data?.user_count      ?? 0
    const user_avg_stars  = data?.user_avg_stars  ?? null
    const user_worked_pct = data?.user_worked_pct ?? null
    const seeded_count    = data?.seeded_count    ?? 0
    const seed_sources    = (data?.seed_sources as string[] | null) ?? []

    // Display gate: public numbers only render when user_count >= threshold.
    const display_ready = user_count >= PUBLIC_DISPLAY_MIN

    // Badge logic — per Atlas's Stage A review, pilot data must NOT light the
    // GONR-tested badge. Badge fires only when the card has internal_eval
    // or gonr_lab signal. Pilot surfaces through its own field for future UI.
    const gonr_lab_tested = seed_sources.some((s) => s === 'internal_eval' || s === 'gonr_lab')
    const pilot_tested    = seed_sources.includes('pilot')

    return NextResponse.json({
      card_id: cardId,
      user_count,
      user_avg_stars: display_ready ? user_avg_stars : null,
      user_worked_pct: display_ready ? user_worked_pct : null,
      display_ready,
      gonr_lab_tested,
      pilot_tested,
      seeded_count,
      seed_sources,
      display_threshold: PUBLIC_DISPLAY_MIN,
    })
  } catch (err) {
    console.warn('[ratings/aggregate] exception:', err)
    return NextResponse.json({ error: 'read_failed' }, { status: 500 })
  }
}
