// app/api/protocol-status/route.ts
//
// Atlas spec, AtlasOps msg 3165 + 3193 (2026-05-17):
//   Public, read-only, no auth. Counts only - pro_verified / cross_ref /
//   single_source / draft / total active. Latest promotion batch_id + ts if
//   available. Plus the stain x fabric labels of the currently pro_verified
//   cards (per msg 3193 "include count + card list"), with NO protocol body /
//   chemistry / instructions / scope - labels only.
//
// Powers /verified, the buyer-visible trust surface.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type LevelCounts = {
  pro_verified: number
  cross_ref: number
  single_source: number
  draft: number
}

type ProVerifiedCard = {
  stain: string
  fabric: string
  card_key: string
  verified_at: string
}

type StatusResponse = {
  generated_at: string
  total_active: number
  counts: LevelCounts
  pro_verified_cards: ProVerifiedCard[]
  latest_promotion?: {
    batch_id: string | null
    promoted_at: string
  }
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  // Service-role used here strictly because procedures table reads aren't
  // exposed to anon. We return ONLY aggregate counts + non-sensitive labels -
  // never card content. Same hardening pattern as other public counts routes
  // (e.g. /api/usage).
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase admin credentials not configured')
  return createClient(url, key)
}

const EMPTY_COUNTS: LevelCounts = { pro_verified: 0, cross_ref: 0, single_source: 0, draft: 0 }

export async function GET() {
  try {
    const supabase = getSupabase()

    // Active canonical rows, verification_level only.
    const levels = await supabase
      .from('procedures')
      .select('verification_level')
      .eq('is_active', true)
      .is('plant_id', null)

    if (levels.error) {
      // procedures may not exist in some local/dev configs - degrade gracefully.
      return NextResponse.json({
        generated_at: new Date().toISOString(),
        total_active: 0,
        counts: EMPTY_COUNTS,
        pro_verified_cards: [],
        _degraded: true,
        _reason: levels.error.message,
      } satisfies StatusResponse & { _degraded: true; _reason: string }, { status: 200 })
    }

    const counts: LevelCounts = { ...EMPTY_COUNTS }
    for (const r of levels.data ?? []) {
      const lvl = r.verification_level as keyof LevelCounts
      if (lvl in counts) counts[lvl]++
    }
    const total_active = (levels.data ?? []).length

    // pro_verified card labels, no content.
    const proRows = await supabase
      .from('procedures')
      .select('card_key,stain_canonical,surface_canonical,updated_at')
      .eq('verification_level', 'pro_verified')
      .eq('is_active', true)
      .is('plant_id', null)
      .order('updated_at', { ascending: false })

    const pro_verified_cards: ProVerifiedCard[] = (proRows.data ?? []).map(r => ({
      stain: r.stain_canonical ?? '',
      fabric: r.surface_canonical ?? '',
      card_key: r.card_key,
      verified_at: r.updated_at,
    }))

    // Latest promotion batch from card_reviews audit log.
    let latest_promotion: StatusResponse['latest_promotion'] = undefined
    const reviews = await supabase
      .from('card_reviews')
      .select('reviewed_at,note')
      .eq('action', 'approve')
      .order('reviewed_at', { ascending: false })
      .limit(1)
    if (!reviews.error && reviews.data?.length) {
      const r = reviews.data[0]
      const m = (r.note || '').match(/batch=(SB-[A-Za-z0-9-]+)/)
      latest_promotion = {
        batch_id: m?.[1] ?? null,
        promoted_at: r.reviewed_at as string,
      }
    }

    const body: StatusResponse = {
      generated_at: new Date().toISOString(),
      total_active,
      counts,
      pro_verified_cards,
      ...(latest_promotion ? { latest_promotion } : {}),
    }

    // Brief cache - counts change only when SB ships a batch (minutes-to-hours
    // cadence). 60s edge cache keeps the buyer surface snappy without hiding
    // promotions for long.
    return NextResponse.json(body, {
      headers: {
        'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=120',
      },
    })
  } catch (err) {
    console.error('[/api/protocol-status] failed:', err)
    return NextResponse.json({ error: 'status_unavailable' }, { status: 500 })
  }
}
