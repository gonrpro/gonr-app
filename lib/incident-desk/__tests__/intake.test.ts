// lib/incident-desk/__tests__/intake.test.ts — TASK-155 v0
//
// Validation + prompt construction tests. The acceptance bars to enforce
// at this layer:
//   - Required fields validated (garment_type, damage_types, damage_discovered_at, desired_outputs)
//   - Lang validated to 'en' | 'es'
//   - Photos validated structurally
//   - Intake summary preserves the operator-entered facts (transparency rule)
//   - System prompt contains the non-negotiable rules (no Eisen, no legal, evidence separation)

import { describe, it, expect } from 'vitest'
import {
  validateIntake,
  renderIntakeSummary,
  buildSystemPrompt,
  buildUserContent,
} from '../intake'
import type { IncidentIntake } from '../types'

function minimalIntake(overrides: Partial<IncidentIntake> = {}): IncidentIntake {
  return {
    garment_type: 'silk blouse',
    damage_types: ['stain_set'],
    damage_discovered_at: 'after_cleaning',
    desired_outputs: ['intake_note', 'decline_note'],
    ...overrides,
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// validateIntake
// ──────────────────────────────────────────────────────────────────────────────

describe('validateIntake', () => {
  it('accepts a minimal valid intake', () => {
    const r = validateIntake(minimalIntake())
    expect(r.ok).toBe(true)
  })

  it('rejects missing garment_type', () => {
    const r = validateIntake({ ...minimalIntake(), garment_type: '' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.field).toBe('garment_type')
  })

  it('rejects empty damage_types', () => {
    const r = validateIntake({ ...minimalIntake(), damage_types: [] })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.field).toBe('damage_types')
  })

  it('rejects invalid damage_discovered_at', () => {
    const r = validateIntake({ ...minimalIntake(), damage_discovered_at: 'sometime' as never })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.field).toBe('damage_discovered_at')
  })

  it('rejects invalid desired_outputs value', () => {
    const r = validateIntake({ ...minimalIntake(), desired_outputs: ['nonexistent_doc' as never] })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.field).toBe('desired_outputs')
  })

  it('rejects invalid lang', () => {
    const r = validateIntake({ ...minimalIntake(), lang: 'fr' as never })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.field).toBe('lang')
  })

  it('accepts photos with kind + url', () => {
    const r = validateIntake({
      ...minimalIntake(),
      photos: [
        { kind: 'front', url: 'data:image/jpeg;base64,abc' },
        { kind: 'care_label', url: 'https://example.com/x.jpg' },
      ],
    })
    expect(r.ok).toBe(true)
  })

  it('rejects photos missing url', () => {
    const r = validateIntake({
      ...minimalIntake(),
      photos: [{ kind: 'front' } as never],
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.field).toBe('photos[0]')
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// renderIntakeSummary — operator transparency
// ──────────────────────────────────────────────────────────────────────────────

describe('renderIntakeSummary', () => {
  it('preserves the operator-entered facts (transparency rule)', () => {
    const intake = minimalIntake({
      brand_label_notes: 'Equipment, Made in Italy',
      fiber_content: '100% silk',
      color: 'navy',
      damage_locations: 'right sleeve cuff',
      customer_claim_language: 'They ruined my favorite blouse.',
      treatment_already_attempted: 'pre-spotted with NSD before perc cycle',
      ticket_or_order_number: 'JC-2026-1420',
    })
    const summary = renderIntakeSummary(intake)

    expect(summary).toContain('silk blouse')
    expect(summary).toContain('Equipment, Made in Italy')
    expect(summary).toContain('100% silk')
    expect(summary).toContain('navy')
    expect(summary).toContain('right sleeve cuff')
    expect(summary).toContain('They ruined my favorite blouse.')
    expect(summary).toContain('NSD before perc cycle')
    expect(summary).toContain('JC-2026-1420')
    expect(summary).toContain('after_cleaning')
  })

  it('lists desired_outputs explicitly', () => {
    const intake = minimalIntake({
      desired_outputs: ['decline_note', 'customer_email' as never],
    })
    // Even though customer_email isn't in the closed enum (it'd fail validation),
    // the renderer is non-validating — it surfaces what the operator sent.
    const summary = renderIntakeSummary(intake)
    expect(summary).toContain('Desired outputs:')
    expect(summary).toContain('decline_note')
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// buildSystemPrompt — non-negotiable rules
// ──────────────────────────────────────────────────────────────────────────────

describe('buildSystemPrompt', () => {
  it('contains all non-negotiable rules in EN', () => {
    const p = buildSystemPrompt('en')
    expect(p).toContain('NO Eisen references')
    expect(p).toContain('NO legal advice')
    expect(p).toContain('Never state definitive liability when evidence is insufficient')
    expect(p).toContain('Separate FACTS')
    expect(p).toContain('EVIDENCE GAPS')
  })

  it('appends Spanish-language amendment in ES', () => {
    const p = buildSystemPrompt('es')
    expect(p).toContain('Spanish')
    expect(p).toContain('NSD, POG')
  })

  it('lists the full output JSON shape with all required document fields', () => {
    const p = buildSystemPrompt('en')
    for (const field of [
      'operator_summary',
      'likely_causes',
      'risk_assessment',
      'liability_position',
      'recommended_next_steps',
      'missing_evidence_questions',
      'customer_intake_script',
      'customer_sms',
      'customer_email',
      'ticket_note',
      'written_decline_or_release_note',
      'incident_report',
      'documentation_checklist',
      'disclaimers',
    ]) {
      expect(p, `system prompt missing required output field "${field}"`).toContain(field)
    }
  })

  it('emphasizes no admission of fault in customer-facing docs', () => {
    const p = buildSystemPrompt('en')
    expect(p.toLowerCase()).toContain('admission of fault')
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// buildUserContent — text + photos packaging
// ──────────────────────────────────────────────────────────────────────────────

describe('buildUserContent', () => {
  it('produces a single text block when no photos', () => {
    const content = buildUserContent(minimalIntake())
    expect(content).toHaveLength(1)
    expect(content[0].type).toBe('text')
  })

  it('appends one image_url entry per photo', () => {
    const content = buildUserContent(minimalIntake({
      photos: [
        { kind: 'front', url: 'data:image/jpeg;base64,abc' },
        { kind: 'detail', url: 'data:image/jpeg;base64,def' },
      ],
    }))
    expect(content).toHaveLength(3)
    expect(content[1].type).toBe('image_url')
    expect(content[2].type).toBe('image_url')
  })
})
