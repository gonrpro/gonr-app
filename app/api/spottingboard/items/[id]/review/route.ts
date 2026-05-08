// app/api/spottingboard/items/[id]/review/route.ts
//
// TASK-161 — supervisor review endpoint.
// POST /api/spottingboard/items/<item_id>/review
//
// Auth chain:
//   1. session email
//   2. plant_users membership for (plant_id, session_email) — must be owner|operator
//   3. validate transition is in the supervisor-allowed set
//   4. invoke apply_plant_brain_item_change RPC (SECURITY DEFINER + caller-supplied
//      actor; TASK-157 P0 fix ensures actor matches auth.jwt() email)
//
// The RPC handles atomicity: row update + plant_brain_promotion_log audit row
// land together; conflict_flag changes auto-flip runtime_eligible=false.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
  applyReviewTransition,
  validateReviewTransition,
  type ReviewChangeType,
} from '@/lib/spottingboard/review'

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
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      },
    )
    const { data } = await supabase.auth.getUser()
    return data.user?.email ?? null
  } catch {
    return null
  }
}

interface ReviewBody {
  plant_id?: string
  change_type?: string
  to_value?: unknown
  reason?: string
  source_basis?: unknown[]
  safety_label_override?: string
  metadata?: Record<string, unknown>
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: itemId } = await context.params
  if (!itemId) {
    return NextResponse.json({ error: 'item_id_required' }, { status: 400 })
  }

  const email = await getSessionEmail()
  if (!email) return NextResponse.json({ error: 'login_required' }, { status: 401 })

  let body: ReviewBody
  try {
    body = (await req.json()) as ReviewBody
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!body.plant_id) {
    return NextResponse.json({ error: 'plant_id_required' }, { status: 400 })
  }

  // Pre-validate WITHOUT invoking the RPC so we return clean field errors.
  const preValidation = validateReviewTransition({
    plant_id: body.plant_id,
    item_id: itemId,
    decided_by: email,
    change_type: body.change_type as ReviewChangeType | undefined,
    to_value: body.to_value,
    reason: body.reason,
  })
  if (preValidation) {
    return NextResponse.json(preValidation, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  // Membership + role check. Same pattern as TASK-158 capture route. The RPC
  // also re-checks (lower(p_decided_by) = lower(auth.jwt() email) per
  // TASK-157 P0 fix), but app-layer pre-check returns cleaner errors.
  const { data: membership, error: membershipErr } = await supabase
    .from('plant_users')
    .select('role')
    .eq('plant_id', body.plant_id)
    .eq('user_email', email.toLowerCase())
    .maybeSingle()

  if (membershipErr) {
    console.error('[/api/spottingboard/items/[id]/review POST] membership check failed', membershipErr)
    return NextResponse.json({ error: 'membership_check_failed' }, { status: 503 })
  }

  if (!membership) {
    return NextResponse.json(
      { error: 'not_a_plant_member', plant_id: body.plant_id },
      { status: 403 },
    )
  }

  const role = (membership as { role: string }).role
  if (role !== 'owner' && role !== 'operator') {
    return NextResponse.json(
      { error: 'role_insufficient', role, required: ['owner', 'operator'] },
      { status: 403 },
    )
  }

  const result = await applyReviewTransition(
    {
      plant_id: body.plant_id,
      item_id: itemId,
      decided_by: email,
      change_type: body.change_type as ReviewChangeType,
      to_value: body.to_value,
      reason: body.reason!,
      source_basis: body.source_basis,
      safety_label_override: body.safety_label_override as never,
      metadata: body.metadata,
    },
    { client: supabase },
  )

  if (!result.ok) {
    return NextResponse.json(result, {
      status: result.error.includes('not owner/operator') || result.error.includes('not found')
        ? 403
        : result.error.includes('decided_by required')
          ? 400
          : 500,
    })
  }

  return NextResponse.json(
    {
      ok: true,
      rpc_result: result.rpc_result,
    },
    { status: 200 },
  )
}
