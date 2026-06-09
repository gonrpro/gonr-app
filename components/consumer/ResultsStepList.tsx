import { AlertTriangle } from 'lucide-react'
import type { Step } from '@/lib/types'

// TASK-218 SHARED FOUNDATION — numbered gradient-pill step list.
// Re-skin of ConsumerSolveShell's step list + ResultCard's protocol renderer,
// green-free and brand-premium. Renders the engine's steps VERBATIM and IN ORDER
// (homeSolutions for consumer tier, or spottingProtocol for paid tier). The
// engine's step 1 is the safe-first move — never reordered, never invented, and
// the count is whatever the engine returns (NO hardcoded cap).
//
// Steps may be plain strings (home narrative) or structured Step objects. We do
// not synthesize a bold "title" the engine didn't provide: an optional `agent`
// renders as the eyebrow, the instruction renders as the body.

export type StepLike = string | Step

export interface ResultsStepListProps {
  steps: ReadonlyArray<StepLike>
  /** Optional uppercase eyebrow above the list (e.g. "Recommended for you"). */
  heading?: string
  className?: string
  /**
   * Engine-position offset for the displayed step number. When the engine's step
   * array is split for progressive disclosure (e.g. "Do this now" 1-3 / "Full
   * rescue plan" 4-N), the remainder list passes its offset so numbering stays
   * continuous and faithful to engine order — step 4 reads "4", never "1".
   */
  startIndex?: number
}

// ATLAS COPY GATE (FRONTIER-SWARM-SPEC line 94): heat must never read as
// unconditionally safe. This is a PRESENTATION/COPY-FRAMING change explicitly
// carved out of the verbatim rule — we author no advice, we only detect the
// engine's OWN heat wording and attach the care-label conditional to it. Applied
// fail-closed (every heat step, not only when a restrictive label was captured):
// the assembled care label is frequently 'unknown', and gating the caveat on a
// captured restriction would fail-OPEN on exactly that case — leaving "wash in
// hot water" as a flat "safe move" for an unlabeled dry-clean-only item.
//
// Two buckets, two gate-authorized strings:
//  • Hot-WASH wording → the Atlas-authorized "only if the care label allows hot
//    wash". Matches "hot/hottest/warm water", "hot wash", "hottest setting",
//    "boiling water" — INCLUDING "wash in hot water", which the prior phrase
//    list missed (it is neither "hot wash" nor "hottest").
//  • Heat-PROCESS wording (dryer / iron / high heat) → the generic "only if the
//    care label allows it" (the hot-wash phrasing would not fit those steps).
const HOT_WASH_PHRASES =
  /(?:\b(?:hot|hottest|warm)\s+(?:water|wash))|(?:\bhottest\s+setting)|(?:\bboiling\s+water)/i
// Heat-PROCESS wording (dryer / iron / high heat). Phrase-list detection is
// brittle, so cover the common engine variants explicitly:
//  • "high heat" / "highest heat" / "hottest heat"
//  • "hottest|highest … (cycle|setting|heat)" — e.g. "highest heat setting",
//    "hottest available cycle" (engine inserts up to a few words before the noun)
//  • "tumble dry … high" — e.g. "tumble dry on the highest heat setting", which
//    matched NEITHER prior list and read as a flat safe move
//  • bare "dryer" / "iron"
const HEAT_PROCESS_PHRASES =
  /\b(?:high|highest|hottest)\s+heat\b|\b(?:hottest|highest)\s+(?:\w+\s+){0,3}?(?:cycle|setting|heat)\b|\btumble\s+dry\b[^.]*?\bhigh|\bdryer\b|\biron\b/i
// Don't double-append if the engine (or a prior caveat) ALREADY conditions on the
// CARE LABEL. Must require the care-label sense — a bare "only if" (e.g. "rinse
// with hot water only if colorfast") is an UNRELATED conditional and must NOT
// suppress the heat caveat, or the engine's hot-water wording reads as
// unconditionally safe. The authorized caveat strings below contain "care label",
// so the double-append guard still fires once a caveat has been attached.
const ALREADY_CONDITIONAL = /care label|laundry symbol|if the label/i
const HOT_WASH_CAVEAT = ' — only if the care label allows hot wash'
const HEAT_PROCESS_CAVEAT = ' — only if the care label allows it'

export function applyHeatCaveat(instruction: string): string {
  if (ALREADY_CONDITIONAL.test(instruction)) return instruction
  // Strip a single trailing period/whitespace so the em-dash caveat reads clean.
  const base = instruction.replace(/\.\s*$/, '')
  if (HOT_WASH_PHRASES.test(instruction)) return `${base}${HOT_WASH_CAVEAT}`
  if (HEAT_PROCESS_PHRASES.test(instruction)) return `${base}${HEAT_PROCESS_CAVEAT}`
  return instruction
}

function normalize(
  step: StepLike,
  index: number,
  startIndex: number,
): { number: number; agent?: string; instruction: string; warning?: string } {
  if (typeof step === 'string') {
    return { number: startIndex + index + 1, instruction: applyHeatCaveat(step) }
  }
  // ENGINE CONTRACT: step.warning is an engine-authored, per-step safety caveat.
  // It is rendered VERBATIM (no applyHeatCaveat, no copy framing) and must NEVER
  // be dropped — engine-authored safety text lost in presentation is exactly the
  // class of bug the safety contract forbids.
  const warning =
    typeof step.warning === 'string' && step.warning.trim().length > 0 ? step.warning : undefined
  return {
    number: step.step ?? startIndex + index + 1,
    agent: step.agent && step.agent.trim().length > 0 ? step.agent : undefined,
    instruction: applyHeatCaveat(step.instruction),
    warning,
  }
}

export default function ResultsStepList({ steps, heading, className, startIndex = 0 }: ResultsStepListProps) {
  if (steps.length === 0) return null

  return (
    <div className={className}>
      {heading ? (
        <p className="mb-3 text-xs font-extrabold uppercase tracking-wide text-gonr-textgray">{heading}</p>
      ) : null}
      <ol className="grid gap-3">
        {steps.map((step, index) => {
          const { number, agent, instruction, warning } = normalize(step, index, startIndex)
          return (
            <li key={index} className="flex gap-3">
              <span className="gonr-gradient mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-black text-white shadow-[0_6px_16px_-8px_rgba(247,10,117,0.7)]">
                {number}
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                {agent ? (
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-gonr-hotpink">{agent}</p>
                ) : null}
                <p className="text-[15px] font-semibold leading-6 text-gonr-navy">{instruction}</p>
                {warning ? (
                  <p
                    className="mt-1.5 flex items-start gap-1.5 text-[13px] font-semibold leading-5"
                    style={{ color: 'var(--gonr-danger)' }}
                  >
                    <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{warning}</span>
                  </p>
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
