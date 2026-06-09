// Pure Attach → intake-hint derivations, extracted from SolveFlow so they are unit-
// testable in the node test runner (SolveFlow is a 'use client' component). No React,
// no client runtime — every import here is type-only and erased at build time.
import type { AttachContext } from '@/components/consumer/AttachMenu'
import type { ChatIntakeContext } from '@/components/consumer/screens/ChatIntakeScreen'
import type { CareStatus, SolveInput, StainType } from '@/lib/consumer-safety/solve-input'

// ── Structured hints for the agent (raw vision, not yet mapped to SolveInput) ─
export interface IntakeHints {
  userNote?: string
  stain?: { stain?: string; surface?: string; family?: string; confidence?: string }
  careLabel?: { fiber?: string; careSymbols?: string[]; warnings?: string[] }
  hardConstraints?: string[]
}

// Restrictive care symbols are NON-OVERRIDABLE hard constraints (mirrors the vision
// layer's RESTRICTIVE_SYMBOLS set in lib/vision/scanPacket.ts).
export const RESTRICTIVE_CARE_SYMBOLS: ReadonlySet<string> = new Set([
  'dry-clean-only',
  'no-bleach',
  'no-heat',
  'hand-wash-only',
  'do-not-wash',
  'no-iron',
])

// Vision stain family → the intake stain vocabulary (for the deterministic fallback).
const FAMILY_TO_STAIN_TYPE: Readonly<Record<string, StainType>> = {
  protein: 'protein',
  tannin: 'tannin',
  oil: 'oil_grease',
  'oil-grease': 'oil_grease',
  grease: 'oil_grease',
  dye: 'dye',
  ink: 'ink',
  rust: 'rust_mineral',
  mineral: 'rust_mineral',
  particulate: 'particulate',
}

/** Filter a care-label symbol list to the non-overridable restrictive tokens
 *  (no-bleach / no-heat / no-iron / dry-clean-only / hand-wash-only / do-not-wash).
 *  Single source of truth for "which symbols are hard constraints" — used by both the
 *  agentic hints path and the deterministic fallback so they can never diverge. */
export function restrictiveCareSymbols(symbols: ReadonlyArray<string> | undefined): string[] {
  return (symbols ?? []).filter((s) => RESTRICTIVE_CARE_SYMBOLS.has(s.toLowerCase()))
}

// Care-label symbol → care status (restrictive symbols win; unknown stays unknown).
export function careFromSymbols(symbols: ReadonlyArray<string>): CareStatus | undefined {
  const set = new Set(symbols.map((s) => s.toLowerCase()))
  if (set.has('dry-clean-only') || set.has('do-not-wash')) return 'dry_clean_only'
  if (set.has('hand-wash-only')) return 'hand_wash'
  if (set.has('machine-wash-warm')) return 'machine_washable'
  return undefined
}

/** Build the agent's structured hints from an Attach vision result + typed text. */
export function hintsFromAttach(ctx: AttachContext | null, typed: string): IntakeHints {
  const hints: IntakeHints = {}
  if (typed.trim()) hints.userNote = typed.trim()
  if (!ctx) return hints

  if (ctx.source === 'stain-photo' && ctx.stain) {
    hints.stain = {
      stain: ctx.stain.stain,
      surface: ctx.stain.surface,
      family: ctx.stain.family,
      confidence: ctx.stain.confidence,
    }
  }
  if (ctx.source === 'care-label' && ctx.care) {
    hints.careLabel = {
      fiber: ctx.care.fiber,
      careSymbols: ctx.care.careSymbols,
      warnings: ctx.care.warnings,
    }
    hints.hardConstraints = restrictiveCareSymbols(ctx.care.careSymbols)
  }
  return hints
}

/** Build the deterministic-fallback Chat pre-fill from an Attach hint + typed text. */
export function contextFromAttach(ctx: AttachContext, typed: string): ChatIntakeContext {
  // Carry the captured photo through so the chip reflects "what you showed me".
  const thumbnailUrl = ctx.thumbnailUrl
  if (ctx.source === 'stain-photo' && ctx.stain) {
    const detected: Partial<SolveInput> = {}
    const mapped = FAMILY_TO_STAIN_TYPE[(ctx.stain.family ?? '').toLowerCase()]
    if (mapped) detected.stainType = mapped
    const text =
      typed.trim() ||
      [ctx.stain.stain, ctx.stain.surface].filter((s) => Boolean(s && s.trim())).join(' on ')
    return { text, detected, thumbnailUrl }
  }
  if (ctx.source === 'care-label' && ctx.care) {
    const detected: Partial<SolveInput> = {}
    const care = careFromSymbols(ctx.care.careSymbols ?? [])
    if (care) detected.careStatus = care
    // Treatment-only symbols (no-bleach / no-heat / no-iron) have NO CareStatus slot, so
    // careFromSymbols can't carry them. Forward them explicitly as careSymbols — the
    // engine reads SolveInput.careSymbols as hard constraints (the adversarial care-label
    // override). Without this the FALLBACK drops the label-specific restriction that the
    // agentic path already forwards via hints.hardConstraints.
    const careSymbols = restrictiveCareSymbols(ctx.care.careSymbols)
    if (careSymbols.length > 0) detected.careSymbols = careSymbols
    return { text: typed.trim(), detected, thumbnailUrl }
  }
  return { text: typed.trim(), thumbnailUrl }
}
