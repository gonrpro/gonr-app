// lib/spottingboard/review.ts (server-only)
//
// Supervisor review helpers for SpottingBoard. TASK-161 (Atlas route 2026-05-07):
// supervisor (owner|operator) can transition plant_brain_items rows through
// review_status, safety_label (within plant-local bounds), feed_mode (private-only
// → review-candidate), and add conflict_flags. Every transition writes an audit
// row to plant_brain_promotion_log via the SECURITY DEFINER RPC
// apply_plant_brain_item_change (TASK-150 + TASK-157 patches).
//
// Constraints (TASK-152 §7.1 + Atlas TASK-161 lock):
//   - Supervisor cannot set authority_class=source-backed (SB-only)
//   - Supervisor cannot set feed_mode=promoted-central (DDL blocks)
//   - Supervisor cannot flip runtime_eligible=true directly (RPC recomputes
//     from gate per DDL composite check after every transition)
//   - SB review required when target differs from intended_module, when
//     row carries high-risk/claim-sensitive, when safety_label=unsafe_do_not_use,
//     or when source_default_conflict flag is present (TASK-152 §7.1) — for
//     TASK-161 minimum loop, supervisor can't promote across modules at all
//     (only review_status / safety_label / feed_mode transitions); module
//     promotion is a follow-up ticket.
//
// Caller (route handler) is responsible for verifying plant_users membership
// + role (owner|operator) BEFORE invoking these helpers.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { BrainLibraryItem } from './items'
import type { SafetyLabel } from './types'

function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('[spottingboard/review] Missing Supabase service-role credentials')
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

// ──────────────────────────────────────────────────────────────────────────────
// Allowed transitions for the minimum-loop supervisor surface
//
// TASK-161 ships only review_status transitions + safety_label upgrade to
// reviewed_for_plant_use + feed_mode request-review. Module promotion,
// authority_class changes, and source-backed marks are out of scope (require
// SB review per TASK-152 §7.1 — separate ticket).
// ──────────────────────────────────────────────────────────────────────────────

export type ReviewChangeType =
  | 'review_status'
  | 'safety_label'
  | 'feed_mode'
  | 'conflict_flags'

export const ALLOWED_REVIEW_STATUS_TRANSITIONS = [
  'in-review',
  'reviewed-accept',
  'reviewed-reject',
] as const

export const SUPERVISOR_ALLOWED_SAFETY_LABEL_TRANSITIONS = [
  // Supervisor can move from needs_source_review to reviewed_for_plant_use
  // (plant-local trust, not source-backed). Cannot mark source_backed (SB-only).
  // Cannot mark unsafe_do_not_use directly (classifier or SB-only).
  'reviewed_for_plant_use',
] as const

export const SUPERVISOR_ALLOWED_FEED_MODE_TRANSITIONS = [
  // Supervisor can request SB review by moving private-only to review-candidate.
  // Cannot set promoted-central (DDL blocks; SB only via separate path).
  'review-candidate',
] as const

// ──────────────────────────────────────────────────────────────────────────────
// Validation
// ──────────────────────────────────────────────────────────────────────────────

export interface ReviewTransitionInput {
  plant_id: string
  item_id: string
  decided_by: string                     // session email
  change_type: ReviewChangeType
  to_value: unknown                      // shape depends on change_type; validated below
  reason: string
  source_basis?: unknown[]
  safety_label_override?: SafetyLabel    // RPC requires p_safety_label parameter
  metadata?: Record<string, unknown>
}

export interface ReviewTransitionError {
  ok: false
  error: string
  field?: string
}

export interface ReviewTransitionResult {
  ok: true
  rpc_result: unknown                    // RPC returns jsonb with applied state
}

export function validateReviewTransition(
  input: Partial<ReviewTransitionInput>,
): ReviewTransitionError | null {
  if (!input.plant_id) return { ok: false, error: 'plant_id_required' }
  if (!input.item_id) return { ok: false, error: 'item_id_required' }
  if (!input.decided_by) return { ok: false, error: 'decided_by_required' }
  if (!input.change_type) return { ok: false, error: 'change_type_required' }

  const reason = (input.reason ?? '').trim()
  if (!reason) {
    return { ok: false, error: 'reason_required', field: 'reason' }
  }
  if (reason.length > 2000) {
    return { ok: false, error: 'reason_too_long', field: 'reason' }
  }

  switch (input.change_type) {
    case 'review_status': {
      const v = String(input.to_value ?? '')
      if (!ALLOWED_REVIEW_STATUS_TRANSITIONS.includes(v as never)) {
        return {
          ok: false,
          error: 'invalid_review_status_transition',
          field: 'to_value',
        }
      }
      break
    }
    case 'safety_label': {
      const v = String(input.to_value ?? '')
      if (!SUPERVISOR_ALLOWED_SAFETY_LABEL_TRANSITIONS.includes(v as never)) {
        // Supervisor can't set source_backed, unsafe_do_not_use, or escalation_required.
        return {
          ok: false,
          error: 'safety_label_transition_requires_sb_review',
          field: 'to_value',
        }
      }
      break
    }
    case 'feed_mode': {
      const v = String(input.to_value ?? '')
      if (!SUPERVISOR_ALLOWED_FEED_MODE_TRANSITIONS.includes(v as never)) {
        return {
          ok: false,
          error: 'feed_mode_transition_requires_sb_review',
          field: 'to_value',
        }
      }
      break
    }
    case 'conflict_flags': {
      // Append-only: caller passes the FULL new conflict_flags array (the RPC
      // expects the complete to_value, not just the addition). Just sanity-
      // check it's an array.
      if (!Array.isArray(input.to_value)) {
        return { ok: false, error: 'conflict_flags_must_be_array', field: 'to_value' }
      }
      break
    }
    default:
      return { ok: false, error: 'unsupported_change_type' }
  }

  return null
}

// ──────────────────────────────────────────────────────────────────────────────
// Apply: invoke the SECURITY DEFINER RPC
// ──────────────────────────────────────────────────────────────────────────────

export async function applyReviewTransition(
  input: ReviewTransitionInput,
  options: { client?: SupabaseClient } = {},
): Promise<ReviewTransitionResult | ReviewTransitionError> {
  const validation = validateReviewTransition(input)
  if (validation) return validation

  const supabase = options.client ?? getSupabaseAdmin()

  const safetyLabelForLog: SafetyLabel =
    input.safety_label_override ??
    (input.change_type === 'safety_label'
      ? (input.to_value as SafetyLabel)
      : 'needs_source_review')

  const { data, error } = await supabase.rpc('apply_plant_brain_item_change', {
    p_item_id: input.item_id,
    p_plant_id: input.plant_id,
    p_change_type: input.change_type,
    p_to_value:
      input.change_type === 'conflict_flags'
        ? input.to_value
        : input.to_value,                 // RPC accepts jsonb; supabase-js wraps
    p_reason: input.reason,
    p_source_basis: input.source_basis ?? [],
    p_safety_label: safetyLabelForLog,
    p_decided_by: input.decided_by.toLowerCase(),
    p_metadata: input.metadata ?? {},
  })

  if (error) {
    console.error('[applyReviewTransition] RPC failed', error)
    // RPC raises exceptions for validation failures (e.g. non-member, invalid
    // change_type, constraint violations). Surface the message to the caller
    // since the RPC's exceptions are intentionally informative.
    return {
      ok: false,
      error: error.message ?? 'rpc_error',
    }
  }

  return { ok: true, rpc_result: data }
}

// ──────────────────────────────────────────────────────────────────────────────
// Read: list rows in the supervisor review queue (unreviewed + in-review)
// ──────────────────────────────────────────────────────────────────────────────

export async function listReviewQueue(
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
    // Queue includes fresh review rows plus accepted rows still waiting for the
    // separate plant-use safety mark. Without this, the "Mark reviewed for
    // plant use" action is unreachable because it only appears after
    // review_status=reviewed-accept.
    .or('review_status.in.(unreviewed,in-review),and(review_status.eq.reviewed-accept,safety_label.eq.needs_source_review)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[listReviewQueue] read failed', error)
    return []
  }

  return (data ?? []) as BrainLibraryItem[]
}
