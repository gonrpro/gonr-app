// app/api/admin/provenance/route.ts
// Founder-only read surface for TASK-055 provenance state.
// Three views in one response:
//   summary      — counts by verification_level across all active canonical cards
//   drafts       — cards at verification_level = 'draft' (the gap queue Atlas asked for)
//   recent       — last 50 active cards, ordered by updated_at desc, with verification_level
//
// Gate: session email in FOUNDER_EMAILS. Any other caller → 403.
// Graceful: if the verification_level column doesn't exist yet (migration
// 20260424_protocol_cards_provenance.sql not applied), return a 200 with
// empty payload + `_columnMissing: true` so the UI can show an onboarding hint.

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
      .select('card_key,stain_canonical,surface_canonical,verification_level,sources,cross_refs,updated_at')
      .eq('is_active', true)
      .is('plant_id', null)
      .order('updated_at', { ascending: false })
      .limit(1000)

    // Graceful: column might not exist yet if the migration hasn't been applied.
    if (all.error && (all.error.code === 'PGRST204' || /verification_level|column .* does not exist/i.test(all.error.message))) {
      return NextResponse.json({
        summary: { draft: 0, single_source: 0, cross_ref: 0, pro_verified: 0, total: 0 },
        drafts: [],
        recent: [],
        _columnMissing: true,
        _migrationPath: 'supabase/migrations/20260424_protocol_cards_provenance.sql',
      })
    }

    if (all.error) throw all.error

    const rows = (all.data ?? []) as CardRow[]
    const summary = { draft: 0, single_source: 0, cross_ref: 0, pro_verified: 0, unknown: 0, total: rows.length }
    for (const row of rows) {
      const level = (row.verification_level ?? 'unknown') as keyof typeof summary
      if (level in summary) (summary as Record<string, number>)[level] += 1
      else summary.unknown += 1
    }

    const drafts = rows
      .filter(r => r.verification_level === 'draft' || r.verification_level === null)
      .slice(0, 200)

    const recent = rows.slice(0, 50)

    return NextResponse.json({ summary, drafts, recent })
  } catch (err) {
    console.error('[admin/provenance] load failed:', err)
    return NextResponse.json({ error: 'load_failed' }, { status: 500 })
  }
}
