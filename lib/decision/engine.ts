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
import {
  isCardRatifiedForConsumer,
  isConsumerSolveTier,
  RATIFIED_CARD_ALLOWLIST_VERSION,
} from '@/lib/solve/ratified-cards'
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
  /** Runtime audience gate for TASK-251 legacy-card admission. */
  viewerTier?: string | null
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
  const base = await lookupProtocol(input.stain, input.surface)

  // ── ES→AI-tier fallback (TASK-218, Tyler 2026-06-09) ──────────────────────
  // The curated card library is English-only today. Serving an English library
  // card to a non-English request would mix languages and — far worse — ship
  // English safety prose to someone who asked in Spanish. Until SB authors
  // localized cards, suppress any library hit for a non-English lang so the
  // solve route falls through to the AI tier, which generates IN the requested
  // language. We mirror lookupProtocol's own no-match shape exactly
  // ({card:null, tier:4, confidence:0, source:'ai'}) so the route's
  // `if (result.card)` branch is skipped and the AI path runs unchanged.
  //
  // Fail-safe: lang defaults to 'en', so an absent/unknown lang is treated as
  // English and English behavior is byte-for-byte unchanged.
  const lang = (input.lang ?? 'en').toLowerCase()
  if (lang !== 'en' && base.card) {
    return { card: null, tier: 4, confidence: 0, source: 'ai' }
  }

  // TASK-251 — consumer legacy-card deny gate. Tier-1/2 data/core matches are
  // legacy guidance until an explicit source/SB ratification entry admits the
  // card. Paid/pro tiers keep the old behavior for this task.
  if (
    base.card &&
    base.source === 'core' &&
    (base.tier === 1 || base.tier === 2) &&
    isConsumerSolveTier(input.viewerTier) &&
    !isCardRatifiedForConsumer(base.card.id)
  ) {
    return {
      card: null,
      tier: 4,
      confidence: 0,
      source: 'core',
      legacyDenied: {
        reason: 'unratified_legacy_card',
        cardId: base.card.id,
        allowlistVersion: RATIFIED_CARD_ALLOWLIST_VERSION,
      },
    }
  }

  return base
}
