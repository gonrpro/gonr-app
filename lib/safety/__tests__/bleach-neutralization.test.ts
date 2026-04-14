import { describe, test, expect } from 'vitest'
import { ensureBleachNeutralization } from '../bleach-neutralization'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeSpottingCard(steps: any[]): any {
  return {
    title: 'Test',
    stainFamily: 'protein',
    surface: 'cotton',
    spottingProtocol: steps.map((s, i) => ({
      step: i + 1,
      agent: s.agent || '',
      technique: s.technique || 'blot',
      instruction: s.instruction || '',
    })),
    materialWarnings: [],
    escalation: 'Take to pro.',
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeLegacyCard(professionalSteps: string[], products: string[] = [], diyProducts: string[] = []): any {
  return {
    title: 'Test Legacy',
    stainFamily: 'tannin',
    surface: 'cotton',
    professionalProtocol: {
      steps: professionalSteps,
      products,
      warnings: [],
    },
    diyProtocol: {
      steps: [],
      products: diyProducts,
    },
    materialWarnings: [],
    escalation: 'Take to pro.',
  }
}

describe('BLEACH-2 — appends neutralization when bleach is recommended', () => {
  test('H₂O₂ in spottingProtocol, no vinegar — appends', () => {
    const card = makeSpottingCard([
      { agent: 'hydrogen peroxide 3%', instruction: 'Apply hydrogen peroxide 3% to stain. Blot gently.' },
    ])
    const before = card.spottingProtocol.length
    const result = ensureBleachNeutralization(card)
    expect(result.appended).toBe(true)
    expect(result.reason).toContain('hydrogen peroxide')
    expect(card.spottingProtocol.length).toBe(before + 1)
    expect(card.spottingProtocol.at(-1).technique).toBe('Neutralization rinse')
    expect(card.materialWarnings.length).toBeGreaterThan(0)
  })

  test('Oxygen bleach in professionalProtocol.steps, no vinegar — appends', () => {
    const card = makeLegacyCard([
      '1. Apply oxygen bleach to stain. Dwell 10 min.',
      '2. Rinse with warm water.',
    ])
    const result = ensureBleachNeutralization(card)
    expect(result.appended).toBe(true)
    expect(result.reason).toContain('oxygen bleach')
    expect(card.spottingProtocol).toBeDefined()
    expect(card.spottingProtocol.length).toBe(1)
    expect(card.professionalProtocol.warnings.some((w: string) => w.toLowerCase().includes('neutraliz'))).toBe(true)
  })

  test('Chlorine bleach in products, no vinegar — appends', () => {
    const card = makeLegacyCard(
      ['1. Soak garment.'],
      ['chlorine bleach diluted 1:10'],
    )
    const result = ensureBleachNeutralization(card)
    expect(result.appended).toBe(true)
    expect(result.reason).toContain('chlorine bleach')
  })

  test('OxiClean mentioned — appends', () => {
    const card = makeLegacyCard(
      ['1. Soak in OxiClean solution.'],
    )
    const result = ensureBleachNeutralization(card)
    expect(result.appended).toBe(true)
    expect(result.reason).toContain('oxiclean')
  })

  test('Sodium perborate — appends', () => {
    const card = makeSpottingCard([
      { agent: 'sodium perborate', instruction: 'Apply sodium perborate paste to yellowed area.' },
    ])
    const result = ensureBleachNeutralization(card)
    expect(result.appended).toBe(true)
    expect(result.reason).toContain('sodium perborate')
  })

  test('H₂O₂ variant spelling (h₂o₂ unicode) — matches', () => {
    const card = makeSpottingCard([
      { agent: 'h₂o₂ 3%', instruction: 'Apply h₂o₂ to test area.' },
    ])
    const result = ensureBleachNeutralization(card)
    expect(result.appended).toBe(true)
  })
})

describe('BLEACH-2 — does not append when neutralization is already present', () => {
  test('H₂O₂ + existing vinegar rinse step — no-op', () => {
    const card = makeSpottingCard([
      { agent: 'hydrogen peroxide 3%', instruction: 'Apply hydrogen peroxide.' },
      { agent: 'white vinegar', instruction: 'Rinse with dilute white vinegar.' },
    ])
    const before = card.spottingProtocol.length
    const result = ensureBleachNeutralization(card)
    expect(result.appended).toBe(false)
    expect(result.reason).toContain('already has neutralization')
    expect(card.spottingProtocol.length).toBe(before)
  })

  test('H₂O₂ + existing acetic acid step — no-op', () => {
    const card = makeLegacyCard([
      '1. Apply hydrogen peroxide 3%.',
      '2. Neutralize with acetic acid 28% diluted 1:10.',
    ])
    const result = ensureBleachNeutralization(card)
    expect(result.appended).toBe(false)
  })

  test('Oxygen bleach + explicit "neutralize" word — no-op', () => {
    const card = makeSpottingCard([
      { agent: 'oxygen bleach', instruction: 'Soak. Neutralize with dilute acid rinse at the end.' },
    ])
    const result = ensureBleachNeutralization(card)
    expect(result.appended).toBe(false)
  })
})

describe('BLEACH-2 — skips negated bleach mentions', () => {
  test('"Never use chlorine bleach" in instruction — no-op', () => {
    const card = makeSpottingCard([
      { agent: 'Cold water and dish soap', instruction: 'Never use chlorine bleach — destroys wool keratin.' },
    ])
    const result = ensureBleachNeutralization(card)
    expect(result.appended).toBe(false)
    expect(result.reason).toBe('no bleach in protocol')
  })

  test('"Do not use hydrogen peroxide" — no-op', () => {
    const card = makeSpottingCard([
      { agent: 'Cold water only', instruction: 'Do not use hydrogen peroxide on dark dyes — will bleach color.' },
    ])
    const result = ensureBleachNeutralization(card)
    expect(result.appended).toBe(false)
  })

  test('"No oxygen bleach on silk" — no-op', () => {
    const card = makeSpottingCard([
      { agent: 'dish soap', instruction: 'Apply dish soap. No oxygen bleach — damages silk fibroin.' },
    ])
    const result = ensureBleachNeutralization(card)
    expect(result.appended).toBe(false)
  })

  test('"Avoid OxiClean" — no-op', () => {
    const card = makeSpottingCard([
      { agent: 'cold water', instruction: 'Avoid OxiClean on cashmere — felts the fiber.' },
    ])
    const result = ensureBleachNeutralization(card)
    expect(result.appended).toBe(false)
  })
})

describe('BLEACH-2 — skips cards with no bleach', () => {
  test('Dish soap + cold water card — no-op', () => {
    const card = makeSpottingCard([
      { agent: 'dish soap', instruction: 'Apply dish soap to stain and work gently.' },
    ])
    const result = ensureBleachNeutralization(card)
    expect(result.appended).toBe(false)
    expect(result.reason).toBe('no bleach in protocol')
  })

  test('Amyl acetate professional card (e.g. nail polish on acrylic) — no-op', () => {
    const card = makeLegacyCard(
      ['1. Apply amyl acetate.', '2. Blot. Repeat.'],
      ['amyl acetate', 'NSD (Neutral Synthetic Detergent)'],
    )
    const result = ensureBleachNeutralization(card)
    expect(result.appended).toBe(false)
  })

  test('Empty card — no-op', () => {
    const card = { title: 'Empty' }
    const result = ensureBleachNeutralization(card)
    expect(result.appended).toBe(false)
  })

  test('Null card — no-op', () => {
    const result = ensureBleachNeutralization(null)
    expect(result.appended).toBe(false)
    expect(result.reason).toBe('invalid card')
  })
})

describe('BLEACH-2 — idempotent', () => {
  test('Running the rule twice only appends once', () => {
    const card = makeSpottingCard([
      { agent: 'hydrogen peroxide 3%', instruction: 'Apply hydrogen peroxide 3%.' },
    ])
    ensureBleachNeutralization(card)
    const lenAfterFirst = card.spottingProtocol.length
    const result = ensureBleachNeutralization(card)
    expect(result.appended).toBe(false)
    expect(result.reason).toContain('already has neutralization')
    expect(card.spottingProtocol.length).toBe(lenAfterFirst)
  })
})
