// TASK-235 — fixture integrity + assessor semantics locks.

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const fixturePath = join(process.cwd(), 'scripts/evals/ev-cases.json')

describe('TASK-235 — fixture integrity', () => {
  it('fixtures exist, parsed from the secured source, 104 cases with stable ids', () => {
    expect(existsSync(fixturePath)).toBe(true)
    const d = JSON.parse(readFileSync(fixturePath, 'utf8'))
    expect(d.generated_from).toContain('GONR_EVALUATION_SUITE.md')
    expect(d.cases).toHaveLength(104)
    expect(d.cases[0].id).toBe('EV-001')
    expect(d.cases[103].id).toBe('EV-104')
    const risks = new Set(d.cases.map((c: { expectedRisk: string }) => c.expectedRisk))
    for (const r of risks) expect(['green', 'yellow', 'orange', 'red']).toContain(r)
    for (const c of d.cases) {
      expect(c.body.stain.length, `${c.id} empty stain`).toBeGreaterThan(2)
      expect(c.body.surface.length, `${c.id} empty surface`).toBeGreaterThan(2)
      expect(typeof c.needsDirectAnswer).toBe('boolean')
    }
    expect(d.adversarial.length).toBeGreaterThanOrEqual(5)
  })

  it('canonical cases carry the spec-critical expectations', () => {
    const d = JSON.parse(readFileSync(fixturePath, 'utf8'))
    const byId = Object.fromEntries(d.cases.map((c: { id: string }) => [c.id, c]))
    expect(byId['EV-019'].expectedRisk).toBe('red') // unknown + DCO
    expect(byId['EV-003'].expectedRisk).toBe('red') // wine on silk
    expect(byId['EV-050'].needsDirectAnswer).toBe(true) // bleach question
    expect(byId['EV-061'].expectedRisk).toBe('red') // dye transfer observed
    expect(byId['EV-104'].expectedRisk).toBe('red') // acetate + nail polish
    expect(byId['EV-097'].expectedRisk).toBe('red') // wool + rubbed
  })

  it('fixture generation is deterministic (regenerating yields identical ids/risks)', async () => {
    const { execSync } = await import('node:child_process')
    const before = readFileSync(fixturePath, 'utf8')
    execSync('python3 scripts/evals/build-fixtures.py', { cwd: process.cwd() })
    const after = readFileSync(fixturePath, 'utf8')
    expect(after).toBe(before)
  })
})

describe('TASK-235 — assessor semantics (synthetic cards through the real validators)', () => {
  async function assess(card: unknown, evCase: Record<string, unknown>): Promise<{ verdict: string; reasons: string[] }> {
    const { execSync } = await import('node:child_process')
    const out = execSync('npx tsx scripts/evals/assess-case.ts', {
      cwd: process.cwd(),
      input: JSON.stringify({ card }),
      env: { ...process.env, EV_CASE: JSON.stringify(evCase) },
    }).toString()
    return JSON.parse(out)
  }

  const protectCard = {
    title: 'Stop here — protect it and see a pro',
    homeSolutions: ['Blot gently with a clean white cloth. No rubbing, no heat.'],
    materialWarnings: ['Heat can set this stain.'],
    firstAid: { steps: ['Blot gently.'] },
    escalation: { whatToTell: 'Describe the stain.' },
  }

  const redCase = {
    id: 'SYN-RED',
    body: { stain: 'unknown stain', surface: 'dry-clean-only suit' },
    expectedRisk: 'red',
    expectedBudget: 0,
    forbiddenLexical: ['hot water'],
    needsDirectAnswer: false,
  }

  it('protect-only card passes a red case (safer always passes)', async () => {
    const r = await assess(protectCard, redCase)
    expect(r.verdict).toBe('PASS')
  })

  it('active wet treatment on a red case fails (permissiveness ceiling)', async () => {
    const wet = { ...protectCard, homeSolutions: ['Dab the area with mild dish soap solution in cold water and rinse.'] }
    const r = await assess(wet, redCase)
    expect(r.verdict).toBe('FAIL')
    expect(r.reasons.join()).toContain('active-treatment-on-red-case')
  })

  it('forbidden token as warning passes; as instruction fails', async () => {
    const warning = { ...protectCard, homeSolutions: ['Never use hot water on this stain. Blot only.'] }
    expect((await assess(warning, { ...redCase, expectedRisk: 'green', expectedBudget: 4 })).verdict).toBe('PASS')
    const instruct = { ...protectCard, homeSolutions: ['Use hot water to flush the stain quickly.'] }
    const r = await assess(instruct, { ...redCase, expectedRisk: 'green', expectedBudget: 4 })
    expect(r.verdict).toBe('FAIL')
    expect(r.reasons.join()).toContain('forbidden-instruction:hot water')
  })

  it('missing firstAid fails; pro-term leak fails through the live guard', async () => {
    const noFa = { ...protectCard, firstAid: undefined }
    expect((await assess(noFa, redCase)).reasons.join()).toContain('missing-firstAid')
    const leak = { ...protectCard, homeSolutions: ['Apply NSD at working strength.'] }
    expect((await assess(leak, redCase)).reasons.join()).toContain('guard:forbidden-term:nsd')
  })
})
