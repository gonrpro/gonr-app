// lib/solve/consumer-output-guard.ts
// TASK-231 Sprint 0 — minimal consumer result validator (Sprint 1 builds the
// full result contract on top of this).
//
// Runs on EVERY card leaving /api/solve to a non-paid tier, after all card
// mutation (safety filter, plant filters, neutralization, affiliates) and
// before sanitizeCardForTier. Blocks:
//   1. pro/internal vocabulary (Jerry's, Spotter→Bleaching Guide, trade agents)
//   2. unfilled template placeholders ([hours/days], [products], …)
//   3. fabricated user history (claims of prior treatments the request never
//      disclosed — "with Prior Bleach Applied" when the user only ASKED about
//      bleach)
//   4. instructions to mix bleach with anything (negation-aware: "never mix
//      bleach…" warnings are required copy, not violations)
//
// A blocked card is replaced by the caller's fallback; if the fallback ITSELF
// fails validation it is replaced by minimalSafeCard(), which is clean by
// construction — the chain always terminates in safe output.

// Pro/internal terms that must never reach a consumer screen — definitions
// moved to the TASK-236 consolidated rule table (lib/safety/rule-table.ts);
// re-exported here so existing imports keep working.
import { FORBIDDEN_CONSUMER_TERMS, UNSAFE_CONSUMER_CHEMISTRY } from '../safety/rule-table'
export { FORBIDDEN_CONSUMER_TERMS }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Card = any

export interface GuardViolation {
  rule: string
  match: string
}

// Unfilled template placeholders. Matches the report's literal [hours/days] /
// [products] plus any short bracketed lowercase token that reads like an
// unexpanded slot. Bracketed numerics ("[1]") and citation-style "[source: x]"
// don't match.
export const PLACEHOLDER_RE = /\[(?:hours\/days|products|[a-z][a-z /-]{1,30})\]/

// Agents whose "prior use" the card may only assert when the request text
// disclosed them. Order matters only for reporting.
const HISTORY_AGENTS = [
  'bleach',
  'solvent',
  'vinegar',
  'peroxide',
  'ammonia',
  'enzyme',
  'alcohol',
  'acetone',
] as const

// Phrasings that assert the user already did something with an agent.
// TASK-234 hardening: added passive assertion shapes ("bleach was used",
// "bleach has been applied") after a live probe caught one AI-authored
// claim-shaped phrase rendering once in ~9 intake runs. Conditional advice
// ("IF prior bleach exposure occurred, rinse…") stays legitimate — only
// assertion shapes are fabrication.
function fabricatedHistoryPatterns(agent: string): RegExp[] {
  return [
    new RegExp(`prior\\s+(?:\\w+\\s+)?${agent}[\\w\\s]{0,20}(?:applied|used|treatment)`, 'i'),
    new RegExp(`with\\s+prior\\s+${agent}`, 'i'),
    new RegExp(`already\\s+(?:applied|used|tried)\\s+(?:\\w+\\s+){0,2}${agent}`, 'i'),
    new RegExp(`treated\\s+(?:at\\s+home\\s+)?with\\s+(?:\\w+\\s+){0,2}${agent}`, 'i'),
    new RegExp(`after\\s+(?:your|the\\s+user'?s?)\\s+${agent}`, 'i'),
    new RegExp(`${agent}\\s+(?:was|has\\s+been|had\\s+been)\\s+(?:previously\\s+)?(?:applied|used)`, 'i'),
    new RegExp(`(?:user|they|you)\\s+(?:had\\s+)?(?:applied|used|poured)\\s+(?:\\w+\\s+){0,2}${agent}`, 'i'),
  ]
}

// Instructing the user to combine bleach with anything. Negation-aware: a
// "never/do not mix…" warning is REQUIRED consumer copy, not a violation.
const BLEACH_MIX_RE = /\bmix(?:ing)?\b[^.;\n]{0,60}\bbleach\b|\bbleach\b[^.;\n]{0,40}\bmix(?:ing)?\b/i
const NEGATION_NEAR = /\b(?:never|don'?t|do\s+not|avoid|must\s+not|no)\b/i

// TASK-232 contract additions ────────────────────────────────────────────
// Title sanity: truncation artifacts and raw classifier fragments are the
// pressure test's "…(care label: dry…" / "user is unsure what caused it. on
// what seems" class. Length cap is generous — verified titles run short.
const TITLE_MAX_LEN = 90
const TITLE_ARTIFACT_RES: ReadonlyArray<{ id: string; re: RegExp }> = [
  { id: 'ellipsis-truncation', re: /(?:…|\.\.\.)\s*\(?[^)]*$/ },
  { id: 'double-period', re: /\.\.(?!\.)/ },
  { id: 'classifier-fragment', re: /user\s+is\s+unsure|on\s+what\s+seems\s+to\s+be|\blabeled\b.*\(fiber/i },
]
function titleViolations(title: unknown): GuardViolation[] {
  if (typeof title !== 'string' || title.length === 0) return []
  const v: GuardViolation[] = []
  if (title.length > TITLE_MAX_LEN) v.push({ rule: 'title-too-long', match: title.slice(0, 40) })
  const open = (title.match(/\(/g) ?? []).length
  const close = (title.match(/\)/g) ?? []).length
  if (open !== close) v.push({ rule: 'title-unbalanced-parens', match: title.slice(-30) })
  for (const { id, re } of TITLE_ARTIFACT_RES) {
    if (re.test(title)) v.push({ rule: `title-${id}`, match: title.slice(0, 40) })
  }
  return v
}

// Absent-step references: escalation/why copy citing a chemical treatment the
// steps never gave ("after gentle detergent and peroxide treatment" with no
// peroxide step). Checked only in treatment-context phrasing so plain
// warnings ("never use peroxide here") don't trip it.
const STEP_CHEMS = ['peroxide', 'bleach', 'ammonia', 'enzyme', 'vinegar', 'acetone', 'alcohol'] as const
function absentStepViolations(card: Card): GuardViolation[] {
  if (!card || typeof card !== 'object') return []
  const stepsText = [
    ...(Array.isArray(card.spottingProtocol)
      ? card.spottingProtocol.map((s: { agent?: string; instruction?: string }) => `${s?.agent ?? ''} ${s?.instruction ?? ''}`)
      : []),
    ...(Array.isArray(card.homeSolutions) ? card.homeSolutions : []),
  ]
    .join(' ')
    .toLowerCase()
  const refText = [
    card?.escalation?.when,
    card?.escalation?.whatToTell,
    card?.whyThisWorks,
    card?.stainChemistry,
  ]
    .filter((s): s is string => typeof s === 'string')
    .join(' ')
  const v: GuardViolation[] = []
  for (const chem of STEP_CHEMS) {
    if (stepsText.includes(chem)) continue
    const re = new RegExp(`(?:after|following|once|post)[^.;\\n]{0,40}\\b${chem}\\b|\\b${chem}\\b[^.;\\n]{0,20}\\btreatment\\b`, 'i')
    const m = refText.match(re)
    if (m && !NEGATION_NEAR.test(refText.slice(Math.max(0, refText.indexOf(m[0]) - 40), refText.indexOf(m[0])))) {
      v.push({ rule: `absent-step-reference:${chem}`, match: m[0] })
    }
  }
  return v
}

// Unsupported direct recommendations: positively instructing chlorine bleach,
// household ammonia, or acetone anywhere in a consumer card (TASK-231 prompt
// bans generating them; this catches template/card sources too).
const DIRECT_REC_RE =
  /\b(?:apply|use|add|dab|pour|mix\s+in|treat\s+with|work\s+in)\b[^.;\n]{0,40}\b(?:chlorine\s+bleach|ammonia|acetone)\b/i
function directRecViolation(text: string): GuardViolation | null {
  const m = text.match(DIRECT_REC_RE)
  if (!m) return null
  const idx = text.indexOf(m[0])
  const lookback = text.slice(Math.max(0, idx - 60), idx)
  const boundary = Math.max(
    lookback.lastIndexOf('.'),
    lookback.lastIndexOf(';'),
    lookback.lastIndexOf('!'),
    lookback.lastIndexOf('?'),
    lookback.lastIndexOf('\\n'),
    lookback.lastIndexOf('","'),
  )
  const clause = lookback.slice(boundary + 1) + m[0]
  if (NEGATION_NEAR.test(clause)) return null
  return { rule: 'unsupported-direct-recommendation', match: m[0] }
}

// TASK-236 — unsafe chemistry beyond the trade-term list (rule table:
// unsafe-chemistry:*). Household/garage products with no safe consumer use on
// textiles are blocked when POSITIVELY INSTRUCTED in a clause; "never use
// oven cleaner" warnings pass. TSP stays case-sensitive in the table so
// "add 1 tsp of detergent" can never false-positive.
const CHEM_INSTRUCT_RE = /\b(?:apply|use|add|dab|pour|mix|treat|work\s+in|try|scrub|wipe|soak|spray)\b/i
function unsafeChemistryViolations(text: string): GuardViolation[] {
  const v: GuardViolation[] = []
  for (const { id, re } of UNSAFE_CONSUMER_CHEMISTRY) {
    // EVERY occurrence is clause-tested (codex-review P2): a negated warning
    // earlier in the card must not shadow a later positive instruction of the
    // same chemical.
    const fresh = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`)
    let m: RegExpExecArray | null
    while ((m = fresh.exec(text)) !== null) {
      const before = text.slice(Math.max(0, m.index - 80), m.index)
      const after = text.slice(m.index, m.index + 80)
      const leftBoundary = Math.max(
        before.lastIndexOf('.'),
        before.lastIndexOf(';'),
        before.lastIndexOf('!'),
        before.lastIndexOf('?'),
        before.lastIndexOf('\n'),
        before.lastIndexOf('","'),
      )
      const rightCandidates = [after.indexOf('.'), after.indexOf(';'), after.indexOf('!'), after.indexOf('?'), after.indexOf('\n'), after.indexOf('","')].filter((i) => i >= 0)
      const rightBoundary = rightCandidates.length ? Math.min(...rightCandidates) : after.length
      const clause = before.slice(leftBoundary + 1) + after.slice(0, rightBoundary)
      if (!CHEM_INSTRUCT_RE.test(clause) || NEGATION_NEAR.test(clause)) continue
      v.push({ rule: `unsafe-chemistry:${id}`, match: clause.trim().slice(0, 60) })
      break
    }
  }
  return v
}

function collectCardText(card: Card): string {
  // Serialize every string the consumer renderer could show. JSON.stringify
  // covers nested fields (steps, escalation, products, warnings) in one pass;
  // internal keys are included deliberately — internal-only text that would
  // never render still indicates a contaminated template upstream.
  if (!card || typeof card !== 'object') return ''
  try {
    return JSON.stringify(card)
  } catch {
    return ''
  }
}

// Disclosure ground truth for the fabricated-history check (codex-review P2):
// users disclose prior treatments in the brief/fabric/location fields and via
// care-label warnings, not only in stain+surface. Every string here counts as
// "the user said it" — derived/internal ctx fields stay excluded so model
// inference can't whitelist itself.
export function buildRequestDisclosureText(ctx: {
  stain?: string
  surface?: string
  brief?: string
  fabricDescription?: string
  garmentLocation?: string
  labelWarnings?: string[]
} | null | undefined): string {
  if (!ctx) return ''
  return [
    ctx.stain,
    ctx.surface,
    ctx.brief,
    ctx.fabricDescription,
    ctx.garmentLocation,
    ...(Array.isArray(ctx.labelWarnings) ? ctx.labelWarnings : []),
  ]
    .filter((s): s is string => typeof s === 'string' && s.length > 0)
    .join(' ')
}

export function validateConsumerCard(
  card: Card,
  opts: { requestText: string },
): GuardViolation[] {
  const text = collectCardText(card)
  if (!text) return []
  const violations: GuardViolation[] = []

  for (const { id, re } of FORBIDDEN_CONSUMER_TERMS) {
    const m = text.match(re)
    if (m) violations.push({ rule: `forbidden-term:${id}`, match: m[0] })
  }

  const placeholder = text.match(PLACEHOLDER_RE)
  if (placeholder) violations.push({ rule: 'unfilled-placeholder', match: placeholder[0] })

  for (const agent of HISTORY_AGENTS) {
    // Disclosure must be disclosure-SHAPED (codex-review): ctx.brief and care
    // labels carry derived RESTRICTIONS ("NO BLEACH — do not recommend…")
    // where the bare agent word appears without the user having used it. Only
    // an agent near a past-use verb counts as disclosed; restriction text
    // never matches, so it can't whitelist a fabricated-history claim.
    const disclosedRe = new RegExp(
      `(?:prior|already|previously|earlier|used|applied|tried|treated|poured|put)[^.;\\n]{0,40}\\b${agent}|\\b${agent}[^.;\\n]{0,40}(?:was\\s+(?:used|applied)|already|earlier)`,
      'i',
    )
    if (disclosedRe.test(opts.requestText)) continue // user actually disclosed it
    for (const re of fabricatedHistoryPatterns(agent)) {
      const m = text.match(re)
      if (m) {
        violations.push({ rule: `fabricated-history:${agent}`, match: m[0] })
        break
      }
    }
  }

  const mix = text.match(BLEACH_MIX_RE)
  if (mix) {
    // Negation must sit in the SAME clause as the mix phrase (codex-review
    // P1): "Do not rub. Mix bleach with warm water." has a negation nearby
    // but it governs a different sentence — the lookback stops at the last
    // sentence/clause boundary before the match.
    const idx = text.indexOf(mix[0])
    const windowStart = Math.max(0, idx - 60)
    const lookback = text.slice(windowStart, idx)
    const boundary = Math.max(
      lookback.lastIndexOf('.'),
      lookback.lastIndexOf(';'),
      lookback.lastIndexOf('!'),
      lookback.lastIndexOf('?'),
      lookback.lastIndexOf('\\n'),
      lookback.lastIndexOf('","'), // JSON string boundary = separate field
    )
    const clause = lookback.slice(boundary + 1) + mix[0]
    if (!NEGATION_NEAR.test(clause)) {
      violations.push({ rule: 'bleach-mixing-instruction', match: mix[0] })
    }
  }

  // TASK-232 contract additions
  violations.push(...titleViolations(card?.title))
  violations.push(...absentStepViolations(card))
  const directRec = directRecViolation(text)
  if (directRec) violations.push(directRec)

  // TASK-236 — broader unsafe-chemistry screen (table-driven)
  violations.push(...unsafeChemistryViolations(text))

  return violations
}

// Clean-by-construction terminal fallback: protect-only guidance + pro
// referral. Contains no agent names beyond water, asserts no history, and
// carries the never-mix warning. Shaped as an already-sanitized CONSUMER card
// (codex-review P2): no spottingProtocol / professionalProtocol /
// products.professional — this card is returned AFTER the caller's tier
// sanitization, so it must never reintroduce pro-only fields.
// If this card ever fails validation the guard tests fail.
export function minimalSafeCard(stain: string, surface: string): Card {
  // Same folded-note hygiene as buildDowngradeCard (TASK-234): engine stain
  // text can carry internal notes after an em-dash — never echo them.
  const clean = (v: string) => {
    const head = (v ?? '').split('—')[0].split(';')[0].trim()
    return !head || head.length > 60 || /\bprior\b|\bapplied\b|\bunknown\b/i.test(head) ? '' : head
  }
  const cs = clean(stain)
  const cf = clean(surface)
  const what = cs && cf ? `${cs} on ${cf}` : 'this stain'
  return {
    id: 'safe-fallback-protect-only',
    title: 'Protect the item — this one needs a professional',
    stainFamily: 'combination',
    surface: surface || 'unknown',
    source: 'deterministic-fallback',
    stainChemistry: `We couldn't verify a safe home treatment for ${what}, so the right move is to protect the item and hand it to a pro.`,
    whyThisWorks: 'Not adding chemistry, heat, or rubbing keeps the stain treatable. Most damage happens from home attempts, not from the stain itself.',
    homeSolutions: [
      'Blot gently with a clean white cloth, working from the outside of the stain inward. Do not rub, and keep heat away from the area.',
      'Take the item to a professional cleaner soon and tell them exactly what happened. Do not apply any product first — and never mix bleach with vinegar, ammonia, or any other cleaner.',
    ],
    materialWarnings: ['Heat, rubbing, and home chemistry can set this stain permanently. Protect and escalate.'],
    products: { consumer: [] },
    escalation: {
      when: 'Now — before any home treatment.',
      whatToTell: 'Describe the stain, the garment, and anything already done to it.',
      specialistType: 'Professional cleaner',
    },
    difficulty: 8,
    meta: { riskLevel: 'high', tier: 'deterministic-fallback' },
    _contractBlocked: true,
  }
}

export interface EnforceResult {
  card: Card
  blocked: boolean
  violations: GuardViolation[]
}

export function enforceConsumerCard(
  card: Card,
  buildFallback: () => Card,
  opts: { requestText: string; stain?: string; surface?: string },
): EnforceResult {
  const violations = validateConsumerCard(card, opts)
  if (violations.length === 0) return { card, blocked: false, violations }

  const fallback = buildFallback()
  const fallbackViolations = validateConsumerCard(fallback, opts)
  if (fallbackViolations.length === 0) {
    if (fallback && typeof fallback === 'object') fallback._contractBlocked = true
    return { card: fallback, blocked: true, violations }
  }

  return {
    card: minimalSafeCard(opts.stain ?? '', opts.surface ?? ''),
    blocked: true,
    violations: [...violations, ...fallbackViolations],
  }
}
