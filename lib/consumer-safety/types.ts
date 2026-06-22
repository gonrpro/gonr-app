export type Material =
  | 'cotton'
  | 'linen'
  | 'denim'
  | 'polyester'
  | 'nylon'
  | 'wool'
  | 'silk'
  | 'rayon_viscose'
  | 'acetate'
  | 'leather'
  | 'suede'
  | 'blend'
  | 'unknown'

export type CareStatus = 'machine_washable' | 'hand_wash' | 'dry_clean_only' | 'unknown'
export type HeatExposure = 'none' | 'warm_hot_wash' | 'machine_dried' | 'ironed' | 'unknown'
export type Colorfastness = 'colorfast' | 'prone_to_bleed' | 'unknown'
export type StainAge = 'fresh' | 'hours_old' | 'set_in' | 'unknown'
export type ItemValue = 'everyday' | 'valuable' | 'sentimental' | 'unknown'

export type StainType =
  | 'oil_grease'
  | 'protein'
  | 'tannin'
  | 'dye'
  | 'ink'
  | 'rust_mineral'
  | 'particulate'
  | 'mixed_unknown'
  | 'unknown'

export interface SolveInput {
  stainDescription: string
  stainType?: StainType
  material: Material
  careStatus: CareStatus
  heatExposure: HeatExposure
  colorfastness: Colorfastness
  stainAge: StainAge
  priorTreatment: string[]
  itemValue: ItemValue
  locationText?: string
}

export type VerdictLevel = 'diy_safe' | 'diy_with_constraints' | 'stop_use_pro' | 'do_not_attempt'
export type Confidence = 'high' | 'medium' | 'low'
export type SafetyLabel =
  | 'source_backed'
  | 'reviewed_for_consumer_use'
  | 'needs_source_review'
  | 'escalation_required'
  | 'unsafe_do_not_use'

// TASK-260 Lane 3B (Atlas-locked 2026-06-18): provenance grade. Irreversible-risk,
// chlorine-bleach and heat-set claims require at least one source of tier
// pro_reference | textbook | manufacturer; forum | unknown alone fails the gate.
export type SourceTier = 'pro_reference' | 'textbook' | 'manufacturer' | 'trade_assoc' | 'forum' | 'unknown'
export const PRO_SOURCE_TIERS: SourceTier[] = ['pro_reference', 'textbook', 'manufacturer']

export interface SourceRef {
  kind: 'citation' | 'reference' | 'sb_card'
  label: string
  // Provenance grade. Required (>=1 pro_reference|textbook|manufacturer) for irreversible/
  // bleach/heat claims. A verified:true card needs every source tiered + confidence-rated.
  tier?: SourceTier
  // Per-source confidence; a card rolls up to the LOWEST confidence across its sources.
  confidence?: Confidence
}

export interface SafetyRule {
  id: string
  match: (input: NormalizedSolveInput) => boolean
  enforces: VerdictLevel
  severity: 'hard_stop' | 'constraint' | 'caution'
  reason: string
  avoid?: string[]
  source?: SourceRef
}

export interface ConsumerCard {
  id: string
  stainType: StainType
  materials: Material[]
  title: string
  protocolName?: string
  mechanism?: string
  sourceFit?: string
  knowledgeBullets?: string[]
  productGuidance?: Array<{
    name: string
    use: string
    note?: string
  }>
  safeSteps: string[]
  avoid: string[]
  maxVerdict: VerdictLevel
  consumerSafe: true
  sources: SourceRef[]
  sourceSupport: 'yes' | 'partial' | 'no'
  proChemistryInSource: boolean
  phase0: boolean
  phase0Fixture: boolean
  publishReady: boolean
  excludedReason?: string
  unsupportedConsumerStepClaims?: boolean
}

export interface ReferralOption {
  kind: 'known_partner' | 'generic_search'
  label: string
  detail?: string
}

export interface ReferralBlock {
  emphasize: boolean
  options: ReferralOption[]
  handoffSummary: string
}

export interface SafetyVerdict {
  verdict: VerdictLevel
  confidence: Confidence
  reasons: string[]
  triggeredRules: string[]
  avoid: string[]
  blockedActions: string[]
  safeFirstMove?: string
  constraints?: string[]
  card?: string | null
  candidateCard?: string | null
  missingFacts?: string[]
  requiresReferral: boolean
  referral: ReferralBlock
  source: 'rule_engine' | 'card' | 'ai_edge'
  safetyLabel: SafetyLabel
  safetyFilterVersion: string
}

export interface NormalizedSolveInput extends SolveInput {
  stainType: StainType
  normalizedText: string
  normalizedPriorTreatment: string[]
}
