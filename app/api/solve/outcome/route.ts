// app/api/solve/outcome/route.ts — TASK-043 P0 Slice 1
// Operator-reported outcome write path.
//
// POST /api/solve/outcome
// Body: { correlation_id, outcome, notes?, image_url? }
//   outcome ∈ 'solved' | 'partial' | 'failed' | 'escalated'
// Response: { ok: true, outcome_id } | { ok: false, error }
//
// Upserts on solve_correlation_id — re-reports overwrite the prior report.
// Emits outcome.reported event via recordEvent() to complete the three-event
// trace (solve.requested → procedure.served → outcome.reported) for the solve.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { recordEvent, EVENT_TYPES } from '@/lib/events/record'

const VALID_OUTCOMES = ['solved', 'partial', 'failed', 'escalated'] as const
type Outcome = typeof VALID_OUTCOMES[number]

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase admin credentials not configured')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
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
    return data.user?.email ?? null
  } catch {
    return null
  }
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 })
    }

    const { correlation_id, outcome, notes, image_url } = body as {
      correlation_id?: string
      outcome?: string
      notes?: string
      image_url?: string
    }

    if (!correlation_id || typeof correlation_id !== 'string') {
      return NextResponse.json({ ok: false, error: 'missing_correlation_id' }, { status: 400 })
    }
    if (!outcome || !VALID_OUTCOMES.includes(outcome as Outcome)) {
      return NextResponse.json({ ok: false, error: 'invalid_outcome' }, { status: 400 })
    }

    const email = await getSessionEmail()
    const clientIp = getClientIp(req)
    const actor_id = email ? email.toLowerCase() : `anon:${clientIp}`

    const supabase = getSupabaseAdmin()

    // Cast — generated Supabase types don't know about the new outcomes table yet.
    const { data, error } = await (supabase.from('outcomes') as any)
      .upsert(
        {
          solve_correlation_id: correlation_id,
          actor_id,
          outcome,
          notes: notes ?? null,
          image_url: image_url ?? null,
          reported_at: new Date().toISOString(),
        },
        { onConflict: 'solve_correlation_id' }
      )
      .select('id, plant_id')
      .single()

    if (error) {
      console.error('[outcome] upsert failed:', error.message)
      return NextResponse.json({ ok: false, error: 'database_error' }, { status: 500 })
    }

    // Emit outcome.reported event for the trace. Fire-and-forget.
    recordEvent({
      type: EVENT_TYPES.OUTCOME_REPORTED,
      actor_id,
      plant_id: data?.plant_id ?? null,
      payload: { correlation_id, outcome, has_notes: !!notes, has_image: !!image_url },
      correlation_id,
    }).catch(() => {})

    return NextResponse.json({ ok: true, outcome_id: data?.id ?? null })
  } catch (err) {
    console.error('[outcome] unexpected:', err instanceof Error ? err.message : err)
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 })
  }
}
