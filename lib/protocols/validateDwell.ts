// lib/protocols/validateDwell.ts
// TASK-037 — runtime guard against numeric dwell-time regressions.
//
// Atlas's rule (2026-04-17): GONR never makes a numeric dwell-time call.
// Authors must use soft language. This validator is meant to be called from
// any code path that writes to `protocol_cards.data.spottingProtocol[].dwellTime`:
// migrations, admin UIs, bulk import scripts, the card-draft API, etc.
//
// Usage:
//   const result = validateDwellTime(step.dwellTime)
//   if (!result.ok) throw new Error(result.reason)
//
// Policy:
//   Reject: any string that contains a numeric duration token
//           (1 minute, 2-3 min, 30 seconds, 1h, etc.)
//   Accept: soft descriptive language ("Brief", "Until rinse water runs clear",
//           "Leave briefly; monitor continuously", "Immediate", "N/A")
//   Accept: empty / null (step simply has no dwell directive)

export interface DwellValidationResult {
  ok: boolean
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
  if (typeof value !== 'string') return { ok: false, reason: 'dwellTime must be a string' }

  const s = value.trim()
  if (s === '') return { ok: true }

  const numericMatch = s.match(NUMERIC_DURATION_RE)
  if (numericMatch) {
    return {
      ok: false,
      reason:
        `dwellTime contains an explicit numeric duration ("${numericMatch[0]}"). ` +
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
      reason:
        `dwellTime contains a numeric range with a time unit ("${rangeMatch[0]}"). ` +
        'GONR policy (TASK-037): strip the numbers, use soft language instead.',
      matchedToken: rangeMatch[0],
    }
  }

  return { ok: true }
}

/**
 * Validate every dwellTime in a protocol card's spottingProtocol steps.
 * Returns the first failure (or ok) so callers can surface a single error.
 * For batch contexts, iterate manually and aggregate.
 */
export function validateCardDwells(card: { spottingProtocol?: Array<{ dwellTime?: string }> }): DwellValidationResult {
  const steps = card.spottingProtocol
  if (!Array.isArray(steps)) return { ok: true }
  for (let i = 0; i < steps.length; i++) {
    const r = validateDwellTime(steps[i]?.dwellTime)
    if (!r.ok) return { ok: false, reason: `step[${i}]: ${r.reason}`, matchedToken: r.matchedToken }
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
