// lib/spottingboard/__tests__/review.test.ts — TASK-161

import { describe, it, expect, vi } from 'vitest'
import {
  validateReviewTransition,
  applyReviewTransition,
  ALLOWED_REVIEW_STATUS_TRANSITIONS,
  SUPERVISOR_ALLOWED_SAFETY_LABEL_TRANSITIONS,
  SUPERVISOR_ALLOWED_FEED_MODE_TRANSITIONS,
  type ReviewTransitionInput,
} from '../review'

function baseInput(overrides: Partial<ReviewTransitionInput> = {}): ReviewTransitionInput {
  return {
    plant_id: 'plant-uuid-1',
    item_id: 'item-uuid-1',
    decided_by: 'owner@plant.com',
    change_type: 'review_status',
    to_value: 'reviewed-accept',
    reason: 'Verified against plant SOP and pre-test passed',
    ...overrides,
  }
}

describe('validateReviewTransition — required fields', () => {
  it('rejects missing plant_id', () => {
    const r = validateReviewTransition({ ...baseInput(), plant_id: '' })
    expect(r?.error).toBe('plant_id_required')
  })

  it('rejects missing item_id', () => {
    const r = validateReviewTransition({ ...baseInput(), item_id: '' })
    expect(r?.error).toBe('item_id_required')
  })

  it('rejects missing decided_by', () => {
    const r = validateReviewTransition({ ...baseInput(), decided_by: '' })
    expect(r?.error).toBe('decided_by_required')
  })

  it('rejects empty reason (audit log mandatory per TASK-152 §7.1)', () => {
    const r = validateReviewTransition({ ...baseInput(), reason: '' })
    expect(r?.error).toBe('reason_required')
    expect(r?.field).toBe('reason')
  })

  it('rejects whitespace-only reason', () => {
    const r = validateReviewTransition({ ...baseInput(), reason: '   ' })
    expect(r?.error).toBe('reason_required')
  })

  it('rejects reason over 2000 chars', () => {
    const r = validateReviewTransition({ ...baseInput(), reason: 'x'.repeat(2001) })
    expect(r?.error).toBe('reason_too_long')
  })
})

describe('validateReviewTransition — review_status (TASK-161 supervisor allowed)', () => {
  it('accepts in-review', () => {
    expect(validateReviewTransition(baseInput({ to_value: 'in-review' }))).toBeNull()
  })

  it('accepts reviewed-accept', () => {
    expect(validateReviewTransition(baseInput({ to_value: 'reviewed-accept' }))).toBeNull()
  })

  it('accepts reviewed-reject', () => {
    expect(validateReviewTransition(baseInput({ to_value: 'reviewed-reject' }))).toBeNull()
  })

  it('rejects unreviewed (transition direction is forward only)', () => {
    const r = validateReviewTransition(baseInput({ to_value: 'unreviewed' }))
    expect(r?.error).toBe('invalid_review_status_transition')
  })

  it('rejects unknown values', () => {
    const r = validateReviewTransition(baseInput({ to_value: 'random_status' }))
    expect(r?.error).toBe('invalid_review_status_transition')
  })
})

describe('validateReviewTransition — safety_label (TASK-161 supervisor restricted)', () => {
  it('accepts reviewed_for_plant_use', () => {
    expect(
      validateReviewTransition(
        baseInput({ change_type: 'safety_label', to_value: 'reviewed_for_plant_use' }),
      ),
    ).toBeNull()
  })

  it('rejects source_backed (SB-only per TASK-152 §7.2)', () => {
    const r = validateReviewTransition(
      baseInput({ change_type: 'safety_label', to_value: 'source_backed' }),
    )
    expect(r?.error).toBe('safety_label_transition_requires_sb_review')
  })

  it('rejects unsafe_do_not_use (classifier or SB-only)', () => {
    const r = validateReviewTransition(
      baseInput({ change_type: 'safety_label', to_value: 'unsafe_do_not_use' }),
    )
    expect(r?.error).toBe('safety_label_transition_requires_sb_review')
  })

  it('rejects escalation_required (predictive-intake gate territory)', () => {
    const r = validateReviewTransition(
      baseInput({ change_type: 'safety_label', to_value: 'escalation_required' }),
    )
    expect(r?.error).toBe('safety_label_transition_requires_sb_review')
  })

  it('rejects needs_source_review (no-op transition; nothing to write)', () => {
    const r = validateReviewTransition(
      baseInput({ change_type: 'safety_label', to_value: 'needs_source_review' }),
    )
    expect(r?.error).toBe('safety_label_transition_requires_sb_review')
  })
})

describe('validateReviewTransition — feed_mode (TASK-161 supervisor restricted)', () => {
  it('accepts review-candidate (request SB review)', () => {
    expect(
      validateReviewTransition(
        baseInput({ change_type: 'feed_mode', to_value: 'review-candidate' }),
      ),
    ).toBeNull()
  })

  it('rejects promoted-central (DDL blocks; SB-only)', () => {
    const r = validateReviewTransition(
      baseInput({ change_type: 'feed_mode', to_value: 'promoted-central' }),
    )
    expect(r?.error).toBe('feed_mode_transition_requires_sb_review')
  })

  it('rejects private-only (no-op transition; revert is a separate path)', () => {
    const r = validateReviewTransition(
      baseInput({ change_type: 'feed_mode', to_value: 'private-only' }),
    )
    expect(r?.error).toBe('feed_mode_transition_requires_sb_review')
  })

  it('rejects anonymous-signal (not in supervisor scope)', () => {
    const r = validateReviewTransition(
      baseInput({ change_type: 'feed_mode', to_value: 'anonymous-signal' }),
    )
    expect(r?.error).toBe('feed_mode_transition_requires_sb_review')
  })
})

describe('validateReviewTransition — conflict_flags', () => {
  it('accepts an array as to_value', () => {
    expect(
      validateReviewTransition(
        baseInput({
          change_type: 'conflict_flags',
          to_value: [
            {
              flag_id: 'flag-1',
              kind: 'plant_rule_conflict',
              detail: 'conflicts with existing rule X',
              raised_by: 'supervisor',
              raised_at: '2026-05-07T17:00:00Z',
            },
          ],
        }),
      ),
    ).toBeNull()
  })

  it('rejects non-array to_value', () => {
    const r = validateReviewTransition(
      baseInput({ change_type: 'conflict_flags', to_value: 'not-an-array' }),
    )
    expect(r?.error).toBe('conflict_flags_must_be_array')
  })

  it('accepts empty array (clearing conflicts)', () => {
    expect(
      validateReviewTransition(
        baseInput({ change_type: 'conflict_flags', to_value: [] }),
      ),
    ).toBeNull()
  })
})

describe('validateReviewTransition — unsupported change_type', () => {
  it('rejects authority_class (SB-only)', () => {
    const r = validateReviewTransition(
      // @ts-expect-error — intentional: authority_class is not in ReviewChangeType
      baseInput({ change_type: 'authority_class', to_value: 'source-backed' }),
    )
    expect(r?.error).toBe('unsupported_change_type')
  })

  it('rejects runtime_eligibility (RPC recomputes from gate)', () => {
    const r = validateReviewTransition(
      // @ts-expect-error — intentional: runtime_eligibility is not in ReviewChangeType
      baseInput({ change_type: 'runtime_eligibility', to_value: true }),
    )
    expect(r?.error).toBe('unsupported_change_type')
  })

  it('rejects promotion_status (separate path)', () => {
    const r = validateReviewTransition(
      // @ts-expect-error — intentional
      baseInput({ change_type: 'promotion_status', to_value: 'promoted' }),
    )
    expect(r?.error).toBe('unsupported_change_type')
  })
})

describe('applyReviewTransition — RPC integration (mocked)', () => {
  function fakeClient(rpcSpy: (name: string, args: Record<string, unknown>) => unknown) {
    return {
      rpc: async (name: string, args: Record<string, unknown>) => {
        rpcSpy(name, args)
        return { data: { ok: true, applied: args.p_change_type }, error: null }
      },
    } as unknown as Parameters<typeof applyReviewTransition>[1]['client']
  }

  it('calls apply_plant_brain_item_change with the expected RPC parameter shape', async () => {
    let captured: { name: string; args: Record<string, unknown> } | null = null
    const result = await applyReviewTransition(baseInput(), {
      client: fakeClient((name, args) => {
        captured = { name, args }
      }),
    })

    expect(result.ok).toBe(true)
    expect(captured!.name).toBe('apply_plant_brain_item_change')
    expect(captured!.args.p_item_id).toBe('item-uuid-1')
    expect(captured!.args.p_plant_id).toBe('plant-uuid-1')
    expect(captured!.args.p_change_type).toBe('review_status')
    expect(captured!.args.p_to_value).toBe('reviewed-accept')
    expect(captured!.args.p_reason).toBe('Verified against plant SOP and pre-test passed')
    expect(captured!.args.p_decided_by).toBe('owner@plant.com')
    expect(captured!.args.p_safety_label).toBe('needs_source_review') // default for non-safety_label changes
    expect(captured!.args.p_metadata).toEqual({})
  })

  it('passes safety_label_override into p_safety_label when provided', async () => {
    let captured: { name: string; args: Record<string, unknown> } | null = null
    const result = await applyReviewTransition(
      baseInput({
        change_type: 'safety_label',
        to_value: 'reviewed_for_plant_use',
        safety_label_override: 'reviewed_for_plant_use',
      }),
      {
        client: fakeClient((name, args) => {
          captured = { name, args }
        }),
      },
    )
    expect(result.ok).toBe(true)
    expect(captured!.args.p_safety_label).toBe('reviewed_for_plant_use')
  })

  it('lowercases decided_by before passing to RPC', async () => {
    let captured: { name: string; args: Record<string, unknown> } | null = null
    await applyReviewTransition(baseInput({ decided_by: 'OWNER@Plant.com' }), {
      client: fakeClient((name, args) => {
        captured = { name, args }
      }),
    })
    expect(captured!.args.p_decided_by).toBe('owner@plant.com')
  })

  it('returns validation error without calling RPC when input is invalid', async () => {
    const rpcSpy = vi.fn()
    const r = await applyReviewTransition(
      baseInput({ change_type: 'safety_label', to_value: 'source_backed' }),
      { client: fakeClient(rpcSpy) },
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('safety_label_transition_requires_sb_review')
    expect(rpcSpy).not.toHaveBeenCalled()
  })
})

describe('Allowed transitions — sanity bounds', () => {
  it('review_status allowlist has exactly 3 forward transitions', () => {
    expect(ALLOWED_REVIEW_STATUS_TRANSITIONS).toHaveLength(3)
    expect(ALLOWED_REVIEW_STATUS_TRANSITIONS).toContain('in-review')
    expect(ALLOWED_REVIEW_STATUS_TRANSITIONS).toContain('reviewed-accept')
    expect(ALLOWED_REVIEW_STATUS_TRANSITIONS).toContain('reviewed-reject')
  })

  it('safety_label supervisor allowlist has exactly 1 entry (reviewed_for_plant_use)', () => {
    expect(SUPERVISOR_ALLOWED_SAFETY_LABEL_TRANSITIONS).toHaveLength(1)
    expect(SUPERVISOR_ALLOWED_SAFETY_LABEL_TRANSITIONS).toContain('reviewed_for_plant_use')
  })

  it('feed_mode supervisor allowlist has exactly 1 entry (review-candidate)', () => {
    expect(SUPERVISOR_ALLOWED_FEED_MODE_TRANSITIONS).toHaveLength(1)
    expect(SUPERVISOR_ALLOWED_FEED_MODE_TRANSITIONS).toContain('review-candidate')
  })
})
