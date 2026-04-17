// lib/protocols/validateDwell.ts
// TASK-037 — runtime guard against numeric dwell-time regressions.
// TASK-038 — extended: also rejects numeric time tokens in step prose.
//
// Atlas's rule (2026-04-17): GONR never makes a numeric dwell-time call.
// One gate, two named checks:
//   1. FAIL_DWELL_FIELD       — dwellTime struct field rejection
//   2. FAIL_PROSE_NUMERIC_TIME — numeric time in user-facing step prose
//
// Prose check scope (Atlas-whitelisted):
//   professionalProtocol.steps[], diyProtocol.steps[],
//   homeSolutions[].instruction, homeSolutions[].technique,
//   spottingProtocol[].instruction   ← added 2026-04-17 Phase 1b
// Prose check does NOT scan: timeEstimate, lastValidated, escalation text,
//   warnings, stainChemistry, whyThisWorks, or any metadata / admin field.
// Note: spottingProtocol is the render-path source — lookup.ts normalizer
// early-returns when it's populated, so if this field carries dwell tails,
// the cleaned professionalProtocol.steps never reaches the UI.
//
// Usage:
//   const r = validateDwellTime(step.dwellTime)     // field check
//   const r = validateProseTime(step.instruction)   // prose check
//   const r = validateCard(card)                    // both, whole card
//   if (!r.ok) throw new Error(r.reason)

export type FailCode =
  | 'FAIL_DWELL_FIELD'
  | 'FAIL_PROSE_NUMERIC_TIME'

export interface DwellValidationResult {
  ok: boolean
  code?: FailCode
  reason?: string
  matchedToken?: string
}

// Matches any explicit numeric duration — the only thing we reject.
// Units covered: sec, seconds, s; min, minute, minutes, mins; hr, hour, hours, h.
const NUMERIC_DURATION_RE = /\b\d+(?:\.\d+)?\s*(?:sec(?:ond)?s?\b|s\b|min(?:ute)?s?\b|hr|hour|hours?\b|h\b)/i

// Standalone numeric range like "2-3" (with optional spacing) — if followed by
// any unit within a few chars, we catch it via NUMERIC_DURATION_RE. This extra
// check catches range forms like "2-3 minutes" split across the string.
const NUMERIC_RANGE_RE = /\b\d+\s*[-–—]\s*\d+\b/

export function validateDwellTime(value: unknown): DwellValidationResult {
  if (value === null || value === undefined || value === '') return { ok: true }
  if (typeof value !== 'string') return { ok: false, code: 'FAIL_DWELL_FIELD', reason: 'dwellTime must be a string' }

  const s = value.trim()
  if (s === '') return { ok: true }

  const numericMatch = s.match(NUMERIC_DURATION_RE)
  if (numericMatch) {
    return {
      ok: false,
      code: 'FAIL_DWELL_FIELD',
      reason:
        `FAIL_DWELL_FIELD: dwellTime contains an explicit numeric duration ("${numericMatch[0]}"). ` +
        'GONR policy (TASK-037): use soft descriptive language — e.g., "Brief — apply, work, check", ' +
        '"Until rinse water runs clear", "Leave briefly; monitor continuously", "Brief; do not linger", ' +
        '"Repeat briefly as needed", or "Immediate".',
      matchedToken: numericMatch[0],
    }
  }

  // Also reject a bare range with a unit-adjacent context, e.g. "2-3 (check)"
  // is fine (no unit), but "2-3 minutes" already covered above. Keep this
  // check as belt-and-suspenders for oddly formatted strings.
  const rangeMatch = s.match(NUMERIC_RANGE_RE)
  if (rangeMatch && /min|sec|hour|hr/i.test(s)) {
    return {
      ok: false,
      code: 'FAIL_DWELL_FIELD',
      reason:
        `FAIL_DWELL_FIELD: dwellTime contains a numeric range with a time unit ("${rangeMatch[0]}"). ` +
        'GONR policy (TASK-037): strip the numbers, use soft language instead.',
      matchedToken: rangeMatch[0],
    }
  }

  return { ok: true }
}

// TASK-038 — prose numeric-time rejection.
// Matches any numeric time token: "5 min", "5-10 minutes", "30 seconds",
// "1 hour", "2-3 hrs", etc. Scoped to user-facing step prose only.
const PROSE_NUMERIC_TIME_RE =
  /\b\d+(?:\s*[-–—]\s*\d+)?\s*(?:sec(?:ond)?s?|min(?:ute)?s?|hrs?|hours?)\b/i

export function validateProseTime(value: unknown, location = 'prose'): DwellValidationResult {
  if (value === null || value === undefined || value === '') return { ok: true }
  if (typeof value !== 'string') return { ok: true }
  const m = value.match(PROSE_NUMERIC_TIME_RE)
  if (m) {
    return {
      ok: false,
      code: 'FAIL_PROSE_NUMERIC_TIME',
      reason:
        `FAIL_PROSE_NUMERIC_TIME: numeric time token ("${m[0]}") in ${location}. ` +
        'GONR policy (TASK-038): user-facing step prose must not prescribe specific durations. ' +
        'Rewrite as soft guidance ("Apply and monitor", "Work briefly; check frequently") ' +
        'or drop the duration if not critical to the chemistry.',
      matchedToken: m[0],
    }
  }
  return { ok: true }
}

interface ProseScanCard {
  professionalProtocol?: { steps?: string[] }
  diyProtocol?: { steps?: string[] }
  homeSolutions?: Array<{ instruction?: string; technique?: string }>
  spottingProtocol?: Array<{ dwellTime?: string; instruction?: string }>
}

/**
 * Whole-card validator. Runs both named checks:
 *   FAIL_DWELL_FIELD       — on every spottingProtocol step's dwellTime
 *   FAIL_PROSE_NUMERIC_TIME — on professionalProtocol.steps[],
 *                             diyProtocol.steps[], and homeSolutions prose.
 * Returns the first failure so callers can surface one error.
 */
export function validateCard(card: ProseScanCard): DwellValidationResult {
  // Check 1: structured dwellTime field (existing TASK-037 rule)
  const steps = card.spottingProtocol
  if (Array.isArray(steps)) {
    for (let i = 0; i < steps.length; i++) {
      const r = validateDwellTime(steps[i]?.dwellTime)
      if (!r.ok) return { ...r, reason: `spottingProtocol.steps[${i}]: ${r.reason}` }
    }
  }

  // Check 2: prose numeric times in whitelisted fields only.
  // spottingProtocol[].instruction is the render-path source (see file header).
  if (Array.isArray(steps)) {
    for (let i = 0; i < steps.length; i++) {
      const r = validateProseTime(steps[i]?.instruction, `spottingProtocol[${i}].instruction`)
      if (!r.ok) return r
    }
  }
  const proSteps = card.professionalProtocol?.steps
  if (Array.isArray(proSteps)) {
    for (let i = 0; i < proSteps.length; i++) {
      const r = validateProseTime(proSteps[i], `professionalProtocol.steps[${i}]`)
      if (!r.ok) return r
    }
  }
  const diySteps = card.diyProtocol?.steps
  if (Array.isArray(diySteps)) {
    for (let i = 0; i < diySteps.length; i++) {
      const r = validateProseTime(diySteps[i], `diyProtocol.steps[${i}]`)
      if (!r.ok) return r
    }
  }
  if (Array.isArray(card.homeSolutions)) {
    for (let i = 0; i < card.homeSolutions.length; i++) {
      const h = card.homeSolutions[i]
      const r1 = validateProseTime(h?.instruction, `homeSolutions[${i}].instruction`)
      if (!r1.ok) return r1
      const r2 = validateProseTime(h?.technique, `homeSolutions[${i}].technique`)
      if (!r2.ok) return r2
    }
  }
  return { ok: true }
}

/**
 * @deprecated use validateCard — kept for TASK-037 call-site compatibility.
 */
export function validateCardDwells(card: { spottingProtocol?: Array<{ dwellTime?: string }> }): DwellValidationResult {
  const steps = card.spottingProtocol
  if (!Array.isArray(steps)) return { ok: true }
  for (let i = 0; i < steps.length; i++) {
    const r = validateDwellTime(steps[i]?.dwellTime)
    if (!r.ok) return { ...r, reason: `step[${i}]: ${r.reason}` }
  }
  return { ok: true }
}

// ── Tests (run with `node --test validate-dwell.ts` if using a TS runner,
//          or copy into a Vitest/Jest spec) ────────────────────────────────
//
// Must reject:
//   "1 minute", "2 minutes", "30 seconds", "1-2 minutes", "2-3 min",
//   "1 hour", "15-20 minutes soak, then work", "1 minute maximum"
//
// Must accept:
//   "Brief — apply, work, check", "Until rinse water runs clear",
//   "Leave briefly; monitor continuously", "Brief; do not linger",
//   "Repeat briefly as needed", "Immediate", "N/A", "Normal wash cycle",
//   "", null, undefined
