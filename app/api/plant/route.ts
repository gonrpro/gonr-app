// app/api/plant/route.ts
// TASK-023 Phase A — Plant CRUD for the Plant Profile Wizard.
//
// GET    → returns current user's plant + role, or null if no plant.
// POST   → create a new plant for current user (auto-adds them as owner).
//          Body: { name: string }
// PATCH  → update wizard answers on user's plant. Owner role required.
//          Body: { solvent?, board?, skill_level?, bleach_allowed?, house_rules?,
//                  wizard_completed?: boolean }
//
// Service-role client bypasses RLS for these endpoints — auth check happens
// up-front via session cookie. Same pattern as other authed POST routes.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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
    return data.user?.email ?? null
  } catch {
    return null
  }
}

export async function GET() {
  const email = await getSessionEmail()
  if (!email) return NextResponse.json({ error: 'login_required' }, { status: 401 })

  try {
    const supabase = getSupabaseAdmin()
    const { data: membership } = await supabase
      .from('plant_users')
      .select('plant_id, role')
      .eq('user_email', email.toLowerCase())
      .maybeSingle()

    if (!membership) {
      return NextResponse.json({ plant: null, role: null })
    }

    const { data: plant } = await supabase
      .from('plants')
      .select('*')
      .eq('id', (membership as { plant_id: string }).plant_id)
      .maybeSingle()

    return NextResponse.json({
      plant,
      role: (membership as { role: string }).role,
    })
  } catch (err) {
    console.warn('[/api/plant GET] error:', err)
    return NextResponse.json({ error: 'temporary_error' }, { status: 503 })
  }
}

export async function POST(req: Request) {
  const email = await getSessionEmail()
  if (!email) return NextResponse.json({ error: 'login_required' }, { status: 401 })

  let body: { name?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const name = (body.name || '').trim()
  if (!name) return NextResponse.json({ error: 'name_required' }, { status: 400 })

  try {
    const supabase = getSupabaseAdmin()

    // Refuse if user already belongs to a plant — multi-plant per user out of scope for Phase A.
    const { data: existing } = await supabase
      .from('plant_users')
      .select('plant_id')
      .eq('user_email', email.toLowerCase())
      .maybeSingle()
    if (existing) {
      return NextResponse.json({ error: 'already_in_plant' }, { status: 409 })
    }

    const { data: plant, error: plantErr } = await supabase
      .from('plants')
      .insert({ name, owner_email: email.toLowerCase() })
      .select()
      .single()
    if (plantErr || !plant) {
      return NextResponse.json({ error: 'plant_create_failed' }, { status: 500 })
    }

    const { error: memberErr } = await supabase.from('plant_users').insert({
      plant_id: (plant as { id: string }).id,
      user_email: email.toLowerCase(),
      role: 'owner',
    })
    if (memberErr) {
      // Roll back the plant since membership failed.
      await supabase.from('plants').delete().eq('id', (plant as { id: string }).id)
      return NextResponse.json({ error: 'membership_create_failed' }, { status: 500 })
    }

    return NextResponse.json({ plant, role: 'owner' }, { status: 201 })
  } catch (err) {
    console.warn('[/api/plant POST] error:', err)
    return NextResponse.json({ error: 'temporary_error' }, { status: 503 })
  }
}

export async function PATCH(req: Request) {
  const email = await getSessionEmail()
  if (!email) return NextResponse.json({ error: 'login_required' }, { status: 401 })

  let body: {
    name?: string              // plant name (rename allowed via Phase D /profile re-edit)
    solvents?: string[]        // multi-select array (TASK-023 Phase C)
    solvent_other?: string     // free text when 'other' is in solvents[]
    solvent?: string           // legacy single-select, accepted for back-compat
    board?: string
    skill_level?: string
    bleach_allowed?: boolean
    house_rules?: string
    wizard_completed?: boolean
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  try {
    const supabase = getSupabaseAdmin()

    const { data: membership } = await supabase
      .from('plant_users')
      .select('plant_id, role')
      .eq('user_email', email.toLowerCase())
      .maybeSingle()
    if (!membership) {
      return NextResponse.json({ error: 'no_plant' }, { status: 404 })
    }
    const m = membership as { plant_id: string; role: string }
    if (m.role !== 'owner') {
      return NextResponse.json({ error: 'owner_only' }, { status: 403 })
    }

    const updates: Record<string, unknown> = {}
    // Plant name rename (TASK-023 Phase D). Trim, length cap.
    if (typeof body.name === 'string' && body.name.trim().length > 0) {
      updates.name = body.name.trim().slice(0, 100)
    }
    // Multi-solvent (TASK-023 Phase C). Validate each entry against the known
    // slug list to prevent arbitrary writes; reject anything outside the set.
    if (Array.isArray(body.solvents)) {
      const ALLOWED_SOLVENTS = new Set([
        'perc', 'hydrocarbon', 'green-earth', 'solvon-k4',
        'sensene', 'intense', 'co2', 'wet', 'other',
      ])
      const cleaned = body.solvents
        .filter(s => typeof s === 'string')
        .map(s => s.trim().toLowerCase())
        .filter(s => ALLOWED_SOLVENTS.has(s))
      updates.solvents = cleaned
    }
    if (typeof body.solvent_other === 'string') {
      updates.solvent_other = body.solvent_other.trim().slice(0, 100)
    }
    // Legacy single-select still accepted for back-compat (writes to solvent col).
    if (typeof body.solvent === 'string') updates.solvent = body.solvent
    if (typeof body.board === 'string') updates.board = body.board
    if (typeof body.skill_level === 'string') updates.skill_level = body.skill_level
    if (typeof body.bleach_allowed === 'boolean') updates.bleach_allowed = body.bleach_allowed
    if (typeof body.house_rules === 'string') updates.house_rules = body.house_rules
    if (body.wizard_completed === true) updates.wizard_completed_at = new Date().toISOString()

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'no_updates' }, { status: 400 })
    }

    const { data: plant, error: updateErr } = await supabase
      .from('plants')
      .update(updates)
      .eq('id', m.plant_id)
      .select()
      .single()

    if (updateErr) {
      return NextResponse.json({ error: 'update_failed' }, { status: 500 })
    }

    return NextResponse.json({ plant })
  } catch (err) {
    console.warn('[/api/plant PATCH] error:', err)
    return NextResponse.json({ error: 'temporary_error' }, { status: 503 })
  }
}
