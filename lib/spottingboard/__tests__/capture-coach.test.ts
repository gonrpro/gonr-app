// lib/spottingboard/__tests__/capture-coach.test.ts — TASK-164

import { describe, it, expect } from 'vitest'
import { deriveCoachPanel, type ClassifierInput } from '../capture-coach'

function input(overrides: Partial<ClassifierInput> = {}): ClassifierInput {
  return {
    title: 'Never use chlorine bleach on wool',
    body: 'Substitute oxygen bleach with cold-only application.',
    stain_scope: [],
    fabric_scope: ['wool'],
    chemistry_scope: ['chlorine bleach', 'oxygen bleach'],
    ...overrides,
  }
}

describe('deriveCoachPanel — empty form', () => {
  it('returns level=none when title and body are empty', () => {
    const panel = deriveCoachPanel(input({ title: '', body: '' }))
    expect(panel.level).toBe('none')
    expect(panel.matches).toEqual([])
    expect(panel.headline).toContain('Start typing')
  })

  it('returns level=none with whitespace-only title and body', () => {
    const panel = deriveCoachPanel(input({ title: '   ', body: '\n\n' }))
    expect(panel.level).toBe('none')
  })
})

describe('deriveCoachPanel — scope_required', () => {
  it('flags scope_required=true when all 3 scope arrays empty', () => {
    const panel = deriveCoachPanel(
      input({
        title: 'Some rule',
        body: 'Some body',
        stain_scope: [],
        fabric_scope: [],
        chemistry_scope: [],
      }),
    )
    expect(panel.scope_required).toBe(true)
    expect(panel.level).toBe('info')
    expect(panel.headline).toContain('Add a scope')
    expect(panel.suggested_action).toContain('stain, fabric, or chemistry')
  })

  it('does NOT flag scope_required when at least one scope is filled', () => {
    const panel = deriveCoachPanel(
      input({
        stain_scope: [],
        fabric_scope: ['wool'],
        chemistry_scope: [],
      }),
    )
    expect(panel.scope_required).toBe(false)
  })
})

describe('deriveCoachPanel — clean rule (no matches)', () => {
  it('returns level=info when no patterns match and scope filled', () => {
    const panel = deriveCoachPanel(
      input({
        title: 'Cool water flush for fresh tea',
        body: 'Use cool water from the back of the fabric. No agitation.',
        stain_scope: ['tea'],
        fabric_scope: ['cotton'],
        chemistry_scope: [],
      }),
    )
    expect(panel.level).toBe('info')
    expect(panel.matches).toHaveLength(0)
    expect(panel.headline).toContain('Looks good')
  })

  it('returns benign defaults in preview_governance when no match', () => {
    const panel = deriveCoachPanel(
      input({
        title: 'Cool water flush',
        body: 'Pretest first.',
        stain_scope: ['tea'],
        fabric_scope: [],
        chemistry_scope: [],
      }),
    )
    expect(panel.preview_governance.safety_label).toBe('needs_source_review')
    expect(panel.preview_governance.risk_tier).toBe('requires-supervisor')
    expect(panel.preview_governance.runtime_eligible).toBe(false)
    expect(panel.preview_governance.authority_class).toBe('plant-local')
  })
})

describe('deriveCoachPanel — hard-block matches', () => {
  it('returns level=error for unsafe_or_contraindicated match', () => {
    const panel = deriveCoachPanel(
      input({
        title: 'Rust quick fix',
        body: 'Use chlorine bleach first to lift rust marks.',
        chemistry_scope: ['chlorine bleach'],
      }),
    )
    expect(panel.level).toBe('error')
    expect(panel.matches.length).toBeGreaterThan(0)
    expect(panel.preview_governance.safety_label).toBe('unsafe_do_not_use')
    expect(panel.preview_governance.risk_tier).toBe('high-risk')
    expect(panel.headline).toContain('hard-ban')
  })

  it('suggests editing or saving as quarantined for unsafe match', () => {
    const panel = deriveCoachPanel(
      input({
        title: 'Use bleach',
        body: 'Apply chlorine bleach on rust.',
      }),
    )
    expect(panel.level).toBe('error')
    expect(panel.suggested_action).toContain('Edit your rule')
    expect(panel.suggested_action).toContain('save as-is')
    expect(panel.suggested_action).toContain('unsafe_do_not_use')
  })

  it('returns level=warning for claim_sensitive match (leather)', () => {
    const panel = deriveCoachPanel(
      input({
        title: 'Leather grease handling',
        body: 'Process leather garments per plant SOP.',
        fabric_scope: ['leather'],
      }),
    )
    expect(panel.level).toBe('warning')
    expect(panel.preview_governance.risk_tier).toBe('claim-sensitive')
    expect(panel.preview_governance.safety_label).toBe('needs_source_review')
  })

  it('returns level=warning for supervisor_only match (unknown_fiber + oxidizer)', () => {
    const panel = deriveCoachPanel(
      input({
        title: 'Unknown fiber treatment',
        body: 'Use oxidizer on the spot.',
      }),
    )
    expect(panel.level).toBe('warning')
    expect(panel.preview_governance.risk_tier).toBe('requires-supervisor')
  })
})

describe('deriveCoachPanel — review_required (soft flag)', () => {
  it('returns level=info for review_required-only match (we always)', () => {
    const panel = deriveCoachPanel(
      input({
        title: 'Coffee on silk',
        body: 'We always blot fresh first then cool water.',
        stain_scope: ['coffee'],
        fabric_scope: ['silk'],
      }),
    )
    expect(panel.level).toBe('info')
    expect(panel.matches.length).toBeGreaterThan(0)
    expect(panel.headline).toContain('flag for supervisor review')
  })
})

describe('deriveCoachPanel — multi-match precedence', () => {
  it('rust+bleach + leather → unsafe_or_contraindicated wins (high-risk safety_label=unsafe)', () => {
    const panel = deriveCoachPanel(
      input({
        title: 'Rust on leather',
        body: 'Use chlorine bleach first.',
        chemistry_scope: ['chlorine bleach'],
        fabric_scope: ['leather'],
      }),
    )
    expect(panel.level).toBe('error')
    expect(panel.preview_governance.safety_label).toBe('unsafe_do_not_use')
    expect(panel.preview_governance.risk_tier).toBe('high-risk')
  })
})

describe('deriveCoachPanel — preview_governance always reflects locked TASK-158 defaults', () => {
  it('runtime_eligible always false', () => {
    const panel = deriveCoachPanel(input())
    expect(panel.preview_governance.runtime_eligible).toBe(false)
  })

  it('authority_class always plant-local', () => {
    const panel = deriveCoachPanel(input())
    expect(panel.preview_governance.authority_class).toBe('plant-local')
  })

  it('feed_mode always private-only', () => {
    const panel = deriveCoachPanel(input())
    expect(panel.preview_governance.feed_mode).toBe('private-only')
  })

  it('review_status always unreviewed', () => {
    const panel = deriveCoachPanel(input())
    expect(panel.preview_governance.review_status).toBe('unreviewed')
  })

  it('promotion_status always never-promoted', () => {
    const panel = deriveCoachPanel(input())
    expect(panel.preview_governance.promotion_status).toBe('never-promoted')
  })
})
