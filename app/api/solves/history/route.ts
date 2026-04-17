// app/api/solves/history/route.ts — TASK-043 Slice 3
// Solve history read path. Joins events (procedure.served) with outcomes
// on correlation_id and returns the most recent solves for the authenticated
// user (or their plant, if they belong to one).
//
// GET /api/solves/history?limit=&offset=&stain=&surface=&outcome=
// Requires an authenticated session. Anon returns 401.
//
// Response: { ok, count, results: SolveHistoryRow[] }

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getUserPlant } from '@/lib/auth/getUserPlant'

const DEFAULT_LIMIT = 25
const MAX_LIMIT = 100

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

interface SolveHistoryRow {
  correlation_id: string
  stain: string | null
  surface: string | null
  procedure_id: string | null
  procedure_type: string | null
  procedure_title: string | null
  source: string | null
  confidence: number | null
  tier: number | null
  served_at: string
  outcome: string | null
  outcome_notes: string | null
  outcome_reported_at: string | null
}

export async function GET(req: Request) {
  try {
    const email = await getSessionEmail()
    if (!email) {
      return NextResponse.json({ ok: false, error: 'auth_required' }, { status: 401 })
    }
    const plant = await getUserPlant(email)

    const url = new URL(req.url)
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT)))
    const offset = Math.max(0, Number(url.searchParams.get('offset') ?? 0))
    const stainFilter = url.searchParams.get('stain')?.toLowerCase() ?? null
    const surfaceFilter = url.searchParams.get('surface')?.toLowerCase() ?? null
    const outcomeFilter = url.searchParams.get('outcome') ?? null

    const supabase = getSupabaseAdmin()

    // Step 1: fetch recent procedure.served events scoped to this user.
    // Scope: events.actor_id = email OR events.plant_id = user's plant id.
    // Supabase's `or` filter on the service-role client:
    const actor = email.toLowerCase()
    let eventsQuery = (supabase.from('events') as any)
      .select('correlation_id, actor_id, plant_id, payload, created_at')
      .eq('type', 'procedure.served')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const plantId = plant?.plantId ?? null
    if (plantId) {
      eventsQuery = eventsQuery.or(`actor_id.eq.${actor},plant_id.eq.${plantId}`)
    } else {
      eventsQuery = eventsQuery.eq('actor_id', actor)
    }

    const { data: eventRows, error: eventsErr } = await eventsQuery
    if (eventsErr) {
      console.error('[history] events fetch failed:', eventsErr.message)
      return NextResponse.json({ ok: false, error: 'database_error' }, { status: 500 })
    }
    const events = (eventRows ?? []) as Array<{
      correlation_id: string
      actor_id: string
      plant_id: string | null
      payload: Record<string, unknown>
      created_at: string
    }>

    // Step 2: batch-fetch outcomes for those correlation_ids.
    const correlationIds = events.map(e => e.correlation_id).filter(Boolean)
    const outcomeMap = new Map<string, { outcome: string; notes: string | null; reported_at: string }>()
    if (correlationIds.length > 0) {
      const { data: outcomeRows } = await (supabase.from('outcomes') as any)
        .select('solve_correlation_id, outcome, notes, reported_at')
        .in('solve_correlation_id', correlationIds)
      for (const o of (outcomeRows ?? []) as Array<{ solve_correlation_id: string; outcome: string; notes: string | null; reported_at: string }>) {
        outcomeMap.set(o.solve_correlation_id, { outcome: o.outcome, notes: o.notes, reported_at: o.reported_at })
      }
    }

    // Step 2b: historical fallback. Older procedure.served events don't carry
    // stain/surface/procedure_title in their payload (added 2026-04-17 after
    // Tyler flagged all rows rendering as generic "Solve"). Pull the matching
    // solve.requested events for this batch so rows missing those fields can
    // still be titled correctly.
    const reqMap = new Map<string, { stain: string | null; surface: string | null }>()
    if (correlationIds.length > 0) {
      const { data: reqRows } = await (supabase.from('events') as any)
        .select('correlation_id, payload')
        .eq('type', 'solve.requested')
        .in('correlation_id', correlationIds)
      for (const r of (reqRows ?? []) as Array<{ correlation_id: string; payload: Record<string, unknown> }>) {
        const p = r.payload ?? {}
        reqMap.set(r.correlation_id, {
          stain: typeof p.stain === 'string' ? p.stain : null,
          surface: typeof p.surface === 'string' ? p.surface : null,
        })
      }
    }

    // Step 3: merge + apply client-side filters (stain, surface, outcome)
    const results: SolveHistoryRow[] = []
    for (const e of events) {
      const payload = e.payload ?? {}
      const req = reqMap.get(e.correlation_id) ?? null
      const stain =
        (typeof payload.stain === 'string' ? payload.stain : null) ?? req?.stain ?? null
      const surface =
        (typeof payload.surface === 'string' ? payload.surface : null) ?? req?.surface ?? null
      if (stainFilter && (!stain || !stain.toLowerCase().includes(stainFilter))) continue
      if (surfaceFilter && (!surface || !surface.toLowerCase().includes(surfaceFilter))) continue
      const outcomeInfo = outcomeMap.get(e.correlation_id) ?? null
      if (outcomeFilter && outcomeInfo?.outcome !== outcomeFilter) continue
      results.push({
        correlation_id: e.correlation_id,
        stain,
        surface,
        procedure_id: typeof payload.procedure_id === 'string' ? payload.procedure_id : null,
        procedure_type: typeof payload.procedure_type === 'string' ? payload.procedure_type : null,
        procedure_title: typeof payload.procedure_title === 'string' ? payload.procedure_title : null,
        source: typeof payload.source === 'string' ? payload.source : null,
        confidence: typeof payload.confidence === 'number' ? payload.confidence : null,
        tier: typeof payload.tier === 'number' ? payload.tier : null,
        served_at: e.created_at,
        outcome: outcomeInfo?.outcome ?? null,
        outcome_notes: outcomeInfo?.notes ?? null,
        outcome_reported_at: outcomeInfo?.reported_at ?? null,
      })
    }

    return NextResponse.json({ ok: true, count: results.length, results })
  } catch (err) {
    console.error('[history] unexpected:', err instanceof Error ? err.message : err)
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 })
  }
}
