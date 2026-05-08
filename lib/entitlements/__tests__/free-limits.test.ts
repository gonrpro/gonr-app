// lib/entitlements/__tests__/free-limits.test.ts — TASK-154
//
// Verifies free-tier caps single-source-of-truth.

import { describe, it, expect } from 'vitest'
import {
  FREE_LIMITS,
  freeCapForModule,
  moduleHasFreeCap,
  productThatLiftsCap,
} from '../free-limits'

describe('free-limits — module caps', () => {
  it('caps chemistry_rule at 5', () => {
    expect(freeCapForModule('chemistry_rule')).toBe(FREE_LIMITS.maxChemistryRules)
    expect(FREE_LIMITS.maxChemistryRules).toBe(5)
  })

  it('caps procedure at 5', () => {
    expect(freeCapForModule('procedure')).toBe(FREE_LIMITS.maxProcedures)
    expect(FREE_LIMITS.maxProcedures).toBe(5)
  })

  it('returns null for uncapped modules', () => {
    expect(freeCapForModule('tribal_note')).toBeNull()
    expect(freeCapForModule('preference')).toBeNull()
    expect(freeCapForModule('printout')).toBeNull()
    expect(freeCapForModule('plant_profile')).toBeNull()
    expect(freeCapForModule('reference_sop')).toBeNull()
    expect(freeCapForModule('training_check')).toBeNull()
    expect(freeCapForModule('escalation_rule')).toBeNull()
  })

  it('moduleHasFreeCap matches freeCapForModule', () => {
    expect(moduleHasFreeCap('chemistry_rule')).toBe(true)
    expect(moduleHasFreeCap('procedure')).toBe(true)
    expect(moduleHasFreeCap('tribal_note')).toBe(false)
    expect(moduleHasFreeCap('plant_profile')).toBe(false)
  })

  it('productThatLiftsCap always returns spottingboard_pro', () => {
    expect(productThatLiftsCap('chemistry_rule')).toBe('spottingboard_pro')
    expect(productThatLiftsCap('procedure')).toBe('spottingboard_pro')
  })

  it('locks down which Free features are enabled vs gated', () => {
    expect(FREE_LIMITS.runtimeBridgeEnabled).toBe(false)
    expect(FREE_LIMITS.fullExportEnabled).toBe(false)
    expect(FREE_LIMITS.trainingTestsAvailable).toBe(false)
    expect(FREE_LIMITS.supervisorReviewQueueEnabled).toBe(false)
    expect(FREE_LIMITS.sampleExportEnabled).toBe(true)
  })
})
