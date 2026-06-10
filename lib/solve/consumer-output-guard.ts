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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Card = any

export interface GuardViolation {
  rule: string
  match: string
}

// Pro/internal terms that must never reach a consumer screen. Word-boundary
// regexes so short trade acronyms (POG/VDS/NSD) don't false-positive inside
// ordinary words. Extend the TASK-231 test list before extending this.
export const FORBIDDEN_CONSUMER_TERMS: ReadonlyArray<{ id: string; re: RegExp }> = [
  { id: 'jerrys-house-rules', re: /jerry'?s\s+cleaners/i },
  { id: 'house-rules', re: /house\s+rules/i },
  { id: 'spotter-ref', re: /\bspotter\b\s*(?:→|->)?\s*/i },
  { id: 'bleaching-guide', re: /bleaching\s+guide/i },
  { id: 'bongo', re: /\bbongo\b/i },
  { id: 'streetan', re: /\bstreetan\b/i },
  { id: 'formula-209', re: /formula\s*209/i },
  { id: 'pog', re: /\bPOG\b/ },
  { id: 'vds', re: /\bVDS\b/ },
  { id: 'nsd', re: /\bNSD\b/ },
  { id: 'acetic-acid', re: /acetic\s+acid|28%\s*acetic/i },
  { id: 'amyl-acetate', re: /amyl\s+acetate/i },
  { id: 'steam-gun', re: /steam\s+gun/i },
  { id: 'sodium-hydrosulfite', re: /sodium\s+hydrosul(?:ph|f)ite/i },
  { id: 'titanium-sulfate', re: /titanium\s+sulfate/i },
  { id: 'bleach-vinegar-neutralization', re: /neutrali[sz]e\s+(?:residual\s+)?(?:the\s+)?bleach\s+with\s+vinegar/i },
]

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
function fabricatedHistoryPatterns(agent: string): RegExp[] {
  return [
    new RegExp(`prior\\s+(?:\\w+\\s+)?${agent}[\\w\\s]{0,20}(?:applied|used|treatment)`, 'i'),
    new RegExp(`with\\s+prior\\s+${agent}`, 'i'),
    new RegExp(`already\\s+(?:applied|used|tried)\\s+(?:\\w+\\s+){0,2}${agent}`, 'i'),
    new RegExp(`treated\\s+(?:at\\s+home\\s+)?with\\s+(?:\\w+\\s+){0,2}${agent}`, 'i'),
    new RegExp(`after\\s+(?:your|the\\s+user'?s?)\\s+${agent}`, 'i'),
  ]
}

// Instructing the user to combine bleach with anything. Negation-aware: a
// "never/do not mix…" warning is REQUIRED consumer copy, not a violation.
const BLEACH_MIX_RE = /\bmix(?:ing)?\b[^.;\n]{0,60}\bbleach\b|\bbleach\b[^.;\n]{0,40}\bmix(?:ing)?\b/i
const NEGATION_NEAR = /\b(?:never|don'?t|do\s+not|avoid|must\s+not|no)\b/i

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
  const what = stain && surface ? `${stain} on ${surface}` : 'this stain'
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
