import type {
  ConsumerCard,
  Material,
  NormalizedSolveInput,
  SafetyRule,
  SolveInput,
  StainType,
  VerdictLevel,
} from './types'

export const VERDICT_SEVERITY: Record<VerdictLevel, 1 | 2 | 3 | 4> = {
  diy_safe: 1,
  diy_with_constraints: 2,
  stop_use_pro: 3,
  do_not_attempt: 4,
}

const PRO_LANGUAGE_TERMS = [
  'pog',
  'volatile dry solvent',
  'vds',
  'amyl acetate',
  'spotting board',
  'tamp with bone spatula',
  'reducing agent',
  'sodium hydrosulfite',
  'rustgo',
  'tanex',
  'protein formula',
  'drycleaning solvent',
  'dry cleaning solvent',
  'perchloroethylene',
  'perc',
  'trichloroethylene',
]

const TREATMENT_VERBS = [
  'apply',
  'blot',
  'brush',
  'clean',
  'dab',
  'flush',
  'launder',
  'remove',
  'rinse',
  'rub',
  'scrub',
  'soak',
  'spray',
  'treat',
  'wash',
  'wet',
]

const COMPONENT_SCAN_STAIN_TYPES = new Set<StainType>(['oil_grease', 'protein', 'tannin', 'mixed_unknown', 'unknown'])
const PROTEIN_COMPONENT_TERMS = ['blood', 'sweat', 'urine', 'pee', 'milk', 'egg', 'vomit', 'cream', 'formula', 'chocolate']
const TANNIN_COMPONENT_TERMS = ['coffee', 'tea', 'wine', 'juice', 'tomato', 'berry', 'mustard', 'soy sauce', 'salsa', 'chocolate']
const OIL_COMPONENT_TERMS = ['oil', 'grease', 'butter', 'makeup', 'cosmetic', 'lipstick', 'body oil', 'motor oil']
const PARTICULATE_COMPONENT_TERMS = ['mud', 'dirt', 'soil', 'particulate']
const REVIEWED_MIXED_TERMS = ['chocolate', 'coffee with cream', 'cream in coffee', 'coffee and cream']

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\u2018\u2019\u201a\u201b\u2032]/g, "'")
    .replace(/[_\u2010-\u2015\u2212-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function termRegex(term: string, flags = ''): RegExp | null {
  const normalizedTerm = normalizeText(term)
  if (!normalizedTerm) return null

  const phrase = normalizedTerm.split(' ').map(escapeRegExp).join('\\s+')
  return new RegExp(`(^|[^a-z0-9])(${phrase})(?=$|[^a-z0-9])`, flags)
}

export function containsTerm(value: string, term: string): boolean {
  const normalizedValue = normalizeText(value)
  const regex = termRegex(term)
  if (!normalizedValue || !regex) return false

  return regex.test(normalizedValue)
}

function hasNegatedContext(normalizedValue: string, index: number): boolean {
  const lookback = normalizedValue
    .slice(Math.max(0, index - 64), index)
    .replace(/[']/g, '')
    .replace(/[,;:/()]+/g, ' ')
    .replace(/\s+/g, ' ')
  if (/\b(not sure|unsure|uncertain|unknown|dont know|do not know|not certain|whether|if)\b/.test(lookback)) return false
  if (/\bnot\s+(only|just|merely|simply)\b/.test(lookback)) return false

  return (
    /\b(didnt|did not|dont|do not|havent|have not|hasnt|has not|never)\s+$/.test(lookback) ||
    /\b(no|not|never|without)\s+(?:[a-z0-9]+\s+){0,4}$/.test(lookback) ||
    /\b(no|not|never)\s+(?:[a-z0-9]+\s+){0,4}(?:or|and)\s+$/.test(lookback) ||
    /\b(didnt|did not|dont|do not|havent|have not|hasnt|has not|never)\s+(?:use|used|try|tried|apply|applied)\s+(?:[a-z0-9]+\s+){0,4}$/.test(
      lookback,
    )
  )
}

function hasChemicalFreeSuffix(normalizedValue: string, index: number): boolean {
  const lookahead = normalizedValue.slice(index, index + 24)
  return /^\s*(free|less)\b/.test(lookahead)
}

export function containsUnnegatedTerm(value: string, term: string): boolean {
  const normalizedValue = normalizeText(value)
  const regex = termRegex(term, 'g')
  if (!normalizedValue || !regex) return false

  for (const match of normalizedValue.matchAll(regex)) {
    const matchedTermIndex = match.index + match[1].length
    const matchedTermEndIndex = matchedTermIndex + match[2].length
    if (!hasNegatedContext(normalizedValue, matchedTermIndex) && !hasChemicalFreeSuffix(normalizedValue, matchedTermEndIndex)) return true
  }

  return false
}

export function inferStainType(description: string, explicit?: StainType): StainType {
  const text = normalizeText(description)

  if (explicit === 'unknown' || explicit === 'mixed_unknown') return explicit
  if (containsTerm(text, 'rust') || containsTerm(text, 'iron stain') || containsTerm(text, 'mineral')) return 'rust_mineral'
  if (
    ['dye transfer', 'color bleed', 'colour bleed', 'ink', 'marker', 'hair dye', 'food coloring', 'food colouring'].some((term) =>
      containsTerm(text, term),
    )
  ) {
    return containsTerm(text, 'ink') || containsTerm(text, 'marker') ? 'ink' : 'dye'
  }

  if (REVIEWED_MIXED_TERMS.some((term) => containsTerm(text, term))) return 'mixed_unknown'

  const componentFamilies: StainType[] = [
    PROTEIN_COMPONENT_TERMS.some((term) => containsTerm(text, term)) ? 'protein' : null,
    OIL_COMPONENT_TERMS.some((term) => containsTerm(text, term)) ? 'oil_grease' : null,
    TANNIN_COMPONENT_TERMS.some((term) => containsTerm(text, term)) ? 'tannin' : null,
    PARTICULATE_COMPONENT_TERMS.some((term) => containsTerm(text, term)) ? 'particulate' : null,
  ].filter((family): family is StainType => family !== null)

  if (componentFamilies.length > 1) return 'mixed_unknown'
  if (explicit) return explicit
  if (componentFamilies[0]) return componentFamilies[0]

  return 'unknown'
}

export function normalizeInput(input: SolveInput): NormalizedSolveInput {
  const normalizedPriorTreatment = input.priorTreatment.map(normalizeText).filter(Boolean)
  const normalizedText = normalizeText([input.stainDescription, ...normalizedPriorTreatment].join(' '))

  return {
    ...input,
    stainDescription: input.stainDescription.trim(),
    stainType: inferStainType(input.stainDescription, input.stainType),
    priorTreatment: input.priorTreatment.filter(Boolean),
    normalizedText,
    normalizedPriorTreatment,
  }
}

export function mentionsAny(input: NormalizedSolveInput, terms: string[], candidateText: string[] = []): boolean {
  const structuredPriorTreatment = normalizeText(input.normalizedPriorTreatment.join(' '))
  const freeText = normalizeText([input.stainDescription, ...candidateText].join(' '))

  return terms.some((term) => containsTerm(structuredPriorTreatment, term) || containsUnnegatedTerm(freeText, term))
}

export function hasProteinComponent(input: NormalizedSolveInput): boolean {
  if (input.stainType === 'protein') return true
  if (!COMPONENT_SCAN_STAIN_TYPES.has(input.stainType)) return false
  return PROTEIN_COMPONENT_TERMS.some((term) => containsTerm(input.normalizedText, term))
}

export function hasTanninComponent(input: NormalizedSolveInput): boolean {
  if (input.stainType === 'tannin') return true
  if (!COMPONENT_SCAN_STAIN_TYPES.has(input.stainType)) return false
  const textWithoutTeaTreeOil = input.normalizedText.replace(/(^|[^a-z0-9])tea\s+tree\s+oil(?=$|[^a-z0-9])/g, ' ')
  return TANNIN_COMPONENT_TERMS.some((term) => containsTerm(term === 'tea' ? textWithoutTeaTreeOil : input.normalizedText, term))
}

export function severity(level: VerdictLevel): 1 | 2 | 3 | 4 {
  return VERDICT_SEVERITY[level]
}

export function isSensitiveMaterial(material: Material): boolean {
  return ['silk', 'wool', 'leather', 'suede', 'acetate', 'unknown', 'blend'].includes(material)
}

export function containsProLanguage(card: ConsumerCard): boolean {
  const consumerText = normalizeText([card.title, ...card.safeSteps].join(' '))
  return PRO_LANGUAGE_TERMS.some((term) => containsTerm(consumerText, term))
}

export function unsupportedClaimInConsumerSteps(card: ConsumerCard): boolean {
  if (card.sourceSupport !== 'partial') return false
  return card.unsupportedConsumerStepClaims !== false
}

export function isProtectionOnlySafeFirstMove(verdict: VerdictLevel, text?: string): boolean {
  if (verdict === 'diy_safe' || verdict === 'diy_with_constraints') return true
  if (!text) return false
  const normalized = normalizeText(text).replace(
    /\b(do not|don't|dont|never|avoid)\s+(apply|blot|brush|clean|dab|flush|launder|remove|rinse|rub|scrub|soak|spray|treat|wash|wet)\b/g,
    '',
  )
  return !TREATMENT_VERBS.some((verb) => new RegExp(`\\b${verb}\\b`).test(normalized))
}

export function deriveBlockedActions(rules: SafetyRule[]): string[] {
  const text = normalizeText(rules.flatMap((rule) => rule.avoid ?? []).join(' '))
  const blocks = new Set<string>()

  const addIf = (terms: string[], block: string) => {
    if (terms.some((term) => containsTerm(text, term))) blocks.add(block)
  }

  addIf(['heat', 'hot water', 'dryer', 'iron', 'tumble dry', 'heat dry'], 'heat')
  addIf(['bleach', 'chlorine', 'sodium hypochlorite'], 'chlorine_bleach')
  addIf(['ammonia', 'baking soda', 'alkaline', 'alkali', 'carbonate', 'lye'], 'ammonia_or_alkali')
  addIf(['peroxide', 'oxygen bleach', 'oxiclean'], 'peroxide_or_oxygen_bleach')
  addIf(['acetone', 'solvent', 'alcohol', 'nail polish remover'], 'solvents')
  addIf(['enzyme', 'protease', 'biological detergent'], 'enzyme_detergent')
  addIf(['soak', 'rinse', 'wet', 'water'], 'wet_treatment')
  addIf(['scrub', 'rub', 'agitate', 'wring'], 'rubbing_or_agitation')
  addIf(['machine wash', 'wash', 'launder'], 'machine_washing')
  addIf(['machine dry', 'dryer', 'tumble dry'], 'machine_drying')

  return Array.from(blocks)
}

export function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)))
}
