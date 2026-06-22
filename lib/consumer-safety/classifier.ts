import { CONSUMER_CARDS_PHASE0, findConsumerCard } from '@/lib/consumer-cards/cards'
import { buildReferralBlock } from '@/lib/referrals/consumer'
import {
  containsProLanguage,
  deriveBlockedActions,
  isProtectionOnlySafeFirstMove,
  isSensitiveMaterial,
  mentionsAny,
  normalizeInput,
  severity,
  uniqueStrings,
  unsupportedClaimInConsumerSteps,
} from './helpers'
import { CHLORINE_BLEACH_TERMS, SAFETY_FILTER_VERSION, SAFETY_RULES_PHASE0, hasPriorHeatExposure } from './rules'
import type {
  Confidence,
  ConsumerCard,
  NormalizedSolveInput,
  SafetyLabel,
  SafetyRule,
  SafetyVerdict,
  SolveInput,
  VerdictLevel,
} from './types'

const DEFAULT_BLOCKED_ACTIONS = [
  'heat',
  'chlorine_bleach',
  'ammonia_or_alkali',
  'peroxide_or_oxygen_bleach',
  'solvents',
  'enzyme_detergent',
  'soaking',
  'scrubbing',
  'machine_washing',
  'machine_drying',
]

const DEFAULT_AVOID = [
  'Do not apply heat.',
  'Do not use bleach, ammonia, peroxide, acetone, or solvents.',
  'Do not soak, scrub, machine wash, or machine dry unless a reviewed card allows it.',
]

const PROTECTION_ONLY_STOP = 'Do not apply heat or strong cleaners; keep the item stable and use the handoff summary for a qualified cleaner.'
const PROTECTION_ONLY_DNA = 'Stop now; keep the item away from heat and cleaners and use the handoff summary for a qualified cleaner.'

function policyRule(id: string, enforces: VerdictLevel, reason: string, avoid: string[]): SafetyRule {
  return {
    id,
    enforces,
    severity: enforces === 'do_not_attempt' ? 'hard_stop' : 'caution',
    reason,
    avoid,
    match: () => true,
  }
}

function confidenceDowngradeRules(input: NormalizedSolveInput): SafetyRule[] {
  const rules: SafetyRule[] = []
  const hasBleach = mentionsAny(input, CHLORINE_BLEACH_TERMS)
  const hasAmmoniaOrAcid = mentionsAny(input, ['ammonia', 'vinegar', 'acid', 'unknown cleaner'])
  const hasAcetone = mentionsAny(input, ['acetone', 'nail polish remover'])

  if (hasBleach && hasAmmoniaOrAcid) {
    rules.push(
      policyRule(
        'SB-POLICY-bleach-mixing',
        'do_not_attempt',
        'Bleach mixed with ammonia, acids, or unknown cleaners can create a dangerous reaction; stop and do not add more products.',
        ['Do not mix bleach with ammonia, acids, or other cleaners.', 'Ventilate the area if fumes are present.', 'Do not continue home treatment.'],
      ),
    )
  } else if (hasBleach && !SAFETY_RULES_PHASE0.some((rule) => rule.id === 'SB-HS-003-chlorine-bleach-sensitive-or-colored' && rule.match(input))) {
    rules.push(
      policyRule(
        'SB-POLICY-prior-bleach',
        'stop_use_pro',
        'Prior bleach use can permanently change color or weaken fibers; a cleaner should review before anything else is tried.',
        ['Do not add more bleach.', 'Do not apply heat.', 'Do not keep repeating treatments.'],
      ),
    )
  }

  if (hasAcetone && input.material === 'unknown') {
    rules.push(
      policyRule(
        'SB-POLICY-acetone-unknown-lining',
        'do_not_attempt',
        'Acetone can damage acetate fabric or unknown linings, and the material is not confirmed.',
        ['Do not use acetone or nail-polish remover.', 'Do not add solvents.', 'Do not rub.'],
      ),
    )
  }

  if (input.careStatus === 'dry_clean_only' && (input.stainType === 'unknown' || input.stainDescription.length === 0)) {
    rules.push(
      policyRule(
        'SB-POLICY-dry-clean-only-unknown',
        'stop_use_pro',
        'A dry-clean-only item with an unknown stain should be reviewed before home treatment.',
        ['Do not soak, rinse, scrub, or machine wash.', 'Do not use heat.', 'Do not experiment with household cleaners.'],
      ),
    )
  }

  return rules
}

export function isCardRenderable(card: ConsumerCard, verdict: SafetyVerdict): boolean {
  if (verdict.verdict === 'stop_use_pro' || verdict.verdict === 'do_not_attempt') return false
  if (card.consumerSafe !== true) return false
  if (card.phase0 !== true || card.phase0Fixture !== true) return false
  if (card.sourceSupport === 'no') return false
  if (severity(card.maxVerdict) < severity(verdict.verdict)) return false
  if (containsProLanguage(card)) return false
  if (card.sourceSupport === 'partial' && unsupportedClaimInConsumerSteps(card)) return false
  return true
}

function mostSevereLevel(rules: SafetyRule[]): VerdictLevel {
  return rules.reduce<VerdictLevel>((winner, rule) => (severity(rule.enforces) > severity(winner) ? rule.enforces : winner), 'diy_safe')
}

function canUseDiyCard(input: NormalizedSolveInput, card: ConsumerCard | null, triggeredRules: SafetyRule[], candidateVerdict: SafetyVerdict): card is ConsumerCard {
  if (!card) return false
  if (card.id.includes('fresh') && input.stainAge !== 'fresh') return false
  if (isSensitiveMaterial(input.material)) return false
  if (input.careStatus !== 'machine_washable' && input.careStatus !== 'hand_wash') return false
  if (input.colorfastness !== 'colorfast') return false
  if (hasPriorHeatExposure(input)) return false
  if (triggeredRules.some((rule) => severity(rule.enforces) > severity(card.maxVerdict))) return false
  return isCardRenderable(card, candidateVerdict)
}

function confidenceFor(input: NormalizedSolveInput, verdict: VerdictLevel, card: ConsumerCard | null): Confidence {
  if (input.material === 'unknown' || input.careStatus === 'unknown' || input.colorfastness === 'unknown') return 'low'
  if (hasPriorHeatExposure(input)) return 'low'
  if (verdict === 'stop_use_pro' || verdict === 'do_not_attempt') return card?.sourceSupport === 'yes' ? 'medium' : 'low'
  if (card?.sourceSupport === 'yes' && input.stainAge !== 'unknown') return 'medium'
  return 'medium'
}

function safetyLabelFor(verdict: VerdictLevel, confidence: Confidence, card: ConsumerCard | null): SafetyLabel {
  if (verdict === 'do_not_attempt') return 'unsafe_do_not_use'
  if (verdict === 'stop_use_pro' || confidence === 'low') return 'escalation_required'
  if (!card || card.sourceSupport === 'partial' || card.proChemistryInSource) return 'needs_source_review'
  if (card.publishReady) return 'reviewed_for_consumer_use'
  return 'source_backed'
}

function safeFirstMoveFor(verdict: VerdictLevel, card: ConsumerCard | null): string {
  if (verdict === 'do_not_attempt') return PROTECTION_ONLY_DNA
  if (verdict === 'stop_use_pro') return PROTECTION_ONLY_STOP
  return card?.safeSteps[0] ?? 'Blot only with a clean white cloth and do not apply heat.'
}

function missingFactsForCard(input: NormalizedSolveInput, card: ConsumerCard | null): string[] {
  if (!card) return []

  const missing: string[] = []
  if (input.careStatus === 'unknown') missing.push('care label allows washing')
  if (input.colorfastness === 'unknown') missing.push('white or colorfast fabric')
  if (input.heatExposure === 'unknown') missing.push('no warm water, dryer, or iron has touched it')
  if (card.id.includes('fresh') && input.stainAge === 'unknown') missing.push('stain is fresh')
  return missing
}

function buildVerdict(input: NormalizedSolveInput, verdict: VerdictLevel, rules: SafetyRule[], card: ConsumerCard | null): SafetyVerdict {
  const orderedRules = [...rules].sort((a, b) => severity(b.enforces) - severity(a.enforces))
  const confidence = confidenceFor(input, verdict, card)
  const avoid = uniqueStrings([...orderedRules.flatMap((rule) => rule.avoid ?? []), ...(card?.avoid ?? []), ...DEFAULT_AVOID])
  const blockedActions = uniqueStrings([...deriveBlockedActions(orderedRules), ...DEFAULT_BLOCKED_ACTIONS])
  const safeFirstMove = safeFirstMoveFor(verdict, card)
  const requiresReferral =
    verdict === 'stop_use_pro' ||
    verdict === 'do_not_attempt' ||
    confidence === 'low' ||
    orderedRules.some((rule) => rule.severity === 'hard_stop') ||
    input.material === 'unknown' ||
    input.careStatus === 'unknown' ||
    input.colorfastness === 'unknown'
  const label = safetyLabelFor(verdict, confidence, card)
  const reasons =
    orderedRules.length > 0
      ? orderedRules.map((rule) => rule.reason)
      : card && (verdict === 'diy_safe' || verdict === 'diy_with_constraints')
        ? ['A Phase 0 consumer card matched the stain, fabric, care status, and colorfastness facts.']
        : ['No reviewed consumer-safe card matched all safety facts, so Phase 0 fails closed.']

  const partial: Omit<SafetyVerdict, 'referral'> = {
    verdict,
    confidence,
    reasons,
    triggeredRules: orderedRules.map((rule) => rule.id),
    avoid,
    blockedActions,
    safeFirstMove:
      verdict === 'diy_safe' || verdict === 'diy_with_constraints'
        ? safeFirstMove
        : isProtectionOnlySafeFirstMove(verdict, safeFirstMove)
          ? safeFirstMove
          : verdict === 'do_not_attempt'
            ? PROTECTION_ONLY_DNA
            : PROTECTION_ONLY_STOP,
    constraints: verdict === 'diy_with_constraints' ? uniqueStrings([...(card?.avoid ?? []), ...orderedRules.flatMap((rule) => rule.avoid ?? [])]).slice(0, 5) : undefined,
    card: verdict === 'diy_safe' || verdict === 'diy_with_constraints' ? card?.id ?? null : null,
    candidateCard: card?.id ?? null,
    missingFacts: missingFactsForCard(input, card),
    requiresReferral,
    source: card && (verdict === 'diy_safe' || verdict === 'diy_with_constraints') ? 'card' : 'rule_engine',
    safetyLabel: label,
    safetyFilterVersion: SAFETY_FILTER_VERSION,
  }

  return {
    ...partial,
    referral: buildReferralBlock(input, partial),
  }
}

export function classify(input: SolveInput): SafetyVerdict {
  const normalized = normalizeInput(input)
  const matchingRules = SAFETY_RULES_PHASE0.filter((rule) => rule.match(normalized))
  const policyRules = confidenceDowngradeRules(normalized)
  const triggeredRules = [...matchingRules, ...policyRules]
  const matchedCard = findConsumerCard(normalized)

  if (triggeredRules.length > 0) {
    const floor = mostSevereLevel(triggeredRules)
    const provisional = buildVerdict(normalized, floor, triggeredRules, matchedCard)

    if (floor === 'diy_safe' || floor === 'diy_with_constraints') {
      if (canUseDiyCard(normalized, matchedCard, triggeredRules, provisional)) {
        return buildVerdict(normalized, floor, triggeredRules, matchedCard)
      }

      return buildVerdict(
        normalized,
        'stop_use_pro',
        [
          ...triggeredRules,
          policyRule(
            'SB-POLICY-no-reviewed-card',
            'stop_use_pro',
            'The safety floor allows only constrained DIY, but no reviewed Phase 0 card matched all required facts.',
            DEFAULT_AVOID,
          ),
        ],
        null,
      )
    }

    return provisional
  }

  const candidate = buildVerdict(normalized, matchedCard?.maxVerdict ?? 'stop_use_pro', [], matchedCard)
  if (matchedCard && canUseDiyCard(normalized, matchedCard, [], candidate)) {
    return buildVerdict(normalized, matchedCard.maxVerdict, [], matchedCard)
  }

  return buildVerdict(normalized, 'stop_use_pro', [], null)
}

export { CONSUMER_CARDS_PHASE0, SAFETY_FILTER_VERSION, SAFETY_RULES_PHASE0 }
