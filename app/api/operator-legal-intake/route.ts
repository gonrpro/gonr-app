// TASK-144 — POST /api/operator-legal-intake
// Drop-in for Next.js App Router at app/api/operator-legal-intake/route.ts
// Lab delivers this file; Atlas integrates into ~/Desktop/gonr-app/.
// Separate from /api/operator-feedback to keep legal-sensitive content isolated.

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const ALLOWED_CATEGORY = ['refund', 'billing-dispute', 'damaged-garment', 'terms-question', 'other-legal'] as const
const ALLOWED_CONTACT_METHOD = ['email', 'phone', 'in-app'] as const

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

  const category = validate(body.category, ALLOWED_CATEGORY)
  if (!category) {
    return NextResponse.json({ error: 'invalid_category' }, { status: 400 })
  }

  const description = typeof body.description === 'string' ? body.description.trim() : ''
  if (description.length === 0) {
    return NextResponse.json({ error: 'description_required' }, { status: 400 })
  }
  if (description.length > 5000) {
    return NextResponse.json({ error: 'description_too_long' }, { status: 400 })
  }

  const contact_method = validate(body.contact_method, ALLOWED_CONTACT_METHOD)
  const contact_value = typeof body.contact_value === 'string' && body.contact_value.trim().length > 0
    ? body.contact_value.trim()
    : null

  const row = {
    plant_id,
    user_id: user.id,
    category,
    description,
    contact_method,
    contact_value,
  }

  const { error } = await supabase.from('operator_legal_intake').insert(row)
  if (error) {
    return NextResponse.json({ error: 'insert_failed', detail: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
