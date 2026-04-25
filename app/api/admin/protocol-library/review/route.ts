// app/api/admin/protocol-library/review/route.ts
//
// Task #44 — Internal Verification Actions v1.
// Founder-only endpoint for protocol-card reviewer actions.
//
// POST: record an approve / flag / note review for a card. Promotion rules
//       (Atlas 8414):
//         - approve : verification_level steps up by one tier (draft →
//                     single_source → cross_ref → pro_verified). Already at
//                     pro_verified = no-op (idempotent).
//         - flag    : note required. No promotion. Records the concern.
//         - note    : annotation only. No promotion.
//
// GET: ?card_key=X returns the audit trail for a card (most recent first).
//
// Gate: session email in FOUNDER_EMAILS. Any other caller → 403.
// Graceful: if the card_reviews table doesn't exist yet (migration pending),
// returns 503 with a clear message — UI can show an onboarding hint.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
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

const PROMOTION_LADDER = ['draft', 'single_source', 'cross_ref', 'pro_verified'] as const
type Level = (typeof PROMOTION_LADDER)[number]

function nextLevel(current: string | null | undefined): Level {
  const idx = PROMOTION_LADDER.indexOf((current ?? 'draft') as Level)
  if (idx < 0) return 'single_source'
  return PROMOTION_LADDER[Math.min(idx + 1, PROMOTION_LADDER.length - 1)]
}

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

function isMissingTableError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false
  if (err.code === 'PGRST205' || err.code === '42P01') return true
  if (err.message && /relation .* does not exist|table .* card_reviews/i.test(err.message)) return true
  return false
}

type ReviewBody = {
  card_key?: string
  action?: 'approve' | 'flag' | 'note'
  note?: string
  card_version?: string
}

export async function POST(req: NextRequest) {
  const email = await getSessionEmail()
  if (!email || !FOUNDER_EMAILS.includes(email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  let body: ReviewBody
  try {
    body = (await req.json()) as ReviewBody
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const card_key = (body.card_key ?? '').trim()
  const action = body.action
  const note = (body.note ?? '').trim() || null
  const card_version = (body.card_version ?? '').trim() || null

  if (!card_key) return NextResponse.json({ error: 'card_key required' }, { status: 400 })
  if (!action || !['approve', 'flag', 'note'].includes(action)) {
    return NextResponse.json({ error: 'action must be approve | flag | note' }, { status: 400 })
  }
  if (action === 'flag' && !note) {
    return NextResponse.json({ error: 'flag action requires a note' }, { status: 400 })
  }

  try {
    const supabase = getSupabaseAdmin()

    const insert = await supabase
      .from('card_reviews')
      .insert({
        card_key,
        reviewer_email: email,
        reviewer_role: 'founder',
        action,
        note,
        card_version,
      })
      .select()
      .single()

    if (insert.error) {
      if (isMissingTableError(insert.error)) {
        return NextResponse.json({
          error: 'migration_pending',
          message: 'card_reviews table not yet applied. See supabase/migrations/20260425000000_card_reviews.sql.',
        }, { status: 503 })
      }
      throw insert.error
    }

    let promoted = false
    let newLevel: Level | null = null

    if (action === 'approve') {
      const cur = await supabase
        .from('procedures')
        .select('id,verification_level')
        .eq('card_key', card_key)
        .eq('is_active', true)
        .is('plant_id', null)
        .maybeSingle()

      if (cur.error) throw cur.error
      if (!cur.data) {
        return NextResponse.json({ ok: true, review: insert.data, promoted: false, reason: 'no active canonical row for card_key' })
      }

      const target = nextLevel(cur.data.verification_level as string | null)
      if (target !== cur.data.verification_level) {
        const upd = await supabase
          .from('procedures')
          .update({ verification_level: target })
          .eq('id', cur.data.id)
        if (upd.error) throw upd.error
        promoted = true
        newLevel = target
      } else {
        newLevel = target
      }
    }

    return NextResponse.json({ ok: true, review: insert.data, promoted, newLevel })
  } catch (err) {
    console.error('[admin/protocol-library/review] POST failed:', err)
    return NextResponse.json({ error: 'review_failed' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const email = await getSessionEmail()
  if (!email || !FOUNDER_EMAILS.includes(email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const url = new URL(req.url)
  const card_key = url.searchParams.get('card_key')?.trim()

  try {
    const supabase = getSupabaseAdmin()

    let query = supabase
      .from('card_reviews')
      .select('id,card_key,reviewer_email,reviewer_role,action,note,card_version,reviewed_at')
      .order('reviewed_at', { ascending: false })
      .limit(50)

    if (card_key) query = query.eq('card_key', card_key)

    const res = await query

    if (res.error) {
      if (isMissingTableError(res.error)) {
        return NextResponse.json({
          reviews: [],
          _migrationPending: true,
          _migrationPath: 'supabase/migrations/20260425000000_card_reviews.sql',
        })
      }
      throw res.error
    }

    return NextResponse.json({ reviews: res.data ?? [] })
  } catch (err) {
    console.error('[admin/protocol-library/review] GET failed:', err)
    return NextResponse.json({ error: 'load_failed' }, { status: 500 })
  }
}
