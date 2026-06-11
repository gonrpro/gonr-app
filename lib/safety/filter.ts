// lib/safety/filter.ts
// GONR Safety Filter — rules-based safety check for AI-generated protocol cards
// Pure function, no I/O, <1ms execution

import { FILTER_RULES, type FilterContextKey } from './rule-table'

export interface SafetyViolation {
  rule: string
  term: string
  field: string
  action: 'replaced' | 'removed' | 'blocked'
}

export interface SafetyResult {
  safe: boolean       // false = nuclear violation, block the response
  filtered: boolean   // true = auto-corrections were made
  violations: SafetyViolation[]
  card: any           // mutated card (corrections applied in-place)
}

// Safe fallback for nuclear violations
export const SAFE_FALLBACK = {
  title: 'Professional Assessment Required',
  stainFamily: 'unknown',
  surface: '',
  stainChemistry: 'This stain and material combination requires careful professional evaluation.',
  whyThisWorks: 'Some stain/material combinations carry risk of permanent damage if the wrong agent is used. These holding steps reduce risk while leaving the strongest treatment options for a professional.',
  homeSolutions: [
    'Stop active treatment now and keep the item away from heat: no dryer, iron, steamer, hot water, or direct sun.',
    'If you are going to do anything before a cleaner sees it, blot only with a clean white towel. Do not rub or scrub.',
    'If the care label allows water and a hidden area does not transfer color, lightly blot from the outside edge with cool water, then blot dry.',
    'Take it to a professional cleaner as soon as possible and tell them what the stain is, when it happened, and anything already used.',
  ],
  spottingProtocol: [
    { step: 1, instruction: 'Stop active treatment now and keep the item away from heat: no dryer, iron, steamer, hot water, or direct sun.' },
    { step: 2, instruction: 'If you are going to do anything before a cleaner sees it, blot only with a clean white towel. Do not rub or scrub.' },
    { step: 3, instruction: 'If the care label allows water and a hidden area does not transfer color, lightly blot from the outside edge with cool water, then blot dry.' },
    { step: 4, instruction: 'Take it to a professional cleaner as soon as possible and tell them what the stain is, when it happened, and anything already used.' },
  ],
  materialWarnings: ['Do not scrub, add household products, or use heat on this combination.'],
  escalation: 'Best result: take this to a professional cleaner. If you handle it first, stick to the minimal holding steps above.',
  _safetyBlocked: true,
  meta: { stainCanonical: '', surfaceCanonical: '', tier: 'safety-blocked' },
}

// SB cautious-copy gate (signed 2026-06-08). The SAFE_FALLBACK holding steps ("if you
// are going to do anything…") may ONLY be shown when the item can plausibly tolerate a
// gentle home holding action: washable, NOT a delicate/specialty fiber, NOT dry-clean-
// only, and NO chemical already applied. When any of those is true, the cautious "try
// this first" steps are stripped and the fallback stays refuse-only. (The acutely-
// dangerous chemical-mixing / acetone-on-acetate / fume cases already route through
// hard-refuse separately, so they never reach this fallback.)
export function cautiousFallbackEligible(flags: {
  isDelicateFiber: boolean
  isDryCleanOnly: boolean
  hasPriorChemical: boolean
}): boolean {
  return !flags.isDelicateFiber && !flags.isDryCleanOnly && !flags.hasPriorChemical
}

// Fields the caller swaps onto the contextual fallback when cautious holding steps are
// NOT eligible — no "try this" guidance, just the safe escalation. Do-Not-Do / material
// warnings are added by the caller and are ALWAYS shown.
export const REFUSE_ONLY_FALLBACK = {
  whyThisWorks:
    'For a delicate or dry-clean-only item, or one where a chemical has already been used, the wrong home step can cause permanent damage. A professional cleaner has the safest options here.',
  homeSolutions: [] as string[],
  spottingProtocol: [
    { step: 1, instruction: 'Do not treat this at home — for this material or situation, the wrong step risks permanent damage.' },
    { step: 2, instruction: 'Keep it away from heat and do not apply any product.' },
    { step: 3, instruction: 'Take it to a professional cleaner soon, and tell them the stain, when it happened, and anything already used.' },
  ],
  escalation:
    'Take this to a professional cleaner. Given the material/situation, home treatment risks permanent damage — let a pro handle it.',
}

// ---------------------------------------------------------------------------
// Surface / stain context detectors
// ---------------------------------------------------------------------------

function detectContext(stain: string, surface: string, card: any) {
  const surfaceText = (surface + ' ' + (card.title || '')).toLowerCase()
  const stainText = stain.toLowerCase()
  const isLeather = /\b(leather|cuero|piel)\b/i.test(surface) && !/faux|vegan|pleather|imitaci[óo]n|sint[ée]tic/i.test(surface)

  return {
    isSilk: /\b(silk|seda)\b/i.test(surfaceText),
    // angora/mohair added (TASK-229b): same keratin felting/enzyme chemistry as
    // wool; the intake collapse previously erased these words so the rules could
    // never have fired — now that the surface preserves them, recognize them.
    isWool: /\b(wool|cashmere|merino|angora|mohair|lana|cachemir)\b/i.test(surfaceText),
    isMarble: /\b(marble|limestone|travertine|m[áa]rmol|piedra caliza|travertino)\b/i.test(surfaceText),
    isAcetate: /\b(acetate|triacetate|tri[-\s]?acetate|acetato|triacetato)\b/i.test(surfaceText),
    // Extended 2026-04-18: combination stains carrying a protein component
    // (chocolate = milk protein; gravy / dairy / meat / baby formula etc.)
    // need the same cold-water-pre-rinse discipline as pure protein stains,
    // per eval judge flag on chocolate-cotton.
    isProtein: /\b(blood|urine|sweat|egg|milk|vomit|chocolate|gravy|baby[-\s]?formula|ice[-\s]?cream|yogurt|cheese|meat|fish|custard|pudding|dairy|sangre|orina|sudor|huevo|leche|v[óo]mito|salsa|f[óo]rmula|helado|yogur|queso|carne|pescado|l[áa]cteo)\b/i.test(stainText),
    isWood: /\b(wood|hardwood|madera)\b/i.test(surfaceText),
    isLeather,
    isAnilineLeather: isLeather && /\b(aniline|anilina)\b/i.test(surfaceText),
    isAlcantara: /\balcantara\b/i.test(surfaceText),
    isTannin: /\b(wine|coffee|tea|juice|beer|chocolate|vino|caf[ée]|t[ée]|jugo|zumo|cerveza)\b/i.test(stainText),
  }
}

// ---------------------------------------------------------------------------
// Warning-context check
// If the 120 chars before the matched term contain a negation, it's a warning
// about the substance, not a recommendation. Skip the violation.
// ---------------------------------------------------------------------------

function isWarningContext(text: string, matchIndex: number): boolean {
  const lookback = text.slice(Math.max(0, matchIndex - 120), matchIndex).toLowerCase()
  // English + Spanish negations (TASK-218): now that the banned-agent rules match
  // Spanish chemical names, a Spanish safety WARNING ("nunca use amoníaco") must be
  // recognized as educational, not a recommendation, to avoid false-positive blocks.
  if (/\b(never|do not|avoid|don't|not recommended|not safe|harmful|dangerous|nunca|no use|no aplique|no utilice|evite|evitar|no recomendado|no es seguro|peligroso|da[ñn]ino|no debe)\b/.test(lookback)) {
    return true
  }
  // Bare "no" (TASK-229b): warning copy like "No hot water, no enzymes, no
  // OxiClean" was being rewritten into contradictions ("No cool water…"). The
  // eval grader treats \bno\b within a tight window as warning context; match
  // it — but only within 40 chars, not the full 120, so prose like "there is
  // no need to dilute — apply X" can't shadow a genuine recommendation of X.
  const near = text.slice(Math.max(0, matchIndex - 40), matchIndex).toLowerCase()
  return /\bno\b/.test(near)
}

// ---------------------------------------------------------------------------
// Field scanner — walks card fields the spec requires us to check
// ---------------------------------------------------------------------------

interface FieldEntry {
  path: string        // human-readable path, e.g. "spottingProtocol[0].agent"
  getValue: () => string | undefined
  setValue: (v: string) => void
  replaceable: boolean // false = flag only (materialWarnings)
}

function collectFields(card: any): FieldEntry[] {
  const fields: FieldEntry[] = []

  // spottingProtocol[*].agent, .instruction, .technique
  const steps: any[] = Array.isArray(card.spottingProtocol) ? card.spottingProtocol : []
  for (let i = 0; i < steps.length; i++) {
    for (const key of ['agent', 'instruction', 'technique'] as const) {
      if (typeof steps[i]?.[key] === 'string') {
        fields.push({
          path: `spottingProtocol[${i}].${key}`,
          getValue: () => steps[i][key],
          setValue: (v: string) => { steps[i][key] = v },
          replaceable: true,
        })
      }
    }
  }

  // homeSolutions — strings, or objects carrying .agent/.instruction. Library
  // cards use the object shape; those fields were previously unscanned entirely
  // (TASK-229 finding: banned terms in homeSolutions[i].instruction passed the
  // filter untouched on real cards).
  const home: unknown[] = Array.isArray(card.homeSolutions) ? card.homeSolutions : []
  for (let i = 0; i < home.length; i++) {
    const entry = home[i]
    if (typeof entry === 'string') {
      fields.push({
        path: `homeSolutions[${i}]`,
        getValue: () => home[i] as string,
        setValue: (v: string) => { home[i] = v },
        replaceable: true,
      })
    } else if (entry && typeof entry === 'object') {
      const obj = entry as Record<string, unknown>
      for (const key of ['agent', 'instruction'] as const) {
        if (typeof obj[key] === 'string') {
          fields.push({
            path: `homeSolutions[${i}].${key}`,
            getValue: () => obj[key] as string,
            setValue: (v: string) => { obj[key] = v },
            replaceable: true,
          })
        }
      }
    }
  }

  // materialWarnings (flag only, don't replace)
  const warnings: string[] = Array.isArray(card.materialWarnings) ? card.materialWarnings : []
  for (let i = 0; i < warnings.length; i++) {
    if (typeof warnings[i] === 'string') {
      fields.push({
        path: `materialWarnings[${i}]`,
        getValue: () => warnings[i],
        setValue: (v: string) => { warnings[i] = v },
        replaceable: false,
      })
    }
  }

  // escalation — string or object with whatToTell
  if (typeof card.escalation === 'string') {
    fields.push({
      path: 'escalation',
      getValue: () => card.escalation,
      setValue: (v: string) => { card.escalation = v },
      replaceable: true,
    })
  } else if (card.escalation && typeof card.escalation.whatToTell === 'string') {
    fields.push({
      path: 'escalation.whatToTell',
      getValue: () => card.escalation.whatToTell,
      setValue: (v: string) => { card.escalation.whatToTell = v },
      replaceable: true,
    })
  }

  return fields
}

// ---------------------------------------------------------------------------
// Regex-based term scanner + replacer
// ---------------------------------------------------------------------------

interface ScanRule {
  id: string
  pattern: RegExp
  replacement: string | null    // null = BLOCK (nuclear)
  note?: string                 // appended after replacement
  action: 'replaced' | 'blocked'
}

function scanAndReplace(
  text: string,
  rule: ScanRule,
  fieldPath: string,
  violations: SafetyViolation[],
  replaceable: boolean,
): { newText: string; nuclear: boolean } {
  let nuclear = false
  let newText = text
  let match: RegExpExecArray | null
  const re = new RegExp(rule.pattern.source, rule.pattern.flags) // fresh copy

  // Collect all matches first to avoid infinite loops on global regex
  const matches: { index: number; term: string }[] = []
  while ((match = re.exec(text)) !== null) {
    matches.push({ index: match.index, term: match[0] })
  }

  // Process in reverse order so indices stay valid
  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i]

    // Warning-context exception: "NEVER use peroxide on silk" is educational,
    // not a recommendation. Skip these even on nuclear rules — this matches the
    // eval grader's warning-context awareness and lets trusted library cards
    // name hazards in safety advice without triggering a nuclear block.
    if (isWarningContext(text, m.index)) continue

    if (rule.replacement === null) {
      // Nuclear — BLOCK
      violations.push({ rule: rule.id, term: m.term, field: fieldPath, action: 'blocked' })
      nuclear = true
    } else if (replaceable) {
      // Replace in-place
      const suffix = rule.note ? ` ${rule.note}` : ''
      newText =
        newText.slice(0, m.index) +
        rule.replacement + suffix +
        newText.slice(m.index + m.term.length)
      violations.push({ rule: rule.id, term: m.term, field: fieldPath, action: 'replaced' })
    } else {
      // Non-replaceable field (materialWarnings) — flag only
      violations.push({ rule: rule.id, term: m.term, field: fieldPath, action: 'replaced' })
    }
  }

  return { newText, nuclear }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function runSafetyFilter(card: any, stain: string, surface: string): SafetyResult {
  // Deep-clone so we mutate a copy, not the original
  const safeCard = JSON.parse(JSON.stringify(card))
  const violations: SafetyViolation[] = []
  let isNuclear = false

  const ctx = detectContext(stain, surface, safeCard)
  const fields = collectFields(safeCard)

  // Build the set of active rules from the consolidated rule table
  // (TASK-236, lib/safety/rule-table.ts): a rule is active when ANY of its
  // `when.any` context keys is true and NONE of its `when.not` keys is true.
  // Pattern/replacement/note data lives in the table; this module owns only
  // the context detection and the scan/replace engine.
  const activeRules: ScanRule[] = FILTER_RULES.filter((def) => {
    const active = def.when.any.some((k: FilterContextKey) => ctx[k])
    const excluded = (def.when.not ?? []).some((k: FilterContextKey) => ctx[k])
    return active && !excluded
  }).map((def) => ({
    id: def.id,
    pattern: def.pattern,
    replacement: def.replacement,
    note: def.note,
    action: def.replacement === null ? ('blocked' as const) : ('replaced' as const),
  }))

  // Run every active rule against every scannable field
  for (const rule of activeRules) {
    for (const field of fields) {
      const text = field.getValue()
      if (!text) continue

      const result = scanAndReplace(text, rule, field.path, violations, field.replaceable)

      if (result.nuclear) {
        isNuclear = true
      }

      // Write back the corrected text
      if (field.replaceable && result.newText !== text) {
        field.setValue(result.newText)
      }
    }
  }

  return {
    safe: !isNuclear,
    filtered: violations.length > 0 && !isNuclear,
    violations,
    card: safeCard,
  }
}
