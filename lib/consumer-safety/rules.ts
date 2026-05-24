import { containsUnnegatedTerm, hasProteinComponent, hasTanninComponent, mentionsAny } from './helpers'
import type { NormalizedSolveInput, SafetyRule } from './types'

export const SAFETY_FILTER_VERSION = 'sb-consumer-phase0-2026-05-23'

export const CHLORINE_BLEACH_TERMS = ['bleach', 'chlorine bleach', 'sodium hypochlorite', 'clorox', 'liquid bleach']
const STRUCTURED_HEAT_EXPOSURES = ['warm_hot_wash', 'machine_dried', 'ironed']
const HEAT_EXPOSURE_TERMS = [
  'hot water',
  'warm water',
  'hot wash',
  'warm wash',
  'machine dried',
  'machine dry',
  'tumble dried',
  'tumble dry',
  'dryer',
  'ironed',
  'iron',
  'heat dried',
  'heat dry',
]

function mentionsChlorineBleachIntent(input: NormalizedSolveInput): boolean {
  const textWithoutNonChlorineBleach = input.normalizedText.replace(
    /\b(oxygen bleach|color safe bleach|colour safe bleach|non chlorine bleach|non-chlorine bleach|oxiclean)\b/g,
    '',
  )

  if (CHLORINE_BLEACH_TERMS.some((term) => term !== 'bleach' && containsUnnegatedTerm(textWithoutNonChlorineBleach, term))) {
    return true
  }
  if (input.normalizedPriorTreatment.some((treatment) => treatment === 'bleach')) return true

  return containsUnnegatedTerm(textWithoutNonChlorineBleach, 'bleach')
}

export function hasPriorHeatExposure(input: NormalizedSolveInput): boolean {
  // Phase 0 DIY cards require confirmed no heat; unknown heat fails closed.
  return input.heatExposure === 'unknown' || STRUCTURED_HEAT_EXPOSURES.includes(input.heatExposure) || mentionsAny(input, HEAT_EXPOSURE_TERMS)
}

export const SAFETY_RULES_PHASE0: SafetyRule[] = [
  {
    id: 'SB-HS-001-acetone-on-acetate',
    match: (i) => i.material === 'acetate' && mentionsAny(i, ['acetone', 'nail polish remover']),
    enforces: 'do_not_attempt',
    severity: 'hard_stop',
    reason: 'Acetone and many nail-polish removers can dissolve acetate fabric or acetate linings on contact.',
    avoid: ['Do not use acetone or nail-polish remover.', 'Do not rub or flush with solvent.', 'Do not continue home treatment.'],
  },
  {
    id: 'SB-HS-002-enzyme-on-silk-wool',
    match: (i) => ['silk', 'wool'].includes(i.material) && mentionsAny(i, ['enzyme', 'protease', 'biological detergent', 'enzyme detergent']),
    enforces: 'do_not_attempt',
    severity: 'hard_stop',
    reason: 'Protease enzymes can digest protein fibers such as silk and wool, causing irreversible fiber damage.',
    avoid: ['Do not use enzyme detergent.', 'Do not soak.', 'Do not machine wash.'],
  },
  {
    id: 'SB-HS-003-chlorine-bleach-sensitive-or-colored',
    match: (i) =>
      mentionsChlorineBleachIntent(i) &&
      (['silk', 'wool', 'leather', 'suede', 'nylon', 'rayon_viscose', 'blend'].includes(i.material) ||
        i.colorfastness !== 'colorfast'),
    enforces: 'do_not_attempt',
    severity: 'hard_stop',
    reason: 'Chlorine bleach can dissolve/yellow protein fibers, weaken sensitive fibers, and strip dyes from colored or unstable materials.',
    avoid: ['Do not use chlorine bleach.', 'Do not mix bleach with other cleaners.', 'Do not apply heat.'],
  },
  {
    id: 'SB-HS-004-peroxide-oxygen-bleach-on-silk',
    match: (i) => i.material === 'silk' && mentionsAny(i, ['peroxide', 'hydrogen peroxide', 'oxygen bleach', 'oxiclean']),
    enforces: 'do_not_attempt',
    severity: 'hard_stop',
    reason: 'Consumer peroxide or oxygen bleach use on silk can yellow or weaken the fiber and is not controllable at home.',
    avoid: ['Do not use peroxide or oxygen bleach.', 'Do not soak silk.', 'Do not expose to heat.'],
  },
  {
    id: 'SB-HS-005-alkali-on-tannin',
    match: (i) => hasTanninComponent(i) && mentionsAny(i, ['ammonia', 'baking soda', 'sodium carbonate', 'washing soda', 'lye', 'alkaline cleaner']),
    enforces: 'do_not_attempt',
    severity: 'hard_stop',
    reason: 'Alkaline products can chemically darken or fix tannin stains, making them much harder or impossible to remove.',
    avoid: ['Do not use ammonia, baking soda, or alkaline cleaners.', 'Do not scrub.', 'Do not heat-dry.'],
  },
  {
    id: 'SB-HS-006-unknown-or-aniline-leather-wet-soap-solvent',
    match: (i) => i.material === 'leather' && mentionsAny(i, ['water', 'dish soap', 'dawn', 'detergent', 'alcohol', 'acetone', 'solvent', 'bleach']),
    enforces: 'stop_use_pro',
    severity: 'hard_stop',
    reason: 'Unknown/aniline leather can permanently water-spot, lose dye, dry out, or stiffen from common household cleaners.',
    avoid: ['Do not use water, dish soap, alcohol, acetone, or bleach.', 'Do not rub.', 'Do not use heat.'],
  },
  {
    id: 'SB-HS-007-suede-water-solvent',
    match: (i) => i.material === 'suede' && mentionsAny(i, ['water', 'soap', 'detergent', 'alcohol', 'acetone', 'solvent', 'oil cleaner', 'bleach']),
    enforces: 'stop_use_pro',
    severity: 'hard_stop',
    reason: 'Suede and nubuck can mat, darken, stiffen, or lose nap from water, solvents, oils, bleach, and rubbing.',
    avoid: ['Do not wet suede.', 'Do not use household cleaners.', 'Do not rub the nap.'],
  },
  {
    id: 'SB-HS-008-dry-clean-only-home-wet-treatment',
    match: (i) => i.careStatus === 'dry_clean_only' && mentionsAny(i, ['water', 'rinse', 'soak', 'detergent', 'wash', 'launder', 'machine']),
    enforces: 'stop_use_pro',
    severity: 'hard_stop',
    reason: 'Dry-clean-only items may shrink, bleed, distort, or lose finish with home wet treatment.',
    avoid: ['Do not soak, rinse, or machine wash.', 'Do not scrub.', 'Do not use heat.'],
  },
  {
    id: 'SB-HS-009-dye-ink-default-referral',
    match: (i) => i.stainType === 'dye' || i.stainType === 'ink' || mentionsAny(i, ['dye transfer', 'ink', 'marker', 'hair dye', 'food coloring']),
    enforces: 'stop_use_pro',
    severity: 'hard_stop',
    reason: 'Dye and ink removal often requires controlled solvent/reducer/oxidizer work and can spread color or remove garment dye at home.',
    avoid: ['Do not rub.', 'Do not use acetone or alcohol unless a source-backed card explicitly permits it.', 'Do not bleach.'],
  },
  {
    id: 'SB-HS-010-rust-mineral-default-referral',
    match: (i) => i.stainType === 'rust_mineral' || mentionsAny(i, ['rust', 'iron stain', 'mineral stain']),
    enforces: 'stop_use_pro',
    severity: 'hard_stop',
    reason: 'Rust/mineral removal often requires controlled acidic chemistry; consumer acids can damage fibers, dyes, trims, or finishes.',
    avoid: ['Do not use strong acids.', 'Do not use chlorine bleach.', 'Do not heat.'],
  },
  {
    id: 'SB-HS-016-silk-floor',
    match: (i) => i.material === 'silk',
    enforces: 'stop_use_pro',
    severity: 'hard_stop',
    reason: 'Silk is a high-risk protein fiber with dye bleeding, water spotting, heat, enzyme, peroxide, bleach, and distortion risks; Phase 0 consumer treatment should refer.',
    avoid: ['Do not wash, soak, rub, wring, bleach, use enzyme detergent, use peroxide, use acetone, or apply heat.', 'Keep the item dry if possible and use a qualified cleaner.'],
  },
  {
    id: 'SB-HS-017-wool-floor',
    match: (i) => i.material === 'wool',
    enforces: 'stop_use_pro',
    severity: 'hard_stop',
    reason: 'Wool is a high-risk protein fiber with felting, dye, heat/agitation, enzyme, chlorine, peroxide, and alkali risks; Phase 0 consumer treatment should refer.',
    avoid: ['Do not machine wash, soak, agitate, use hot water, use enzyme detergent, use chlorine bleach, or tumble dry.', 'Keep flat/dry if possible and use a qualified cleaner.'],
  },
  {
    id: 'SB-HS-018-leather-floor',
    match: (i) => i.material === 'leather',
    enforces: 'stop_use_pro',
    severity: 'hard_stop',
    reason: 'Consumer intake cannot reliably distinguish protected from aniline leather; water, soap, solvents, heat, and rubbing can permanently mark or strip leather.',
    avoid: ['Do not use water, dish soap, detergent, alcohol, acetone, bleach, heat, or rubbing.', 'Blot dry only if there is loose moisture and refer to a leather cleaner.'],
  },
  {
    id: 'SB-HS-019-suede-floor',
    match: (i) => i.material === 'suede',
    enforces: 'stop_use_pro',
    severity: 'hard_stop',
    reason: 'Suede and nubuck can permanently mat, darken, stiffen, or lose nap from water, cleaners, solvents, oils, bleach, and rubbing.',
    avoid: ['Do not wet suede, use soap, use solvents, use oil cleaners, bleach, or rub the nap.', 'Refer to a suede/nubuck cleaner.'],
  },
  {
    id: 'SB-CS-011-heat-on-protein',
    match: (i) => hasProteinComponent(i) && hasPriorHeatExposure(i),
    enforces: 'stop_use_pro',
    severity: 'constraint',
    reason: 'Heat can denature protein stains and set them into the fiber; already heated protein stains need conservative handling.',
    avoid: ['Do not use hot water.', 'Do not machine dry.', 'Do not iron until fully removed.'],
  },
  {
    id: 'SB-CS-012-fresh-protein-cold-only',
    match: (i) => hasProteinComponent(i) && i.stainAge === 'fresh' && !hasPriorHeatExposure(i) && !['silk', 'wool', 'leather', 'suede'].includes(i.material),
    enforces: 'diy_with_constraints',
    severity: 'constraint',
    reason: 'Protein stains must stay cold and air-dried until the stain is confirmed gone.',
    avoid: ['No warm or hot water.', 'No dryer.', 'No ironing.'],
  },
  {
    id: 'SB-CS-013-unknown-material-care-or-colorfastness',
    match: (i) => i.material === 'unknown' || i.careStatus === 'unknown' || i.colorfastness === 'unknown',
    enforces: 'stop_use_pro',
    severity: 'caution',
    reason: 'Unknown fiber, care label, or dye stability makes home treatment unreliable; the safest action is limited protection and referral.',
    avoid: ['Do not bleach.', 'Do not heat.', 'Do not use solvents or strong cleaners.'],
  },
  {
    id: 'SB-CS-014-rayon-wet-risk',
    match: (i) => i.material === 'rayon_viscose' && mentionsAny(i, ['soak', 'scrub', 'wring', 'machine wash', 'hot water']),
    enforces: 'stop_use_pro',
    severity: 'constraint',
    reason: 'Rayon loses strength when wet and can shrink, distort, ring, or tear with soaking, wringing, heat, or agitation.',
    avoid: ['Do not soak rayon.', 'Do not wring or scrub.', 'Do not heat-dry.'],
  },
  {
    id: 'SB-CS-015-valuable-or-sentimental',
    match: (i) => i.itemValue === 'valuable' || i.itemValue === 'sentimental',
    enforces: 'stop_use_pro',
    severity: 'caution',
    reason: 'Valuable or sentimental items should not be risked on uncertain home treatment.',
    avoid: ['Do not experiment.', 'Do not use bleach, solvents, or heat.', 'Do not keep repeating treatments.'],
  },
]
