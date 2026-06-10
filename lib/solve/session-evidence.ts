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
  directHazardQuestion: 'chlorine-bleach' | 'ammonia' | 'acid-mix' | null
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

const HEAT_APPLIED_RE =
  /(?:used|applied|tried|put|hit|blasted|went\s+over)[^.;\n]{0,30}(?:hot\s+water|hair\s*dryer|dryer|iron(?:ed)?|steam)|(?:hot\s+water|hair\s*dryer|iron|steam)[^.;\n]{0,25}(?:was\s+used|already|applied)|machine[-\s]dried|tumble[-\s]dried|ironed\s+(?:it|over|the)/i

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
  }
}
