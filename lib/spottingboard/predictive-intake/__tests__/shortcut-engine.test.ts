// lib/spottingboard/predictive-intake/__tests__/shortcut-engine.test.ts
// TASK-165 v0 — safety enforcement tests for the predictive intake engine.
//
// Acceptance bar coverage:
//   1. Shortcuts never bypass safety_blockers (hard_block precedence)
//   2. Fast path = fewer questions, never inferred permission
//   3. Fingerprint provenance enforced
//   4. Unknowns on high-risk flags treated as TRUE (fail-closed)
//   5. Mined patterns / source labels never stripped from audit packet

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  evaluateShortcut,
  assertProvenance,
  FingerprintProvenanceError,
} from '../shortcut-engine'
import { validateGateSpec, GateSpecSchemaError } from '../loader'
import type {
  GateSpec,
  OperatorFingerprint,
} from '../types'

const SPEC_PATH = join(__dirname, '..', '..', '..', '..', 'data', 'predictive-intake-gate-spec.json')

function loadSpec(): GateSpec {
  return validateGateSpec(JSON.parse(readFileSync(SPEC_PATH, 'utf-8')))
}

/**
 * Baseline of every flag (GLOBAL-001 high-risk + family hard-block negative
 * + family disambiguation + shortcut gate) set to a safe default. Tests
 * spread this and override only the flags relevant to the assertion. This
 * mirrors how a real caller (workbench intake) must always provide a
 * complete answer set per fail-closed unknown_semantics.
 */
function safeBaselineFlags(): Record<string, boolean> {
  return {
    // GLOBAL-001 high-risk flags — all confirmed safe
    fiber_is_delicate_or_specialty: false,
    material_is_leather_suede_aniline_alcantara: false,
    dye_stability_unknown_or_failed: false,
    stain_identity_unknown: false,
    prior_home_treatment_unknown_or_present: false,
    heat_exposure_unknown_or_present: false,
    garment_is_luxury_claim_sensitive_or_trimmed: false,
    chemical_incompatibility_possible: false,
    // oil-grease-delicate-dryclean required disambiguation answered
    fiber_material: true,
    finish_type_if_leather: true,
    dye_stability: true,
    trim_embellishment_presence: true,
    prior_treatment: true,
    heat_exposure: true,
    who_is_authorized_for_solvent: true,
    // oil-grease-delicate-dryclean shortcut gate flags — all confirmed
    fiber_not_delicate_or_specialty: true,
    dye_stability_known_pass: true,
    no_leather_suede_aniline_alcantara: true,
    no_unknown_trim_embellishment: true,
    stain_is_confirmed_oil_grease_lipid_cosmetic: true,
    no_prior_home_solvent_or_heat_attempt: true,
    // oil-grease-delicate-dryclean hard-block negative flags
    aniline_or_unfinished_leather: false,
    oil_or_grease: false,
    suede_or_nubuck: false,
    silk_or_acetate: false,
    strong_solvent_needed_or_unknown: false,
    unknown_trim_or_embellishment: false,
    dry_side_solvent: false,
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Loader
// ──────────────────────────────────────────────────────────────────────────────

describe('validateGateSpec', () => {
  it('accepts SB v0.1 gate spec without throwing', () => {
    expect(() => loadSpec()).not.toThrow()
  })

  it('rejects gate spec with bad inference label', () => {
    const raw = JSON.parse(readFileSync(SPEC_PATH, 'utf-8'))
    raw.inference_labels.push('totally_made_up_label')
    expect(() => validateGateSpec(raw)).toThrow(GateSpecSchemaError)
  })

  it('rejects gate spec with bad hard_block action', () => {
    const raw = JSON.parse(readFileSync(SPEC_PATH, 'utf-8'))
    raw.decision_families[0].hard_blocks[0].action = 'totally_made_up_action'
    expect(() => validateGateSpec(raw)).toThrow(GateSpecSchemaError)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// Acceptance bar #1 — shortcuts never bypass safety_blockers
// ──────────────────────────────────────────────────────────────────────────────

describe('evaluateShortcut — hard block precedence', () => {
  it('returns unsafe_cannot_infer when family hard_block fires', () => {
    const spec = loadSpec()
    const decision = evaluateShortcut(spec, {
      family_id: 'oil-grease-delicate-dryclean',
      flags: {
        aniline_or_unfinished_leather: true,
        oil_or_grease: true,
        // Even with all gate flags satisfied, hard block must win
        fiber_not_delicate_or_specialty: true,
        dye_stability_known_pass: true,
        no_leather_suede_aniline_alcantara: true,
        no_unknown_trim_embellishment: true,
        stain_is_confirmed_oil_grease_lipid_cosmetic: true,
        no_prior_home_solvent_or_heat_attempt: true,
      },
    })
    expect(decision.outcome).toBe('unsafe_cannot_infer')
    expect(decision.audit.matched_rule_ids[0]).toMatch(/hard_block/)
    expect(decision.audit.blocked_flags).toContain('aniline_or_unfinished_leather')
  })

  it('hard_block fires even when an operator fingerprint suggests fast path', () => {
    const spec = loadSpec()
    const fp: OperatorFingerprint = {
      operator_id: 'op-1',
      plant_id: 'plant-1',
      dimensions: {
        oil_handling_pref: {
          value: 'pog_first',
          provenance: 'observed',
          updated_at: '2026-05-08T01:00:00Z',
        },
      },
    }
    const decision = evaluateShortcut(spec, {
      family_id: 'oil-grease-delicate-dryclean',
      flags: {
        ...safeBaselineFlags(),
        // Trigger ONLY the suede+oil hard_block (not aniline+oil, not silk+solvent)
        suede_or_nubuck: true,
        oil_or_grease: true,
      },
      operator_fingerprint: fp,
    })
    expect(decision.outcome).toBe('needs_supervisor_confirmation')
    expect(decision.audit.matched_rule_ids[0]).toMatch(/hard_block/)
    // Audit packet must record fingerprint was NOT used to grant the outcome
    // — hard block precedes fingerprint
    expect(decision.audit.operator_or_plant_fingerprint_used).toBe(false)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// Acceptance bar #4 — unknowns on high-risk flags = TRUE (fail-closed)
// ──────────────────────────────────────────────────────────────────────────────

describe('evaluateShortcut — unknown_semantics fail-closed', () => {
  it('treats unknown high-risk flag as triggering hard_block', () => {
    const spec = loadSpec()
    const decision = evaluateShortcut(spec, {
      family_id: 'oil-grease-delicate-dryclean',
      flags: {
        // aniline + oil combo — leave aniline as unknown (undefined). Should fire.
        aniline_or_unfinished_leather: undefined,
        oil_or_grease: true,
      },
    })
    // Hard block fires because aniline=unknown is treated as TRUE per
    // SB unknown_semantics.
    expect(decision.outcome).toBe('unsafe_cannot_infer')
  })

  it('global rule GLOBAL-001 fires when any high-risk flag is unknown', () => {
    const spec = loadSpec()
    const decision = evaluateShortcut(spec, {
      family_id: 'oil-grease-delicate-dryclean',
      flags: {
        // Leave a GLOBAL-001 listed flag unknown
        fiber_is_delicate_or_specialty: null,
      },
    })
    // Either family hard_block or GLOBAL-001 should fire — both unsafe paths
    expect(decision.outcome).not.toBe('allow_fast_path')
  })

  it('GLOBAL-001 lists null/undefined as triggering action', () => {
    const spec = loadSpec()
    const decision = evaluateShortcut(spec, {
      family_id: 'oil-grease-delicate-dryclean',
      flags: {
        ...safeBaselineFlags(),
        // Override: stain_identity_unknown as undefined (= unknown = TRUE)
        stain_identity_unknown: undefined,
      },
    })
    // GLOBAL-001 action "force_full_intake_or_supervisor_confirmation"
    // normalizes to needs_supervisor_confirmation
    expect(decision.outcome).toBe('needs_supervisor_confirmation')
    expect(decision.audit.matched_rule_ids).toContain('GLOBAL-001')
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// Acceptance bar #2 — fast path = fewer questions, never inferred permission
// ──────────────────────────────────────────────────────────────────────────────

describe('evaluateShortcut — fast path requires confirmed flags', () => {
  it('forces full intake when shortcut gate flag is unconfirmed', () => {
    const spec = loadSpec()
    const decision = evaluateShortcut(spec, {
      family_id: 'oil-grease-delicate-dryclean',
      flags: {
        ...safeBaselineFlags(),
        // Override: leave one shortcut-gate flag as undefined
        stain_is_confirmed_oil_grease_lipid_cosmetic: undefined,
      },
    })
    expect(decision.outcome).toBe('force_full_intake')
    expect(decision.audit.matched_rule_ids).toContain('shortcut_gate_not_satisfied')
    expect(decision.audit.blocked_flags).toContain('stain_is_confirmed_oil_grease_lipid_cosmetic')
  })

  it('allows fast path when all gate flags confirmed AND no hard blocks', () => {
    const spec = loadSpec()
    const allConfirmed = {
      // GLOBAL-001 high-risk flags — all confirmed safe
      fiber_is_delicate_or_specialty: false,
      material_is_leather_suede_aniline_alcantara: false,
      dye_stability_unknown_or_failed: false,
      stain_identity_unknown: false,
      prior_home_treatment_unknown_or_present: false,
      heat_exposure_unknown_or_present: false,
      garment_is_luxury_claim_sensitive_or_trimmed: false,
      chemical_incompatibility_possible: false,
      // Required disambiguation answered
      fiber_material: true,
      finish_type_if_leather: true,
      dye_stability: true,
      trim_embellishment_presence: true,
      prior_treatment: true,
      heat_exposure: true,
      who_is_authorized_for_solvent: true,
      // Shortcut gate flags — all confirmed
      fiber_not_delicate_or_specialty: true,
      dye_stability_known_pass: true,
      no_leather_suede_aniline_alcantara: true,
      no_unknown_trim_embellishment: true,
      stain_is_confirmed_oil_grease_lipid_cosmetic: true,
      no_prior_home_solvent_or_heat_attempt: true,
      // Hard-block negative flags — must be explicitly false or hard_block fires
      // (per fail-closed unknown_semantics). Real callers must provide these.
      aniline_or_unfinished_leather: false,
      oil_or_grease: false,
      suede_or_nubuck: false,
      silk_or_acetate: false,
      strong_solvent_needed_or_unknown: false,
      unknown_trim_or_embellishment: false,
      dry_side_solvent: false,
    }
    const decision = evaluateShortcut(spec, {
      family_id: 'oil-grease-delicate-dryclean',
      flags: allConfirmed,
    })
    expect(decision.outcome).toBe('allow_fast_path')
    expect(decision.audit.confirmation_required).toBe(false)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// Acceptance bar #5 — every decision carries a source/inference label
// ──────────────────────────────────────────────────────────────────────────────

describe('evaluateShortcut — audit packet always includes source label', () => {
  it('every outcome path attaches a non-empty source_label', () => {
    const spec = loadSpec()
    const cases = [
      { family_id: 'oil-grease-delicate-dryclean', flags: { aniline_or_unfinished_leather: true, oil_or_grease: true } },
      { family_id: 'oil-grease-delicate-dryclean', flags: { fiber_is_delicate_or_specialty: true } },
      { family_id: 'oil-grease-delicate-dryclean', flags: {} },
    ]
    for (const c of cases) {
      const decision = evaluateShortcut(spec, c)
      expect(decision.audit.source_label).toBeTruthy()
      expect(decision.audit.matched_family_id).toBe(c.family_id)
    }
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// Acceptance bar #3 — fingerprint provenance enforced
// ──────────────────────────────────────────────────────────────────────────────

describe('assertProvenance — fingerprint provenance enforcement', () => {
  it('accepts fingerprint with all dimensions provenance-tagged', () => {
    const fp: OperatorFingerprint = {
      operator_id: 'op-1',
      plant_id: 'plant-1',
      dimensions: {
        oil_pref: {
          value: 'pog_first',
          provenance: 'observed',
          updated_at: '2026-05-08T01:00:00Z',
        },
        tannin_pref: {
          value: 'acidic_first',
          provenance: 'declared',
          updated_at: '2026-05-08T01:00:00Z',
        },
      },
    }
    expect(() => assertProvenance(fp)).not.toThrow()
  })

  it('rejects inferred dimension without confidence', () => {
    const fp: OperatorFingerprint = {
      operator_id: 'op-1',
      plant_id: 'plant-1',
      dimensions: {
        bad: {
          value: 'x',
          provenance: 'inferred',
          // confidence missing
          updated_at: '2026-05-08T01:00:00Z',
        },
      },
    }
    expect(() => assertProvenance(fp)).toThrow(FingerprintProvenanceError)
  })

  it('rejects inferred dimension with confidence out of [0..1]', () => {
    const fp: OperatorFingerprint = {
      operator_id: 'op-1',
      plant_id: 'plant-1',
      dimensions: {
        bad: {
          value: 'x',
          provenance: 'inferred',
          confidence: 1.5,
          updated_at: '2026-05-08T01:00:00Z',
        },
      },
    }
    expect(() => assertProvenance(fp)).toThrow(FingerprintProvenanceError)
  })
})
