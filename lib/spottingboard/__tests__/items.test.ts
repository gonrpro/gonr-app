// lib/spottingboard/__tests__/items.test.ts — TASK-158 minimum loop

import { describe, it, expect, vi } from 'vitest'
import {
  validateChemistryRuleInput,
  captureChemistryRule,
  type CaptureChemistryRuleInput,
} from '../items'

function baseInput(overrides: Partial<CaptureChemistryRuleInput> = {}): CaptureChemistryRuleInput {
  return {
    plant_id: 'plant-uuid-1',
    captured_by: 'owner@plant.com',
    title: 'Never use chlorine bleach on wool',
    body: 'Substitute oxygen bleach with cold-only application. Stop on any color migration.',
    stain_scope: [],
    fabric_scope: ['wool'],
    chemistry_scope: ['chlorine bleach'],
    ...overrides,
  }
}

describe('validateChemistryRuleInput — TASK-152 §2.1 chemistry_rule validity', () => {
  it('accepts valid input with at least one scope', () => {
    expect(validateChemistryRuleInput(baseInput())).toBeNull()
  })

  it('accepts input with only stain_scope filled', () => {
    expect(
      validateChemistryRuleInput(
        baseInput({ fabric_scope: [], chemistry_scope: [], stain_scope: ['coffee'] }),
      ),
    ).toBeNull()
  })

  it('accepts input with only chemistry_scope filled', () => {
    expect(
      validateChemistryRuleInput(
        baseInput({ fabric_scope: [], chemistry_scope: ['perc'], stain_scope: [] }),
      ),
    ).toBeNull()
  })

  it('rejects when ALL three scopes are empty (TASK-152 §2.1 blank-scope rule)', () => {
    const r = validateChemistryRuleInput(
      baseInput({ stain_scope: [], fabric_scope: [], chemistry_scope: [] }),
    )
    expect(r).not.toBeNull()
    expect(r?.error).toBe('scope_required')
    expect(r?.field).toBe('scope')
  })

  it('rejects missing plant_id', () => {
    const r = validateChemistryRuleInput({ ...baseInput(), plant_id: '' })
    expect(r?.error).toBe('plant_id_required')
  })

  it('rejects missing captured_by', () => {
    const r = validateChemistryRuleInput({ ...baseInput(), captured_by: '' })
    expect(r?.error).toBe('captured_by_required')
  })

  it('rejects empty title', () => {
    const r = validateChemistryRuleInput({ ...baseInput(), title: '' })
    expect(r?.error).toBe('title_required')
    expect(r?.field).toBe('title')
  })

  it('rejects whitespace-only title', () => {
    const r = validateChemistryRuleInput({ ...baseInput(), title: '   ' })
    expect(r?.error).toBe('title_required')
  })

  it('rejects title over 200 chars', () => {
    const r = validateChemistryRuleInput({ ...baseInput(), title: 'x'.repeat(201) })
    expect(r?.error).toBe('title_too_long')
  })

  it('rejects empty body', () => {
    const r = validateChemistryRuleInput({ ...baseInput(), body: '' })
    expect(r?.error).toBe('body_required')
  })

  it('rejects body over 5000 chars', () => {
    const r = validateChemistryRuleInput({ ...baseInput(), body: 'x'.repeat(5001) })
    expect(r?.error).toBe('body_too_long')
  })
})

describe('captureChemistryRule — fail-closed defaults (Atlas TASK-158 lock)', () => {
  function fakeClient(insertSpy: (row: Record<string, unknown>) => unknown) {
    return {
      from: () => ({
        insert: (row: Record<string, unknown>) => {
          insertSpy(row)
          return {
            select: () => ({
              single: async () => ({
                data: { id: 'item-uuid-1' },
                error: null,
              }),
            }),
          }
        },
      }),
    } as unknown as NonNullable<Parameters<typeof captureChemistryRule>[1]>['client']
  }

  it('inserts a row with all locked defaults', async () => {
    const captured: Record<string, unknown> = {}
    const result = await captureChemistryRule(baseInput(), {
      client: fakeClient((row) => Object.assign(captured, row)),
    })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.item_id).toBe('item-uuid-1')

    expect(captured.module).toBe('chemistry_rule')
    expect(captured.authority_class).toBe('plant-local')
    expect(captured.feed_mode).toBe('private-only')
    expect(captured.review_status).toBe('unreviewed')
    expect(captured.safety_label).toBe('needs_source_review')
    expect(captured.risk_tier).toBe('requires-supervisor')
    expect(captured.runtime_eligible).toBe(false)
    expect(captured.promotion_status).toBe('never-promoted')
  })

  it('lowercases captured_by and created_by', async () => {
    const captured: Record<string, unknown> = {}
    await captureChemistryRule(baseInput({ captured_by: 'OWNER@Plant.com' }), {
      client: fakeClient((row) => Object.assign(captured, row)),
    })
    expect(captured.created_by).toBe('owner@plant.com')
    const tp = captured.tenant_provenance as Record<string, unknown>
    expect(tp.captured_by).toBe('owner@plant.com')
  })

  it('writes scope arrays into tenant_provenance', async () => {
    const captured: Record<string, unknown> = {}
    await captureChemistryRule(
      baseInput({
        stain_scope: ['coffee', 'wine'],
        fabric_scope: ['wool'],
        chemistry_scope: ['bleach'],
      }),
      { client: fakeClient((row) => Object.assign(captured, row)) },
    )
    const tp = captured.tenant_provenance as Record<string, unknown>
    expect(tp.stain_scope).toEqual(['coffee', 'wine'])
    expect(tp.fabric_scope).toEqual(['wool'])
    expect(tp.chemistry_scope).toEqual(['bleach'])
  })

  it('records intended_module + capture_method in tenant_provenance', async () => {
    const captured: Record<string, unknown> = {}
    await captureChemistryRule(baseInput(), {
      client: fakeClient((row) => Object.assign(captured, row)),
    })
    const tp = captured.tenant_provenance as Record<string, unknown>
    expect(tp.intended_module).toBe('chemistry_rule')
    expect(tp.capture_method).toBe('operator_add_rule')
    expect(tp.module_chosen_by).toBe('operator')
    expect(tp.module_overridden).toBe(false)
  })

  it('returns validation error without inserting when scopes are empty', async () => {
    const insertSpy = vi.fn()
    const result = await captureChemistryRule(
      baseInput({ stain_scope: [], fabric_scope: [], chemistry_scope: [] }),
      { client: fakeClient(insertSpy) },
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('scope_required')
    expect(insertSpy).not.toHaveBeenCalled()
  })

  it('passes through source_evidence array unchanged', async () => {
    const captured: Record<string, unknown> = {}
    await captureChemistryRule(
      baseInput({
        source_evidence: [
          { kind: 'book', label: 'DLI Wedding Gown Manual', ref: 'section 4.2' },
        ],
      }),
      { client: fakeClient((row) => Object.assign(captured, row)) },
    )
    expect(captured.source_evidence).toEqual([
      { kind: 'book', label: 'DLI Wedding Gown Manual', ref: 'section 4.2' },
    ])
  })

  it('defaults source_evidence to empty array when omitted', async () => {
    const captured: Record<string, unknown> = {}
    await captureChemistryRule(baseInput(), {
      client: fakeClient((row) => Object.assign(captured, row)),
    })
    expect(captured.source_evidence).toEqual([])
  })
})
