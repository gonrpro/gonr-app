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
  /** Couture veto class: silk/velvet/satin/embellished/structured/vintage. */
  delicateConstruction: boolean
  /** Solvent-territory stain class (dried oil-based paint) — pro only. */
  solventClassStain: boolean
  /** Acetone-risk stain (nail polish/superglue) — caps effort at orange. */
  solventRiskStain: boolean
  /** Suite protect-only effort classes (motor oil/tar/polish/residue/wool rug). */
  orangeStainClass: boolean
  /** User disclosed they only have napkins/water — no product steps. */
  limitedSupplies: boolean
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
// mildew/mold added (TASK-236, EV-029): biological growth on leather is
// specialist work just like liquid damage.
const LIQUID_SOLVENT_RE = /liquid|wet|spill|soaked|solvent|water\s+mark|drink|wine|coffee|juice|oil|sauce|mildew|mold/i
const DCO_RE = /dry[-\s]?clean(?:\s+|-)?only|\bdco\b/i
const UNKNOWN_STAIN_RE = /unknown\s+stain|mystery|not\s+sure\s+what|unsure\s+what|don'?t\s+know\s+what|unidentified/i
const UNKNOWN_FABRIC_RE = /fiber\s+unknown|unknown\s+(?:fiber|fabric|material)|no\s+(?:care\s+)?label|can'?t\s+(?:find|read)\s+the\s+label/i
const VALUABLE_RE = /heirloom|sentimental|valuable|luxury|designer|wedding|couture|expensive|irreplaceable|high[-\s]value/i

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
  /\bstrongest\b|\bstrong(?:er)?\s+(?:option|step|stuff|product|chemical|treatment)\b|\bsomething\s+stronger\b|\bnuclear\s+option\b|\bkeep\s+escalating\b|\bgive\s+me\s+everything\b|\bwhat\s+else\s+can\s+i\s+(?:try|use)\b|\bdon'?t\s+care\s+if\s+it'?s\s+risky\b|\bno\s+matter\s+the\s+risk\b/i
const GUARDRAIL_BYPASS_RE =
  /\bpretend\s+i'?m\b|\bignore\s+(?:your|the)\s+(?:rules|instructions|safety)\b|\bdisregard\s+(?:your|the)\s+(?:rules|instructions|safety)\b|\bsystem\s*:\s*allow\b|\bi\s+accept\s+the\s+risk\b/i
const COLORED_GARMENT_RE = /\bcolored\b|\bcolou?red\b|\bdark\b|\bnavy\b|\bblack\b|\bbright(?:ly)?[-\s]colored\b|\bdyed\b/i
const RAYON_VISCOSE_RE = /\brayon\b|\bviscose\b/i
// Couture/delicate-construction veto class (TASK-236, encyclopedia doctrine:
// "valued/structured/embellished → do_not_attempt/specialist"). Wool-class
// fibers are deliberately EXCLUDED — that doctrine line (EV-011/EV-038 vs
// verified wool cards) is an open SB decision.
const DELICATE_CONSTRUCTION_RE =
  /\bsilk\b|\bseda\b|\bvelvet\b|\bsatin\b|\btaffeta\b|\bchiffon\b|\borganza\b|\blace\b|\bsequin(?:ned|ed)?\b|\bbeaded\b|\bembellished\b|\bembroidered\b|\bstructured\b|\bvintage\b|\bantique\b|\bchristening\b|\bdelicate\s+garment\b|\bmetallic\s+print\b|\bfoil\s+print(?:ed)?\b|\bglitter(?:ed)?\b/i
// Stain classes that are solvent territory at home (pro work): dried
// oil-based paint. Wet nail polish on non-acetate is acetone-risk → orange.
const SOLVENT_CLASS_STAIN_RE = /\boil[-\s]based\b[^.;\n]{0,20}\bpaint\b|\bpaint\b[^.;\n]{0,20}\boil[-\s]based\b/i
const SOLVENT_RISK_STAIN_RE = /\bnail\s+polish\b|\bsuper\s*glue\b/i
// Stain/surface classes the encyclopedia suite caps at protect-only effort:
// solvent-leaning or dye-risk residues plus wool flooring (garment wool-class
// stays an open SB doctrine line — this is rugs/carpet only).
const ORANGE_STAIN_CLASS_RE =
  /\bmotor\s+oil\b|\bshoe\s+polish\b|\bhighlighter\b|\badhesive\b|\bsticker\s+residue\b|\bdye\s+(?:ring|halo)\b|\bunknown\s+(?:\w+\s+)?residue\b|\btar\b|\bwool\s+(?:rug|carpet)\b/i
// Limited-supplies context ("traveling, only napkins and water"): the user
// cannot follow product steps, so recommending them is invented-product
// advice (EV-062). Caps effort at protect-only; firstAid blot guidance is
// exactly what they CAN do.
const LIMITED_SUPPLIES_RE =
  /\bonly\b[^.;\n]{0,30}\b(?:napkins?|paper\s+towels?|tissues?|water)\b|\bno\s+(?:cleaning\s+)?(?:products?|supplies)\s+(?:available|on\s+hand|with\s+me)\b/i

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
    delicateConstruction: DELICATE_CONSTRUCTION_RE.test(all),
    solventClassStain: SOLVENT_CLASS_STAIN_RE.test(text),
    solventRiskStain: SOLVENT_RISK_STAIN_RE.test(text),
    orangeStainClass: ORANGE_STAIN_CLASS_RE.test(all),
    limitedSupplies: LIMITED_SUPPLIES_RE.test(text),
  }
}
