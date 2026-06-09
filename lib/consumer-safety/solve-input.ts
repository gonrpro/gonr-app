// TASK-218 SHARED FOUNDATION — canonical SolveInput fact shape + intake vocab.
//
// Single source of truth for the structured facts the consumer journey collects
// (MATERIAL / STAIN / CARE / HEAT / COLOR / AGE / VALUE). Chat (intake),
// Details (confirmation), and Results all import from here so the fact taxonomy
// and human-readable labels never drift between screens. The option lists were
// lifted verbatim out of ConsumerSolveShell.tsx — data wiring unchanged.
//
// NOTE: this module only models the *answer vocabulary*. The safety verdict is
// produced by lib/consumer-safety/classifier on a SolveInput; screens must not
// author advice from these labels.

import type {
  CareStatus,
  Colorfastness,
  HeatExposure,
  ItemValue,
  Material,
  SolveInput,
  StainAge,
  StainType,
} from './types'

export type {
  CareStatus,
  Colorfastness,
  HeatExposure,
  ItemValue,
  Material,
  SolveInput,
  StainAge,
  StainType,
} from './types'

/** A selectable answer: the canonical enum value + the copy shown to the user. */
export interface FactOption<T extends string> {
  value: T
  label: string
}

// 'auto' lets the engine infer the stain family from free text instead of forcing
// the user to self-classify chemistry.
export const STAIN_OPTIONS: ReadonlyArray<FactOption<StainType | 'auto'>> = [
  { value: 'auto', label: 'Let GONR infer it' },
  { value: 'protein', label: 'Blood / sweat / protein' },
  { value: 'tannin', label: 'Coffee / wine / tea' },
  { value: 'oil_grease', label: 'Oil / grease' },
  { value: 'dye', label: 'Dye transfer' },
  { value: 'ink', label: 'Ink / marker' },
  { value: 'rust_mineral', label: 'Rust / mineral' },
  { value: 'particulate', label: 'Mud / soil' },
  { value: 'mixed_unknown', label: 'Mixed stain' },
  { value: 'unknown', label: 'Unknown stain' },
]

export const MATERIAL_OPTIONS: ReadonlyArray<FactOption<Material>> = [
  { value: 'cotton', label: 'Cotton' },
  { value: 'linen', label: 'Linen' },
  { value: 'denim', label: 'Denim' },
  { value: 'polyester', label: 'Polyester' },
  { value: 'nylon', label: 'Nylon' },
  { value: 'wool', label: 'Wool' },
  { value: 'silk', label: 'Silk' },
  { value: 'rayon_viscose', label: 'Rayon / viscose' },
  { value: 'acetate', label: 'Acetate lining' },
  { value: 'leather', label: 'Leather' },
  { value: 'suede', label: 'Suede / nubuck' },
  { value: 'blend', label: 'Blend' },
  { value: 'unknown', label: 'I am not sure' },
]

export const CARE_OPTIONS: ReadonlyArray<FactOption<CareStatus>> = [
  { value: 'machine_washable', label: 'Machine washable' },
  { value: 'hand_wash', label: 'Hand wash' },
  { value: 'dry_clean_only', label: 'Dry clean only' },
  { value: 'unknown', label: 'I am not sure' },
]

export const HEAT_OPTIONS: ReadonlyArray<FactOption<HeatExposure>> = [
  { value: 'none', label: 'No heat yet' },
  { value: 'warm_hot_wash', label: 'Warm or hot water' },
  { value: 'machine_dried', label: 'Machine dryer' },
  { value: 'ironed', label: 'Ironed' },
  { value: 'unknown', label: 'I am not sure' },
]

export const COLOR_OPTIONS: ReadonlyArray<FactOption<Colorfastness>> = [
  { value: 'colorfast', label: 'Colorfast / white' },
  { value: 'prone_to_bleed', label: 'Dark, bright, or might bleed' },
  { value: 'unknown', label: 'I am not sure' },
]

export const AGE_OPTIONS: ReadonlyArray<FactOption<StainAge>> = [
  { value: 'fresh', label: 'Fresh' },
  { value: 'hours_old', label: 'Hours old' },
  { value: 'set_in', label: 'Set in / already washed' },
  { value: 'unknown', label: 'I am not sure' },
]

export const VALUE_OPTIONS: ReadonlyArray<FactOption<ItemValue>> = [
  { value: 'everyday', label: 'Everyday item' },
  { value: 'valuable', label: 'Valuable' },
  { value: 'sentimental', label: 'Sentimental' },
  { value: 'unknown', label: 'I am not sure' },
]

// Things the user may have already done to the stain (drives prior-treatment risk).
export const PRIOR_TREATMENTS: readonly string[] = [
  'water',
  'detergent',
  'bleach',
  'ammonia',
  'acetone',
  'enzyme detergent',
  'peroxide',
  'baking soda',
]

// Example free-text prompts surfaced as quick-fill chips on the intake screen.
export const EXAMPLE_CHIPS: readonly string[] = [
  'red wine on white cotton shirt',
  'grease on silk blouse',
  'ink on wool coat',
  'already used bleach and ammonia',
]

/** Fresh SolveInput with safe "unknown" defaults — fail-closed, nothing assumed. */
export function emptySolveInput(): SolveInput {
  return {
    stainDescription: '',
    stainType: undefined,
    material: 'unknown',
    careStatus: 'unknown',
    heatExposure: 'unknown',
    colorfastness: 'unknown',
    stainAge: 'unknown',
    priorTreatment: [],
    itemValue: 'everyday',
    locationText: '',
  }
}

/** Look up the human label for an enum value within an option list. */
export function labelFor<T extends string>(
  options: ReadonlyArray<FactOption<T>>,
  value: T,
): string {
  return options.find((option) => option.value === value)?.label ?? value
}

// ── Engine solve-body assembly (constraint-propagating) ──────────────────────
//
// TASK-218 FRONTIER FIX: the intake collects safety-critical facts — care status
// (dry-clean-only / hand-wash), prior aggressive treatment (bleach / ammonia /
// solvent), heat already applied, and colorfastness — but the deterministic
// engine's text-only JSON contract (/api/solve) reads ONLY `stain` + `surface`.
// If we forward just those, every collected constraint silently evaporates before
// the verdict (a do-not-wash / prior-bleach item can get a water-based home step).
//
// This is the SINGLE place both the orchestrator's server-side engine call and the
// Results re-solve build the engine body, so the constraints can never be dropped
// on one path and not the other. The frontier authors NO advice here: every folded
// fact is derived deterministically from care-label ground truth + machine-readable
// risk tokens. The deterministic engine remains the final authority on the verdict.

/** Body posted to the deterministic /api/solve engine. */
export interface EngineSolveBody {
  /** Free-text stain, with heat / prior-aggressive-treatment notes folded in. */
  stain: string
  /** Fiber + restrictive care constraints folded into the surface descriptor. */
  surface?: string
  // ── Structured constraints (forward-compat) ──
  // The current JSON engine contract does NOT read these fields — they are ALSO
  // folded into `stain`/`surface` above, which is what makes them gate the verdict
  // TODAY. They ride along as explicit fields so the engine owner (Atlas) can wire
  // them as first-class hard gates without any frontier change. Until that lands
  // they are NOT engine-enforced as fields; the folded text is the load-bearing path.
  careStatus?: CareStatus
  heatExposure?: HeatExposure
  colorfastness?: Colorfastness
  priorTreatment?: string[]
  careConstraints?: string[]
  /** Raw restrictive care-label symbol tokens (no-bleach / no-heat / no-iron /
   *  dry-clean-only / hand-wash-only / do-not-wash). UNLIKE the fields above this
   *  one IS read by the engine: /api/solve's JSON branch passes it into
   *  buildSolveContext so ctx.hasNoBleach / ctx.hasNoHeat / isDryCleanOnly arm on
   *  the text-only frontier path — the same guards the multipart image path gets
   *  from the care-label scan. These are HARD constraints; the bleach/heat/iron
   *  symbols have NO CareStatus slot, so without this they evaporate before the
   *  verdict (the adversarial care-label override). */
  careSymbols?: string[]
}

// Restrictive care-label symbols → load-bearing surface phrases the engine reads.
// dry-clean-only / hand-wash-only / do-not-wash are already represented through
// CareStatus → CARE_SURFACE_CONSTRAINTS; the bleach/heat/iron symbols have no
// CareStatus slot at all, so they are folded here as explicit surface phrases.
// no-heat is a 'no heat allowed' surface NOTE — NOT heatExposure='warm_hot_wash'
// (that means heat was already applied, the wrong semantics for a label ban).
const RESTRICTIVE_SYMBOL_SURFACE: Record<string, string> = {
  'no-bleach': 'no bleach / do not bleach',
  'no-iron': 'no iron',
  'no-heat': 'no heat allowed',
}

// Care statuses that RESTRICT what the engine may safely recommend. Folded into
// the surface text so the engine reads them even on the text-only path (which
// otherwise sees only fiber). 'do-not-wash' is appended for dry-clean-only so a
// water-based home step can never become the unguarded default.
const CARE_SURFACE_CONSTRAINTS: Record<CareStatus, readonly string[]> = {
  machine_washable: [],
  unknown: [],
  hand_wash: ['hand-wash only'],
  dry_clean_only: ['dry-clean-only', 'do-not-wash'],
}

// Heat already in the fabric (sets protein / tannin). Folded into the stain text.
const HEAT_STAIN_NOTE: Record<HeatExposure, string | null> = {
  none: null,
  unknown: null,
  warm_hot_wash: 'warm/hot water already applied',
  machine_dried: 'machine-dried, heat-set',
  ironed: 'ironed, heat-set',
}

// Prior treatments that materially change safe chemistry (aggressive agents). A
// stain treated with these must never receive an un-gated oxidizer/solvent step.
const AGGRESSIVE_PRIOR = /bleach|ammonia|acetone|peroxide|solvent|alkali|oxidiz|lye|caustic/i

/**
 * Build the {stain, surface, …} body for /api/solve from the assembled facts,
 * folding every restrictive constraint into the text the engine actually reads.
 *
 * When NO restrictive constraint is present the output is byte-identical to the
 * old {stain, surface} body (happy path unchanged). Constraints only alter the
 * strings exactly where the bug manifested — and a deliberate library miss there
 * routes the engine to its conservative path WITH the constraint in the brief,
 * which is the correct fail-closed behavior for a do-not-wash / prior-bleach item.
 *
 * @param input        assembled facts (fail-closed "unknown" defaults)
 * @param override     a follow-up that replaces the stain description, if any
 * @param surfaceBase  a richer raw fabric descriptor (e.g. "silk chiffon blouse")
 *                     to use instead of the canonical material label, when available
 * @param careSymbols  restrictive care-label symbol tokens (no-bleach / no-heat /
 *                     no-iron / dry-clean-only / …). The bleach/heat/iron symbols
 *                     have no CareStatus slot, so they are folded into the surface
 *                     text here AND echoed on the body's `careSymbols` field, which
 *                     the engine's JSON branch reads to arm ctx.hasNoBleach etc.
 *                     Without this the label ban silently dies before the verdict.
 */
export function buildEngineSolveBody(
  input: SolveInput,
  opts: { override?: string | null; surfaceBase?: string; careSymbols?: readonly string[] } = {},
): EngineSolveBody {
  const { override = null, surfaceBase, careSymbols = [] } = opts

  // Normalize + dedupe the restrictive symbol tokens (lowercased, e.g. 'no-bleach').
  const symbols = Array.from(
    new Set(careSymbols.map((s) => s.trim().toLowerCase()).filter(Boolean)),
  )

  // ── surface: fiber descriptor + restrictive care / color constraints ──
  const fiberBase =
    surfaceBase?.trim() ||
    (input.material && input.material !== 'unknown' ? labelFor(MATERIAL_OPTIONS, input.material) : '')
  const careConstraints = [...CARE_SURFACE_CONSTRAINTS[input.careStatus]]
  if (input.colorfastness === 'prone_to_bleed') careConstraints.push('prone to bleed')
  // Fold the bleach/heat/iron symbols (which CareStatus cannot represent) into the
  // surface text as load-bearing phrases — this is what makes a 'do not bleach' label
  // gate the verdict on the text-only path, not just on the multipart image path.
  for (const sym of symbols) {
    const phrase = RESTRICTIVE_SYMBOL_SURFACE[sym]
    if (phrase && !careConstraints.includes(phrase)) careConstraints.push(phrase)
  }
  const surfaceParts = [fiberBase, ...careConstraints].filter(Boolean)
  const surface = surfaceParts.length > 0 ? surfaceParts.join(', ') : undefined

  // ── stain: description + heat + prior aggressive treatment ──
  const base = (override ?? input.stainDescription).trim() || 'unknown stain'
  const stainNotes: string[] = []
  const heatNote = HEAT_STAIN_NOTE[input.heatExposure]
  if (heatNote) stainNotes.push(heatNote)
  const priorAggressive = input.priorTreatment
    .map((treatment) => treatment.trim())
    .filter((treatment) => treatment.length > 0 && AGGRESSIVE_PRIOR.test(treatment))
  if (priorAggressive.length > 0) stainNotes.push(`prior ${priorAggressive.join(' + ')} applied`)
  const stain = stainNotes.length > 0 ? `${base} — ${stainNotes.join('; ')}` : base

  const body: EngineSolveBody = { stain }
  if (surface) body.surface = surface
  // Structured echo for the forthcoming engine contract (NOT yet enforced — see note).
  if (input.careStatus !== 'unknown') body.careStatus = input.careStatus
  if (input.heatExposure !== 'unknown' && input.heatExposure !== 'none') {
    body.heatExposure = input.heatExposure
  }
  if (input.colorfastness !== 'unknown') body.colorfastness = input.colorfastness
  if (priorAggressive.length > 0) body.priorTreatment = priorAggressive
  if (careConstraints.length > 0) body.careConstraints = careConstraints
  // The raw restrictive symbol tokens — READ by the engine's JSON branch to arm
  // ctx.hasNoBleach / ctx.hasNoHeat / isDryCleanOnly (line-413 guard + brief lines).
  if (symbols.length > 0) body.careSymbols = symbols
  return body
}
