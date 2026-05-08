// lib/spottingboard/items.ts (server-only) — TASK-160 update
//
// TASK-158 minimum-loop scope: raw chemistry_rule capture, fail-closed defaults.
// TASK-160 update (Atlas 2026-05-07): classifier runs BEFORE insert. Hard-block
// match downgrades safety_label + raises risk_tier; appends conflict_flags.
// Classifier never UPGRADES — only quarantines.
//
// Atlas TASK-158 lock — defaults at insert (raw capture, no classifier):
//   authority_class    = plant-local
//   feed_mode          = private-only      (LOCKED at capture)
//   review_status      = unreviewed        (LOCKED at capture)
//   safety_label       = needs_source_review (LOCKED at capture, EXCEPT classifier downgrades to unsafe_do_not_use on hard_block)
//   risk_tier          = requires-supervisor (chemistry floor; classifier may raise to high-risk / claim-sensitive)
//   runtime_eligible   = false             (LOCKED at capture)
//   promotion_status   = never-promoted    (LOCKED at capture)
//
// Caller is responsible for verifying plant_users membership before invoking.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { PlantBrainItemModule } from './types'
import { classifyCapturedRow, getPatternConfigVersion, type PatternMatch } from './classifier'

function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('[spottingboard/items] Missing Supabase service-role credentials')
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

// ──────────────────────────────────────────────────────────────────────────────
// Capture input shape
// ──────────────────────────────────────────────────────────────────────────────

export interface CaptureChemistryRuleInput {
  plant_id: string
  captured_by: string                  // session email
  title: string                        // operator-provided
  body: string                         // operator-provided rule text
  stain_scope: string[]                // at least one of stain/fabric/chemistry per TASK-152 §2.1
  fabric_scope: string[]
  chemistry_scope: string[]
  source_evidence?: Array<{
    kind: 'citation' | 'attachment' | 'url' | 'book'
    label: string
    ref: string
  }>
}

export interface CaptureResult {
  ok: true
  item_id: string
  /** Actual governance fields written after fail-closed classifier overrides. */
  applied_state: {
    authority_class: 'plant-local'
    feed_mode: 'private-only'
    review_status: 'unreviewed'
    safety_label: 'needs_source_review' | 'unsafe_do_not_use' | 'escalation_required'
    risk_tier: 'requires-supervisor' | 'high-risk' | 'claim-sensitive'
    runtime_eligible: false
    conflict_flags: Array<{
      flag_id: string
      kind: 'source_default_conflict'
      detail: string
      raised_by: 'classifier'
      raised_at: string
    }>
  }
  /** TASK-160: surfaces classifier match info to the UI */
  classifier?: {
    hard_block: boolean
    matches: PatternMatch[]
    pattern_config_version: string
  }
}

export interface CaptureError {
  ok: false
  error: string
  field?: string
}

// ──────────────────────────────────────────────────────────────────────────────
// Validation
// ──────────────────────────────────────────────────────────────────────────────

export function validateChemistryRuleInput(
  input: Partial<CaptureChemistryRuleInput>,
): CaptureError | null {
  if (!input.plant_id) return { ok: false, error: 'plant_id_required' }
  if (!input.captured_by) return { ok: false, error: 'captured_by_required' }

  const title = (input.title ?? '').trim()
  if (!title) return { ok: false, error: 'title_required', field: 'title' }
  if (title.length > 200) return { ok: false, error: 'title_too_long', field: 'title' }

  const body = (input.body ?? '').trim()
  if (!body) return { ok: false, error: 'body_required', field: 'body' }
  if (body.length > 5000) return { ok: false, error: 'body_too_long', field: 'body' }

  const stainScope = input.stain_scope ?? []
  const fabricScope = input.fabric_scope ?? []
  const chemistryScope = input.chemistry_scope ?? []

  const hasAnyScope = stainScope.length + fabricScope.length + chemistryScope.length > 0
  if (!hasAnyScope) {
    return {
      ok: false,
      error: 'scope_required',
      field: 'scope',
    }
  }

  return null
}

// ──────────────────────────────────────────────────────────────────────────────
// Capture: insert a chemistry_rule row with fail-closed defaults + classifier
// ──────────────────────────────────────────────────────────────────────────────

export async function captureChemistryRule(
  input: CaptureChemistryRuleInput,
  options: { client?: SupabaseClient } = {},
): Promise<CaptureResult | CaptureError> {
  const validation = validateChemistryRuleInput(input)
  if (validation) return validation

  const supabase = options.client ?? getSupabaseAdmin()
  const now = new Date().toISOString()

  // TASK-160: run classifier BEFORE building the insert row. Pure function;
  // returns overrides we apply when hard_block matches.
  const classifier = classifyCapturedRow({
    title: input.title,
    body: input.body,
    stain_scope: input.stain_scope,
    fabric_scope: input.fabric_scope,
    chemistry_scope: input.chemistry_scope,
  })

  const tenantProvenance = {
    plant_id: input.plant_id,
    captured_by: input.captured_by.toLowerCase(),
    captured_at: now,
    capture_method: 'operator_add_rule',
    intended_module: 'chemistry_rule',
    module_chosen_by: 'operator',
    module_overridden: false,
    stain_scope: input.stain_scope,
    fabric_scope: input.fabric_scope,
    chemistry_scope: input.chemistry_scope,
    // TASK-160: record classifier version + matches in provenance for audit
    classifier_version: getPatternConfigVersion(),
    classifier_matches: classifier.matches.map((m) => ({
      pattern_id: m.pattern_id,
      classification: m.classification,
    })),
  }

  // Apply classifier overrides (NEVER upgrade; only downgrade/quarantine)
  const safetyLabel = classifier.overrides.safety_label ?? 'needs_source_review'
  const riskTier = classifier.overrides.risk_tier ?? 'requires-supervisor'
  const conflictFlags = classifier.overrides.conflict_flags_append ?? []

  const row = {
    plant_id: input.plant_id,
    module: 'chemistry_rule' as PlantBrainItemModule,
    title: input.title.trim(),
    body: input.body.trim(),
    authority_class: 'plant-local',
    feed_mode: 'private-only',
    consent: { mode: 'private-only' },
    tenant_provenance: tenantProvenance,
    review_status: 'unreviewed',
    promotion_status: 'never-promoted',
    risk_tier: riskTier,
    source_evidence: input.source_evidence ?? [],
    conflict_flags: conflictFlags,
    safety_label: safetyLabel,
    runtime_eligible: false,
    created_by: input.captured_by.toLowerCase(),
  }

  const { data, error } = await supabase
    .from('plant_brain_items')
    .insert(row)
    .select('id')
    .single()

  if (error) {
    console.error('[captureChemistryRule] insert failed', error)
    return { ok: false, error: 'db_error' }
  }

  return {
    ok: true,
    item_id: (data as { id: string }).id,
    applied_state: {
      authority_class: 'plant-local',
      feed_mode: 'private-only',
      review_status: 'unreviewed',
      safety_label: safetyLabel,
      risk_tier: riskTier,
      runtime_eligible: false,
      conflict_flags: conflictFlags,
    },
    classifier: {
      hard_block: classifier.hard_block,
      matches: classifier.matches,
      pattern_config_version: getPatternConfigVersion(),
    },
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Read: list a plant's plant_brain_items for Brain Library (unchanged from TASK-158)
// ──────────────────────────────────────────────────────────────────────────────

export interface BrainLibraryItem {
  id: string
  module: PlantBrainItemModule
  title: string | null
  body: string
  authority_class: string
  risk_tier: string
  review_status: string
  safety_label: string
  conflict_flags: unknown[]
  runtime_eligible: boolean
  created_at: string
  reviewer_email: string | null
}

export async function listPlantBrainItems(
  plant_id: string,
  options: { client?: SupabaseClient; limit?: number } = {},
): Promise<BrainLibraryItem[]> {
  const supabase = options.client ?? getSupabaseAdmin()
  const limit = options.limit ?? 100

  const { data, error } = await supabase
    .from('plant_brain_items')
    .select(
      'id, module, title, body, authority_class, risk_tier, review_status, safety_label, conflict_flags, runtime_eligible, created_at, reviewer_email',
    )
    .eq('plant_id', plant_id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[listPlantBrainItems] read failed', error)
    return []
  }

  return (data ?? []) as BrainLibraryItem[]
}
