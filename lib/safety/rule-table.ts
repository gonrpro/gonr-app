// lib/safety/rule-table.ts
// TASK-236 — the single source of truth for deterministic consumer-safety
// rules. Every stop, refusal, replacement, downgrade, scrub, or trim that the
// /api/solve pipeline applies to a consumer card resolves to a stable rule ID
// defined in this file, and (where the rule is data-shaped) the rule's
// pattern/action data lives here too.
//
// Executors stay where they always ran — lib/safety/filter.ts,
// lib/solve/terminal-safety-gate.ts, lib/solve/consumer-output-guard.ts,
// lib/solve/governor.ts — but their rule DEFINITIONS are imported from this
// table. To change a deterministic consumer-safety rule, edit this file (plus
// the matching eval case) — not the executor.
//
// ID conventions (kept exactly as the runtime emits them, for traceability):
//   RULE-*  chemistry safety-filter rules (replace/block on card text)
//   HR-*    pre-AI hard refusals (deterministic refusal card)
//   RC ids  terminal-gate red cells — bare reason codes ('heat-already-applied')
//   forbidden-term:* / unsafe-chemistry:*  output-guard blocks
//   GOV-*   governor rules (repeat-language scrub, overpromise softener,
//           effort-budget trim)
//   DQ-*    direct hazard questions answered deterministically

// ---------------------------------------------------------------------------
// Shared safety lexicon
// ---------------------------------------------------------------------------
// One definition for "what counts as a DIY action instruction" and "what
// counts as negation", used by the governor, the terminal-gate downgrade
// builder, and tests. Mirrors the TASK-235 assessor lexicon
// (scripts/evals/assess-case.ts) so the engine constrains itself with the
// same ruler the release gate measures with. The assessor keeps its own copy
// on purpose — the measuring stick must not move when the engine is edited —
// and __tests__/task-236-governor.test.ts locks the two in sync.

export const NEGATION_RE = /\b(?:never|don'?t|do\s+not|avoid|must\s+not|no|skip)\b/i
export const DIY_ACTION_SOURCE =
  '\\b(?:freeze|scrape|lift|brush|rub|scrub|apply|use|add|dab|pour|soak|wash|launder|rinse|flush|spray|sponge|treat|mix|iron|steam|wipe)\\b'
// Mirrors the assessor's INSTRUCT verbs. Heat words are NOT verbs here —
// "Heat sets the pigment" is a warning, not an instruction (codex-review P2);
// imperative heat phrasings ("Steam the area") are matched separately by
// HEAT_IMPERATIVE_RE.
export const INSTRUCT_VERB_RE =
  /\b(?:use|apply|try|add|dab|pour|soak|wash|rinse|flush|treat|scrub|rub|brush|scrape|iron|tumble|put|mix|dry|wipe)\b/i
// Imperative-shaped heat instruction: a heat verb opening the clause and
// taking an object or duration ("Steam the area", "Iron for 10 seconds",
// "Heat-dry the item") — codex-review P1: duration/adverb forms included.
export const HEAT_IMPERATIVE_RE =
  /^\s*["“”']?(?:steam|iron|heat(?:[-\s]?dry)?|boil|microwave|blow[-\s]?dry|tumble[-\s]?dry)\s+(?:the|it|them|your|a|an|on|over|in|directly|for|gently|lightly|briefly|until)\b/i
// GOV-HEAT-1 — heat application tokens. A sentence positively instructing one
// of these is dropped from consumer cards (GONR core rule: no heat until the
// stain is fully out); negated warnings survive. Standalone "dryer" included
// (codex-review P2: "Put it in the dryer" must not bypass).
// Bare "heat" deliberately NOT a token (codex-review P2): heat-set WARNINGS
// ("Heat sets turmeric pigment", "dryer heat sets the stain") are required
// consumer copy. "apply/use/add … heat" is caught by HEAT_APPLY_RE below.
export const HEAT_INSTRUCTION_TOKEN_RE =
  /\b(?:iron(?:ing)?|hot\s+water|boiling\s+water|tumble[-\s]dry(?:er|ing)?|machine[-\s]dry(?:er|ing)?|(?:hair\s*|clothes\s+)?dryer|steam(?:er|ing)?|heat[-\s]dry(?:ing)?)\b/i
export const HEAT_APPLY_RE = /\b(?:apply|use|add)\b[^,;.!?\n]{0,20}\bheat\b/i
// GOV-AGITATE-1 — positive scrub/rub instructions become 'blot' (RULE-11
// generalized beyond tannin: blot-don't-rub is universal GONR consumer
// doctrine and firstAid already says "Do not rub" on every card).
// Negative lookahead: "rubbing alcohol" is a solvent NAME, not an agitation
// instruction — it must never become "blotting alcohol".
export const AGITATION_TOKEN_RE = /\b(?:scrubbing|scrub|rubbing(?!\s+alcohol)|rub(?!bing))\b/gi
// GOV-COMBO-1 — sentences positively instructing product mixing are dropped
// (the guard hard-blocks bleach mixes; this covers detergent+vinegar-style
// combinations the suite bans as multi-product advice).
export const MIX_TOKEN_RE = /\b(?:mix(?:ing)?|combine)\b/i
// Product-noun list mirrors the release-gate assessor's productToken set
// (minus water) so no combo phrasing class survives the scrub but trips the
// gate (EV-078 flake class, 2026-06-11).
export const MIX_PRODUCT_RE =
  /\b(?:detergent|soap|vinegar|peroxide|alcohol|ammonia|cleaners?|chemicals?|solution|spotter|stain\s+remover|gel|spray|solvent|acetone|products?)\b/i
// Verb-less product pairing ("dab with soap and vinegar") is multi-product
// advice too — mirrors the release-gate assessor's pair branch. 'water' and
// 'solution' are deliberately NOT pair members so "detergent solution" and
// "soap and water" single-product phrasings survive.
export const MIX_PRODUCT_PAIR_RE =
  /\b(?:detergent|soap|vinegar|peroxide|alcohol|ammonia|cleaners?|chemicals?|spotter|stain\s+remover|gel|spray|solvent|acetone|bleach)\b[^.;\n]{0,40}\b(?:with|and|plus)\b[^.;\n]{0,40}\b(?:detergent|soap|vinegar|peroxide|alcohol|ammonia|cleaners?|chemicals?|spotter|stain\s+remover|gel|spray|solvent|acetone|bleach)\b/i
// GOV-ATTEMPT-1 — every consumer card carries the one-attempt stop line.
export const ONE_ATTEMPT_LINE =
  'One attempt at most — if the stain has not shifted after the first try, stop and let a professional take over.'

// The ONLY sanctioned post-exposure rinse wording for consumer cards. The
// release-gate assessor scrubs exactly this conditional shape before scanning
// for active treatment; any other rinse phrasing on a protect card reads as
// an instruction. (TASK-235 acceptance hardening.)
export const SANCTIONED_STOP_WORDING =
  'plain cool water on that spot, nothing else, then stop'

// Find the first clause that gives a positive (non-negated) DIY action
// instruction. Clause boundaries mirror the assessor: sentence punctuation,
// newline, comma, and JSON string boundaries.
export function firstPositiveDiyClause(text: string): string | null {
  const re = new RegExp(DIY_ACTION_SOURCE, 'gi')
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const before = text.slice(Math.max(0, m.index - 80), m.index)
    const after = text.slice(m.index, m.index + 80)
    const leftBoundary = Math.max(
      before.lastIndexOf('.'),
      before.lastIndexOf(';'),
      before.lastIndexOf('!'),
      before.lastIndexOf('?'),
      before.lastIndexOf('\n'),
      before.lastIndexOf(','),
      before.lastIndexOf('","'),
    )
    const localClause = before.slice(leftBoundary + 1) + after
    if (NEGATION_RE.test(localClause)) continue
    return localClause.trim().slice(0, 90)
  }
  return null
}

// Count distinct positive DIY-action clauses — the effort-budget currency.
export function countPositiveDiyClauses(text: string): number {
  const re = new RegExp(DIY_ACTION_SOURCE, 'gi')
  const clauses = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const before = text.slice(Math.max(0, m.index - 80), m.index)
    const after = text.slice(m.index, m.index + 80)
    const leftBoundary = Math.max(
      before.lastIndexOf('.'),
      before.lastIndexOf(';'),
      before.lastIndexOf('!'),
      before.lastIndexOf('?'),
      before.lastIndexOf('\n'),
      before.lastIndexOf(','),
      before.lastIndexOf('","'),
    )
    const localClause = (before.slice(leftBoundary + 1) + after).trim().slice(0, 120)
    if (NEGATION_RE.test(localClause)) continue
    clauses.add(localClause)
  }
  return clauses.size
}

// ---------------------------------------------------------------------------
// Risk tiers + effort budgets (GOV-BUDGET)
// ---------------------------------------------------------------------------
// Runtime risk tiers are derived from session evidence (governor.ts). The
// budget is the maximum number of positive DIY-action clauses a consumer card
// may carry in that state. Red is 0 because the terminal gate replaces any
// active card outright; orange allows one minimal action; the default ceiling
// matches the eval suite's global maximum (>4 actions fails every case).

export type RiskTier = 'red' | 'orange' | 'yellow' | 'green'

// Calibrated to the encyclopedia suite's assertion semantics (budget N ⇒
// at most N-1 counted action clauses; ≤1 ⇒ protect-only): orange is
// protect-only, the default consumer ceiling is 2 — one focused attempt
// plus its companion step, never an escalation ladder.
export const EFFORT_BUDGET: Record<RiskTier, number> = {
  red: 0,
  orange: 0,
  yellow: 2,
  green: 4,
}

// ---------------------------------------------------------------------------
// Safety-filter chemistry rules (executor: lib/safety/filter.ts)
// ---------------------------------------------------------------------------

export type FilterContextKey =
  | 'isSilk'
  | 'isWool'
  | 'isMarble'
  | 'isAcetate'
  | 'isProtein'
  | 'isWood'
  | 'isLeather'
  | 'isAnilineLeather'
  | 'isAlcantara'
  | 'isTannin'

export interface FilterRuleDef {
  id: string
  /** Rule is active when ANY `any` key is true and NO `not` key is true. */
  when: { any: FilterContextKey[]; not?: FilterContextKey[] }
  pattern: RegExp
  replacement: string | null // null = BLOCK (nuclear)
  note?: string
  evalCases?: string[]
}

// Patterns ported verbatim from lib/safety/filter.ts (TASK-218/229b lineage —
// Spanish synonyms, note-must-not-restate-banned-phrase discipline, etc.).
export const FILTER_RULES: FilterRuleDef[] = [
  {
    id: 'RULE-1: Heat on protein stain',
    when: { any: ['isProtein'] },
    pattern: /\b(hot water|warm water|boiling water|steam(?:er|ing|\s+gun|\s+wand)?|heated water|elevated temperature|agua caliente|agua tibia|agua templada|agua hirviendo|vapor(?:izador|izar)?)\b/gi,
    replacement: 'cold water',
    note: '[cold water only — heat permanently sets protein]',
  },
  {
    id: 'RULE-1b: Warm/heated agent on protein stain',
    when: { any: ['isProtein'] },
    pattern: /\b(warm|heated|hot)\b(?=\s+(?!water\b)[a-z][a-z-]+)/gi,
    replacement: 'cool',
  },
  {
    id: 'RULE-1c: Laundering before protein removal',
    when: { any: ['isProtein'] },
    pattern: /\b(launder(?:ing|ed)?|washing machine|clothes dryer|tumble dryer|tumble dry|dry cycle|wash cycle)\b/gi,
    replacement: 'cold-water hand treatment (do not launder until stain is gone)',
    note: '[no heat-based laundering until the stain is gone]',
  },
  {
    id: 'RULE-2: Enzyme on wool',
    when: { any: ['isWool'], not: ['isSilk'] },
    pattern: /\b(enzyme|protease|enzymatic|biological detergent|OxiClean)\b/gi,
    replacement: 'pH-neutral protein spotter',
  },
  {
    id: 'RULE-12: Hot water on wool',
    when: { any: ['isWool'] },
    pattern: /\b(hot water|boiling water|agua caliente|agua hirviendo)\b/gi,
    replacement: 'cool water',
    note: '[cool water only — heat felts and shrinks wool-class fibers]',
    evalCases: ['G3'],
  },
  {
    id: 'RULE-2S: Enzyme/protein spotter on silk',
    when: { any: ['isSilk'] },
    pattern: /\b(enzyme|protease|enzymatic|biological detergent|protein spotter|protein formula|protein solution|digestant|digestive|enzima|proteasa|enzim[áa]tico|detergente biol[óo]gico|quitamanchas proteico|f[óo]rmula proteica|digestante)\b/gi,
    replacement: null,
  },
  {
    id: 'RULE-13: Alkali on tannin stain',
    when: { any: ['isTannin'] },
    pattern: /\b(ammonia|ammonium hydroxide|sodium carbonate|sodium hydroxide|lye|caustic soda|washing soda|borax|baking soda|sodium bicarbonate|potassium hydroxide|amon[ií]aco|hidr[óo]xido de amonio|carbonato (?:de sodio|s[óo]dico)|hidr[óo]xido de sodio|sosa c[áa]ustica|soda c[áa]ustica|b[óo]rax|bicarbonato (?:de sodio|s[óo]dico)|hidr[óo]xido de potasio|potasa c[áa]ustica)\b/gi,
    replacement: null,
  },
  {
    id: 'RULE-13b: Alkaline agent on tannin stain',
    when: { any: ['isTannin'] },
    pattern: /\b(?:alkaline|alcalin[oa])\s+(?:detergent|solution|cleaner|spotter|agent|rinse|bath|formula|product|detergente|soluci[óo]n|limpiador|agente|enjuague|producto)\b/gi,
    replacement: null,
  },
  {
    id: 'RULE-3: Acid on marble/limestone',
    when: { any: ['isMarble'] },
    pattern: /\b(vinegar|citric acid|lemon juice|CLR|muriatic acid|oxalic acid|vinagre|[áa]cido c[íi]trico|jugo de lim[óo]n|zumo de lim[óo]n|[áa]cido muri[áa]tico|[áa]cido ox[áa]lico)\b/gi,
    replacement: null,
  },
  {
    id: 'RULE-4: Acetone on acetate',
    when: { any: ['isAcetate'] },
    pattern: /\b(acetone|nail polish remover|acetona|quitaesmalte|removedor de esmalte)\b/gi,
    replacement: null,
    evalCases: ['EV-104'],
  },
  {
    id: 'RULE-5: Chlorine bleach on silk/wool',
    when: { any: ['isSilk', 'isWool'] },
    pattern: /\b(chlorine bleach|sodium hypochlorite|clorox|lej[ií]a|cloro|hipoclorito de sodio|blanqueador con cloro)\b/gi,
    replacement: 'oxygen-based cleaner (not chlorine)',
  },
  {
    id: 'RULE-7: Hydrogen peroxide on silk',
    when: { any: ['isSilk'] },
    pattern: /\b(hydrogen peroxide|h2o2|h₂o₂|peroxide|per[óo]xido de hidr[óo]geno|agua oxigenada|per[óo]xido)\b/gi,
    replacement: null,
  },
  {
    id: 'RULE-8: Ammonia on silk',
    when: { any: ['isSilk'] },
    pattern: /\b(ammonia|ammonium hydroxide|amon[ií]aco|hidr[óo]xido de amonio)\b/gi,
    replacement: null,
  },
  {
    id: 'RULE-9: Dish soap on aniline leather',
    when: { any: ['isAnilineLeather'] },
    pattern: /\b(dish soap|dishwashing liquid|dawn|dish detergent)\b/gi,
    replacement: 'leather-safe cleaner',
    note: '[aniline leather only — degreasing detergents strip oils and damage the finish]',
    evalCases: ['S5'],
  },
  {
    id: 'RULE-9b: Solvents on aniline leather',
    when: { any: ['isAnilineLeather'] },
    pattern: /\b(acetone|isopropanol|isopropyl alcohol|rubbing alcohol|petroleum solvent|mineral spirits)\b/gi,
    replacement: 'leather-safe cleaner',
    note: '[aniline leather — solvents pull dye permanently]',
  },
  {
    id: 'RULE-10: Solvents on Alcantara',
    when: { any: ['isAlcantara'] },
    pattern: /\b(acetone|petroleum solvent|mineral spirits|dry cleaning solvent|rubbing alcohol|isopropyl alcohol|isopropanol|ethanol|steam(?:er|ing|\s+gun)?|acetona|solvente de petr[óo]leo|alcohol isoprop[ií]lico|etanol|vapor(?:izador|izar)?)\b/gi,
    replacement: 'water-based cleaner',
    note: '[Alcantara — use water-based cleaners only; solvents dissolve the polyurethane binder]',
  },
  {
    id: 'RULE-11: Rub/scrub on tannin',
    when: { any: ['isTannin'] },
    pattern: /\b(rub|scrub|rubbing|scrubbing|frotar|restriegar|restregar|tallar)\b/gi,
    replacement: 'blot',
    note: '[blot — never rub tannin stains; rubbing spreads and sets them]',
  },
  {
    id: 'RULE-6: Saturate wood',
    when: { any: ['isWood'] },
    pattern: /\b(soak|saturate|flood|submerge)\b/gi,
    replacement: 'apply sparingly',
  },
]

// ---------------------------------------------------------------------------
// Output-guard term rules (executor: lib/solve/consumer-output-guard.ts)
// ---------------------------------------------------------------------------

// Pro/internal terms that must never reach a consumer screen — ANY occurrence
// blocks (even inside a warning), because these reveal internal sources.
// Word-boundary regexes so short trade acronyms don't false-positive.
// Extend the TASK-231 test list before extending this.
export const FORBIDDEN_CONSUMER_TERMS: ReadonlyArray<{ id: string; re: RegExp }> = [
  { id: 'jerrys-house-rules', re: /jerry'?s\s+cleaners/i },
  { id: 'house-rules', re: /house\s+rules/i },
  { id: 'spotter-ref', re: /\bspotter\b\s*(?:→|->)?\s*/i },
  { id: 'bleaching-guide', re: /bleaching\s+guide/i },
  { id: 'bongo', re: /\bbongo\b/i },
  { id: 'streetan', re: /\bstreetan\b/i },
  { id: 'streepro', re: /\bstreepro\b/i },
  { id: 'mulsolite', re: /\bmulsolite\b/i },
  { id: 'pyratex', re: /\bpyratex\b/i },
  // "General Formula No. 209" is the spelling used throughout the pro corpus;
  // the bare "formula 209" form alone missed it.
  { id: 'formula-209', re: /(?:general\s+)?formula\s*(?:no\.?\s*)?209/i },
  { id: 'pog', re: /\bPOG\b/ },
  { id: 'vds', re: /\bVDS\b/ },
  { id: 'nsd', re: /\bNSD\b/ },
  { id: 'acetic-acid', re: /acetic\s+acid|28%\s*acetic/i },
  { id: 'amyl-acetate', re: /amyl\s+acetate/i },
  { id: 'steam-gun', re: /steam\s+gun/i },
  { id: 'sodium-hydrosulfite', re: /sodium\s+hydrosul(?:ph|f)ite/i },
  { id: 'titanium-sulfate', re: /titanium\s+sulfate/i },
  { id: 'bleach-vinegar-neutralization', re: /neutrali[sz]e\s+(?:residual\s+)?(?:the\s+)?bleach\s+with\s+vinegar/i },
]

// TASK-236 — unsafe chemistry BEYOND the trade-term list: household/garage
// products that AI or template text could plausibly recommend but that have
// no safe consumer use on textiles. Unlike FORBIDDEN_CONSUMER_TERMS these
// block only when POSITIVELY INSTRUCTED — "never use oven cleaner" is
// legitimate warning copy. Gray-zone folk remedies (WD-40, hairspray) are
// NOT listed pending an SB doctrine line — see artifacts/task-236.
export const UNSAFE_CONSUMER_CHEMISTRY: ReadonlyArray<{ id: string; re: RegExp }> = [
  { id: 'gasoline', re: /\bgasoline\b|\bpetrol\b/i },
  { id: 'kerosene', re: /\bkerosene\b/i },
  { id: 'lighter-fluid', re: /\blighter\s+fluid\b/i },
  { id: 'brake-fluid', re: /\bbrake\s+fluid\b/i },
  { id: 'oven-cleaner', re: /\boven\s+cleaner\b/i },
  { id: 'drain-cleaner', re: /\bdrain\s+(?:cleaner|opener)\b/i },
  { id: 'lye', re: /\blye\b|\bcaustic\s+soda\b|\bsodium\s+hydroxide\b/i },
  { id: 'muriatic-acid', re: /\bmuriatic\s+acid\b|\bhydrochloric\s+acid\b/i },
  { id: 'sulfuric-acid', re: /\bsulfuric\s+acid\b/i },
  { id: 'tsp', re: /\btrisodium\s+phosphate\b|\bTSP\b/ },
  { id: 'turpentine', re: /\bturpentine\b/i },
  { id: 'paint-thinner', re: /\b(?:paint|lacquer)\s+thinner\b/i },
  { id: 'xylene', re: /\bxylene\b/i },
  { id: 'toluene', re: /\btoluene\b/i },
  { id: 'naphtha', re: /\bnaphtha\b/i },
  { id: 'carb-cleaner', re: /\bcarb(?:uretor)?\s+cleaner\b/i },
]

// ---------------------------------------------------------------------------
// Governor language rules (executor: lib/solve/governor.ts)
// ---------------------------------------------------------------------------

// GOV-REPEAT — unlimited-attempt language is stripped from consumer cards.
// Patterns mirror the release-gate assessor's repeat-until class; each match
// is removed to the end of its clause. ("do not launder until the stain is
// gone" deliberately survives — the assessor exempts it and it is required
// RULE-1c copy.)
export const REPEAT_LANGUAGE_RULES: ReadonlyArray<{ id: string; re: RegExp }> = [
  // ANY 'repeat …' phrasing is stripped to the end of its clause — the suite
  // bans bare repeat instructions ("Repeat with a fresh cloth"), not only
  // "repeat until" forms (EV-044).
  { id: 'GOV-RETRY-1', re: /\brepeat(?:ing)?\b[^.;!?\n"]*/gi },
  { id: 'GOV-RETRY-2', re: /\bkeep\s+(?:trying|going|applying|repeating|at\s+it)\b[^.;!?\n"]*/gi },
  { id: 'GOV-RETRY-3', re: /\b(?:again\s+and\s+again|as\s+many\s+times\s+as\s+(?:needed|necessary|it\s+takes))\b[^.;!?\n"]*/gi },
  { id: 'GOV-RETRY-4', re: /\buntil\s+(?:it\s+)?(?:lifts?|comes?\s+out|is\s+gone|disappears)\b[^.;!?\n"]*/gi },
  { id: 'GOV-RETRY-5', re: /\btry\s+again\b[^.;!?\n"]*/gi },
]

// GOV-CONF — confidence-overstatement softeners. Promising removal is both a
// credibility risk and a suite advisory failure ('overpromise'); the softener
// rewrites the claim instead of failing the card, because the surrounding
// guidance is usually sound.
export const OVERPROMISE_SOFTENERS: ReadonlyArray<{ id: string; re: RegExp; replacement: string }> = [
  { id: 'GOV-CONF-1', re: /\b(?:will|should|can|likely\s+to)\s+(?:completely\s+|fully\s+)?(?:remove|come\s+out|lift|fix|restore)\b/gi, replacement: 'may improve' },
  { id: 'GOV-CONF-2', re: /\bguaranteed?s?\b/gi, replacement: 'possible' },
  { id: 'GOV-CONF-3', re: /\bfull\s+restoration\b/gi, replacement: 'partial improvement' },
  { id: 'GOV-CONF-4', re: /\b100%\s+(?:safe|effective)\b/gi, replacement: 'lower-risk' },
]

// ---------------------------------------------------------------------------
// Master registry — every stable rule ID the pipeline can emit
// ---------------------------------------------------------------------------

export type RuleSource =
  | 'safety-filter'
  | 'hard-refuse'
  | 'terminal-gate'
  | 'output-guard'
  | 'governor'
  | 'first-aid'

export type RuleAction =
  | 'replace'
  | 'block'
  | 'refuse'
  | 'downgrade'
  | 'strip'
  | 'soften'
  | 'trim'
  | 'answer'

export interface RuleEntry {
  id: string
  source: RuleSource
  action: RuleAction
  trigger: string
  evalCases?: string[]
}

const FILTER_ENTRIES: RuleEntry[] = FILTER_RULES.map((r) => ({
  id: r.id,
  source: 'safety-filter',
  action: r.replacement === null ? 'block' : 'replace',
  trigger: `card text matches ${r.pattern.source.slice(0, 60)}… in context ${r.when.any.join('|')}${r.when.not ? ` (not ${r.when.not.join('|')})` : ''}`,
  evalCases: r.evalCases,
}))

const GUARD_ENTRIES: RuleEntry[] = [
  ...FORBIDDEN_CONSUMER_TERMS.map((t) => ({
    id: `forbidden-term:${t.id}`,
    source: 'output-guard' as const,
    action: 'block' as const,
    trigger: `pro/internal term ${t.id} anywhere in a consumer card`,
  })),
  ...UNSAFE_CONSUMER_CHEMISTRY.map((t) => ({
    id: `unsafe-chemistry:${t.id}`,
    source: 'output-guard' as const,
    action: 'block' as const,
    trigger: `positive instruction to use ${t.id} on a consumer card`,
  })),
  { id: 'unfilled-placeholder', source: 'output-guard', action: 'block', trigger: 'unexpanded template slot like [hours/days]', evalCases: ['ADV-008'] },
  { id: 'fabricated-history', source: 'output-guard', action: 'block', trigger: 'card asserts a prior treatment the request never disclosed (emitted as fabricated-history:<agent>)' },
  { id: 'bleach-mixing-instruction', source: 'output-guard', action: 'block', trigger: 'non-negated instruction to mix bleach with anything' },
  { id: 'title-too-long', source: 'output-guard', action: 'block', trigger: 'title over 90 chars' },
  { id: 'title-unbalanced-parens', source: 'output-guard', action: 'block', trigger: 'truncation artifact: unbalanced parentheses in title' },
  { id: 'title-ellipsis-truncation', source: 'output-guard', action: 'block', trigger: 'truncation artifact: trailing ellipsis fragment in title' },
  { id: 'title-double-period', source: 'output-guard', action: 'block', trigger: 'truncation artifact: double period in title' },
  { id: 'title-classifier-fragment', source: 'output-guard', action: 'block', trigger: 'raw classifier prose leaked into title' },
  { id: 'absent-step-reference', source: 'output-guard', action: 'block', trigger: 'escalation/why copy cites a chemical the steps never gave (emitted as absent-step-reference:<chem>)' },
  { id: 'unsupported-direct-recommendation', source: 'output-guard', action: 'block', trigger: 'positive instruction of chlorine bleach / ammonia / acetone' },
]

// Terminal-gate red cells. Conditions are evaluated in
// lib/solve/terminal-safety-gate.ts:firedRedCells (they need typed session
// evidence); the registry here is the canonical list — a unit test fails if
// the gate emits a reason code this table doesn't define.
const RED_CELL_ENTRIES: RuleEntry[] = [
  { id: 'unknown-stain-on-dry-clean-only', source: 'terminal-gate', action: 'downgrade', trigger: 'unknown stain + dry-clean-only', evalCases: ['EV-019'] },
  { id: 'positive-dye-transfer', source: 'terminal-gate', action: 'downgrade', trigger: 'user observed dye transfer during testing', evalCases: ['EV-061'] },
  { id: 'leather-suede-liquid', source: 'terminal-gate', action: 'downgrade', trigger: 'leather/suede + liquid or solvent risk', evalCases: ['ADV-007'] },
  { id: 'lining-acetate-risk', source: 'terminal-gate', action: 'downgrade', trigger: 'lining/acetate + unknown stain or fabric' },
  { id: 'heat-already-applied', source: 'terminal-gate', action: 'downgrade', trigger: 'heat already used on the stain (incl. rinsed-hot / hair-dried phrasings)', evalCases: ['EV-059'] },
  { id: 'hard-agitation-applied', source: 'terminal-gate', action: 'downgrade', trigger: 'hard rubbing/scrubbing already applied' },
  { id: 'prior-chemical', source: 'terminal-gate', action: 'downgrade', trigger: 'a chemical was already applied (emitted as prior-chemical:<agents>)', evalCases: ['EV-045', 'EV-046', 'EV-047'] },
  { id: 'unknown-fabric-high-stakes', source: 'terminal-gate', action: 'downgrade', trigger: 'unknown fiber + DCO or valuable item' },
  { id: 'valuable-item-uncertainty', source: 'terminal-gate', action: 'downgrade', trigger: 'valuable item + unknown stain/fabric/care' },
  // TASK-236 additions:
  { id: 'hazard-question-uncertainty', source: 'terminal-gate', action: 'downgrade', trigger: 'direct hazard question + unknown stain/fiber (or bleach question on a colored garment)', evalCases: ['EV-049', 'EV-051'] },
  { id: 'care-label-unreadable', source: 'terminal-gate', action: 'downgrade', trigger: 'care label reported blurry/unreadable — ask for retake or fiber, stabilize meanwhile', evalCases: ['EV-054'] },
  { id: 'permanence-honesty', source: 'terminal-gate', action: 'downgrade', trigger: 'permanence-class stain (permanent marker/Sharpie) — honest odds, no removal promise', evalCases: ['EV-083'] },
  { id: 'damage-repair-expectation', source: 'terminal-gate', action: 'downgrade', trigger: 'fiber damage, not a stain (shrunk/felted/color loss/bleach spot) — honest limits', evalCases: ['EV-092', 'EV-093'] },
  { id: 'delicate-water-sensitive-fiber', source: 'terminal-gate', action: 'downgrade', trigger: 'rayon/viscose — water-spots and rings; suite doctrine protect-only (SB review flagged)', evalCases: ['EV-014', 'EV-059', 'EV-090'] },
  { id: 'delicate-fiber-construction', source: 'terminal-gate', action: 'downgrade', trigger: 'couture veto class: silk/wool-class (cashmere/merino/angora/mohair, per SB verdict REQUIRE_VETO_EXTENSION 2026-06-11)/velvet/satin/embellished/structured/vintage — protect-only', evalCases: ['EV-003', 'EV-011', 'EV-025', 'EV-030', 'EV-031', 'EV-032', 'EV-033', 'EV-034', 'EV-037', 'EV-038', 'EV-040', 'EV-041', 'EV-043', 'EV-052', 'EV-053', 'EV-056', 'EV-058', 'EV-086', 'EV-094'] },
  { id: 'solvent-class-stain', source: 'terminal-gate', action: 'downgrade', trigger: 'solvent-territory stain class (dried oil-based paint) — pro only', evalCases: ['EV-018'] },
  { id: 'escalation-request', source: 'terminal-gate', action: 'downgrade', trigger: 'stronger/strongest/nuclear-option escalation ask — effort never increases in-session', evalCases: ['ADV-005', 'ADV-006', 'ADV-007'] },
  { id: 'guardrail-bypass-attempt', source: 'terminal-gate', action: 'downgrade', trigger: 'pretend-pro / ignore-rules / injection phrasing in request', evalCases: ['ADV-001', 'ADV-002', 'ADV-004'] },
]

const GOVERNOR_ENTRIES: RuleEntry[] = [
  ...REPEAT_LANGUAGE_RULES.map((r) => ({
    id: r.id,
    source: 'governor' as const,
    action: 'strip' as const,
    trigger: `unlimited-attempt language: ${r.re.source.slice(0, 50)}…`,
  })),
  ...OVERPROMISE_SOFTENERS.map((r) => ({
    id: r.id,
    source: 'governor' as const,
    action: 'soften' as const,
    trigger: `confidence overstatement: ${r.re.source.slice(0, 50)}… → "${r.replacement}"`,
  })),
  { id: 'GOV-BUDGET', source: 'governor', action: 'trim', trigger: 'positive DIY-action clauses exceed the effort budget for the derived risk tier (red 0 / orange 1 / default 4); excess steps trimmed from the tail, fail-closed if untrimmable' },
  { id: 'GOV-HEAT-1', source: 'governor', action: 'strip', trigger: 'positive heat instruction (iron/hot water/dryer/steam/heat) in a consumer card — GONR core rule: no heat until the stain is gone; negated warnings survive' },
  { id: 'GOV-AGITATE-1', source: 'governor', action: 'replace', trigger: 'positive scrub/rub instruction → blot (universal blot-don\'t-rub doctrine; negated warnings survive)', evalCases: ['EV-007'] },
  { id: 'GOV-COMBO-1', source: 'governor', action: 'strip', trigger: 'sentence positively instructing a product mix/combination (non-bleach combos; bleach mixes hard-block in the guard)', evalCases: ['EV-078'] },
  { id: 'GOV-ATTEMPT-1', source: 'governor', action: 'replace', trigger: 'every consumer card carries the one-attempt stop line (appended after the terminal gate if absent)' },
]

const OTHER_ENTRIES: RuleEntry[] = [
  { id: 'HR-1', source: 'hard-refuse', action: 'refuse', trigger: 'nail polish/acetone × acetate — deterministic refusal before AI', evalCases: ['EV-104', 'ADV-003'] },
  { id: 'DQ-chlorine-bleach', source: 'first-aid', action: 'answer', trigger: '"can I use bleach?" — explicit No + why', evalCases: ['EV-050', 'EV-051'] },
  { id: 'DQ-ammonia', source: 'first-aid', action: 'answer', trigger: '"can I use ammonia?" — explicit No + why' },
  { id: 'DQ-acid-mix', source: 'first-aid', action: 'answer', trigger: '"can I mix products?" — explicit No + why' },
  { id: 'DQ-hot-water', source: 'first-aid', action: 'answer', trigger: '"can I use hot water?" — explicit No + why', evalCases: ['EV-049'] },
]

export const RULE_TABLE: ReadonlyArray<RuleEntry> = [
  ...FILTER_ENTRIES,
  ...GUARD_ENTRIES,
  ...RED_CELL_ENTRIES,
  ...GOVERNOR_ENTRIES,
  ...OTHER_ENTRIES,
]

const RULE_INDEX = new Map(RULE_TABLE.map((r) => [r.id, r]))

// Resolve a runtime-emitted rule/reason ID to its table entry. Parameterized
// IDs ('prior-chemical:bleach+ammonia', 'fabricated-history:enzyme',
// 'forbidden-term:pog') resolve via their base ID.
export function getRule(id: string): RuleEntry | undefined {
  const direct = RULE_INDEX.get(id)
  if (direct) return direct
  const colon = id.indexOf(':')
  return colon > 0 ? RULE_INDEX.get(id.slice(0, colon)) : undefined
}
