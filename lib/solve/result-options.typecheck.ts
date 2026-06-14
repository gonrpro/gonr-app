import type {
  ExperimentMethod,
  MethodEvidence,
  PassedProductEvidenceCard,
  RenderableProduct,
  ResultOptions,
} from './result-options'

const base = {
  methodId: 'typecheck',
  stainFamily: 'mixed',
  fabricSurface: 'cotton',
  agentClass: 'household',
  contraindications: [],
  sourceRefs: [],
  concentration: 'n/a',
  dwell: 'n/a',
  attemptLimit: 1,
  spotTestRequired: true as const,
  consentCopyVersion: 'v1' as const,
  proAlternative: 'professional cleaner',
}

// @ts-expect-error do_not_attempt is a HardBlock, not a TreatableMethod tier.
const invalidHardBlockMethod: MethodEvidence = { ...base, tier: 'do_not_attempt', warning: 'x' }

// @ts-expect-error professional is a pro path, not a TreatableMethod tier.
const invalidProfessionalMethod: MethodEvidence = { ...base, tier: 'professional', warning: 'x' }

// @ts-expect-error conditional / experimental methods require a warning.
const invalidMissingWarning: MethodEvidence = { ...base, tier: 'experimental' }

// @ts-expect-error gated methods require spot-test metadata.
const invalidGatedSpotTest: MethodEvidence = { ...base, tier: 'conditional', warning: 'x', spotTestRequired: false }

// @ts-expect-error gated methods require a real consent-copy version, not the ungated sentinel.
const invalidGatedConsentCopy: MethodEvidence = { ...base, tier: 'experimental', warning: 'x', consentCopyVersion: 'none' }

const experimentalMethod: ExperimentMethod = {
  evidence: { ...base, tier: 'experimental', warning: 'x' },
  method: 'risky experiment',
  steps: ['hidden until consent'],
}

const invalidConservativeSlot: ResultOptions = {
  read: { stain: 'coffee', surface: 'cotton', confidence: 'medium' },
  // @ts-expect-error conservative slot is Tier 0/1 only; Tier 2/3 must live in experimentPaths.
  conservative: experimentalMethod,
  experimentPaths: [],
  products: [],
  pro: { available: false },
  hardBlocks: [],
  suppressed: [],
}

const invalidRenderableProduct: RenderableProduct = {
  // @ts-expect-error renderable products must carry a passed ProductEvidenceCard, not a loose id.
  evidenceCardId: 'card:missing',
}

const passedEvidenceCard = {} as PassedProductEvidenceCard

const invalidProProduct: RenderableProduct = {
  // @ts-expect-error products do not carry an independent tier; it is derived from the passed evidence card.
  tier: 'professional',
  evidenceCard: passedEvidenceCard,
}

const invalidHardBlockProduct: RenderableProduct = {
  // @ts-expect-error products do not carry an independent tier; Tier 5 lives in hardBlocks.
  tier: 'do_not_attempt',
  evidenceCard: passedEvidenceCard,
}

void invalidHardBlockMethod
void invalidProfessionalMethod
void invalidMissingWarning
void invalidGatedSpotTest
void invalidGatedConsentCopy
void invalidConservativeSlot
void invalidRenderableProduct
void invalidProProduct
void invalidHardBlockProduct
