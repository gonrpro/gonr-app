import { describe, expect, it } from 'vitest'
import { decide } from '@/lib/decision/engine'
import { langOutputDirective } from '@/lib/solve/langDirective'

// TASK-218 (Tyler 2026-06-09) — Spanish must NEVER receive an English library card.
// The curated library is English-only, so a non-English request must bypass it and
// route to the AI tier (which generates IN the requested language). Atlas gate:
// "No ES request can return an English library-card result. 'red wine on cotton' /
// 'vino tinto en algodón' proves the bypass."

describe('ES → AI-tier library bypass (decide)', () => {
  it('serves the English library card for an English request (control)', async () => {
    const en = await decide({ stain: 'coffee', surface: 'cotton', lang: 'en' })
    // The control MUST actually hit a card, or the bypass assertion below is vacuous.
    expect(en.card).not.toBeNull()
    expect(en.source).toBe('core')
  })

  it('suppresses that same English library card for a Spanish request', async () => {
    const es = await decide({ stain: 'coffee', surface: 'cotton', lang: 'es' })
    // Routed to the AI tier instead of handing back an English card.
    expect(es.card).toBeNull()
    expect(es.tier).toBe(4)
    expect(es.source).toBe('ai')
  })

  it('canonical proof: red wine on cotton — EN may match a card, ES must not', async () => {
    const enWine = await decide({ stain: 'red wine', surface: 'cotton', lang: 'en' })
    const esWine = await decide({ stain: 'red wine', surface: 'cotton', lang: 'es' })
    // If English resolves a library card, Spanish must NOT return it.
    if (enWine.card) {
      expect(esWine.card).toBeNull()
      expect(esWine.source).toBe('ai')
    }
    // Either way, the ES request never carries an English library card.
    expect(esWine.card).toBeNull()
  })

  it('fail-safe: absent/unknown lang behaves exactly like English', async () => {
    const noLang = await decide({ stain: 'coffee', surface: 'cotton' })
    const enLang = await decide({ stain: 'coffee', surface: 'cotton', lang: 'en' })
    expect(noLang.card).toEqual(enLang.card)
    expect(noLang.source).toBe(enLang.source)
  })

  it('lang is case-insensitive (ES and es both bypass)', async () => {
    const upper = await decide({ stain: 'coffee', surface: 'cotton', lang: 'ES' })
    expect(upper.card).toBeNull()
  })
})

describe('langOutputDirective — Spanish output keeps agent names English (filter safety)', () => {
  it('emits a Spanish output mandate for es', () => {
    const d = langOutputDirective('es')
    expect(d).toContain('SPANISH')
    expect(d).toMatch(/MANDATORY/)
  })

  it('carries the safety carve-out: agent names stay English', () => {
    const d = langOutputDirective('es')
    expect(d).toMatch(/agent/i)
    expect(d).toMatch(/English/)
    expect(d).toMatch(/NEVER translate the agent name/)
    // The English chemical exemplars the runSafetyFilter keys on must be named.
    expect(d).toContain('Ammonia')
    expect(d).toContain('Chlorine Bleach')
  })

  it('keeps parser/enum fields in English (stainFamily, source, meta)', () => {
    const d = langOutputDirective('es')
    expect(d).toContain('stainFamily')
    expect(d).toContain('source')
    expect(d).toContain('meta')
  })

  it('returns empty (no behavior change) for en, undefined, and unknown langs', () => {
    expect(langOutputDirective('en')).toBe('')
    expect(langOutputDirective('EN')).toBe('')
    expect(langOutputDirective(undefined)).toBe('')
    expect(langOutputDirective('fr')).toBe('')
  })
})
