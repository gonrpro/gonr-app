// lib/safety/bleach-neutralization.ts
// BLEACH-2 — server-side neutralization rule
// Authored 2026-04-14 (TASK-019) — consolidates Dan 086/096 post-bleach neutralization
// discipline into a pure function called from the safety filter.
//
// Rule: If a card recommends a bleach-family agent (chlorine bleach, sodium hypochlorite,
// hydrogen peroxide, oxygen bleach, sodium perborate, sodium percarbonate, OxiClean) in
// its protocol AND does not already include neutralization guidance (vinegar / acetic /
// neutraliz*), append a standardized acetic-acid rinse step to the card.
//
// Scope: textile substrate only. Rule does not apply to safety warnings about bleach
// (e.g. "do not use chlorine bleach") — only to protocol steps that actually recommend it.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Card = any

const BLEACH_AGENTS = [
  'chlorine bleach',
  'sodium hypochlorite',
  'hydrogen peroxide',
  'h2o2',
  'h₂o₂',
  'oxygen bleach',
  'sodium perborate',
  'sodium percarbonate',
  'oxiclean',
] as const

const NEUTRALIZATION_TERMS = [
  'vinegar',
  'acetic acid',
  'acetic',
  'neutraliz',
] as const

const NEGATIVE_CONTEXTS = [
  'never',
  'do not',
  "don't",
  'avoid',
  'not safe',
  'unsafe',
  'must not',
  'dangerous',
  'destroys',
  'damages',
  'no chlorine',
  'no bleach',
] as const

const NEUTRALIZATION_STEP_INSTRUCTION =
  'Neutralize: Apply acetic acid 28% diluted 1:10 (or 1 cup white vinegar per gallon of clean water). Dwell 1–2 minutes, blot, then flush thoroughly with clean water. Deactivates residual oxidizer and prevents delayed yellowing or fiber weakening. Mandatory after every bleach step per professional bleaching practice.'

const NEUTRALIZATION_WARNING =
  'Mandatory post-bleach neutralization: rinse with dilute acetic acid / white vinegar to deactivate residual oxidizer. See Spotter → Bleaching Guide.'

// TASK-231 — consumer variants. Consumers never get the pro acetic-acid
// procedure or Spotter/Bleaching Guide references; the safe consumer
// post-oxidizer move is a plain cool-water rinse, plus the never-mix warning
// (the pressure test caught the pro block rendering on consumer results).
const CONSUMER_RINSE_INSTRUCTION =
  'Rinse the treated area thoroughly with plain cool water and blot dry. Do not add anything else after a bleaching product — never mix bleach with vinegar, ammonia, or any other cleaner; mixing can create toxic gas.'

const CONSUMER_NEVER_MIX_WARNING =
  'Never mix bleach with vinegar, ammonia, or any other cleaner — mixing can create toxic gas. After any bleaching product, rinse with plain cool water only.'

export interface NeutralizationResult {
  appended: boolean
  reason: string
  card: Card
}

function extractProtocolText(card: Card): string {
  if (!card || typeof card !== 'object') return ''
  const parts: string[] = []

  if (Array.isArray(card.spottingProtocol)) {
    for (const step of card.spottingProtocol) {
      if (step && typeof step === 'object') {
        for (const key of ['agent', 'technique', 'instruction', 'equipment']) {
          const v = step[key]
          if (typeof v === 'string') parts.push(v)
        }
      }
    }
  }

  const pp = card.professionalProtocol
  if (pp && typeof pp === 'object') {
    if (Array.isArray(pp.steps)) parts.push(...pp.steps.filter((s: unknown): s is string => typeof s === 'string'))
    if (Array.isArray(pp.products)) parts.push(...pp.products.filter((s: unknown): s is string => typeof s === 'string'))
  }

  const dp = card.diyProtocol
  if (dp && typeof dp === 'object') {
    if (Array.isArray(dp.steps)) parts.push(...dp.steps.filter((s: unknown): s is string => typeof s === 'string'))
    if (Array.isArray(dp.products)) parts.push(...dp.products.filter((s: unknown): s is string => typeof s === 'string'))
  }

  if (Array.isArray(card.homeSolutions)) {
    parts.push(...card.homeSolutions.filter((s: unknown): s is string => typeof s === 'string'))
  }

  return parts.join(' ').toLowerCase()
}

function isNegatedMention(text: string, idx: number, termLen: number): boolean {
  const windowStart = Math.max(0, idx - 50)
  const windowEnd = Math.min(text.length, idx + termLen + 10)
  const ctx = text.substring(windowStart, windowEnd)
  return NEGATIVE_CONTEXTS.some(neg => ctx.includes(neg))
}

function findRecommendedBleach(card: Card): string | null {
  const text = extractProtocolText(card)
  for (const agent of BLEACH_AGENTS) {
    const idx = text.indexOf(agent)
    if (idx < 0) continue
    if (!isNegatedMention(text, idx, agent.length)) {
      return agent
    }
  }
  return null
}

function hasNeutralization(card: Card): boolean {
  const text = extractProtocolText(card)
  return NEUTRALIZATION_TERMS.some(term => text.includes(term))
}

function appendNeutralization(card: Card): void {
  if (!card || typeof card !== 'object') return

  if (!Array.isArray(card.spottingProtocol)) {
    card.spottingProtocol = []
  }
  const nextStep = (card.spottingProtocol.length || 0) + 1
  card.spottingProtocol.push({
    step: nextStep,
    side: 'wet',
    agent: 'Acetic acid 28% (diluted 1:10) or white vinegar',
    technique: 'Neutralization rinse',
    equipment: 'White cloth, clean water',
    dwellTime: '1–2 minutes, then flush',
    instruction: NEUTRALIZATION_STEP_INSTRUCTION,
    _source: 'bleach-neutralization-rule',
  })

  const pp = card.professionalProtocol
  if (pp && typeof pp === 'object') {
    if (!Array.isArray(pp.warnings)) pp.warnings = []
    if (!pp.warnings.includes(NEUTRALIZATION_WARNING)) {
      pp.warnings.push(NEUTRALIZATION_WARNING)
    }
  }

  if (!Array.isArray(card.materialWarnings)) card.materialWarnings = []
  if (!card.materialWarnings.includes(NEUTRALIZATION_WARNING)) {
    card.materialWarnings.push(NEUTRALIZATION_WARNING)
  }
}

function appendConsumerRinse(card: Card): void {
  if (!card || typeof card !== 'object') return

  if (!Array.isArray(card.spottingProtocol)) {
    card.spottingProtocol = []
  }
  const nextStep = (card.spottingProtocol.length || 0) + 1
  card.spottingProtocol.push({
    step: nextStep,
    side: 'wet',
    agent: 'Cool Water',
    technique: 'Final rinse',
    equipment: 'White cloth, clean water',
    dwellTime: 'Rinse and blot until residue is gone',
    instruction: CONSUMER_RINSE_INSTRUCTION,
    _source: 'bleach-neutralization-rule',
  })

  if (!Array.isArray(card.materialWarnings)) card.materialWarnings = []
  if (!card.materialWarnings.includes(CONSUMER_NEVER_MIX_WARNING)) {
    card.materialWarnings.push(CONSUMER_NEVER_MIX_WARNING)
  }
}

export type NeutralizationAudience = 'pro' | 'consumer'

export function ensureBleachNeutralization(
  card: Card,
  audience: NeutralizationAudience = 'pro',
): NeutralizationResult {
  if (!card || typeof card !== 'object') {
    return { appended: false, reason: 'invalid card', card }
  }

  const recommendedAgent = findRecommendedBleach(card)
  if (!recommendedAgent) {
    return { appended: false, reason: 'no bleach in protocol', card }
  }

  // Consumer cards must never carry the pro acetic-acid block or pro-guide
  // references — plain cool-water rinse instead. Checked BEFORE the generic
  // hasNeutralization() early-exit (codex-review P2): tannin cards routinely
  // use diluted vinegar as the acid TREATMENT step, which hasNeutralization()
  // reads as "already neutralized" — that must not suppress the consumer
  // never-mix warning when an oxidizer is also recommended.
  if (audience === 'consumer') {
    // Idempotence keys on the rule's OWN output (codex-review): a model-
    // authored "never mix bleach" warning without the final cool-water rinse
    // must not satisfy this check — the rinse step is the required copy.
    const hasRuleRinse =
      Array.isArray(card.spottingProtocol) &&
      card.spottingProtocol.some(
        (s: { _source?: string } | null) => s != null && s._source === 'bleach-neutralization-rule',
      )
    const hasStandardWarning =
      Array.isArray(card.materialWarnings) && card.materialWarnings.includes(CONSUMER_NEVER_MIX_WARNING)
    if (hasRuleRinse || hasStandardWarning) {
      return { appended: false, reason: `consumer rinse already present (bleach: ${recommendedAgent})`, card }
    }
    appendConsumerRinse(card)
    return {
      appended: true,
      reason: `appended consumer rinse for bleach agent "${recommendedAgent}"`,
      card,
    }
  }

  if (hasNeutralization(card)) {
    return { appended: false, reason: `already has neutralization (bleach: ${recommendedAgent})`, card }
  }

  appendNeutralization(card)
  return {
    appended: true,
    reason: `appended for bleach agent "${recommendedAgent}"`,
    card,
  }
}
