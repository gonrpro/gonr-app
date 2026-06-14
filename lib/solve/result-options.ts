// lib/solve/result-options.ts
// TASK-257 Slice 2 — ResultOptions contract SHELL (policy-fixed v2 per SB binding review
// 2026-06-13 + Atlas structural review). Contract + policy logic ONLY. NOT wired into
// /api/solve; experimentPaths + products are ALWAYS empty here — method/product DATA comes from
// SB's evidence-gated option matrix, which does not exist yet. No public recs render until that
// matrix + passing evidence cards exist. Invents nothing.
//
// Structural guarantees (make misuse impossible, not just backstopped):
//  • A DIY method (TreatableMethod) can ONLY be Tier 0–3. Tier 4 = pro (ResultOptions.pro),
//    Tier 5 = HardBlock — neither can be constructed as a method that carries steps.
//  • HardBlock has no field for steps/chemistry/products/links — a do_not_attempt entry cannot
//    leak a procedure by consent OR insistence. revealSteps keeps a runtime backstop too.
//  • `warning` is type-required for conditional/experimental (discriminated union).
//  • Method + product evidence fields are mechanically REQUIRED (use "unknown"/[] explicitly).

// ── Tiers ─────────────────────────────────────────────────────────────────────
export type PolicyTier =
  | 'stabilize' //            Tier 0
  | 'low_risk_when_scoped' // Tier 1
  | 'conditional' //          Tier 2
  | 'experimental' //         Tier 3
  | 'professional' //         Tier 4
  | 'do_not_attempt' //       Tier 5 — non-bypassable hard block

/** The ONLY tiers a DIY method may carry (Tier 0–3). Tier 4/5 are NOT methods. */
export type DiyTier = 'stabilize' | 'low_risk_when_scoped' | 'conditional' | 'experimental'
/** DIY tiers whose steps sit behind a consent gate. */
export type GatedTier = 'conditional' | 'experimental'
export type SafeTier = 'stabilize' | 'low_risk_when_scoped'

export type UiTier = 'safe' | 'caution' | 'high_risk' | 'pro' | 'hard_block'
export type ConsentLevel = 'none' | 'spot_test' | 'two_step' | 'never'
export type ConsentCopyVersion = `v${number}` | `policy:${string}`

export interface TierPresentation {
  ui: UiTier
  label: string
  consent: ConsentLevel
}

export const TIER_PRESENTATION: Readonly<Record<PolicyTier, TierPresentation>> = {
  stabilize: { ui: 'safe', label: 'Right now', consent: 'none' },
  low_risk_when_scoped: { ui: 'safe', label: 'Lowest-risk path', consent: 'none' },
  conditional: { ui: 'caution', label: 'Spot-test required', consent: 'spot_test' },
  experimental: { ui: 'high_risk', label: 'Riskier experiment', consent: 'two_step' },
  professional: { ui: 'pro', label: 'Professional path', consent: 'none' },
  do_not_attempt: { ui: 'hard_block', label: 'Do not use this', consent: 'never' },
}

// ── Method evidence (mechanical fields, all REQUIRED; discriminated by tier) ─────
interface BaseMethodEvidence {
  methodId: string
  stainFamily: string
  fabricSurface: string
  agentClass: string
  /** Required: list, or [] explicitly. */
  contraindications: string[]
  sourceRefs: string[]
  /** Required: a value or the explicit string 'n/a'/'unknown'. */
  concentration: string
  dwell: string
  /** Default 1, then stop/pro. Every path carries one. */
  attemptLimit: number
  /** Always carry the professional alternative. */
  proAlternative: string
}
/** Tier 0/1 — no consent gate; warning optional (safe move). */
export interface SafeMethodEvidence extends BaseMethodEvidence {
  tier: SafeTier
  spotTestRequired: false
  consentCopyVersion: 'none'
  warning?: string
}
/** Tier 2/3 — consent-gated; `warning` is REQUIRED (specific fiber/stain/agent risk, never boilerplate). */
export interface GatedMethodEvidence extends BaseMethodEvidence {
  tier: GatedTier
  spotTestRequired: true
  consentCopyVersion: ConsentCopyVersion
  warning: string
}
export type MethodEvidence = SafeMethodEvidence | GatedMethodEvidence

/** A DIY method (Tier 0–3 only, by construction). Steps are NEVER read directly — always via
 *  `revealSteps`, which enforces the per-tier consent gate. */
export interface TreatableMethod<E extends MethodEvidence = MethodEvidence> {
  evidence: E
  method: string
  why?: string
  steps?: string[]
}
export type ConservativeMethod = TreatableMethod<SafeMethodEvidence>
export type ExperimentMethod = TreatableMethod<GatedMethodEvidence>

/** A NON-BYPASSABLE hard block (Tier 5). No field for steps/chemistry/products/links — a
 *  do_not_attempt entry cannot leak a procedure, by consent or insistence. */
export interface HardBlock {
  methodId: string
  stainFamily: string
  fabricSurface: string
  /** "No — here is why." Never a how-to. */
  reason: string
  /** "Here is the safer alternative." */
  saferAlternative: string
  sourceRefs: string[]
}

function sanitizeHardBlock(block: HardBlock): HardBlock {
  return {
    methodId: block.methodId,
    stainFamily: block.stainFamily,
    fabricSurface: block.fabricSurface,
    reason: block.reason,
    saferAlternative: block.saferAlternative,
    sourceRefs: block.sourceRefs,
  }
}

// ── Consent ────────────────────────────────────────────────────────────────────
export interface ConsentState {
  methodId?: string
  consentCopyVersion?: ConsentCopyVersion
  spotTestAcknowledged?: boolean
  readRisks?: boolean
  wantThisOverPro?: boolean
}

function consentMatchesMethod(method: TreatableMethod, consent: ConsentState): boolean {
  return consent.methodId === method.evidence.methodId && consent.consentCopyVersion === method.evidence.consentCopyVersion
}

/**
 * The ONLY supported way to obtain a method's renderable steps. Tier 0–3 only can be a
 * TreatableMethod (Tier 4/5 are not constructible as methods), so the gate handles the DIY
 * tiers; the `default` is a runtime backstop in case a caller force-casts a non-DIY tier in
 * (modeling direct user insistence) — it returns [] no matter the consent flags.
 */
export function revealSteps(method: TreatableMethod, consent: ConsentState): string[] {
  switch (method.evidence.tier) {
    case 'stabilize':
    case 'low_risk_when_scoped':
      return method.steps ?? []
    case 'conditional':
      return consentMatchesMethod(method, consent) && consent.spotTestAcknowledged ? (method.steps ?? []) : []
    case 'experimental':
      return consentMatchesMethod(method, consent) &&
        consent.spotTestAcknowledged &&
        consent.readRisks &&
        consent.wantThisOverPro
        ? (method.steps ?? [])
        : []
    default:
      // Non-DIY tier reached only via a type-cast (do_not_attempt / professional) → never reveal.
      return []
  }
}

// ── Product evidence card (SB schema; mechanical fields REQUIRED) ───────────────
export type FiberCompat = 'safe' | 'conditional' | 'unsafe' | 'untested'
export type EvidenceQuality =
  | 'independent_test'
  | 'official_source'
  | 'sb_verified_test'
  | 'manufacturer_claim'
  | 'mechanism_only'

export interface ProductEvidenceCard {
  name: string
  manufacturer: string
  /** Required: value or 'unknown'. */
  skuUpc: string
  sizeForm: string
  category: string
  lastVerified: string
  /** Required: source/date or 'unknown'. */
  sdsSource: string
  sdsDate: string
  /** Required: list, or [] explicitly. */
  ingredients: string[]
  activeIngredients: Array<{ name: string; functionClass: string; concentration: string }>
  /** Working-solution pH, or the explicit string 'unknown'. Required. */
  workingPh: string
  /** Transcribed from the label. Required: list, or [] explicitly. */
  labelWarnings: string[]
  /** Why the ingredient chemistry addresses the stain. Required. */
  stainMechanism: string
  fiberCompatibility: Array<{ fabric: string; compat: FiberCompat; basis: string }>
  contraindications: string[]
  neverRecommendFor: string[]
  evidenceQuality: EvidenceQuality
  approvedProtocols: Array<{
    protocolId: string
    stainFamily: string
    fabric: string
    tier: DiyTier
    sourceFit: boolean
  }>
  reviewOwner: string
  reviewDate: string
  nextReviewDue: string
}

const PRODUCT_PROTOCOL_TIERS: ReadonlySet<DiyTier> = new Set([
  'stabilize',
  'low_risk_when_scoped',
  'conditional',
  'experimental',
])

const STRONG_EVIDENCE_QUALITY: ReadonlySet<EvidenceQuality> = new Set([
  'independent_test',
  'official_source',
  'sb_verified_test',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isNonEmptyString)
}

function isActiveIngredient(value: unknown): value is ProductEvidenceCard['activeIngredients'][number] {
  return (
    isRecord(value) &&
    isNonEmptyString(value.name) &&
    isNonEmptyString(value.functionClass) &&
    isNonEmptyString(value.concentration)
  )
}

function isApprovedProtocol(value: unknown): value is ProductEvidenceCard['approvedProtocols'][number] {
  return (
    isRecord(value) &&
    isNonEmptyString(value.protocolId) &&
    isNonEmptyString(value.stainFamily) &&
    isNonEmptyString(value.fabric) &&
    PRODUCT_PROTOCOL_TIERS.has(value.tier as DiyTier) &&
    typeof value.sourceFit === 'boolean'
  )
}

function isFiberCompatibility(value: unknown): value is ProductEvidenceCard['fiberCompatibility'][number] {
  return (
    isRecord(value) &&
    isNonEmptyString(value.fabric) &&
    (value.compat === 'safe' || value.compat === 'conditional' || value.compat === 'unsafe' || value.compat === 'untested') &&
    isNonEmptyString(value.basis)
  )
}

/**
 * A product may render as a recommendation ONLY when its card passes every gate for the
 * specific stain family + fabric. SDS-only / manufacturer-claim / mechanism-only is NOT
 * sufficient for a public efficacy recommendation. Returns false on any miss — no vibes.
 */
export function productPassesEvidenceGate(
  card: ProductEvidenceCard,
  stainFamily: string,
  fabric: string,
): boolean {
  // Mechanical completeness — required values must be meaningfully present.
  const required = [
    card.name,
    card.manufacturer,
    card.skuUpc,
    card.sizeForm,
    card.category,
    card.lastVerified,
    card.sdsSource,
    card.sdsDate,
    card.workingPh, // may be the literal 'unknown', but must be stated
    card.stainMechanism,
    card.reviewOwner,
    card.reviewDate,
    card.nextReviewDue,
  ]
  if (required.some((v) => !isNonEmptyString(v))) return false
  const requiredStringArrays = [card.ingredients, card.labelWarnings, card.contraindications, card.neverRecommendFor]
  if (requiredStringArrays.some((items) => !isStringArray(items))) {
    return false
  }
  if (!Array.isArray(card.activeIngredients) || card.activeIngredients.some((item) => !isActiveIngredient(item))) {
    return false
  }
  // Efficacy evidence must be strong; SDS/manufacturer/mechanism alone cannot recommend.
  if (!STRONG_EVIDENCE_QUALITY.has(card.evidenceQuality)) return false
  // Source-fit: an approved protocol for a real use, and a safe/conditional cell for this fabric.
  const requestedStain = stainFamily.toLowerCase()
  const f = fabric.toLowerCase()
  if (
    !Array.isArray(card.approvedProtocols) ||
    !Array.isArray(card.fiberCompatibility) ||
    card.approvedProtocols.some((protocol) => !isApprovedProtocol(protocol)) ||
    card.fiberCompatibility.some((cell) => !isFiberCompatibility(cell))
  ) {
    return false
  }
  const approved = card.approvedProtocols.some(
    (protocol) =>
      protocol.sourceFit === true &&
      protocol.stainFamily.toLowerCase() === requestedStain &&
      protocol.fabric.toLowerCase() === f,
  )
  if (!approved) return false
  if (card.neverRecommendFor.some((x) => x.toLowerCase() === f || x.toLowerCase() === stainFamily.toLowerCase())) {
    return false
  }
  const cell = card.fiberCompatibility.find((c) => c.fabric.toLowerCase() === f)
  if (!cell || (cell.compat !== 'safe' && cell.compat !== 'conditional') || !cell.basis.trim()) return false
  return true
}

export type PassedProductEvidenceCard = ProductEvidenceCard & {
  readonly evidenceGate: 'passed'
  readonly approvedProtocol: {
    readonly protocolId: string
    readonly tier: DiyTier
  }
}

export function passProductEvidenceCard(
  card: ProductEvidenceCard,
  stainFamily: string,
  fabric: string,
): PassedProductEvidenceCard | null {
  if (!productPassesEvidenceGate(card, stainFamily, fabric)) return null
  const requestedStain = stainFamily.toLowerCase()
  const f = fabric.toLowerCase()
  const protocol = card.approvedProtocols.find(
    (p) => p.sourceFit === true && p.stainFamily.toLowerCase() === requestedStain && p.fabric.toLowerCase() === f,
  )
  if (!protocol) return null
  return { ...card, evidenceGate: 'passed', approvedProtocol: { protocolId: protocol.protocolId, tier: protocol.tier } }
}

export interface RenderableProduct {
  /** Render boundary derives risk tier from this passed card's matched approved protocol. */
  evidenceCard: PassedProductEvidenceCard
}

// ── Copy guard ─────────────────────────────────────────────────────────────────
const BANNED_COPY =
  /\bsafe for most fabrics\b|\bguaranteed\b|\bnatural\b|\bgentle\b|\beco[- ]?safe\b|\brepeat until\b|\ball[- ]?fabric[- ]?safe\b|\bnon[- ]?damaging\b/i

/** Returns the matched banned phrase, or null if the copy is clean. */
export function bannedCopyMatch(text: string): string | null {
  const m = text.match(BANNED_COPY)
  return m ? m[0] : null
}

// ── ResultOptions ──────────────────────────────────────────────────────────────
export interface ResultOptions {
  read: {
    stain: string
    stainFamily?: string
    surface: string
    fabric?: string
    confidence: 'high' | 'medium' | 'low'
  }
  /** Lowest-risk move (Tier 0/1) — ALWAYS present, rendered first. */
  conservative: ConservativeMethod
  /** Ranked Tier 2/3 experiment methods — EMPTY until SB's matrix supplies them. */
  experimentPaths: ExperimentMethod[]
  /** Evidence-gated product picks — EMPTY until passing Product Evidence Cards exist. */
  products: RenderableProduct[]
  pro: { available: boolean; referral?: string; whatToTell?: string }
  /** Tier 5 hard blocks — explained, never DIY. Their presence does NOT collapse the result. */
  hardBlocks: HardBlock[]
  /** Audit-only — NEVER user-facing. */
  suppressed: Array<{ item: string; reason: string }>
}

export interface ResultOptionsShellInput {
  stain: string
  surface: string
  fabric?: string
  stainFamily?: string
  confidence?: 'high' | 'medium' | 'low'
  conservativeMethod: string
  conservativeWhy?: string
  firstAid?: string[]
  conservativeTier?: SafeTier
  proAvailable?: boolean
  proReferral?: string
  proWhatToTell?: string
  hardBlocks?: HardBlock[]
}

/**
 * Build the SHELL ResultOptions. experimentPaths + products are ALWAYS empty — filled only from
 * SB's evidence-gated matrix (not yet exist). hardBlocks may be passed (they carry no steps, by
 * type) and do NOT collapse the result. NOT called by /api/solve. Invents nothing.
 */
export function buildResultOptionsShell(input: ResultOptionsShellInput): ResultOptions {
  const tier: SafeTier = input.conservativeTier ?? 'low_risk_when_scoped'
  const evidence: SafeMethodEvidence = {
    methodId: `conservative:${tier}`,
    stainFamily: input.stainFamily ?? 'unknown',
    fabricSurface: input.fabric ?? input.surface,
    agentClass: 'stabilization',
    tier,
    contraindications: [],
    sourceRefs: [],
    concentration: 'n/a',
    dwell: 'n/a',
    attemptLimit: 1,
    spotTestRequired: false,
    consentCopyVersion: 'none',
    proAlternative: input.proReferral ?? 'professional cleaner',
  }
  return {
    read: {
      stain: input.stain,
      stainFamily: input.stainFamily,
      surface: input.surface,
      fabric: input.fabric,
      confidence: input.confidence ?? 'medium',
    },
    conservative: { method: input.conservativeMethod, why: input.conservativeWhy, steps: input.firstAid, evidence },
    experimentPaths: [],
    products: [],
    pro: { available: input.proAvailable ?? false, referral: input.proReferral, whatToTell: input.proWhatToTell },
    hardBlocks: (input.hardBlocks ?? []).map(sanitizeHardBlock),
    suppressed: [],
  }
}
