// lib/decision/engine.ts — TASK-040 Week 0 Day 3
// DecisionEngine coordinator. Architecture Brief §4 Layer 3.
//
// This is the single seam through which every surface calls for a decision.
// Today's implementation is a thin wrapper over lookupProtocol — the real
// composition (plant rules, safety guards, history recall, explanation, risk
// flags) is layered in as each subsystem becomes ready. That's intentional:
// ship the seam with zero behavior change, then evolve the internals.
//
// Callers use `decide()` — NOT lookupProtocol directly. New surfaces land by
// extending this module, not by sprouting parallel decision paths across
// the codebase.

import { lookupProtocol } from '@/lib/protocols/lookup'
import type { LookupResult } from '@/lib/types'

export interface DecideInput {
  stain: string
  surface: string
  /** Plant context for future plant-aware decisioning (Day 4+). */
  plant_id?: string | null
  /** Operator role gating (future). */
  operator_role?: string | null
  /** Language preference; consumed by downstream translation today, not the engine itself. */
  lang?: string
}

/**
 * Coordinator. Returns the full LookupResult shape so existing solve-route
 * callsites work unchanged. Later days will return a richer structured result
 * (why_this / why_not / risk_flags / escalation_hint) — for Day 3 the seam
 * exists and callers flow through it, even though the internal pipeline is
 * still just the library lookup.
 */
export async function decide(input: DecideInput): Promise<LookupResult> {
  // Future composition (Week 1+):
  //   const base = await lookupProtocol(input.stain, input.surface)
  //   const withHistory = await applySolveHistoryRecall(base, input.plant_id)
  //   const withPlant = applyPlantRules(withHistory, input.plant_id)
  //   const withSafety = applySafetyGuards(withPlant, input.stain, input.surface)
  //   return attachExplanation(withSafety, input)
  //
  // For now: the callsite in /api/solve still handles plant + safety after
  // this call, so we keep decide() as a drop-in for lookupProtocol and pull
  // logic inward over time.
  return lookupProtocol(input.stain, input.surface)
}
