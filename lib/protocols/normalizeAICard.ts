// lib/protocols/normalizeAICard.ts — Atlas 2026-04-18 call.
//
// Problem: AI-generated fallback protocols vary wildly in length/shape —
// verified library cards cap around 5 steps, AI output runs 10-14 steps with
// repeated rinses and numeric dwell times that slip past the TASK-037/038
// guards (those gate migrations, not runtime AI output). Operator UX becomes
// inconsistent: one solve feels tight, another feels like a 14-step shop SOP.
//
// This normalizer runs on every AI card before it leaves the solve route:
//   1. Collapse adjacent rinse/flush steps (same agent + water-only action)
//   2. Hard-cap to 8 steps (library median = 5; 8 is the Atlas target upper)
//   3. Strip trailing numeric-time suffixes from instruction prose (TASK-038)
//   4. Soften dwellTime struct field (TASK-037)
//   5. Cap instruction prose to 220 chars at sentence boundary
//
// Keeps critical chemistry; drops shop-SOP padding.

const MAX_STEPS = 8
const INSTRUCTION_MAX_CHARS = 220

// Same two regexes as TASK-038 Phase 1 (lib/output/TASK-038/phase1-mass.mjs).
const DWELL_SUFFIX_RE =
  /(?<=\s|^)[—–\-]\s*\d+(?:\s*[-–—]\s*\d+)?\s*min(?:ute)?s?(?:\s+(?:total\s+)?dwell\s*time)?\.?\s*$/i
const DWELL_SENTENCE_RE =
  /([\.!?]\s+)Dwell\s+\d+(?:\s*[-–—]\s*\d+)?\s*min(?:ute)?s?\.\s*$/i

// For dwellTime struct field — any numeric duration token.
const NUMERIC_DWELL_RE =
  /\b\d+(?:\s*[-–—]\s*\d+)?\s*(?:sec(?:ond)?s?|min(?:ute)?s?|hrs?|hours?)\b/i

// Rinse/flush heuristic — if the agent is water-family and the action is a
// bare rinse/flush with no other chemistry, it's a candidate to merge.
const RINSE_AGENT_RE = /^(cold\s+water|cool\s+water|warm\s+water|water)$/i
const RINSE_ACTION_RE = /^(rinse|flush)\b/i

interface AIStep {
  step?: number
  agent?: string
  technique?: string
  temperature?: string
  dwellTime?: string
  instruction?: string
}

function stripProseTimes(s: string | undefined): string | undefined {
  if (typeof s !== 'string') return s
  let after = s.replace(DWELL_SENTENCE_RE, '$1')
  after = after.replace(DWELL_SUFFIX_RE, '').trimEnd()
  return after
}

function softenDwellField(v: string | undefined): string | undefined {
  if (typeof v !== 'string') return v
  if (NUMERIC_DWELL_RE.test(v)) return 'Brief — apply, work, check'
  return v
}

function truncateAtSentence(s: string | undefined, max: number): string | undefined {
  if (typeof s !== 'string' || s.length <= max) return s
  // Prefer cutting at the last sentence boundary before max.
  const trimmed = s.slice(0, max)
  const lastBoundary = Math.max(
    trimmed.lastIndexOf('. '),
    trimmed.lastIndexOf('! '),
    trimmed.lastIndexOf('? '),
  )
  if (lastBoundary > max * 0.5) return s.slice(0, lastBoundary + 1).trimEnd()
  // No clean boundary — cut at last space before max.
  const lastSpace = trimmed.lastIndexOf(' ')
  if (lastSpace > 0) return s.slice(0, lastSpace).trimEnd() + '…'
  return trimmed + '…'
}

function isRinseStep(s: AIStep): boolean {
  const agent = (s.agent ?? '').trim()
  const action = (s.instruction ?? '').trim()
  return RINSE_AGENT_RE.test(agent) && RINSE_ACTION_RE.test(action)
}

// Collapse adjacent rinse/flush steps into one. Keeps the first rinse's
// instruction (typically the most specific) and drops the follow-ons.
function mergeAdjacentRinses(steps: AIStep[]): AIStep[] {
  const out: AIStep[] = []
  for (const s of steps) {
    const last = out[out.length - 1]
    if (last && isRinseStep(last) && isRinseStep(s)) continue
    out.push(s)
  }
  return out
}

// If still over cap, drop rinse steps first (they're the most compressible),
// then interior duplicates of same-agent consecutive steps.
function capStepCount(steps: AIStep[], max: number): AIStep[] {
  if (steps.length <= max) return steps
  let out = [...steps]
  // Pass 1: drop interior rinses beyond the first and last.
  if (out.length > max) {
    const rinseIdxs = out.map((s, i) => (isRinseStep(s) ? i : -1)).filter(i => i > 0 && i < out.length - 1)
    while (out.length > max && rinseIdxs.length > 0) {
      const idx = rinseIdxs.pop()!
      out.splice(idx, 1)
    }
  }
  // Pass 2: hard-truncate the tail (rare; only if pass 1 wasn't enough).
  if (out.length > max) out = out.slice(0, max)
  return out
}

function renumberSteps(steps: AIStep[]): AIStep[] {
  return steps.map((s, i) => ({ ...s, step: i + 1 }))
}

interface AICard {
  spottingProtocol?: AIStep[]
  // other fields pass through unchanged
}

export function normalizeAICard<T extends AICard>(card: T): T {
  if (!card || typeof card !== 'object') return card
  const steps = Array.isArray(card.spottingProtocol) ? card.spottingProtocol : []
  if (steps.length === 0) return card

  // 1. Per-step prose + field cleanups.
  const cleaned = steps.map(s => ({
    ...s,
    instruction: truncateAtSentence(stripProseTimes(s.instruction), INSTRUCTION_MAX_CHARS),
    technique: stripProseTimes(s.technique),
    dwellTime: softenDwellField(s.dwellTime),
  }))

  // 2. Merge adjacent rinses.
  const merged = mergeAdjacentRinses(cleaned)

  // 3. Cap to MAX_STEPS.
  const capped = capStepCount(merged, MAX_STEPS)

  // 4. Renumber.
  const finalSteps = renumberSteps(capped)

  return { ...card, spottingProtocol: finalSteps }
}
