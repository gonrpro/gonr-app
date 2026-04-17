// lib/auth/getUserPlant.ts
// TASK-023 Phase C — server-side helper to fetch the current user's plant.
//
// Used by /api/solve to pass plant_id into lookupProtocol and apply
// plant-level filters (bleach, solvent, etc.).
//
// Service-role client bypasses RLS; route handlers that call this must have
// already verified the email via getSessionEmail() / checkProAccess().

import { createClient } from '@supabase/supabase-js'

export interface UserPlant {
  plantId: string
  name: string
  solvent: string | null              // legacy single-select (deprecated, kept for back-compat)
  solvents: string[]                  // multi-select (TASK-023 Phase C)
  solventOther: string | null         // free text when 'other' is in solvents[]
  board: string | null
  skillLevel: string | null
  bleachAllowed: boolean
  houseRules: string | null
  wizardCompletedAt: string | null
  role: 'owner' | 'operator' | 'spotter'
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase admin credentials not configured')
  return createClient(url, key)
}

/**
 * Returns the user's plant if they belong to one. Null otherwise.
 * Safe to call without a plant — anon/no-plant users get null, not an error.
 */
export async function getUserPlant(email: string | null | undefined): Promise<UserPlant | null> {
  if (!email) return null
  try {
    const supabase = getSupabaseAdmin()
    const { data: membership } = await supabase
      .from('plant_users')
      .select('plant_id, role')
      .eq('user_email', email.toLowerCase())
      .maybeSingle()
    if (!membership) return null

    const m = membership as { plant_id: string; role: string }
    const { data: plant } = await supabase
      .from('plants')
      .select('*')
      .eq('id', m.plant_id)
      .maybeSingle()
    if (!plant) return null

    const p = plant as {
      id: string; name: string
      solvent: string | null
      solvents: string[] | null
      solvent_other: string | null
      board: string | null; skill_level: string | null
      bleach_allowed: boolean; house_rules: string | null
      wizard_completed_at: string | null
    }

    return {
      plantId: p.id,
      name: p.name,
      solvent: p.solvent,
      solvents: Array.isArray(p.solvents) ? p.solvents : [],
      solventOther: p.solvent_other,
      board: p.board,
      skillLevel: p.skill_level,
      bleachAllowed: p.bleach_allowed,
      houseRules: p.house_rules,
      wizardCompletedAt: p.wizard_completed_at,
      role: (m.role as 'owner' | 'operator' | 'spotter'),
    }
  } catch {
    // Plant lookup is best-effort. If Supabase errors, solve gracefully degrades
    // to canonical behavior — don't fail the whole request.
    return null
  }
}
