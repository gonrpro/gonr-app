// lib/solve/session-evidence.ts
// TASK-232 — parse red-cell safety evidence from the solve request.
//
// The terminal safety gate (terminal-safety-gate.ts) consumes this. Evidence
// comes ONLY from what the request actually carried: stain/surface text
// (where the intake orchestrator folds disclosed prior treatments and heat),
// care-label symbols, and explicit body fields. Discipline inherited from the
// 646aad2 heat false-flag fix: a QUESTION about an agent ("can I use
// bleach?") is not evidence the agent was APPLIED — application requires a
// past-use phrasing. Restrictions ("dry-clean-only", "NO BLEACH" label) are
// care constraints, parsed separately from prior-chemical disclosures.

export interface SessionEvidence {
  dryCleanOnly: boolean
  unknownStain: boolean
  unknownFabric: boolean
  unknownCare: boolean
  unknownColorfastness: boolean
  dyeTransferPositive: boolean
  leatherSuede: boolean
  liquidOrSolventRisk: boolean
  liningOrAcetate: boolean
  heatApplied: boolean
  rubbedHard: boolean
  priorChems: string[]
  valuableItem: boolean
  directHazardQuestion: 'chlorine-bleach' | 'ammonia' | 'acid-mix' | 'hot-water' | null
  // TASK-236 governor evidence:
  /** Care label reported blurry/unreadable — ask for retake/fiber, stabilize. */
  unreadableCareLabel: boolean
  /** Permanence-class stain (permanent marker/Sharpie) — honest odds only. */
  permanenceClass: boolean
  /** Fiber damage, not a stain (shrunk/felted/color loss/bleach spot). */
  damageRepairAsk: boolean
  /** "Stronger/strongest/nuclear option" ask — effort never escalates. */
  escalationRequest: boolean
  /** Pretend-pro / ignore-rules / prompt-injection phrasing. */
  guardrailBypassAttempt: boolean
  /** Colored/dark garment named — chlorine-bleach questions go protect-only. */
  coloredGarment: boolean
  /** Rayon/viscose — water-spots and rings; suite doctrine protect-only. */
  rayonViscose: boolean
}

export interface SolveRequestFacts {
  stain?: string
  surface?: string
  careSymbols?: string[]
  fabricDescription?: string
  garmentLocation?: string
  /** Direct hazard question forwarded verbatim from the intake orchestrator. */
  hazardQuestion?: string
}

// Past-use phrasing — agent must appear near an application verb.
const PRIOR_CHEM_AGENTS = ['bleach', 'ammonia', 'peroxide', 'enzyme', 'solvent', 'vinegar', 'acetone', 'alcohol'] as const
const APPLIED_VERBS = '(?:used|applied|poured|put|tried|treated|already|scrubbed\\s+with|washed\\s+with|prior)'

// TASK-236 (EV-059): real disclosure phrasings "rinsed hot" / "hair-dried" /
// "blow-dried" added — application-shaped only, so "crayon went through the
// dryer load" (the dryer caused the stain) and "already dried 2 days" (the
// stain air-dried) never read as heat treatment.
const HEAT_APPLIED_RE =
  /(?:used|applied|tried|put|hit|blasted|went\s+over)[^.;\n]{0,30}(?:hot\s+water|hair\s*dryer|dryer|iron(?:ed)?|steam)|(?:hot\s+water|hair\s*dryer|iron|steam)[^.;\n]{0,25}(?:was\s+used|already|applied)|machine[-\s]dried|tumble[-\s]dried|ironed\s+(?:it|over|the)|rinsed[^.;\n]{0,12}\bhot\b|hair[-\s]?dried|blow[-\s]?dried/i

const RUBBED_RE =
  /rubbed(?:\s+(?:it|hard|vigorously|a\s+lot))?|scrubbed|scoured|agitated\s+hard|wiped\s+hard/i

const DYE_TRANSFER_RE =
  /(?:dye|color|colour)[^.;\n]{0,30}(?:transfer(?:red)?|bled|bleed(?:ing)?|came\s+off|lifted\s+onto|on\s+(?:the|my)\s+(?:cloth|towel|rag|swab))|spot\s*test[^.;\n]{0,40}(?:transfer|bled|color|colour)/i

const LEATHER_SUEDE_RE = /\bleather\b|\bsuede\b|\bnubuck\b/i
const LINING_ACETATE_RE = /\blining\b|\blined\b|\bacetate\b/i
const LIQUID_SOLVENT_RE = /liquid|wet|spill|soaked|solvent|water\s+mark|drink|wine|coffee|juice|oil|sauce/i
const DCO_RE = /dry[-\s]?clean(?:\s+|-)?only|\bdco\b/i
const UNKNOWN_STAIN_RE = /unknown\s+stain|mystery|not\s+sure\s+what|unsure\s+what|don'?t\s+know\s+what|unidentified/i
const UNKNOWN_FABRIC_RE = /fiber\s+unknown|unknown\s+(?:fiber|fabric|material)|no\s+(?:care\s+)?label|can'?t\s+(?:find|read)\s+the\s+label/i
const VALUABLE_RE = /heirloom|sentimental|valuable|luxury|designer|wedding|couture|expensive|irreplaceable/i

// Direct hazard questions — answered explicitly, never folded into history.
const BLEACH_QUESTION_RE = /can\s+i\s+(?:just\s+)?(?:use|put|try|apply)\s+(?:chlorine\s+)?bleach|is\s+(?:chlorine\s+)?bleach\s+(?:ok|okay|safe)|should\s+i\s+(?:use\s+)?bleach/i
const AMMONIA_QUESTION_RE = /can\s+i\s+(?:just\s+)?(?:use|put|try|apply)\s+ammonia|is\s+ammonia\s+(?:ok|okay|safe)/i
const ACID_MIX_QUESTION_RE = /can\s+i\s+mix|mix(?:ing)?\s+(?:bleach|ammonia|vinegar)[^.;\n]{0,30}(?:\?|safe|ok)/i
// TASK-236 (EV-049): hot water is a hazard question too — heat sets most
// stain families, so "can I just use hot water?" gets an explicit No.
const HOT_WATER_QUESTION_RE =
  /can\s+i\s+(?:just\s+)?(?:use|put|try|pour|rinse\s+(?:it\s+)?(?:in|with))\s+hot\s+water|is\s+hot\s+water\s+(?:ok|okay|safe)|should\s+i\s+(?:use\s+)?hot\s+water/i

// TASK-236 governor evidence patterns. All deterministic, all narrow on
// purpose — each maps to a red cell with a stable ID in the rule table.
const UNREADABLE_LABEL_RE =
  /\b(?:blurry|unreadable|illegible|can'?t\s+(?:read|make\s+out))\b[^.;\n]{0,40}\blabel\b|\blabel\b[^.;\n]{0,60}\b(?:blurry|unreadable|illegible|can'?t\s+(?:be\s+)?read)\b|\blabel\s+photo\s+is\s+\b(?:blurry|unclear)\b/i
const PERMANENCE_CLASS_RE = /\bpermanent\s+marker\b|\bsharpie\b/i
const DAMAGE_REPAIR_RE =
  /\bshrunk(?:en)?\b|\bfelted\b|\bcolor\s+loss\b|\bbleach(?:ed)?\s+(?:spot|patch|mark)\b|\bbleached[-\s]out\b|\bdye\s+loss\b/i
const ESCALATION_REQUEST_RE =
  /\bstrongest\b|\bstronger\s+(?:option|step|stuff|product|chemical|treatment)\b|\bsomething\s+stronger\b|\bnuclear\s+option\b|\bkeep\s+escalating\b|\bgive\s+me\s+everything\b|\bwhat\s+else\s+can\s+i\s+(?:try|use)\b/i
const GUARDRAIL_BYPASS_RE =
  /\bpretend\s+i'?m\b|\bignore\s+(?:your|the)\s+(?:rules|instructions|safety)\b|\bdisregard\s+(?:your|the)\s+(?:rules|instructions|safety)\b|\bsystem\s*:\s*allow\b|\bi\s+accept\s+the\s+risk\b/i
const COLORED_GARMENT_RE = /\bcolored\b|\bcolou?red\b|\bdark\b|\bnavy\b|\bblack\b|\bbright(?:ly)?[-\s]colored\b|\bdyed\b/i
const RAYON_VISCOSE_RE = /\brayon\b|\bviscose\b/i

export function parseSessionEvidence(facts: SolveRequestFacts): SessionEvidence {
  const text = [facts.stain, facts.surface, facts.fabricDescription, facts.garmentLocation, facts.hazardQuestion]
    .filter((s): s is string => typeof s === 'string' && s.length > 0)
    .join(' ')
  const symbols = (facts.careSymbols ?? []).join(' ').toLowerCase()
  const all = `${text} ${symbols}`

  // History scan excludes the hazard question — it is captured separately as
  // directHazardQuestion and must never read as an applied treatment.
  const historyText = facts.hazardQuestion ? text.split(facts.hazardQuestion).join(' ') : text
  const priorChems: string[] = []
  for (const agent of PRIOR_CHEM_AGENTS) {
    const re = new RegExp(`${APPLIED_VERBS}[^.;\\n]{0,40}\\b${agent}|\\b${agent}\\b[^.;\\n]{0,30}(?:was\\s+(?:used|applied)|already)`, 'i')
    if (re.test(historyText)) priorChems.push(agent)
  }

  const directHazardQuestion = BLEACH_QUESTION_RE.test(text)
    ? ('chlorine-bleach' as const)
    : AMMONIA_QUESTION_RE.test(text)
      ? ('ammonia' as const)
      : ACID_MIX_QUESTION_RE.test(text)
        ? ('acid-mix' as const)
        : HOT_WATER_QUESTION_RE.test(text)
          ? ('hot-water' as const)
          : null

  const leatherSuede = LEATHER_SUEDE_RE.test(all)

  return {
    dryCleanOnly: DCO_RE.test(all) || symbols.includes('dry-clean-only'),
    unknownStain: UNKNOWN_STAIN_RE.test(text),
    unknownFabric: UNKNOWN_FABRIC_RE.test(text),
    unknownCare: /care\s+unknown|no\s+care\s+label/i.test(text),
    unknownColorfastness: /colorfast(?:ness)?\s+unknown|not\s+sure\s+if\s+colorfast/i.test(text),
    dyeTransferPositive: DYE_TRANSFER_RE.test(text),
    leatherSuede,
    liquidOrSolventRisk: leatherSuede && LIQUID_SOLVENT_RE.test(text),
    liningOrAcetate: LINING_ACETATE_RE.test(all),
    heatApplied: HEAT_APPLIED_RE.test(text),
    rubbedHard: RUBBED_RE.test(text),
    priorChems,
    valuableItem: VALUABLE_RE.test(text),
    directHazardQuestion,
    unreadableCareLabel: UNREADABLE_LABEL_RE.test(all),
    permanenceClass: PERMANENCE_CLASS_RE.test(text),
    damageRepairAsk: DAMAGE_REPAIR_RE.test(text),
    escalationRequest: ESCALATION_REQUEST_RE.test(text),
    guardrailBypassAttempt: GUARDRAIL_BYPASS_RE.test(text),
    coloredGarment: COLORED_GARMENT_RE.test(text),
    rayonViscose: RAYON_VISCOSE_RE.test(all),
  }
}
