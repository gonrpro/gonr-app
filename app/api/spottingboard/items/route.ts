// app/api/spottingboard/items/route.ts
//
// TASK-158 minimum-loop POST: capture a chemistry_rule into plant_brain_items.
//
// Auth chain:
//   1. session email via getSessionEmail (existing pattern from /api/plant/route.ts)
//   2. plant_users membership for (plant_id, session_email) — must be owner|operator
//      (spotter is read-only per TASK-152 §3 capture-surface matrix)
//   3. Validate input + insert with fail-closed defaults via captureChemistryRule
//
// Atlas TASK-158 lock: raw capture, no classifier. Defaults locked at:
// authority_class=plant-local, feed_mode=private-only, review_status=unreviewed,
// safety_label=needs_source_review, risk_tier=requires-supervisor (chemistry floor),
// runtime_eligible=false, promotion_status=never-promoted.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { captureChemistryRule, validateChemistryRuleInput } from '@/lib/spottingboard/items'

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

interface CaptureBody {
  plant_id?: string
  module?: string
  title?: string
  body?: string
  stain_scope?: string[]
  fabric_scope?: string[]
  chemistry_scope?: string[]
  source_evidence?: Array<{
    kind: 'citation' | 'attachment' | 'url' | 'book'
    label: string
    ref: string
  }>
}

export async function POST(req: NextRequest) {
  const email = await getSessionEmail()
  if (!email) return NextResponse.json({ error: 'login_required' }, { status: 401 })

  let body: CaptureBody
  try {
    body = (await req.json()) as CaptureBody
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  // TASK-158 minimum loop only supports chemistry_rule. Future tasks add
  // procedure / escalation_rule / etc. via classifier.
  if (body.module && body.module !== 'chemistry_rule') {
    return NextResponse.json(
      { error: 'unsupported_module', supported: ['chemistry_rule'] },
      { status: 400 },
    )
  }

  if (!body.plant_id) {
    return NextResponse.json({ error: 'plant_id_required' }, { status: 400 })
  }

  // Pre-validate without hitting DB so we return a clean field-level error.
  const preValidation = validateChemistryRuleInput({
    plant_id: body.plant_id,
    captured_by: email,
    title: body.title,
    body: body.body,
    stain_scope: body.stain_scope,
    fabric_scope: body.fabric_scope,
    chemistry_scope: body.chemistry_scope,
  })
  if (preValidation) {
    return NextResponse.json(preValidation, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  // Membership check: session email must be owner|operator of plant_id.
  // TASK-152 §3 capture-surface matrix: spotter role is read-only.
  // Lower-cased to match plant_users canonical lowercase (TASK-144).
  const { data: membership, error: membershipErr } = await supabase
    .from('plant_users')
    .select('role')
    .eq('plant_id', body.plant_id)
    .eq('user_email', email.toLowerCase())
    .maybeSingle()

  if (membershipErr) {
    console.error('[/api/spottingboard/items POST] membership check failed', membershipErr)
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

  // Capture.
  const result = await captureChemistryRule(
    {
      plant_id: body.plant_id,
      captured_by: email,
      title: body.title!,
      body: body.body!,
      stain_scope: body.stain_scope ?? [],
      fabric_scope: body.fabric_scope ?? [],
      chemistry_scope: body.chemistry_scope ?? [],
      source_evidence: body.source_evidence,
    },
    { client: supabase },
  )

  if (!result.ok) {
    return NextResponse.json(result, { status: result.error === 'db_error' ? 500 : 400 })
  }

  return NextResponse.json(
    {
      ok: true,
      item_id: result.item_id,
      // Echo the ACTUAL governance state written after classifier overrides.
      // This must not imply a rust+bleach hard-block landed as ordinary
      // needs_source_review.
      governance_applied: result.applied_state,
      classifier: result.classifier,
    },
    { status: 201 },
  )
}
