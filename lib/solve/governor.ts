// lib/solve/governor.ts
// TASK-236 — the result governor: deterministic post-composition constraints
// that the TASK-232 terminal gate doesn't cover. Runs on every consumer card
// inside finalizeCardForResponse, after tier sanitization and BEFORE the
// output guard, so the guard and the terminal gate always judge the governed
// text exactly as it would render.
//
// Three jobs, all table-driven from lib/safety/rule-table.ts:
//   1. GOV-REPEAT — strip unlimited-attempt language ("repeat until it
//      lifts", "keep trying") clause-by-clause; steps that empty out are
//      dropped.
//   2. GOV-CONF — soften confidence overstatements ("will remove",
//      "guaranteed") to calibrated phrasing instead of failing the card.
//   3. GOV-BUDGET — derive a risk tier from session evidence and trim
//      positive DIY-action steps that exceed the tier's effort budget.
//      Red-tier cards are left to the terminal gate (it replaces them
//      outright); if a card can't be trimmed under budget it fails closed.

import type { SessionEvidence } from './session-evidence'
import {
  AGITATION_TOKEN_RE,
  EFFORT_BUDGET,
  HEAT_APPLY_RE,
  HEAT_IMPERATIVE_RE,
  HEAT_INSTRUCTION_TOKEN_RE,
  INSTRUCT_VERB_RE,
  MIX_PRODUCT_RE,
  MIX_TOKEN_RE,
  NEGATION_RE,
  OVERPROMISE_SOFTENERS,
  REPEAT_LANGUAGE_RULES,
  countPositiveDiyClauses,
  firstPositiveDiyClause,
  type RiskTier,
} from '../safety/rule-table'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Card = any

export interface GovernorResult {
  card: Card
  /** Stable rule IDs that fired, with a short detail each. */
  applied: Array<{ rule: string; detail: string }>
  riskTier: RiskTier
  /** Card exceeded its effort budget and could not be trimmed under it. */
  failClosed: boolean
}

// Runtime risk tier from session evidence. Red comes from the caller's
// firedRedCells result (the terminal gate owns those conditions); orange is
// any uncertainty signal that justifies capping effort at one action.
export function deriveRiskTier(ev: SessionEvidence, redCellReasons: string[]): RiskTier {
  if (redCellReasons.length > 0) return 'red'
  if (
    ev.unknownFabric ||
    ev.unknownCare ||
    ev.unknownColorfastness ||
    ev.valuableItem ||
    ev.liningOrAcetate ||
    ev.solventRiskStain ||
    ev.orangeStainClass ||
    ev.limitedSupplies ||
    ev.directHazardQuestion !== null
  ) {
    return 'orange'
  }
  return 'yellow'
}

// Walk every string field of the card (except internal keys) and apply fn.
function mapCardStrings(value: unknown, fn: (s: string) => string): unknown {
  if (typeof value === 'string') return fn(value)
  if (Array.isArray(value)) return value.map((v) => mapCardStrings(v, fn))
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [k, k.startsWith('_') ? v : mapCardStrings(v, fn)]),
  )
}

function tidy(s: string): string {
  return s
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.;!?,])/g, '$1')
    .replace(/\(\s*\)/g, '')
    .trim()
}

// NOTE: `detail` must NEVER carry the matched text — _governor metadata is
// serialized onto the card, and echoing a stripped phrase ("repeat until…")
// would re-introduce the banned language to the rendered JSON the release
// gate scans. Counts only.

function scrubRepeatLanguage(card: Card, applied: GovernorResult['applied']): Card {
  const hits = new Map<string, number>()
  const next = mapCardStrings(card, (s) => {
    let out = s
    for (const { id, re } of REPEAT_LANGUAGE_RULES) {
      // Prohibition-aware (codex-review P2 round 2): "Never repeat home
      // chemistry" is a STOP warning and must survive intact — only strip a
      // match when no negation governs its clause.
      const fresh = new RegExp(re.source, re.flags)
      let m: RegExpExecArray | null
      let stripped = out
      let offset = 0
      while ((m = fresh.exec(out)) !== null) {
        const before = out.slice(Math.max(0, m.index - 80), m.index)
        const leftBoundary = Math.max(
          before.lastIndexOf('.'),
          before.lastIndexOf(';'),
          before.lastIndexOf('!'),
          before.lastIndexOf('?'),
          before.lastIndexOf('\n'),
          before.lastIndexOf(','),
        )
        if (NEGATION_RE.test(before.slice(leftBoundary + 1))) continue
        hits.set(id, (hits.get(id) ?? 0) + 1)
        stripped = stripped.slice(0, m.index - offset) + stripped.slice(m.index - offset + m[0].length)
        offset += m[0].length
      }
      out = stripped
    }
    return out === s ? s : tidy(out)
  })
  for (const [rule, n] of hits) applied.push({ rule, detail: `removed open-ended retry phrasing (${n})` })
  return dropEmptySteps(next as Card)
}

// GOV-HEAT-1 — drop sentences that positively instruct heat (iron, hot water,
// dryer, steam). GONR core rule: no heat until the stain is fully out — and
// every consumer card already carries that warning in firstAid, so a heat
// instruction in the steps is both unsafe and self-contradicting. Negated
// warnings ("do not iron", "no hot water") survive.
function scrubHeatInstructions(card: Card, applied: GovernorResult['applied']): Card {
  let dropped = 0
  const next = mapCardStrings(card, (s) => {
    if (!HEAT_INSTRUCTION_TOKEN_RE.test(s) && !/\bheat\b/i.test(s)) return s
    const sentences = s.split(/(?<=[.;!?])\s+/)
    const kept = sentences.filter((sentence) => {
      // Negation is CLAUSE-scoped (codex-review P2): "Do not iron, then
      // tumble dry on high." must still drop — an earlier "do not" in the
      // same sentence cannot launder a later positive heat instruction.
      // Instruction-shaped only (codex-review P2 round 2): warnings like
      // "dryer heat sets the stain" survive — the instruct verb must be a
      // SEPARATE word from the heat token, or the clause must be an
      // imperative heat phrase / "apply … heat".
      const positiveHeat = sentence.split(/,|;|\bthen\b|\band\b/i).some((clause) => {
        if (NEGATION_RE.test(clause)) return false
        if (HEAT_IMPERATIVE_RE.test(clause) || HEAT_APPLY_RE.test(clause)) return true
        if (!HEAT_INSTRUCTION_TOKEN_RE.test(clause)) return false
        const withoutTokens = clause.replace(new RegExp(HEAT_INSTRUCTION_TOKEN_RE.source, 'gi'), '~')
        return INSTRUCT_VERB_RE.test(withoutTokens)
      })
      if (positiveHeat) dropped++
      return !positiveHeat
    })
    return kept.length === sentences.length ? s : tidy(kept.join(' '))
  })
  if (dropped > 0) {
    applied.push({ rule: 'GOV-HEAT-1', detail: `removed ${dropped} heat-class sentence${dropped === 1 ? '' : 's'}` })
  }
  return dropEmptySteps(next as Card)
}

// GOV-AGITATE-1 — positive scrub/rub INSTRUCTIONS become 'blot'. RULE-11
// generalized beyond tannin: blot-don't-rub is universal consumer doctrine.
// Instruction-shaped only (codex-review P2 round 2): the token must sit in
// imperative position (clause start, optionally after and/then + an adverb)
// and take an object — explanatory warnings ("Rubbing pushes ink deeper",
// "rubbing can spread the stain") and negated warnings survive untouched.
const AGITATE_PRE_RE = /^\s*(?:(?:and|then|or)\s+)?(?:gently\s+|lightly\s+|carefully\s+)?$/i
const AGITATE_POST_RE = /^\s+(?:the|it|them|your|a|an|gently|lightly|carefully|with|in|into|on|onto|using|until|for)\b/i
function scrubAgitation(card: Card, applied: GovernorResult['applied']): Card {
  let replaced = 0
  const next = mapCardStrings(card, (s) => {
    const re = new RegExp(AGITATION_TOKEN_RE.source, AGITATION_TOKEN_RE.flags)
    let out = ''
    let last = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(s)) !== null) {
      const before = s.slice(Math.max(0, m.index - 80), m.index)
      const leftBoundary = Math.max(
        before.lastIndexOf('.'),
        before.lastIndexOf(';'),
        before.lastIndexOf('!'),
        before.lastIndexOf('?'),
        before.lastIndexOf('\n'),
        before.lastIndexOf(','),
      )
      const clausePre = before.slice(leftBoundary + 1)
      const post = s.slice(m.index + m[0].length, m.index + m[0].length + 20)
      // Instruction-shaped: token in imperative position, OR a separate
      // instruct verb earlier in the clause drives it ("Use a soft brush to
      // scrub the stain" — codex-review P1). Explanatory warnings ("Rubbing
      // pushes ink deeper") have neither and survive. Comparison phrasing
      // ("blot instead of rubbing", "rather than rubbing") is a no-rub
      // warning, not an instruction (codex-review P2 round 3).
      const comparison = /(?:instead\s+of|rather\s+than|not\s+by)\s*$/i.test(clausePre)
      const imperative = AGITATE_PRE_RE.test(clausePre) || INSTRUCT_VERB_RE.test(clausePre)
      const instructionShaped = imperative && !comparison && AGITATE_POST_RE.test(post)
      out += s.slice(last, m.index)
      if (!instructionShaped || NEGATION_RE.test(clausePre)) {
        out += m[0]
      } else {
        out += /ing$/i.test(m[0]) ? 'blotting' : 'blot'
        replaced++
      }
      last = m.index + m[0].length
    }
    out += s.slice(last)
    return out
  })
  if (replaced > 0) {
    applied.push({ rule: 'GOV-AGITATE-1', detail: `softened ${replaced} agitation step${replaced === 1 ? '' : 's'} to blot` })
  }
  return next as Card
}

// GOV-COMBO-1 — drop sentences positively instructing a product mix/combination
// (bleach mixes already hard-block in the guard; this covers the
// detergent+vinegar class). Negated "never mix…" warnings survive.
function scrubMixInstructions(card: Card, applied: GovernorResult['applied']): Card {
  let dropped = 0
  const next = mapCardStrings(card, (s) => {
    if (!MIX_TOKEN_RE.test(s)) return s
    const sentences = s.split(/(?<=[.;!?])\s+/)
    const kept = sentences.filter((sentence) => {
      const positiveMix = sentence
        .split(/,|;|\bthen\b/i)
        .some((clause) => MIX_TOKEN_RE.test(clause) && MIX_PRODUCT_RE.test(clause) && !NEGATION_RE.test(clause))
      if (positiveMix) dropped++
      return !positiveMix
    })
    return kept.length === sentences.length ? s : tidy(kept.join(' '))
  })
  if (dropped > 0) {
    applied.push({ rule: 'GOV-COMBO-1', detail: `removed ${dropped} combination sentence${dropped === 1 ? '' : 's'}` })
  }
  return dropEmptySteps(next as Card)
}

function softenOverpromise(card: Card, applied: GovernorResult['applied']): Card {
  const hits = new Map<string, number>()
  const next = mapCardStrings(card, (s) => {
    let out = s
    for (const { id, re, replacement } of OVERPROMISE_SOFTENERS) {
      const fresh = new RegExp(re.source, re.flags)
      if (fresh.test(out)) {
        hits.set(id, (hits.get(id) ?? 0) + 1)
        out = out.replace(new RegExp(re.source, re.flags), replacement)
      }
    }
    return out === s ? s : tidy(out)
  })
  for (const [rule, n] of hits) applied.push({ rule, detail: `calibrated confidence wording (${n})` })
  return next as Card
}

// Drop steps/solutions whose instruction text was scrubbed down to nothing.
function dropEmptySteps(card: Card): Card {
  if (!card || typeof card !== 'object') return card
  if (Array.isArray(card.homeSolutions)) {
    card.homeSolutions = card.homeSolutions.filter((entry: unknown) => {
      if (typeof entry === 'string') return entry.trim().length > 0
      if (entry && typeof entry === 'object') {
        const o = entry as { instruction?: unknown }
        return typeof o.instruction !== 'string' || o.instruction.trim().length > 0
      }
      return true
    })
  }
  if (Array.isArray(card.spottingProtocol)) {
    card.spottingProtocol = card.spottingProtocol.filter((step: unknown) => {
      const o = step as { instruction?: unknown } | null
      return !o || typeof o.instruction !== 'string' || o.instruction.trim().length > 0
    })
  }
  return card
}

// Effort-budget currency: positive DIY-action clauses across the surfaces the
// release gate scans (plan steps + products + directAnswer body).
function activeClauseCount(card: Card): number {
  try {
    return countPositiveDiyClauses(
      JSON.stringify({
        homeSolutions: card?.homeSolutions,
        spottingProtocol: card?.spottingProtocol,
        products: card?.products,
        directAnswer: card?.directAnswer ? { ...card.directAnswer, question: undefined } : undefined,
      }),
    )
  } catch {
    return 0
  }
}

function entryHasPositiveDiy(entry: unknown): boolean {
  try {
    return firstPositiveDiyClause(JSON.stringify(entry)) !== null
  } catch {
    return false
  }
}

// Trim active steps from the tail until the card fits its budget. Protocol
// steps go first (they duplicate homeSolutions on AI cards), then
// homeSolutions. Steps without a positive DIY clause (pure warnings,
// stabilization, referral) are never trimmed.
function enforceEffortBudget(
  card: Card,
  budget: number,
  applied: GovernorResult['applied'],
): { card: Card; failClosed: boolean } {
  let count = activeClauseCount(card)
  if (count <= budget) return { card, failClosed: false }

  const trimmed: string[] = []
  const lists: Array<'spottingProtocol' | 'homeSolutions'> = ['spottingProtocol', 'homeSolutions']
  let guardLoops = 64
  while (count > budget && guardLoops-- > 0) {
    let removed = false
    for (const key of lists) {
      const list = card?.[key]
      if (!Array.isArray(list)) continue
      for (let i = list.length - 1; i >= 0; i--) {
        if (entryHasPositiveDiy(list[i])) {
          trimmed.push(`${key}[${i}]`)
          list.splice(i, 1)
          removed = true
          break
        }
      }
      if (removed) break
    }
    if (!removed) break
    count = activeClauseCount(card)
  }

  if (trimmed.length > 0) {
    applied.push({ rule: 'GOV-BUDGET', detail: `trimmed ${trimmed.join(', ')} to fit budget ${budget}` })
  }
  if (count > budget) {
    applied.push({ rule: 'GOV-BUDGET', detail: `fail-closed: ${count} active clauses remain over budget ${budget}` })
    return { card, failClosed: true }
  }
  return { card, failClosed: false }
}

export function applyGovernor(card: Card, ev: SessionEvidence, redCellReasons: string[]): GovernorResult {
  const applied: GovernorResult['applied'] = []
  const riskTier = deriveRiskTier(ev, redCellReasons)
  if (!card || typeof card !== 'object') {
    return { card, applied, riskTier, failClosed: false }
  }

  let governed = scrubRepeatLanguage(card, applied)
  governed = scrubHeatInstructions(governed, applied)
  governed = scrubAgitation(governed, applied)
  governed = scrubMixInstructions(governed, applied)
  governed = softenOverpromise(governed, applied)

  // Red-tier cards are the terminal gate's job — it replaces any active card
  // with the protect+refer downgrade. Trimming here would only mask what the
  // gate should see.
  let failClosed = false
  if (riskTier !== 'red') {
    const budget = EFFORT_BUDGET[riskTier]
    const res = enforceEffortBudget(governed, budget, applied)
    governed = res.card
    failClosed = res.failClosed
  }

  return { card: governed, applied, riskTier, failClosed }
}
