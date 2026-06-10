// lib/solve/terminal-safety-gate.ts
// TASK-232 — the LAST decision point before a consumer result renders.
//
// Runs after card/AI composition, after the TASK-231 output guard, after tier
// sanitization — and can override every upstream source (verified card, AI,
// template, fallback). "Stain chemistry proposes, the gate disposes."
//
// Red-cell classes (recovery packet, spec lines 48-56): when session evidence
// hits one, any card carrying ACTIVE wet/chemistry DIY is downgraded to a
// protect+refer card that names the reason. Do-Not-Do/warning content from
// the original card is preserved — warnings are never the hazard.

import type { SessionEvidence } from './session-evidence'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Card = any

export interface GateDecision {
  card: Card
  downgraded: boolean
  reasons: string[]
}

// Active-treatment detector: does the card instruct wet work or chemistry
// (vs. protect-only blot/refer guidance)? Negation-aware per clause.
const ACTIVE_TREATMENT_RE =
  /\b(?:apply|dab|flush|rinse|soak|work\s+in|spray|saturate|sponge|treat\s+with|wash|launder|blot\s+with\s+(?!a\s+clean\s+(?:white\s+)?(?:cloth|towel|pad)))[^.;\n]{0,60}\b(?:water|soap|detergent|vinegar|peroxide|solution|cleaner|alcohol|solvent)\b/i
const NEGATED_NEAR_RE = /\b(?:never|don'?t|do\s+not|avoid|must\s+not|no)\b[^.;\n]{0,40}$/i

function cardText(card: Card): string {
  if (!card || typeof card !== 'object') return ''
  try {
    return JSON.stringify(card)
  } catch {
    return ''
  }
}

export function cardHasActiveTreatment(card: Card): boolean {
  const text = cardText(card)
  let m: RegExpExecArray | null
  const re = new RegExp(ACTIVE_TREATMENT_RE.source, 'gi')
  while ((m = re.exec(text)) !== null) {
    const lookback = text.slice(Math.max(0, m.index - 50), m.index)
    if (!NEGATED_NEAR_RE.test(lookback)) return true
  }
  return false
}

// Which red cells fired for this session?
export function firedRedCells(ev: SessionEvidence): string[] {
  const reasons: string[] = []
  if (ev.unknownStain && ev.dryCleanOnly) reasons.push('unknown-stain-on-dry-clean-only')
  if (ev.dyeTransferPositive) reasons.push('positive-dye-transfer')
  if (ev.liquidOrSolventRisk) reasons.push('leather-suede-liquid')
  if (ev.liningOrAcetate && (ev.unknownStain || ev.unknownFabric)) reasons.push('lining-acetate-risk')
  if (ev.heatApplied) reasons.push('heat-already-applied')
  if (ev.rubbedHard) reasons.push('hard-agitation-applied')
  if (ev.priorChems.length > 0) reasons.push(`prior-chemical:${ev.priorChems.join('+')}`)
  if (ev.unknownFabric && (ev.dryCleanOnly || ev.valuableItem)) reasons.push('unknown-fabric-high-stakes')
  if (ev.valuableItem && (ev.unknownStain || ev.unknownFabric || ev.unknownCare)) reasons.push('valuable-item-uncertainty')
  return reasons
}

// Human reason line per red cell — consumer-facing, plain language.
const REASON_COPY: Record<string, string> = {
  'unknown-stain-on-dry-clean-only':
    "This is a dry-clean-only item with an unidentified stain — home treatment risks water rings and dye damage on exactly the garment class that's least forgiving.",
  'positive-dye-transfer':
    'Color transferred during testing. That is a stop signal: any wet work from here will move dye, not the stain.',
  'leather-suede-liquid':
    'Leather and suede react badly to liquids and home chemistry — this needs a leather specialist.',
  'lining-acetate-risk':
    'Linings and acetate are extremely solvent- and water-sensitive; wet home treatment commonly leaves rings.',
  'heat-already-applied':
    'Heat has already touched this stain, which may have partially set it. More home chemistry can lock it in — a pro can still work with it.',
  'hard-agitation-applied':
    'Hard rubbing has already stressed the fibers here. More agitation or chemistry risks permanent texture damage.',
  'unknown-fabric-high-stakes':
    "The fiber is unknown and the stakes are high — the safe move is to protect it and let a pro identify the fabric first.",
  'valuable-item-uncertainty':
    'This item matters and too much is unknown. Protect it and hand it to a professional.',
}

function reasonLine(reasons: string[]): string {
  for (const r of reasons) {
    const key = r.startsWith('prior-chemical:') ? null : r
    if (key && REASON_COPY[key]) return REASON_COPY[key]
  }
  if (reasons.some((r) => r.startsWith('prior-chemical:'))) {
    return 'A strong chemical has already been used on this stain. Adding more chemistry at home risks a reaction or permanent damage — never mix products, rinse with cool water only, and let a pro take it from here.'
  }
  return 'The safest move for this one is to protect the item and see a professional.'
}

// Build the downgrade card: protect+refer, preserving original warnings.
export function buildDowngradeCard(original: Card, reasons: string[], stain: string, surface: string): Card {
  const what = stain && surface ? `${stain} on ${surface}` : 'this stain'
  const preservedWarnings: string[] = Array.isArray(original?.materialWarnings)
    ? original.materialWarnings.filter((w: unknown): w is string => typeof w === 'string').slice(0, 4)
    : []
  return {
    id: 'terminal-gate-protect-refer',
    title: 'Stop here — protect it and see a pro',
    stainFamily: original?.stainFamily ?? 'combination',
    surface: surface || 'unknown',
    source: 'terminal-safety-gate',
    stainChemistry: reasonLine(reasons),
    whyThisWorks:
      'Not adding heat, rubbing, or chemistry keeps the stain workable for a professional. Most permanent damage comes from home attempts, not the stain itself.',
    homeSolutions: [
      `Right now for ${what}: blot gently with a clean white cloth from the outside in. No rubbing, no heat, no cleaning products.`,
      'Never mix bleach with vinegar, ammonia, or any other cleaner. If a product has already touched the item, rinse that area with plain cool water and stop.',
      'Take it to a professional cleaner soon and tell them exactly what happened — including anything already tried on it.',
    ],
    materialWarnings: preservedWarnings.length
      ? preservedWarnings
      : ['Heat, rubbing, and home chemistry can set this stain permanently.'],
    products: { consumer: [] },
    escalation: {
      when: 'Now — before any further home treatment.',
      whatToTell: 'Describe the stain, the garment and fiber if known, and anything already applied to it.',
      specialistType: 'Professional cleaner',
    },
    difficulty: 9,
    meta: { riskLevel: 'high', tier: 'terminal-safety-gate' },
    _terminalGate: { downgraded: true, reasons },
  }
}

// The gate itself. Card may be null (some response shapes) — pass through.
export function applyTerminalGate(
  card: Card,
  ev: SessionEvidence,
  opts: { stain: string; surface: string },
): GateDecision {
  if (!card || typeof card !== 'object') return { card, downgraded: false, reasons: [] }

  const reasons = firedRedCells(ev)
  if (reasons.length === 0) return { card, downgraded: false, reasons: [] }

  // Red cell fired: protect-only cards may pass; active treatment may not.
  if (!cardHasActiveTreatment(card)) {
    // Already protect/refer shaped — annotate and pass.
    card._terminalGate = { downgraded: false, reasons }
    return { card, downgraded: false, reasons }
  }

  return { card: buildDowngradeCard(card, reasons, opts.stain, opts.surface), downgraded: true, reasons }
}
