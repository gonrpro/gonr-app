// TASK-218 SHARED FOUNDATION — honest provenance labels for the engine source.
//
// SINGLE SOURCE OF TRUTH for the `response.source` discriminant returned by
// /api/solve and for the human-readable "where this answer came from" line. Both
// the Details (confirmation) and Results screens import from here so one engine
// source value can never render two different provenance strings across the flow.
//
// HONEST SOURCING (BUILD-SPEC §5 / line 393): the Sources line must reflect the
// REAL source. We never overstate "Encyclopedia-verified": the verified-protocol
// wording is reserved for `library*` sources only (engine matched a real protocol
// card). Pure-AI sources are engine tier 4 — NO verified protocol matched — so
// they are branded as AI analysis, never as Encyclopedia-backed.

/** Engine `response.source` discriminant.
 *
 * VERIFIED AGAINST THE LIVE ENGINE (2026-06-08 real /api/solve smoke): the success
 * response echoes `result.source` from lib/protocols/lookup.ts, which is `'core'`
 * for a matched verified protocol card (tiers 1-2) — NOT `'library'`. The
 * `'library' / 'library-plant-tuned'` strings exist only in the engine's internal
 * logSolveHistory/recordEvent calls, never in the response body. `'core'` is the
 * real verified-library source the consumer screens receive; it MUST be mapped or
 * the Results source line crashes. The `library*` rows are kept for forward-compat
 * in case the engine ever promotes them to the response. */
export type SolveSource =
  | 'core'
  | 'library'
  | 'library-plant-tuned'
  | 'ai'
  | 'ai-plant-tuned'
  | 'hard-refuse'
  | 'deterministic-fast-path'
  | 'no-verified-protocol'
  | 'library-safety-blocked'
  | 'ai-unavailable'

/** Honest one-line attribution for a source. `verified` is true ONLY when a real
 *  verified-protocol card backed the answer (`library*`) — it drives the trust
 *  accent and must never be set for AI/AI-unavailable/no-protocol sources. */
export interface SourceLabel {
  label: string
  verified: boolean
}

/**
 * The canonical provenance map. ONE string + trust flag per engine source so
 * Details and Results stay byte-identical. Verified wording lives only on the
 * `library*` rows; everything else states the honest, non-verified provenance.
 */
export const SOURCE_LABEL: Record<SolveSource, SourceLabel> = {
  // Verified protocol card matched — the only place "Encyclopedia / verified" is earned.
  // `core` is what the LIVE engine actually returns for a matched verified card.
  core: { label: 'GONR Encyclopedia — verified protocol', verified: true },
  library: { label: 'GONR Encyclopedia — verified protocol', verified: true },
  'library-plant-tuned': { label: 'GONR Encyclopedia — verified protocol', verified: true },
  // Engine tier 4: no verified protocol matched — AI synthesised the guidance.
  ai: { label: 'AI analysis — no verified protocol matched', verified: false },
  'ai-plant-tuned': { label: 'AI analysis — no verified protocol matched', verified: false },
  // Safety overrides — cautious by design, not a verified-protocol claim.
  'hard-refuse': { label: 'Safety first — we kept this answer cautious', verified: false },
  // TASK-234 red-cell fast path — deterministic protect+refer verdict.
  'deterministic-fast-path': { label: 'Safety first — we kept this answer cautious', verified: false },
  'library-safety-blocked': { label: 'Safety-adjusted guidance', verified: false },
  // No protocol on file yet.
  'no-verified-protocol': { label: 'No verified protocol yet — general guidance only', verified: false },
  // AI assist down — general, non-stain-specific starting point only.
  'ai-unavailable': { label: 'AI reasoning unavailable — general starting point only', verified: false },
}

/** Honest, non-verified fallback for any source the engine emits that we have not
 *  mapped yet. NEVER claims "verified" — an unrecognised source must downgrade to
 *  cautious, not overstate provenance. */
const UNKNOWN_SOURCE_LABEL: SourceLabel = { label: 'GONR safety guidance', verified: false }

/**
 * Resolve a provenance label for an engine `source` WITHOUT ever throwing. The
 * Results + Details source lines are the highest-stakes provenance surfaces; a
 * source value the UI has not seen before (the engine can add tiers independently)
 * must fail safe to an honest non-verified label, never white-screen the result.
 */
export function resolveSourceLabel(source: SolveSource | string | undefined): SourceLabel | null {
  if (!source) return null
  return (SOURCE_LABEL as Record<string, SourceLabel>)[source] ?? UNKNOWN_SOURCE_LABEL
}
