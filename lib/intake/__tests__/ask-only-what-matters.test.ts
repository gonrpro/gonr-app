import { describe, expect, it } from 'vitest'
import {
  applySuppression,
  extractParsedFacts,
  type IntakeQuestion,
  type IntakeRequest,
} from '@/lib/intake/orchestrator'

function chatReq(userText: string, transcript: IntakeRequest['transcript'] = []): IntakeRequest {
  return { transcript: [{ role: 'user', text: userText }, ...transcript] }
}

describe('deterministic fact extraction (ask only what matters)', () => {
  it('resolves stain + fabric from "red wine on a silk dress"', () => {
    const pf = extractParsedFacts(chatReq('red wine on a silk dress'))
    expect(pf.stain).toBe('red wine')
    expect(pf.stainFamily).toBe('tannin')
    expect(pf.fabric).toBe('silk')
    expect(pf.stainKnown).toBe(true)
    expect(pf.fabricKnown).toBe(true)
    expect(pf.fabricConfidence).toBe('high')
  })

  it('resolves stain + fabric from "coffee on cotton shirt"', () => {
    const pf = extractParsedFacts(chatReq('coffee on cotton shirt'))
    expect(pf.stain).toBe('coffee')
    expect(pf.stainFamily).toBe('tannin')
    expect(pf.fabric).toBe('cotton')
    expect(pf.stainKnown).toBe(true)
    expect(pf.fabricKnown).toBe(true)
  })

  it('marks a garment-inferred fabric as LOW confidence (drives a confirm)', () => {
    const pf = extractParsedFacts(chatReq('red wine on my blouse'))
    expect(pf.fabric).toBe('silk') // blouse -> silk (an assumption)
    expect(pf.fabricConfidence).toBe('low')
  })

  it('care-label fiber is ground truth (high confidence)', () => {
    const pf = extractParsedFacts({
      transcript: [{ role: 'user', text: 'some spill' }],
      hints: { careLabel: { fiber: 'Wool' } },
    })
    expect(pf.fabric).toBe('wool')
    expect(pf.fabricConfidence).toBe('high')
  })
})

describe('authoritative suppression', () => {
  const stainQ: IntakeQuestion = { text: 'Do you know what the stain is?', options: [] }
  const fabricQ: IntakeQuestion = { text: 'What is the fabric — cotton, silk, or wool?', options: [] }

  it('GATE: "coffee on cotton" → a stain-identity question is SUPPRESSED for a safety var', () => {
    const req = chatReq('coffee on cotton shirt')
    const pf = extractParsedFacts(req)
    const { question, suppressions } = applySuppression(stainQ, pf, req)
    expect(suppressions).toHaveLength(1)
    expect(suppressions[0].reason).toBe('stain_identity_already_known')
    // substituted question must be a SAFETY variable, never the stain identity
    expect(question).not.toBeNull()
    expect(question?.text).toBe('How long has the stain been there?')
  })

  it('suppresses a fabric re-ask when fabric is known at high confidence', () => {
    const req = chatReq('red wine on a silk dress')
    const pf = extractParsedFacts(req)
    const { question, suppressions } = applySuppression(fabricQ, pf, req)
    expect(suppressions[0].reason).toBe('fabric_already_known')
    expect(question?.text).toBe('How long has the stain been there?')
  })

  it('does NOT suppress a genuine safety question (prior treatment)', () => {
    const priorQ: IntakeQuestion = { text: 'Have you tried anything on it yet?', options: [] }
    const req = chatReq('coffee on cotton shirt')
    const pf = extractParsedFacts(req)
    const { question, suppressions } = applySuppression(priorQ, pf, req)
    expect(suppressions).toHaveLength(0)
    expect(question).toBe(priorQ)
  })

  it('does NOT suppress a fabric confirm when the fabric was only inferred (low conf)', () => {
    const req = chatReq('red wine on my blouse')
    const pf = extractParsedFacts(req)
    const { suppressions } = applySuppression(fabricQ, pf, req)
    expect(suppressions).toHaveLength(0) // model may confirm a low-confidence guess
  })

  it('advances through safety vars: with age known, substitutes prior-treatment', () => {
    const req = chatReq('fresh coffee on cotton shirt that just happened')
    const pf = extractParsedFacts(req)
    const { question } = applySuppression(
      { text: 'what caused the stain?', options: [] },
      pf,
      req,
    )
    expect(question?.text).toBe('Have you tried anything on it yet?')
  })

  it('does not re-ask stain cause after the user answered grass in the chat', () => {
    const req = {
      transcript: [
        { role: 'user' as const, text: 'cotton shorts' },
        { role: 'assistant' as const, text: 'Quick one: is the grass stain still fresh/wet or has it dried/set?' },
        { role: 'user' as const, text: 'Fresh / still wet' },
        { role: 'assistant' as const, text: 'Quick one — do you know what caused the stain?' },
        { role: 'user' as const, text: 'Grass from falling while playing' },
      ],
    }
    const pf = extractParsedFacts(req)
    expect(pf.stain).toBe('grass')
    expect(pf.stainKnown).toBe(true)

    const { question, suppressions } = applySuppression(
      { text: 'Quick one — do you know what caused the stain?', options: [] },
      pf,
      req,
    )
    expect(suppressions[0].reason).toBe('stain_identity_already_known')
    expect(question?.text).not.toMatch(/caused the stain/i)
  })
})
