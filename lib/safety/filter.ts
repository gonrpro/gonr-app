// lib/safety/filter.ts
// GONR Safety Filter — rules-based safety check for AI-generated protocol cards
// Pure function, no I/O, <1ms execution

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
  whyThisWorks: 'Some stain/material combinations carry risk of permanent damage if the wrong agent is used. A professional assessment ensures the right treatment.',
  spottingProtocol: [
    { step: 1, instruction: 'Do not attempt to treat this stain yourself.' },
    { step: 2, instruction: 'Take the item to a professional cleaner as soon as possible.' },
    { step: 3, instruction: 'Describe the stain type and how long ago it occurred.' },
    { step: 4, instruction: 'Do not apply any household products — they may set the stain permanently.' },
  ],
  materialWarnings: ['Professional assessment required for this combination.'],
  escalation: 'Take to a professional cleaner immediately. Do not attempt home treatment.',
  _safetyBlocked: true,
  meta: { stainCanonical: '', surfaceCanonical: '', tier: 'safety-blocked' },
}

// ---------------------------------------------------------------------------
// Surface / stain context detectors
// ---------------------------------------------------------------------------

function detectContext(stain: string, surface: string, card: any) {
  const surfaceText = (surface + ' ' + (card.title || '')).toLowerCase()
  const stainText = stain.toLowerCase()

  return {
    isSilk: /\bsilk\b/i.test(surfaceText),
    isWool: /\bwool\b|\bcashmere\b|\bmerino\b/i.test(surfaceText),
    isMarble: /\bmarble\b|\blimestone\b|\btravertine\b/i.test(surfaceText),
    isAcetate: /\bacetate\b|\btriacetate\b/i.test(surfaceText),
    isProtein: /\bblood\b|\burine\b|\bsweat\b|\begg\b|\bmilk\b|\bvomit\b/i.test(stainText),
    isWood: /\bwood\b|\bhardwood\b/i.test(surfaceText),
    isLeather: /\bleather\b/i.test(surface) && !/faux|vegan|pleather/i.test(surface),
  }
}

// ---------------------------------------------------------------------------
// Warning-context check
// If the 120 chars before the matched term contain a negation, it's a warning
// about the substance, not a recommendation. Skip the violation.
// ---------------------------------------------------------------------------

function isWarningContext(text: string, matchIndex: number): boolean {
  const lookback = text.slice(Math.max(0, matchIndex - 120), matchIndex).toLowerCase()
  return /\b(never|do not|avoid|don't|not recommended|not safe|harmful|dangerous)\b/.test(lookback)
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

  // homeSolutions (array of strings)
  const home: string[] = Array.isArray(card.homeSolutions) ? card.homeSolutions : []
  for (let i = 0; i < home.length; i++) {
    if (typeof home[i] === 'string') {
      fields.push({
        path: `homeSolutions[${i}]`,
        getValue: () => home[i],
        setValue: (v: string) => { home[i] = v },
        replaceable: true,
      })
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

    // Skip if the term is used in a warning context
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

  // Build the set of active rules based on context
  const activeRules: ScanRule[] = []

  // RULE 1: Hot water on protein stains (REPLACE)
  if (ctx.isProtein) {
    activeRules.push({
      id: 'RULE-1: Hot water on protein stain',
      pattern: /\b(hot water|warm water|boiling water)\b/gi,
      replacement: 'cold water',
      note: '[cold water only — heat permanently sets protein]',
      action: 'replaced',
    })
  }

  // RULE 2: Enzymes on silk or wool (REPLACE)
  if (ctx.isSilk || ctx.isWool) {
    activeRules.push({
      id: 'RULE-2: Enzyme on silk/wool',
      pattern: /\b(enzyme|protease|enzymatic|biological detergent|OxiClean)\b/gi,
      replacement: 'pH-neutral protein spotter',
      action: 'replaced',
    })
  }

  // RULE 3: Acid on marble (BLOCK)
  if (ctx.isMarble) {
    activeRules.push({
      id: 'RULE-3: Acid on marble/limestone',
      pattern: /\b(vinegar|citric acid|lemon juice|CLR|muriatic acid|oxalic acid)\b/gi,
      replacement: null, // nuclear
      action: 'blocked',
    })
  }

  // RULE 4: Acetone on acetate (BLOCK)
  if (ctx.isAcetate) {
    activeRules.push({
      id: 'RULE-4: Acetone on acetate',
      pattern: /\b(acetone|nail polish remover)\b/gi,
      replacement: null, // nuclear
      action: 'blocked',
    })
  }

  // RULE 5: Chlorine bleach on silk/wool (REPLACE)
  if (ctx.isSilk || ctx.isWool) {
    activeRules.push({
      id: 'RULE-5: Chlorine bleach on silk/wool',
      pattern: /\b(chlorine bleach|sodium hypochlorite|clorox)\b/gi,
      replacement: 'oxygen-based cleaner (not chlorine)',
      action: 'replaced',
    })
  }

  // RULE 7: H2O2 + ammonia on silk (BLOCK)
  // Hydrogen peroxide and ammonia both destroy silk fiber protein.
  // S1 safety-critical: blood on silk must use cold water + NSD only.
  if (ctx.isSilk) {
    activeRules.push({
      id: 'RULE-7: Hydrogen peroxide on silk',
      pattern: /\b(hydrogen peroxide|h2o2|h₂o₂|peroxide)\b/gi,
      replacement: null, // nuclear — block entire response
      action: 'blocked',
    })
    activeRules.push({
      id: 'RULE-8: Ammonia on silk',
      pattern: /\b(ammonia|ammonium hydroxide)\b/gi,
      replacement: null, // nuclear — block entire response
      action: 'blocked',
    })
  }

  // RULE 6: Flood/saturate wood (REPLACE)
  if (ctx.isWood) {
    activeRules.push({
      id: 'RULE-6: Saturate wood',
      pattern: /\b(soak|saturate|flood|submerge)\b/gi,
      replacement: 'apply sparingly',
      action: 'replaced',
    })
  }

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
