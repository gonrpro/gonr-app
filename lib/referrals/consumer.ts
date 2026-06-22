import type { NormalizedSolveInput, ReferralBlock, SafetyVerdict } from '@/lib/consumer-safety/types'
import { containsUnnegatedTerm, uniqueStrings } from '@/lib/consumer-safety/helpers'

const LOCAL_CITY_MARKERS = ['naples', 'fort myers', 'bonita', 'estero', 'marco island']
const LOCAL_ZIP_PREFIXES = ['341', '339']
const FREE_TEXT_PRIOR_TREATMENTS = [
  { label: 'bleach', terms: ['bleach', 'chlorine bleach', 'sodium hypochlorite', 'clorox', 'liquid bleach'] },
  { label: 'ammonia', terms: ['ammonia'] },
  { label: 'vinegar or acid', terms: ['vinegar', 'acid'] },
  { label: 'acetone', terms: ['acetone', 'nail polish remover'] },
  { label: 'peroxide', terms: ['peroxide', 'hydrogen peroxide', 'oxygen bleach', 'oxiclean'] },
  { label: 'enzyme detergent', terms: ['enzyme detergent', 'enzyme', 'protease', 'biological detergent'] },
  { label: 'baking soda or alkali', terms: ['baking soda', 'sodium carbonate', 'washing soda', 'lye', 'alkaline cleaner'] },
  { label: 'water or rinse', terms: ['water', 'rinse', 'soak'] },
  { label: 'detergent or soap', terms: ['detergent', 'soap', 'dish soap'] },
  { label: 'alcohol or solvent', terms: ['alcohol', 'solvent'] },
  { label: 'heat', terms: ['hot water', 'warm water', 'machine dried', 'dryer', 'ironed'] },
]

function isJerryLocal(locationText?: string): boolean {
  if (!locationText) return false
  const normalized = locationText.toLowerCase()
  const numericTokens = normalized.match(/\b\d{3,5}(?:-\d{4})?\b/g) ?? []

  return (
    LOCAL_CITY_MARKERS.some((marker) => normalized.includes(marker)) ||
    numericTokens.some((token) => LOCAL_ZIP_PREFIXES.some((prefix) => token.startsWith(prefix)))
  )
}

function formatValue(value: string | undefined): string {
  return value && value.length > 0 ? value.replace(/_/g, ' ') : 'unknown'
}

function priorTreatmentsForHandoff(input: NormalizedSolveInput): string {
  const structured = input.priorTreatment.map(formatValue)
  const freeText = FREE_TEXT_PRIOR_TREATMENTS.filter((treatment) =>
    treatment.terms.some((term) => containsUnnegatedTerm(input.stainDescription, term)),
  ).map((treatment) => treatment.label)
  const tried = uniqueStrings([...structured, ...freeText])

  return tried.length > 0 ? tried.join(', ') : 'nothing yet'
}

export function buildCleanerHandoffSummary(input: NormalizedSolveInput, partialVerdict: Pick<SafetyVerdict, 'verdict' | 'confidence' | 'reasons' | 'avoid'>): string {
  const tried = priorTreatmentsForHandoff(input)
  const reasons = partialVerdict.reasons.slice(0, 3).join(' ')
  const avoid = partialVerdict.avoid.slice(0, 4).join(' ')

  return [
    `GONR consumer handoff summary (${partialVerdict.verdict.replace(/_/g, ' ')}, ${partialVerdict.confidence} confidence).`,
    `Item/material: ${formatValue(input.material)}. Care status: ${formatValue(input.careStatus)}. Colorfastness: ${formatValue(input.colorfastness)}.`,
    `Stain: ${input.stainDescription || formatValue(input.stainType)}. Stain age: ${formatValue(input.stainAge)}. Heat exposure: ${formatValue(input.heatExposure)}.`,
    `Prior treatment tried: ${tried}.`,
    reasons ? `Why GONR is cautious: ${reasons}` : '',
    avoid ? `Before review, avoid: ${avoid}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildReferralBlock(input: NormalizedSolveInput, partialVerdict: Pick<SafetyVerdict, 'verdict' | 'confidence' | 'reasons' | 'avoid'>): ReferralBlock {
  const local = isJerryLocal(input.locationText)
  const emphasize = partialVerdict.verdict === 'stop_use_pro' || partialVerdict.verdict === 'do_not_attempt' || partialVerdict.confidence === 'low'

  return {
    emphasize,
    options: [
      ...(local
        ? [
            {
              kind: 'known_partner' as const,
              label: "Jerry's can review this locally",
              detail: 'Use the handoff summary so the cleaner knows what happened before anything else is tried.',
            },
          ]
        : []),
      {
        kind: 'generic_search',
        label: 'Find a qualified cleaner near me',
        detail: 'Ask whether they handle this fabric, stain type, and anything already tried before approving treatment.',
      },
    ],
    handoffSummary: buildCleanerHandoffSummary(input, partialVerdict),
  }
}
