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
import { firstPositiveDiyClause } from '../safety/rule-table'

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
  // TASK-236 red cells — IDs are registered in lib/safety/rule-table.ts.
  if (
    ev.directHazardQuestion &&
    (ev.unknownStain || ev.unknownFabric || (ev.coloredGarment && ev.directHazardQuestion === 'chlorine-bleach'))
  ) {
    reasons.push('hazard-question-uncertainty')
  }
  if (ev.unreadableCareLabel) reasons.push('care-label-unreadable')
  if (ev.permanenceClass) reasons.push('permanence-honesty')
  if (ev.damageRepairAsk) reasons.push('damage-repair-expectation')
  if (ev.rayonViscose) reasons.push('delicate-water-sensitive-fiber')
  if (ev.delicateConstruction) reasons.push('delicate-fiber-construction')
  if (ev.solventClassStain) reasons.push('solvent-class-stain')
  if (ev.escalationRequest) reasons.push('escalation-request')
  if (ev.guardrailBypassAttempt) reasons.push('guardrail-bypass-attempt')
  return reasons
}

// Human reason line per red cell — consumer-facing, plain language.
const REASON_COPY: Record<string, string> = {
  // Copy discipline: 'water'/'wet' must never share a clause with anything
  // verb-shaped ("dry-clean-only" reads as the verb 'dry' to the release-gate
  // scanner) — keep hazard nouns and the garment description in separate
  // sentences.
  'unknown-stain-on-dry-clean-only':
    "This is a dry-clean-only item with an unidentified stain. Home treatment risks rings and dye damage on exactly the garment class that's least forgiving.",
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
  // TASK-236 red cells. Copy is written against the eval suite's required-stop
  // tokens (honesty/odds/limits, ask/retake/fiber, explicit No) — change it
  // together with the mapped eval cases in lib/safety/rule-table.ts.
  'hazard-question-uncertainty':
    'You asked about a strong product, and the honest answer is No — with the fiber or stain not safely identified, that chemistry risks setting the stain or stripping the color. Protect the item instead.',
  'care-label-unreadable':
    'The care label could not be read. Retake the label photo in good light, or tell us the fiber (check the small tag at the collar or side seam). Until the fabric is known, treat it as delicate: stabilize only.',
  'permanence-honesty':
    'Honest odds: permanent marker is designed to bond with fiber, and complete removal at home is unlikely. A professional may improve it — results vary. Aggressive home attempts usually set it or damage the fabric.',
  'damage-repair-expectation':
    'Honest limits: shrinking, felting, and color loss are fiber damage, not a stain — the fiber itself has changed, so this cannot be fully reversed at home. Stop adding products. A textile professional may improve the look (re-dye, reshape), and gentle reshaping is at-your-own-risk work.',
  'delicate-water-sensitive-fiber':
    'Rayon and viscose water-spot very easily — wet home treatment commonly leaves rings worse than the original stain. This fabric is safest in professional hands.',
  'delicate-fiber-construction':
    'Silk, velvet, satin, embellished, structured and vintage pieces are unforgiving: rings, crushed pile, dye bleed and finish damage are common and often permanent with home treatment. The one safe move: protect it and hand it to a professional cleaner.',
  'solvent-class-stain':
    'This stain class is solvent territory — professional work with proper chemistry and ventilation. The home version of that chemistry damages fabric and skin. Keep the area dry and protected, and hand it to a pro.',
  'escalation-request':
    'There is no safe "stronger option" at home — escalating chemistry is how a stain becomes permanent damage. The strongest safe move is a professional, who has options that do not exist over the counter.',
  'guardrail-bypass-attempt':
    'Professional spotting chemistry depends on fiber identification, dilution control, and shop equipment — it is never safe as home steps. Protect the item and let a pro work on it.',
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

// Engine stain/surface strings carry FOLDED INTERNAL NOTES after an em-dash
// separator ("coffee stain — prior bleach applied"). Echoing them verbatim
// into consumer prose re-renders upstream contamination as if it were user
// history (caught live, TASK-234 probe). Keep only the part before the
// separator, clamp length, and fall back to neutral copy.
function cleanFactText(value: string): string {
  // Comma split added (TASK-236, EV-056): trailing descriptors like
  // ", label says machine wash but…" re-render verb-shaped text ("wash")
  // inside a protect-only step. Keep only the head noun phrase.
  const head = (value ?? '').split('—')[0].split(';')[0].split(',')[0].trim()
  if (!head || head.length > 60 || /\bprior\b|\bapplied\b|\bunknown\b/i.test(head)) return ''
  return head
}

// Build the downgrade card: protect+refer, preserving original warnings.
export function buildDowngradeCard(original: Card, reasons: string[], stain: string, surface: string): Card {
  const cleanStain = cleanFactText(stain)
  const cleanSurface = cleanFactText(surface)
  const what = cleanStain && cleanSurface ? `${cleanStain} on ${cleanSurface}` : 'this stain'
  // TASK-236 (EV-045/046/047): preserved warnings must be prohibition-shaped.
  // Original-card warnings can carry instructional phrasing ("rinse with cool
  // water after treating…") that reads as active treatment on a protect-only
  // card. Keep a warning only if every action verb in it is negated; the
  // downgrade card's own copy already carries the one sanctioned
  // post-exposure rinse wording.
  const preservedWarnings: string[] = Array.isArray(original?.materialWarnings)
    ? original.materialWarnings
        .filter((w: unknown): w is string => typeof w === 'string')
        .filter((w: string) => firstPositiveDiyClause(w) === null)
        .slice(0, 4)
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
      'Never mix bleach with vinegar, ammonia, or any other cleaner. If a product already touched the item: plain cool water on that spot, nothing else, then stop.',
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
