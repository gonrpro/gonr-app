// app/api/admin/protocol-library/route.ts
// Founder-only read surface: full protocol library for /admin/protocol-library.
// Returns all active canonical cards with their full `data` payload so the UI
// can render Home + Pro side-by-side without a second fetch.
//
// Gate: session email in FOUNDER_EMAILS. Any other caller → 403.
// No writes. No schema changes. Cards come straight from the `protocol_cards`
// view (backed by `procedures`).

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

type CardRow = {
  card_key: string
  stain_canonical: string | null
  surface_canonical: string | null
  verification_level: string | null
  sources: string[] | null
  cross_refs: string[] | null
  updated_at: string
  data: Record<string, unknown> | null
}

// Three distinct axes, do not collapse them:
//   1. content_verified         — boolean from data.verified (voice/content review pass)
//   2. internal_content_level   — string from data.verification_level (internal cross-ref / sourcing readiness inside the JSON payload)
//      Legacy draft payloads may omit this field; treat missing internal level as draft, not founder-approved.
//   3. founder_approval_level   — string from the DB column verification_level (founder approval ladder mutated by the review endpoint)
type LevelBucket = {
  draft: number
  single_source: number
  cross_ref: number
  pro_verified: number
  unknown: number
}

function emptyBucket(): LevelBucket {
  return { draft: 0, single_source: 0, cross_ref: 0, pro_verified: 0, unknown: 0 }
}

function normalizeInternalLevel(level: string | null | undefined): string {
  // Missing in-payload level only appears on legacy unverified/draft card payloads.
  // Show those as draft so the UI doesn't imply a separate unknown approval state.
  return level ?? 'draft'
}

function bumpBucket(bucket: LevelBucket, level: string | null | undefined): void {
  switch (level) {
    case 'draft': bucket.draft++; break
    case 'single_source': bucket.single_source++; break
    case 'cross_ref': bucket.cross_ref++; break
    case 'pro_verified': bucket.pro_verified++; break
    default: bucket.unknown++
  }
}

export async function GET() {
  const email = await getSessionEmail()
  if (!email || !FOUNDER_EMAILS.includes(email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  try {
    const supabase = getSupabaseAdmin()

    const all = await supabase
      .from('protocol_cards')
      .select('card_key,stain_canonical,surface_canonical,verification_level,sources,cross_refs,updated_at,data')
      .eq('is_active', true)
      .is('plant_id', null)
      .order('card_key', { ascending: true })
      .limit(500)

    if (all.error) throw all.error

    const rows = (all.data ?? []) as CardRow[]

    const summary = {
      total: rows.length,
      content_verified: 0,
      internal_content_level: emptyBucket(),
      founder_approval_level: emptyBucket(),
    }
    for (const row of rows) {
      const data = row.data as { verified?: boolean; verification_level?: string } | null
      if (data?.verified === true) summary.content_verified++
      bumpBucket(summary.internal_content_level, normalizeInternalLevel(data?.verification_level))
      bumpBucket(summary.founder_approval_level, row.verification_level)
    }

    return NextResponse.json({ summary, cards: rows })
  } catch (err) {
    console.error('[admin/protocol-library] load failed:', err)
    return NextResponse.json({ error: 'load_failed' }, { status: 500 })
  }
}
