// lib/spottingboard/capture-coach.ts (server/client compatible, pure)
//
// TASK-164 Capture Coach helpers — derive operator-facing UI state from a
// classifier run + the locked TASK-158 fail-closed defaults. Pure function
// so the logic is unit-testable without React/DOM.
//
// Use case: as the operator types into the capture form, the form runs the
// classifier and feeds its result + the TASK-158 defaults into deriveCoachPanel
// to get the inline feedback panel content + the live governance preview.
//
// "Coach" not "validator" — the goal is to help the operator phrase the rule
// well, not to block save. The form still saves whatever the operator confirms;
// the classifier overrides apply server-side regardless.

import { classifyCapturedRow, type ClassifierInput, type ClassifierResult, type PatternMatch } from './classifier'

export type CoachLevel = 'none' | 'info' | 'warning' | 'error'

export interface GovernancePreview {
  authority_class: 'plant-local'
  feed_mode: 'private-only'
  review_status: 'unreviewed'
  safety_label: 'needs_source_review' | 'unsafe_do_not_use' | 'escalation_required'
  risk_tier: 'safe-default' | 'requires-supervisor' | 'high-risk' | 'claim-sensitive'
  runtime_eligible: false
  promotion_status: 'never-promoted'
}

export interface CoachPanel {
  /** UI severity for styling the panel */
  level: CoachLevel
  /** Operator-facing headline */
  headline: string
  /** Optional short explanatory body */
  body?: string
  /** All matches the classifier found (hard_blocks + review_required) */
  matches: PatternMatch[]
  /** What the row WILL save as if the operator clicks Save now */
  preview_governance: GovernancePreview
  /** Specific action the operator can take to fix the issue, if any */
  suggested_action?: string
  /** True if scope is empty — TASK-152 §2.1 chemistry_rule blank-scope rule */
  scope_required: boolean
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function isFormFilledEnough(input: ClassifierInput): boolean {
  // Don't run the coach on a totally empty form — too noisy.
  return (input.title.trim().length + input.body.trim().length) > 0
}

function hasAnyScope(input: ClassifierInput): boolean {
  const stain = input.stain_scope ?? []
  const fabric = input.fabric_scope ?? []
  const chemistry = input.chemistry_scope ?? []
  return stain.length + fabric.length + chemistry.length > 0
}

function buildSuggestedAction(matches: PatternMatch[]): string | undefined {
  if (matches.length === 0) return undefined
  const unsafe = matches.find((m) => m.classification === 'unsafe_or_contraindicated')
  if (unsafe) {
    const terms = unsafe.matched_terms.slice(0, 3).join(', ')
    return `Edit your rule to remove or rephrase: ${terms}. Or save as-is — the row will be saved with safety_label=unsafe_do_not_use and stay out of runtime guidance.`
  }
  const supervisorOnly = matches.find((m) => m.classification === 'supervisor_only')
  if (supervisorOnly) {
    return 'This rule will save flagged for supervisor review. Add a citation in the source field to fast-track approval.'
  }
  const claim = matches.find((m) => m.classification === 'claim_sensitive')
  if (claim) {
    return 'This rule touches a claim-sensitive area. Saved rules will require explicit supervisor approval before runtime use.'
  }
  return 'This rule was flagged for review. A supervisor will see it in the review queue.'
}

// ──────────────────────────────────────────────────────────────────────────────
// Main entry — derive the panel state from classifier input
// ──────────────────────────────────────────────────────────────────────────────

export function deriveCoachPanel(input: ClassifierInput): CoachPanel {
  // Run the classifier (pure — no side effects)
  const result: ClassifierResult = classifyCapturedRow(input)
  const matches = result.matches
  const scope_required = !hasAnyScope(input)

  // Compute the preview governance fields the form WILL save as. Mirrors
  // captureChemistryRule's logic in lib/spottingboard/items.ts.
  const safetyLabel = result.overrides.safety_label ?? 'needs_source_review'
  const riskTier = result.overrides.risk_tier ?? 'requires-supervisor'

  const previewGovernance: GovernancePreview = {
    authority_class: 'plant-local',
    feed_mode: 'private-only',
    review_status: 'unreviewed',
    safety_label: safetyLabel,
    risk_tier: riskTier,
    runtime_eligible: false,
    promotion_status: 'never-promoted',
  }

  // Empty form — give the coach a friendly idle state
  if (!isFormFilledEnough(input)) {
    return {
      level: 'none',
      headline: 'Start typing — the coach will preview how your rule lands.',
      matches: [],
      preview_governance: previewGovernance,
      scope_required,
    }
  }

  // Scope-required nudge (separate from classifier matches)
  if (scope_required) {
    return {
      level: 'info',
      headline: 'Add a scope before saving.',
      body: 'Chemistry rules need at least one scope dimension (stain, fabric, or chemistry) so runtime safety can reason about when to apply the rule.',
      matches,
      preview_governance: previewGovernance,
      scope_required: true,
      suggested_action: 'Fill in stain, fabric, or chemistry scope above.',
    }
  }

  // No matches — clean rule, will save with TASK-158 defaults
  if (matches.length === 0) {
    return {
      level: 'info',
      headline: 'Looks good — no safety patterns triggered.',
      body: 'This rule will save as plant-local, unreviewed, and require supervisor review before it can become runtime guidance. That is the default for every captured rule.',
      matches,
      preview_governance: previewGovernance,
      scope_required: false,
    }
  }

  // Hard-block matches: classifier will quarantine the row
  if (result.hard_block) {
    const unsafe = matches.find((m) => m.classification === 'unsafe_or_contraindicated')
    if (unsafe) {
      return {
        level: 'error',
        headline: 'This matches a hard-ban safety pattern.',
        body: unsafe.required_display,
        matches,
        preview_governance: previewGovernance,
        scope_required: false,
        suggested_action: buildSuggestedAction(matches),
      }
    }

    // claim_sensitive or supervisor_only — warning level (NOT block)
    return {
      level: 'warning',
      headline: 'This rule is flagged for closer review.',
      body: matches[0]?.reason,
      matches,
      preview_governance: previewGovernance,
      scope_required: false,
      suggested_action: buildSuggestedAction(matches),
    }
  }

  // Only review_required_patterns matched — soft flag
  return {
    level: 'info',
    headline: 'Saved with a flag for supervisor review.',
    body: matches[0]?.reason,
    matches,
    preview_governance: previewGovernance,
    scope_required: false,
    suggested_action: buildSuggestedAction(matches),
  }
}

// Convenience export so consumers don't need to import classifier types separately
export type { ClassifierInput, ClassifierResult, PatternMatch }
