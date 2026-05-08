// lib/spottingboard/__tests__/classifier.test.ts — TASK-160
//
// Tests the pure classifier logic against SB's unsafe-patterns.json.
// No DB, no input mutation. Verifies the fail-closed contract:
// hard-block matches downgrade safety_label + raise risk_tier; non-matches
// leave the row to keep its TASK-158 fail-closed defaults.

import { describe, it, expect } from 'vitest'
import {
  classifyCapturedRow,
  getPatternConfigVersion,
  type ClassifierInput,
} from '../classifier'

function input(overrides: Partial<ClassifierInput> = {}): ClassifierInput {
  return {
    title: '',
    body: '',
    stain_scope: [],
    fabric_scope: [],
    chemistry_scope: [],
    ...overrides,
  }
}

describe('classifyCapturedRow — no match (TASK-158 defaults stand)', () => {
  it('returns hard_block=false and no overrides for benign content', () => {
    const r = classifyCapturedRow(
      input({
        title: 'Standard cool-water flush for fresh tea on cotton',
        body: 'Pretest first. Cool water from the back. No agitation.',
        stain_scope: ['tea'],
        fabric_scope: ['cotton'],
        chemistry_scope: [],
      }),
    )
    expect(r.hard_block).toBe(false)
    expect(r.matches).toHaveLength(0)
    expect(r.overrides.safety_label).toBeUndefined()
    expect(r.overrides.risk_tier).toBeUndefined()
    expect(r.overrides.conflict_flags_append).toBeUndefined()
  })

  it('benign mention of fabrics without unsafe combos does not trigger', () => {
    const r = classifyCapturedRow(
      input({
        title: 'Wool press timing',
        body: 'Wait at least 30 minutes after solvent before any press.',
        fabric_scope: ['wool'],
      }),
    )
    expect(r.hard_block).toBe(false)
  })
})

describe('classifyCapturedRow — hard_blocks (rust + bleach)', () => {
  it('matches rust + chlorine bleach as unsafe_or_contraindicated', () => {
    const r = classifyCapturedRow(
      input({
        title: 'Rust stain quick fix',
        body: 'Use chlorine bleach first to lift the rust mark.',
        chemistry_scope: ['chlorine bleach'],
      }),
    )
    expect(r.hard_block).toBe(true)
    expect(r.matches.length).toBeGreaterThanOrEqual(1)
    const rustMatch = r.matches.find((m) => m.pattern_id === 'rust_bleach_or_oxidizer_first')
    expect(rustMatch).toBeDefined()
    expect(rustMatch?.classification).toBe('unsafe_or_contraindicated')
    // Overrides
    expect(r.overrides.safety_label).toBe('unsafe_do_not_use')
    expect(r.overrides.risk_tier).toBe('high-risk')
    expect(r.overrides.conflict_flags_append?.length).toBeGreaterThanOrEqual(1)
    expect(r.overrides.conflict_flags_append?.[0].kind).toBe('source_default_conflict')
    expect(r.overrides.conflict_flags_append?.[0].raised_by).toBe('classifier')
  })

  it('matches rust + bleach first regardless of capitalization', () => {
    const r = classifyCapturedRow(
      input({
        title: 'RUST removal',
        body: 'Apply CHLORINE BLEACH first then rinse.',
      }),
    )
    expect(r.hard_block).toBe(true)
  })

  it('does NOT match rust alone (without bleach term)', () => {
    const r = classifyCapturedRow(
      input({
        title: 'Rust stain identification',
        body: 'Rust looks brown-orange. Treat with rust-specific spotter only.',
        stain_scope: ['rust'],
      }),
    )
    // Should pass with no hard_block (no chlorine bleach mention)
    expect(r.hard_block).toBe(false)
  })

  it('matches HF rust remover casual use', () => {
    const r = classifyCapturedRow(
      input({
        title: 'Quick rust trick',
        body: 'Use Whink for rust spots on white cotton — works fast.',
      }),
    )
    expect(r.hard_block).toBe(true)
    const m = r.matches.find((x) => x.pattern_id === 'hf_or_fluoride_rust_remover_casual_use')
    expect(m).toBeDefined()
    expect(r.overrides.safety_label).toBe('unsafe_do_not_use')
  })
})

describe('classifyCapturedRow — chemical mixing red flag', () => {
  it('matches mix + chlorine bleach + ammonia', () => {
    const r = classifyCapturedRow(
      input({
        title: 'Plant trick',
        body: 'Mix chlorine bleach and ammonia together for stubborn whites.',
      }),
    )
    expect(r.hard_block).toBe(true)
    const m = r.matches.find((x) => x.pattern_id === 'chemical_mixing_red_flag')
    expect(m).toBeDefined()
  })

  it('does NOT match casual use of word "mix" without chemistry combo', () => {
    const r = classifyCapturedRow(
      input({
        title: 'Mix dwell time and rinse',
        body: 'Test the mix on a hidden area before applying.',
      }),
    )
    expect(r.hard_block).toBe(false)
  })
})

describe('classifyCapturedRow — heat + protein', () => {
  it('matches blood + hot water', () => {
    const r = classifyCapturedRow(
      input({
        title: 'Blood stain on cotton',
        body: 'Use hot water to flush quickly.',
        stain_scope: ['blood'],
      }),
    )
    expect(r.hard_block).toBe(true)
    const m = r.matches.find((x) => x.pattern_id === 'heat_before_protein_or_unknown_identification')
    expect(m).toBeDefined()
    expect(r.overrides.safety_label).toBe('unsafe_do_not_use')
  })

  it('matches unknown stain + heat set', () => {
    const r = classifyCapturedRow(
      input({
        title: 'Unknown stain emergency',
        body: 'Press first then identify.',
      }),
    )
    expect(r.hard_block).toBe(true)
  })
})

describe('classifyCapturedRow — claim_sensitive matches downgrade differently', () => {
  it('matches leather without escalating to unsafe_do_not_use', () => {
    const r = classifyCapturedRow(
      input({
        title: 'Leather jacket cleaning',
        body: 'Process per plant SOP for leather garments.',
        fabric_scope: ['leather'],
      }),
    )
    expect(r.hard_block).toBe(true) // it's a hard_blocks entry classified as claim_sensitive
    const m = r.matches.find((x) => x.pattern_id === 'leather_suede_aniline_or_finish_work')
    expect(m).toBeDefined()
    expect(m?.classification).toBe('claim_sensitive')
    // claim_sensitive sets risk_tier to claim-sensitive but NOT safety_label
    expect(r.overrides.risk_tier).toBe('claim-sensitive')
    expect(r.overrides.safety_label).toBeUndefined()
  })

  it('claim-sensitive does not override existing high-risk from a prior match', () => {
    // Both rust+bleach (unsafe_or_contraindicated → high-risk) AND leather
    // (claim_sensitive → claim-sensitive). The unsafe match must take precedence.
    const r = classifyCapturedRow(
      input({
        title: 'Rust on leather jacket',
        body: 'Use chlorine bleach first.',
        chemistry_scope: ['chlorine bleach'],
        fabric_scope: ['leather'],
      }),
    )
    expect(r.hard_block).toBe(true)
    expect(r.overrides.safety_label).toBe('unsafe_do_not_use')
    expect(r.overrides.risk_tier).toBe('high-risk') // unsafe wins over claim-sensitive
  })
})

describe('classifyCapturedRow — supervisor_only does not set safety_label', () => {
  it('matches unknown_fiber + oxidizer', () => {
    const r = classifyCapturedRow(
      input({
        title: 'Unknown fiber spot treatment',
        body: 'Use oxidizer on the spot.',
      }),
    )
    expect(r.hard_block).toBe(true)
    const m = r.matches.find((x) => x.pattern_id === 'unknown_fiber_or_dye_aggressive_chemistry')
    expect(m).toBeDefined()
    expect(m?.classification).toBe('supervisor_only')
    // supervisor_only sets risk_tier but NOT safety_label
    expect(r.overrides.risk_tier).toBe('requires-supervisor')
    expect(r.overrides.safety_label).toBeUndefined()
  })
})

describe('classifyCapturedRow — review_required_patterns flag without hard_block', () => {
  it('matches "we always" without setting hard_block=true', () => {
    const r = classifyCapturedRow(
      input({
        title: 'Coffee stain on silk',
        body: 'We always blot fresh first then cool water.',
      }),
    )
    expect(r.hard_block).toBe(false)
    const m = r.matches.find((x) => x.pattern_id === 'one_cleaner_habit_as_rule')
    expect(m).toBeDefined()
    expect(m?.classification).toBe('unverified_tribal')
    // review_required adds conflict_flags but NOT safety_label/risk_tier overrides
    expect(r.overrides.safety_label).toBeUndefined()
    expect(r.overrides.risk_tier).toBeUndefined()
    expect(r.overrides.conflict_flags_append?.length).toBeGreaterThanOrEqual(1)
  })

  it('matches "guaranteed" copy as claim_sensitive', () => {
    const r = classifyCapturedRow(
      input({
        title: 'Guaranteed stain removal',
        body: 'This will remove any oil stain from any fabric.',
      }),
    )
    expect(r.hard_block).toBe(true) // it's in hard_blocks, not review_required
    const m = r.matches.find((x) => x.pattern_id === 'guaranteed_removal_or_absolute_safe_copy')
    expect(m).toBeDefined()
    expect(m?.classification).toBe('claim_sensitive')
  })
})

describe('classifyCapturedRow — fail-closed contract (Atlas TASK-160 lock)', () => {
  it('classifier never returns overrides that would UPGRADE a row', () => {
    // Sweep all overrides — none should set authority_class to source-backed,
    // none should set runtime_eligible=true, none should set review_status to
    // reviewed-accept. The classifier output's only fields are safety_label,
    // risk_tier, conflict_flags_append. (TS type enforces this; this test is
    // a redundant runtime check.)
    const r = classifyCapturedRow(
      input({
        title: 'Rust on leather',
        body: 'Use chlorine bleach first then dryer.',
      }),
    )
    const overrideKeys = Object.keys(r.overrides)
    for (const k of overrideKeys) {
      expect(['safety_label', 'risk_tier', 'conflict_flags_append']).toContain(k)
    }
  })

  it('returns frozen-shape output safe to log/serialize', () => {
    const r = classifyCapturedRow(input({ title: 'tea cotton', body: 'cool water' }))
    expect(JSON.stringify(r)).toBeTruthy()
  })
})

describe('getPatternConfigVersion', () => {
  it('returns the SB-published version string', () => {
    const v = getPatternConfigVersion()
    expect(v).toMatch(/^\d+\.\d+\.\d+$/)
  })
})
