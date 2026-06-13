import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { runIntakeTurn, type IntakeRequest } from '@/lib/intake/orchestrator'

// TASK-254 — deterministic pre-LLM intake slot-collector.
// Gate (Atlas): fast-path slot cases make NO model call and resolve <100ms; the
// deterministic questions carry NO treatment prose; unknown/ambiguous stains still
// fall through to the planner LLM. We assert "no model call" by stubbing global
// fetch (the only path callModel reaches OpenAI) and proving it is never invoked.

// Treatment-guidance vocabulary that must NEVER appear in a slot-collection question
// (the short-circuit collects slots, it does not advise treatment).
const TREATMENT =
  /\b(apply|rinse|blot|dab|soak|scrub|flush|pour|launder|wash it|bleach it|hydrogen peroxide|vinegar|dish ?soap|club soda|cold water|warm water|stain remover)\b/i

function intake(text: string): IntakeRequest {
  return { transcript: [{ role: 'user', text }], proceed: false }
}

function plannerQuestionResponse(): Response {
  return new Response(
    JSON.stringify({
      status: 'completed',
      output_text: JSON.stringify({
        read: { fabric: '', stain: '', careRisk: '', confidence: 'medium' },
        knows: [],
        suspects: [],
        cannotKnow: ['the stain is not resolved'],
        nextQuestion: { text: 'Quick one — what caused the stain?', options: ['Not sure'] },
        readyForVerdict: false,
        riskFlags: [],
      }),
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

describe('TASK-254 deterministic intake slot-collector', () => {
  let fetchSpy: ReturnType<typeof vi.fn>
  beforeEach(() => {
    // Any model call goes through global fetch -> reject so a wrongful call is caught.
    fetchSpy = vi.fn(() => Promise.reject(new Error('MODEL_CALLED')))
    vi.stubGlobal('fetch', fetchSpy)
  })
  afterEach(() => vi.unstubAllGlobals())

  // Atlas evidence #1/#2: known stain + missing slot -> deterministic question, no model, <100ms.
  for (const text of ['coffee', 'red wine on shirt', 'grease on a shirt']) {
    it(`fast-path "${text}": deterministic slot question, NO model call, <100ms`, async () => {
      const t0 = performance.now()
      const d = await runIntakeTurn(intake(text), 'test-key')
      const ms = performance.now() - t0
      expect(fetchSpy).not.toHaveBeenCalled() // no LLM round-trip
      expect(d.model).toBe('deterministic')
      expect(d.action).toBe('ask')
      expect((d.nextQuestion?.text ?? '').length).toBeGreaterThan(0)
      expect(ms).toBeLessThan(100)
    })
  }

  // Atlas extra guard: deterministic questions contain no treatment prose.
  it('no-advice guard: deterministic slot questions carry zero treatment prose', async () => {
    for (const text of ['coffee', 'red wine on shirt', 'grease on a shirt']) {
      const d = await runIntakeTurn(intake(text), 'test-key')
      const blob = [d.nextQuestion?.text ?? '', ...(d.nextQuestion?.options ?? [])].join(' ')
      expect(TREATMENT.test(blob)).toBe(false)
    }
  })

  // Conservative gate: a stain NOT in the alias map (e.g. "ink") is unresolved, so it
  // must fall through to the model — never short-circuit on a stain we can't confirm.
  // (Widening the alias map to cover ink etc. is a separate data task, not this logic.)
  it('conservative: an unresolved stain (ink, not in alias map) falls through to the model', async () => {
    fetchSpy.mockResolvedValue(plannerQuestionResponse())
    const d = await runIntakeTurn(intake('ink on cotton'), 'test-key')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(d.model).not.toBe('deterministic')
  })

  // Atlas evidence #4: unknown/ambiguous stain -> falls through to the planner LLM.
  it('planner path: an unknown/ambiguous stain falls through to the model (LLM fires)', async () => {
    fetchSpy.mockResolvedValue(plannerQuestionResponse())
    const d = await runIntakeTurn(intake('some weird unidentifiable splotch'), 'test-key')
    expect(fetchSpy).toHaveBeenCalledTimes(1) // model path taken once (not short-circuited)
    expect(d.model).not.toBe('deterministic')
  })

  // Safety: a hazard disclosure must NOT take the fast-path (defers to the full model
  // + fail-closed path), even when the stain itself is known.
  it('hazard disclosure bypasses the fast-path (defers to model/fail-closed)', async () => {
    const d = await runIntakeTurn(intake('coffee, I already poured bleach on it'), 'test-key')
    expect(fetchSpy).toHaveBeenCalled()
    expect(d.model).not.toBe('deterministic')
  })
})
