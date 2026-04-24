// lib/ui/chemistryFamily.ts
//
// Chemistry family taxonomy — single source for Badge tones + user-facing
// labels across:
//   - chemicals reference page (agent badges)
//   - ResultCard (stain-family badges)
//   - future step-level agent badges
//   - brand/product badges (via the crosswalk in data/chemicals/*)
//
// Rule (Atlas 7993 + 8037): same chemistry meaning → same badge label →
// same color, everywhere. No palette values or label strings live in
// components; everything resolves through these two helpers.
//
// Status: SCAFFOLD. The function shapes + type contracts are locked — Lab
// uses these from BadgeLink / CardBadges / chemicals page without waiting.
// The actual tone + label mappings land when Nova's palette + taxonomy
// deep-dive hands back (tagged TODO inline).

import type { BadgeTone } from '@/components/ui/Badge'

/** A resolved family badge — what to render AND what semantic it carries. */
export type FamilyBadge = {
  /** Badge tone (drives color). */
  tone: BadgeTone
  /** User-facing label (Title-Case, matches spoken / written canonical). */
  label: string
  /**
   * Canonical family key. Stable identifier for deep-links (e.g.
   * `/pro/chemicals?family=tannin`) and for joining the quick-reference
   * content index.
   */
  familyKey: FamilyKey
}

/**
 * Canonical family keys. Kept narrow on purpose — adding a family requires
 * Nova + Atlas review + Badge.tsx tone addition + quick-ref content entry.
 * The `unknown` fallback exists only so resolvers always return something
 * renderable; it should never be a deliberate assignment.
 */
export type FamilyKey =
  | 'protein'
  | 'tannin'
  | 'oil'
  | 'dye'
  | 'rust'
  | 'combination'
  | 'unknown'

// TODO(nova): final tone + label strings land here after the deep-dive.
// Today's scaffold maps every family to a placeholder that renders with the
// neutral tone so nothing breaks visually while we wait for palette lock-in.
// As soon as the palette is approved, replace `neutral` with the approved
// chemistry-family tones from Badge.tsx v2.
const FAMILY_REGISTRY: Record<FamilyKey, FamilyBadge> = {
  protein:     { tone: 'neutral', label: 'Protein',     familyKey: 'protein' },
  tannin:      { tone: 'neutral', label: 'Tannin',      familyKey: 'tannin' },
  oil:         { tone: 'neutral', label: 'Oil / Grease', familyKey: 'oil' },
  dye:         { tone: 'neutral', label: 'Dye',         familyKey: 'dye' },
  rust:        { tone: 'neutral', label: 'Rust',        familyKey: 'rust' },
  combination: { tone: 'neutral', label: 'Combination', familyKey: 'combination' },
  unknown:     { tone: 'neutral', label: 'Unknown',     familyKey: 'unknown' },
}

/**
 * Chemicals-page agent key → family badge.
 * Matches the `AGENT_KEYS` array in `app/pro/chemicals/page.tsx`.
 *
 * TODO(nova): finalize the agent-key → family assignments. The mapping below
 * is Lab's best guess based on what each agent chemically treats — Nova
 * should validate against her deep-dive before we ship colored badges.
 * These assignments affect the ResultCard ↔ chemicals cross-surface color
 * sync that Atlas specified in 7993.
 */
export function agentFamily(agentKey: string): FamilyBadge {
  switch (agentKey) {
    // Strong — what the agent targets
    case 'protein':          return FAMILY_REGISTRY.protein
    case 'enzymatic':        return FAMILY_REGISTRY.protein
    case 'tannin':           return FAMILY_REGISTRY.tannin
    case 'POG':              return FAMILY_REGISTRY.oil
    case 'solvent':          return FAMILY_REGISTRY.oil
    case 'rustRemover':      return FAMILY_REGISTRY.rust

    // Ambiguous — Nova decides whether to keep these on `combination` or
    // pull them into a dedicated family (e.g. "oxidation", "dye-side")
    case 'oxidizingBleach':  return FAMILY_REGISTRY.combination
    case 'reducingAgent':    return FAMILY_REGISTRY.combination
    case 'leveling':         return FAMILY_REGISTRY.combination

    // General-purpose / multi-family
    case 'NSD':                   return FAMILY_REGISTRY.combination
    case 'wetCleaningDetergent':  return FAMILY_REGISTRY.combination
    case 'finishingAgent':        return FAMILY_REGISTRY.combination

    default:                      return FAMILY_REGISTRY.unknown
  }
}

/**
 * ResultCard stain-type string → family badge.
 * Accepts the raw `card.stainType` value (legacy schema uses several
 * slightly different spellings across the 267 cards — normalise before
 * matching).
 */
export function stainFamily(stainType: string | null | undefined): FamilyBadge {
  if (!stainType) return FAMILY_REGISTRY.unknown
  const k = stainType.toLowerCase().trim().replace(/[\s_]/g, '-')
  switch (k) {
    case 'protein':       return FAMILY_REGISTRY.protein
    case 'tannin':        return FAMILY_REGISTRY.tannin
    case 'oil':
    case 'grease':
    case 'oil-grease':
    case 'oil/grease':    return FAMILY_REGISTRY.oil
    case 'dye':
    case 'ink':
    case 'dye-ink':       return FAMILY_REGISTRY.dye
    case 'rust':
    case 'oxidizable':
    case 'oxidation':     return FAMILY_REGISTRY.rust
    case 'combination':
    case 'mixed':         return FAMILY_REGISTRY.combination
    default:              return FAMILY_REGISTRY.unknown
  }
}

/** Deep-link target for the "see full reference" CTA on the quick-ref modal. */
export function familyReferenceUrl(familyKey: FamilyKey): string {
  return `/pro/chemicals?family=${encodeURIComponent(familyKey)}`
}
