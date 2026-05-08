// lib/spottingboard/__tests__/ops-book.test.ts — TASK-162

import { describe, it, expect } from 'vitest'
import {
  renderOpsBookMarkdown,
  isHardSafetyRule,
  MODULE_SECTION_ORDER,
  type RenderOpsBookInput,
} from '../ops-book'
import type { BrainLibraryItem } from '../items'
import type { PlantBrainItemModule } from '../types'

function item(overrides: Partial<BrainLibraryItem>): BrainLibraryItem {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    module: 'chemistry_rule',
    title: 'Test rule',
    body: 'Body text.',
    authority_class: 'plant-local',
    risk_tier: 'requires-supervisor',
    review_status: 'unreviewed',
    safety_label: 'needs_source_review',
    conflict_flags: [],
    runtime_eligible: false,
    created_at: '2026-05-07T12:00:00.000Z',
    reviewer_email: null,
    ...overrides,
  }
}

function input(items: BrainLibraryItem[], overrides: Partial<RenderOpsBookInput> = {}): RenderOpsBookInput {
  return {
    plant: { name: "Jerry's Cleaners", plantId: 'plant-uuid-1' },
    items,
    generated_at: '2026-05-07T18:00:00.000Z',
    generated_by: 'tyler@gonr.pro',
    ...overrides,
  }
}

describe('renderOpsBookMarkdown — title page + structure', () => {
  it('includes plant name in the title', () => {
    const md = renderOpsBookMarkdown(input([]))
    // md() escapes inline-markdown chars only; apostrophe stays as-is.
    expect(md).toContain("# Jerry's Cleaners — Plant Ops Book")
  })

  it('includes generated-at date and generated-by email', () => {
    const md = renderOpsBookMarkdown(input([]))
    expect(md).toContain('Generated 2026-05-07')
    expect(md).toContain('tyler@gonr.pro')
  })

  it('renders At a Glance section with zero counts when no items', () => {
    const md = renderOpsBookMarkdown(input([]))
    expect(md).toContain('## At a Glance')
    expect(md).toContain('Total items: 0')
  })

  it('renders At a Glance counts by safety label', () => {
    const items = [
      item({ id: 'a', safety_label: 'source_backed' }),
      item({ id: 'b', safety_label: 'source_backed' }),
      item({ id: 'c', safety_label: 'unsafe_do_not_use' }),
      item({ id: 'd', safety_label: 'needs_source_review' }),
    ]
    const md = renderOpsBookMarkdown(input(items))
    expect(md).toContain('Total items: 4')
    expect(md).toContain('Source-backed: 2')
    expect(md).toContain('Unsafe / quarantined: 1')
    expect(md).toContain('Pending source review: 1')
  })
})

describe('renderOpsBookMarkdown — section ordering', () => {
  it('renders Hard Safety Rules section first', () => {
    const md = renderOpsBookMarkdown(input([]))
    const hardSafetyIdx = md.indexOf('## Hard Safety Rules')
    const chemistryIdx = md.indexOf('## Chemistry Rules')
    expect(hardSafetyIdx).toBeGreaterThan(0)
    expect(hardSafetyIdx).toBeLessThan(chemistryIdx)
  })

  it('hard-safety rule (escalation_rule + unsafe_do_not_use) lands in Hard Safety section', () => {
    const items = [
      item({
        id: 'esc-1',
        module: 'escalation_rule',
        title: 'Aniline grease — leather specialist only',
        body: 'Do not start in-house. Route to leather specialist regardless of staff seniority.',
        safety_label: 'unsafe_do_not_use',
        risk_tier: 'high-risk',
      }),
    ]
    const md = renderOpsBookMarkdown(input(items))
    const hardSafetyIdx = md.indexOf('## Hard Safety Rules')
    const titleIdx = md.indexOf('Aniline grease')
    const otherEscalationIdx = md.indexOf('## Other Escalation Rules')
    expect(titleIdx).toBeGreaterThan(hardSafetyIdx)
    if (otherEscalationIdx >= 0) {
      expect(titleIdx).toBeLessThan(otherEscalationIdx)
    }
  })

  it('non-hard-safety escalation rule does NOT appear in Hard Safety section', () => {
    const items = [
      item({
        id: 'esc-2',
        module: 'escalation_rule',
        title: 'Standard rush escalation',
        body: 'Manager approves rush jobs after 3pm.',
        safety_label: 'reviewed_for_plant_use',
        risk_tier: 'requires-supervisor',
      }),
    ]
    const md = renderOpsBookMarkdown(input(items))
    // Empty hard safety section + populated other escalation rules section
    expect(md).toContain('No hard safety escalation rules captured yet')
    expect(md).toContain('Standard rush escalation')
  })

  it('renders chemistry rules in dedicated section', () => {
    const items = [
      item({
        id: 'chem-1',
        module: 'chemistry_rule',
        title: 'Never bleach wool',
        body: 'Substitute oxygen bleach, cold-only.',
      }),
    ]
    const md = renderOpsBookMarkdown(input(items))
    expect(md).toContain('## Chemistry Rules')
    expect(md).toContain('Never bleach wool')
  })

  it('renders tribal knowledge in dedicated section when include_tribal=true (default)', () => {
    const items = [
      item({
        id: 'trib-1',
        module: 'tribal_note',
        title: 'Old shop trick: cold milk on coffee',
        body: 'Long-time spotter rule, no source citation yet.',
        authority_class: 'unverified-tribal',
      }),
    ]
    const md = renderOpsBookMarkdown(input(items))
    expect(md).toContain('## Tribal Knowledge — Unverified')
    expect(md).toContain('Old shop trick')
  })

  it('hides tribal section when include_tribal=false', () => {
    const items = [
      item({
        id: 'trib-1',
        module: 'tribal_note',
        title: 'Hidden trick',
        body: 'Will not appear.',
      }),
    ]
    const md = renderOpsBookMarkdown(input(items, { include_tribal: false }))
    expect(md).not.toContain('## Tribal Knowledge — Unverified')
    expect(md).not.toContain('Hidden trick')
  })

  it('separates tribal hard-ban quotes into their own section', () => {
    const items = [
      item({
        id: 'trib-unsafe',
        module: 'tribal_note',
        title: 'They said use Dawn on aniline',
        body: 'Old shop manager said use dish soap on aniline grease — not sure if right.',
        safety_label: 'unsafe_do_not_use',
      }),
    ]
    const md = renderOpsBookMarkdown(input(items))
    expect(md).toContain('## Tribal Knowledge — Hard-ban quotes (training warnings)')
    expect(md).toContain('They said use Dawn on aniline')
  })
})

describe('renderOpsBookMarkdown — per-item rendering preserves all 4 governance fields', () => {
  it('renders authority, risk, review, safety as separate visible badges', () => {
    const md = renderOpsBookMarkdown(
      input([
        item({
          id: 'gov-1',
          authority_class: 'plant-local',
          risk_tier: 'requires-supervisor',
          review_status: 'reviewed-accept',
          safety_label: 'reviewed_for_plant_use',
        }),
      ]),
    )
    expect(md).toContain('**Authority:** plant-local')
    expect(md).toContain('**Risk:** requires-supervisor')
    expect(md).toContain('**Review:** reviewed-accept')
    expect(md).toContain('**Safety:** reviewed_for_plant_use')
  })

  it('renders unsafe_do_not_use warning blockquote', () => {
    const md = renderOpsBookMarkdown(
      input([
        item({
          id: 'unsafe-1',
          safety_label: 'unsafe_do_not_use',
          risk_tier: 'high-risk',
        }),
      ]),
    )
    expect(md).toContain('UNSAFE — DO NOT USE')
    expect(md).toContain('Never apply to garments without explicit supervisor + Stain Brain review')
  })

  it('renders runtime-eligible callout when applicable', () => {
    const md = renderOpsBookMarkdown(
      input([
        item({
          id: 're-1',
          runtime_eligible: true,
          safety_label: 'reviewed_for_plant_use',
          review_status: 'reviewed-accept',
        }),
      ]),
    )
    expect(md).toContain('Runtime-eligible')
  })

  it('renders conflict flags when present', () => {
    const md = renderOpsBookMarkdown(
      input([
        item({
          id: 'conf-1',
          conflict_flags: [
            { flag_id: 'rust_bleach', kind: 'source_default_conflict', detail: 'Rust + chlorine bleach prohibited' },
          ],
        }),
      ]),
    )
    expect(md).toContain('**Conflict flags:**')
    expect(md).toContain('Rust + chlorine bleach prohibited')
  })

  it('renders provenance footer with captured-at and reviewer', () => {
    const md = renderOpsBookMarkdown(
      input([
        item({
          id: 'prov-1',
          created_at: '2026-05-07T10:00:00.000Z',
          reviewer_email: 'val@plant.com',
        }),
      ]),
    )
    expect(md).toContain('Captured: 2026-05-07')
    expect(md).toContain('Reviewer: val@plant.com')
  })

  it('escapes markdown special chars in title and body', () => {
    const md = renderOpsBookMarkdown(
      input([
        item({
          id: 'esc-md-1',
          title: 'Rule with [brackets] and *stars*',
          body: 'Body with `backticks` and # hash',
        }),
      ]),
    )
    expect(md).toContain('\\[brackets\\]')
    expect(md).toContain('\\*stars\\*')
  })
})

describe('renderOpsBookMarkdown — provenance footer + plant profile', () => {
  it('includes provenance section at end', () => {
    const md = renderOpsBookMarkdown(input([]))
    expect(md).toContain('## Provenance')
    expect(md).toContain('Document version: 1.0 (markdown)')
    expect(md).toContain('Powered by GONR Labs')
  })

  it('renders primary_solvent when provided', () => {
    const md = renderOpsBookMarkdown(
      input([], {
        plant: { name: 'Plant', plantId: 'p1', primary_solvent: 'perc' },
      }),
    )
    expect(md).toContain('**Primary process:** perc')
  })

  it('renders locations and languages when provided', () => {
    const md = renderOpsBookMarkdown(
      input([], {
        plant: {
          name: 'Plant',
          plantId: 'p1',
          locations: ['Naples FL', 'Fort Myers FL'],
          languages: ['English', 'Spanish'],
        },
      }),
    )
    expect(md).toContain('Naples FL, Fort Myers FL')
    expect(md).toContain('English, Spanish')
  })
})

describe('isHardSafetyRule', () => {
  it('returns true for escalation_rule + unsafe_do_not_use', () => {
    expect(
      isHardSafetyRule(
        item({
          module: 'escalation_rule',
          safety_label: 'unsafe_do_not_use',
        }),
      ),
    ).toBe(true)
  })

  it('returns true for escalation_rule + escalation_required', () => {
    expect(
      isHardSafetyRule(
        item({
          module: 'escalation_rule',
          safety_label: 'escalation_required',
        }),
      ),
    ).toBe(true)
  })

  it('returns true for escalation_rule + high-risk', () => {
    expect(
      isHardSafetyRule(
        item({
          module: 'escalation_rule',
          risk_tier: 'high-risk',
        }),
      ),
    ).toBe(true)
  })

  it('returns false for chemistry_rule even when unsafe', () => {
    expect(
      isHardSafetyRule(
        item({
          module: 'chemistry_rule',
          safety_label: 'unsafe_do_not_use',
        }),
      ),
    ).toBe(false)
  })

  it('returns false for benign escalation_rule', () => {
    expect(
      isHardSafetyRule(
        item({
          module: 'escalation_rule',
          safety_label: 'reviewed_for_plant_use',
          risk_tier: 'requires-supervisor',
        }),
      ),
    ).toBe(false)
  })
})

describe('MODULE_SECTION_ORDER', () => {
  it('has every PlantBrainItemModule covered', () => {
    const allModules: PlantBrainItemModule[] = [
      'procedure',
      'chemistry_rule',
      'escalation_rule',
      'training_check',
      'reference_sop',
      'printout',
      'preference',
      'tribal_note',
      'plant_profile',
    ]
    for (const m of allModules) {
      expect(MODULE_SECTION_ORDER).toContain(m)
    }
  })
})
