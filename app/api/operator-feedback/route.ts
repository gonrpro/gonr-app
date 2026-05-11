// TASK-144 — POST /api/operator-feedback
// Drop-in for Next.js App Router at app/api/operator-feedback/route.ts
// Lab delivers this file; Atlas integrates into ~/Desktop/gonr-app/.

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const ALLOWED_F1 = ['clear', 'partly_clear', 'not_clear', 'wrong'] as const
const ALLOWED_F2 = ['matched', 'partly_matched', 'didnt_match', 'missing_when_needed'] as const
const ALLOWED_F3 = ['clear', 'unclear', 'missing'] as const
const ALLOWED_F4 = ['clear', 'partly_clear', 'not_clear', 'didnt_notice'] as const
const ALLOWED_F5 = ['clear', 'partly_clear', 'not_clear', 'looked_up'] as const
const ALLOWED_F6 = ['yes', 'no'] as const
const ALLOWED_SURFACE = ['gonr-runtime', 'spottingboard'] as const
const ALLOWED_TRIGGER = ['post-recommendation', 'manual'] as const
const ALLOWED_DEVICE = ['phone', 'tablet', 'desktop'] as const

function validate<T extends readonly string[]>(value: unknown, allowed: T): T[number] | null {
  if (typeof value !== 'string') return null
  return (allowed as readonly string[]).includes(value) ? (value as T[number]) : null
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const plant_id = typeof body.plant_id === 'string' ? body.plant_id : null
  if (!plant_id) {
    return NextResponse.json({ error: 'plant_id_required' }, { status: 400 })
  }

  const surface = validate(body.surface, ALLOWED_SURFACE)
  const trigger = validate(body.trigger, ALLOWED_TRIGGER)
  if (!surface || !trigger) {
    return NextResponse.json({ error: 'invalid_surface_or_trigger' }, { status: 400 })
  }

  const protocol_id = typeof body.protocol_id === 'string' ? body.protocol_id : null
  const dismissed = body.dismissed === true

  const row = {
    plant_id,
    user_id: user.id,
    protocol_id,
    surface,
    trigger,
    recommendation_clarity: validate(body.recommendation_clarity, ALLOWED_F1),
    recommendation_note: typeof body.recommendation_note === 'string' ? body.recommendation_note : null,
    material_risk_match: validate(body.material_risk_match, ALLOWED_F2),
    material_risk_note: typeof body.material_risk_note === 'string' ? body.material_risk_note : null,
    stop_escalate_clarity: validate(body.stop_escalate_clarity, ALLOWED_F3),
    stop_escalate_note: typeof body.stop_escalate_note === 'string' ? body.stop_escalate_note : null,
    provenance_clarity: validate(body.provenance_clarity, ALLOWED_F4),
    provenance_note: typeof body.provenance_note === 'string' ? body.provenance_note : null,
    chemistry_clarity: validate(body.chemistry_clarity, ALLOWED_F5),
    chemistry_note: typeof body.chemistry_note === 'string' ? body.chemistry_note : null,
    would_use_real_garment: validate(body.would_use_real_garment, ALLOWED_F6),
    would_use_note: typeof body.would_use_note === 'string' ? body.would_use_note : null,
    device: validate(body.device, ALLOWED_DEVICE),
    app_version: typeof body.app_version === 'string' ? body.app_version : null,
    dismissed,
  }

  // RLS enforces plant ownership; this insert fails if user is not in plant_users for plant_id
  const { error } = await supabase.from('operator_feedback').insert(row)
  if (error) {
    return NextResponse.json({ error: 'insert_failed', detail: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
