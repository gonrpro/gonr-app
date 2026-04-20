// app/api/ratings/submit/route.ts
// TASK-052 Stage A — upsert a rating for (card_id, rater_key).
//
// Rules:
//  - Identity comes from the Supabase session cookie, never from the request body
//    (TASK-014 rule). Body-supplied email is ignored.
//  - Anon submissions are allowed (IP-keyed rater_key) and rate-limited.
//  - One rating per (card_id, rater_key). Re-submission is an UPSERT in place.
//  - Notes submitted by anyone land as note_status='private' (authed) — anon
//    rating submissions ignore the note field entirely (no anon free-text).

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Simple in-process rate limiter — same pattern used in app/api/solve/route.ts.
// (Replace with a shared helper import if one exists in the repo.)
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1h
const RATE_LIMIT_MAX_RATINGS = 30
const RATE_LIMIT_MAX_NOTES = 5

type Bucket = { ratings: number[]; notes: number[] }
const buckets = new Map<string, Bucket>()

function checkAndTouchBucket(key: string, kind: 'rating' | 'note'): boolean {
  const now = Date.now()
  const b = buckets.get(key) ?? { ratings: [], notes: [] }
  const arr = kind === 'rating' ? b.ratings : b.notes
  // Drop expired entries.
  while (arr.length && arr[0] < now - RATE_LIMIT_WINDOW_MS) arr.shift()
  const cap = kind === 'rating' ? RATE_LIMIT_MAX_RATINGS : RATE_LIMIT_MAX_NOTES
  if (arr.length >= cap) return false
  arr.push(now)
  buckets.set(key, b)
  return true
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

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') || '127.0.0.1'
}

const FOUNDER_EMAILS = ['tyler@gonr.pro', 'tyler@nexshift.co', 'twfyke@me.com', 'eval@gonr.app', 'jeff@cleanersupply.com']

type SubmitBody = {
  card_id?: unknown
  stars?: unknown
  worked?: unknown
  note?: unknown
  correlation_id?: unknown
}

const ALLOWED_WORKED = new Set(['yes', 'no', 'partial'])

export async function POST(req: Request) {
  let body: SubmitBody
  try {
    body = (await req.json()) as SubmitBody
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  // ── Validation ─────────────────────────────────────────────────
  const cardId = typeof body.card_id === 'string' ? body.card_id.trim() : ''
  if (!cardId) return NextResponse.json({ error: 'card_id_required' }, { status: 400 })
  if (cardId.length > 200) return NextResponse.json({ error: 'card_id_too_long' }, { status: 400 })

  const stars = typeof body.stars === 'number' ? Math.trunc(body.stars) : NaN
  if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
    return NextResponse.json({ error: 'stars_out_of_range' }, { status: 400 })
  }

  const worked = typeof body.worked === 'string' ? body.worked.toLowerCase() : ''
  if (!ALLOWED_WORKED.has(worked)) {
    return NextResponse.json({ error: 'worked_invalid' }, { status: 400 })
  }

  const correlationId = typeof body.correlation_id === 'string' ? body.correlation_id.slice(0, 100) : null

  // ── Identity resolution (server-side only) ─────────────────────
  const sessionEmail = await getSessionEmail()
  const clientIp = getClientIp(req)

  const raterKey = sessionEmail ?? `anon:${clientIp}`
  let raterTier: 'anon' | 'free' | 'home' | 'spotter' | 'operator' | 'founder'

  if (!sessionEmail) {
    raterTier = 'anon'
  } else if (FOUNDER_EMAILS.includes(sessionEmail)) {
    raterTier = 'founder'
  } else {
    // Resolve tier from subscriptions. Fail-soft to 'free' on error so a Supabase
    // hiccup doesn't silently change aggregates.
    raterTier = 'free'
    try {
      const supabase = getSupabaseAdmin()
      const { data } = await supabase
        .from('subscriptions')
        .select('status, tier')
        .eq('email', sessionEmail)
        .single()
      if (data && data.status === 'active' && (data.tier === 'home' || data.tier === 'spotter' || data.tier === 'operator')) {
        raterTier = data.tier as typeof raterTier
      }
    } catch {
      // leave as 'free'
    }
  }

  // ── Rate limit ─────────────────────────────────────────────────
  const rateKey = sessionEmail ?? clientIp
  if (!checkAndTouchBucket(rateKey, 'rating')) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  // ── Note handling (auth-gated, moderation-gated) ───────────────
  // Anon submissions strip the note entirely (no anon free-text).
  let noteValue: string | null = null
  let noteStatus: 'private' | 'pending' = 'private'
  if (sessionEmail && typeof body.note === 'string') {
    const trimmed = body.note.trim()
    if (trimmed.length > 0) {
      if (trimmed.length > 1000) {
        return NextResponse.json({ error: 'note_too_long' }, { status: 400 })
      }
      if (!checkAndTouchBucket(rateKey, 'note')) {
        return NextResponse.json({ error: 'rate_limited_notes' }, { status: 429 })
      }
      noteValue = trimmed
      noteStatus = 'pending' // awaits moderation before public display
    }
  }

  // ── Upsert ─────────────────────────────────────────────────────
  try {
    const supabase = getSupabaseAdmin()
    const { error } = await supabase
      .from('card_ratings')
      .upsert(
        {
          card_id: cardId,
          rater_key: raterKey,
          rater_tier: raterTier,
          stars,
          worked,
          note: noteValue,
          note_status: noteStatus,
          source: 'user',
          correlation_id: correlationId,
        },
        { onConflict: 'card_id,rater_key' }
      )
    if (error) {
      console.warn('[ratings/submit] upsert error:', error.message)
      return NextResponse.json({ error: 'write_failed' }, { status: 500 })
    }
  } catch (err) {
    console.warn('[ratings/submit] exception:', err)
    return NextResponse.json({ error: 'write_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, viewerTier: raterTier })
}
