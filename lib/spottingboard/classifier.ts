// lib/spottingboard/classifier.ts (server-side, pure)
//
// TASK-160 — fail-closed classifier for SpottingBoard captures.
//
// Atlas TASK-160 lock 2026-05-07: classifier consumes SB's unsafe-patterns.json.
// Fail-closed only — unsafe match can DOWNGRADE/QUARANTINE the row, NEVER PROMOTE.
//   - Match → set safety_label=unsafe_do_not_use, raise risk_tier to high-risk,
//     append a conflict_flags entry of kind=source_default_conflict.
//   - No match → row keeps the operator-supplied + TASK-158 fail-closed defaults.
//
// The classifier itself does not change `module` (which TASK-158 currently
// pins to chemistry_rule), `authority_class` (stays plant-local — operator's
// row), `feed_mode` (locked private-only), `review_status` (locked unreviewed),
// or `runtime_eligible` (locked false). All it does is raise the safety label
// + risk tier when content matches an SB hard-ban so the row CANNOT later be
// promoted to runtime guidance via the DDL composite check
// `plant_brain_items_unsafe_not_runtime`.
//
// SB content authority: `unsafe-patterns.json` is owned by Stain Brain. Lab
// owns plumbing only — pattern updates land in the JSON, not in this file.

import unsafePatternsRaw from './unsafe-patterns.json'

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export type Classification =
  | 'unsafe_or_contraindicated'
  | 'supervisor_only'
  | 'claim_sensitive'
  | 'unverified_tribal'

export interface UnsafePattern {
  id: string
  match_terms_any: string[]
  match_terms_with_any?: string[]
  reason: string
  required_display: string
  classification: Classification
}

export interface ReviewRequiredPattern {
  id: string
  match_terms_any: string[]
  classification: Classification
  reason: string
}

export interface AuthorityMappingEntry {
  authority_class: string
  risk_tier: string
  review_status: string
}

export interface UnsafePatternsConfig {
  schema_name: string
  version: string
  date: string
  owner: string
  default_action: string
  authority_mapping: Record<string, AuthorityMappingEntry>
  hard_blocks: UnsafePattern[]
  review_required_patterns: ReviewRequiredPattern[]
  required_fields_before_runtime_guidance: string[]
  public_copy_rules: string[]
}

const PATTERNS = unsafePatternsRaw as unknown as UnsafePatternsConfig

// ──────────────────────────────────────────────────────────────────────────────
// Match results
// ──────────────────────────────────────────────────────────────────────────────

export interface PatternMatch {
  pattern_id: string
  classification: Classification
  reason: string
  required_display: string
  matched_terms: string[]
}

export interface ClassifierInput {
  /** Operator-supplied title — checked against patterns */
  title: string
  /** Operator-supplied body — checked against patterns */
  body: string
  /** Optional scope arrays — also checked */
  stain_scope?: string[]
  fabric_scope?: string[]
  chemistry_scope?: string[]
}

export interface ClassifierResult {
  /** Did at least one hard_blocks pattern match? */
  hard_block: boolean
  /** All matched patterns (hard_blocks + review_required_patterns) */
  matches: PatternMatch[]
  /**
   * Override fields the caller SHOULD apply to the row pre-insert when
   * hard_block=true. Caller is responsible for honoring; classifier never
   * mutates DB or input objects.
   */
  overrides: {
    safety_label?: 'unsafe_do_not_use' | 'escalation_required'
    risk_tier?: 'high-risk' | 'requires-supervisor' | 'claim-sensitive'
    conflict_flags_append?: Array<{
      flag_id: string
      kind: 'source_default_conflict'
      detail: string
      raised_by: 'classifier'
      raised_at: string
    }>
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Matching helpers
// ──────────────────────────────────────────────────────────────────────────────

/** Lowercased haystack assembled from all classifier-relevant input fields. */
function assembleHaystack(input: ClassifierInput): string {
  const parts: string[] = [
    input.title,
    input.body,
    ...(input.stain_scope ?? []),
    ...(input.fabric_scope ?? []),
    ...(input.chemistry_scope ?? []),
  ]
  return parts.join(' ').toLowerCase()
}

/** Returns the subset of `terms` (lowercased) that appear in `haystack`. */
function findMatchingTerms(haystack: string, terms: string[]): string[] {
  const matched: string[] = []
  for (const t of terms) {
    if (haystack.includes(t.toLowerCase())) matched.push(t)
  }
  return matched
}

/**
 * Tests one hard_block pattern against the haystack.
 *
 * Logic:
 *   - If `match_terms_any` is non-empty, at least one must hit.
 *   - If `match_terms_with_any` is also present, the AND condition is:
 *     at least one of EACH list must hit.
 *   - If `match_terms_with_any` is absent, the primary list is the only gate.
 *
 * Returns null on no match, or a PatternMatch on hit.
 */
function testHardBlock(
  pattern: UnsafePattern,
  haystack: string,
): PatternMatch | null {
  const primaryHits = findMatchingTerms(haystack, pattern.match_terms_any)
  if (primaryHits.length === 0) return null

  let secondaryHits: string[] = []
  if (pattern.match_terms_with_any && pattern.match_terms_with_any.length > 0) {
    secondaryHits = findMatchingTerms(haystack, pattern.match_terms_with_any)
    if (secondaryHits.length === 0) return null
  }

  return {
    pattern_id: pattern.id,
    classification: pattern.classification,
    reason: pattern.reason,
    required_display: pattern.required_display,
    matched_terms: [...primaryHits, ...secondaryHits],
  }
}

function testReviewRequired(
  pattern: ReviewRequiredPattern,
  haystack: string,
): PatternMatch | null {
  const hits = findMatchingTerms(haystack, pattern.match_terms_any)
  if (hits.length === 0) return null
  return {
    pattern_id: pattern.id,
    classification: pattern.classification,
    reason: pattern.reason,
    required_display: pattern.reason, // review_required_patterns lack a separate required_display
    matched_terms: hits,
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Public entry point
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Classifies a captured row's content against SB's unsafe-patterns.json.
 *
 * The classifier never writes to a DB and never mutates the input. It returns
 * the full match list plus the overrides the caller SHOULD apply pre-insert
 * to honor the fail-closed contract.
 *
 * Hard-block matches set `hard_block: true`. The overrides include
 * safety_label=unsafe_do_not_use and risk_tier=high-risk for any
 * `unsafe_or_contraindicated` classification, or risk_tier=requires-supervisor
 * for `supervisor_only`, or risk_tier=claim-sensitive for `claim_sensitive`.
 *
 * Review-required matches alone do NOT set `hard_block: true` and do not
 * override safety_label, but DO append a conflict_flags entry so supervisor
 * review surfaces them.
 *
 * Atlas TASK-160 lock: classifier never UPGRADES. Even if no patterns match,
 * the row keeps its TASK-158 fail-closed defaults from the capture API.
 */
export function classifyCapturedRow(input: ClassifierInput): ClassifierResult {
  const haystack = assembleHaystack(input)
  const matches: PatternMatch[] = []
  const conflictFlags: NonNullable<ClassifierResult['overrides']['conflict_flags_append']> = []

  let hardBlock = false
  let safetyLabel: ClassifierResult['overrides']['safety_label']
  let riskTier: ClassifierResult['overrides']['risk_tier']

  const now = new Date().toISOString()

  for (const pattern of PATTERNS.hard_blocks) {
    const m = testHardBlock(pattern, haystack)
    if (!m) continue
    matches.push(m)
    hardBlock = true

    conflictFlags.push({
      flag_id: m.pattern_id,
      kind: 'source_default_conflict',
      detail: m.reason,
      raised_by: 'classifier',
      raised_at: now,
    })

    if (m.classification === 'unsafe_or_contraindicated') {
      safetyLabel = 'unsafe_do_not_use'
      // Raise to high-risk if not already higher (claim-sensitive is the only
      // higher tier in our enum and it's not set by this branch).
      riskTier = 'high-risk'
    } else if (m.classification === 'supervisor_only') {
      // Don't lower risk_tier; only raise to requires-supervisor if no higher
      // risk has already been claimed by another match.
      if (!riskTier || riskTier === 'requires-supervisor') {
        riskTier = 'requires-supervisor'
      }
      // Could surface as escalation_required, but TASK-152 §5.4 reserves that
      // for predictive-intake high-risk-flag matches. For supervisor_only
      // we just flag and let the row stay needs_source_review.
    } else if (m.classification === 'claim_sensitive') {
      if (riskTier !== 'high-risk') riskTier = 'claim-sensitive'
    }
  }

  for (const pattern of PATTERNS.review_required_patterns) {
    const m = testReviewRequired(pattern, haystack)
    if (!m) continue
    matches.push(m)
    conflictFlags.push({
      flag_id: m.pattern_id,
      kind: 'source_default_conflict',
      detail: m.reason,
      raised_by: 'classifier',
      raised_at: now,
    })
  }

  return {
    hard_block: hardBlock,
    matches,
    overrides: {
      ...(safetyLabel ? { safety_label: safetyLabel } : {}),
      ...(riskTier ? { risk_tier: riskTier } : {}),
      ...(conflictFlags.length > 0 ? { conflict_flags_append: conflictFlags } : {}),
    },
  }
}

/**
 * Returns the canonical SB-published required_display copy for a matched
 * pattern. Used by the capture API response to surface to the operator why
 * their row was quarantined.
 */
export function getRequiredDisplayForMatch(match: PatternMatch): string {
  return match.required_display
}

/**
 * Diagnostic: returns the pattern config version string. Useful for the API
 * response to record which pattern set a row was classified against, in case
 * SB ships an update later.
 */
export function getPatternConfigVersion(): string {
  return PATTERNS.version
}
