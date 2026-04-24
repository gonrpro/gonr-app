// TASK-056 — disambiguation prompts for ambiguous stain inputs.
//
// When a Spotter / Operator / Founder user submits a query like
// "outdoor couch cushion with a black mark" and the canonical lookup returns
// tier 4 (no match), we serve a disambiguation question instead of an
// AI-fallback card pretending certainty. Home / Free / Anon tiers continue
// through the existing AI-fallback path unchanged (Atlas 8243 lock).
//
// Scope:
//   - Static prompt tree. No LLM involvement in routing.
//   - Only triggers on the set of known ambiguous tokens below.
//   - Each refined_stain MUST correspond to a known stain canonical so the
//     re-solve hits the library (or, at worst, the existing no-verified-
//     protocol message for pro tiers). Aliases list is in data/stain-aliases.json.
//   - The "unknown" escape hatch is explicit: the user consented to a
//     general-baseline response and we disclose it prominently.

export type DisambiguationOption = {
  /** Display label on the pick button. */
  label: string
  /** Canonical stain token used on the re-solve (must resolve in lookup.ts). */
  refined_stain: string
  /** Optional clarifier shown under the label. */
  hint?: string
}

export type DisambiguationPrompt = {
  /** The raw stain token the user entered that triggered this prompt. */
  original_stain: string
  /** The human-readable question to show above the options. */
  question: string
  /** The picks the user can choose from. */
  options: DisambiguationOption[]
  /** The escape hatch. Same shape as a regular option but labeled distinctly. */
  unknown_option: DisambiguationOption
}

/**
 * Meta-stain suffix for explicit pro-tier consent to a general-baseline
 * AI response. The solve route recognizes this suffix, strips it for the
 * actual stain lookup, and attaches `ai_fallback_disclosure` to the response
 * so the client can render the prominent banner.
 */
export const UNKNOWN_META_SUFFIX = '-unknown-general'

export const AMBIGUOUS_STAIN_TOKENS = new Set<string>([
  'mark',
  'black mark',
  'dark mark',
  'dark spot',
  'spot',
  'stain',
  'spill',
  'discoloration',
  'ring',
  'blotch',
  'smudge',
])

function normalize(stain: string): string {
  return stain.trim().toLowerCase()
}

export function isAmbiguousStainInput(stain: string | null | undefined): boolean {
  if (!stain) return false
  return AMBIGUOUS_STAIN_TOKENS.has(normalize(stain))
}

/**
 * Recognizes the `<original>-unknown-general` meta-stain the disambiguation
 * UI fires when the user picks the Unknown option. Returns the original
 * stain + a flag indicating the user explicitly requested the general
 * baseline. When this matches, the solve route falls through to AI fallback
 * AND attaches the `ai_fallback_disclosure` field on the response.
 */
export function parseUnknownMetaStain(stain: string | null | undefined): { isUnknown: boolean; originalStain: string } {
  if (!stain) return { isUnknown: false, originalStain: '' }
  const norm = normalize(stain)
  if (norm.endsWith(UNKNOWN_META_SUFFIX)) {
    return { isUnknown: true, originalStain: norm.slice(0, -UNKNOWN_META_SUFFIX.length) }
  }
  return { isUnknown: false, originalStain: stain }
}

// Builds the unknown option for a given original stain. The refined_stain
// uses the meta-suffix so the server can recognize the user's explicit
// consent on the re-solve.
function unknownOption(originalStain: string): DisambiguationOption {
  return {
    label: 'Not sure / show me the general starting point',
    refined_stain: `${normalize(originalStain)}${UNKNOWN_META_SUFFIX}`,
    hint: 'Tested general steps. Labeled as a baseline, not stain-specific.',
  }
}

// ─── Prompt tree ───────────────────────────────────────────────────────────
// Keyed by the normalized original-stain token. Several ambiguous tokens
// share the same tree (mark / dark mark / dark spot all behave like black mark).
//
// refined_stain values target canonical aliases that exist in
// data/stain-aliases.json. Some picks (e.g., mildew, soot) may still miss
// the card library today — that's fine. The value is routing honesty; the
// pro-tier gate message will explain coverage gaps truthfully and the query
// lands in the solve review queue for the authoring sprint.

type TreeEntry = { question: string; options: DisambiguationOption[] }

const MARK_TREE: TreeEntry = {
  question: 'What kind of mark is this?',
  options: [
    { label: 'Ink or pen', refined_stain: 'ink-ballpoint', hint: 'Includes ballpoint, gel, marker' },
    { label: 'Oil or grease', refined_stain: 'cooking-oil', hint: 'Food oil, grease, lubricant' },
    { label: 'Paint', refined_stain: 'paint-oil', hint: 'Oil-based; switch to latex if water-based' },
    { label: 'Rubber scuff', refined_stain: 'rubber-scuff', hint: 'Shoe mark, tire transfer' },
    { label: 'Soot or charcoal', refined_stain: 'soot' },
    { label: 'Mildew', refined_stain: 'mildew', hint: 'Musty smell, often dark green or black' },
    { label: 'Metal residue or rust', refined_stain: 'rust' },
  ],
}

const SPOT_TREE: TreeEntry = {
  question: 'What kind of spot is this?',
  options: [
    { label: 'Food or drink', refined_stain: 'red-wine', hint: 'Pick closest: coffee, wine, tea, sauce…' },
    { label: 'Ink', refined_stain: 'ink-ballpoint' },
    { label: 'Oil or grease', refined_stain: 'cooking-oil' },
    { label: 'Dye transfer', refined_stain: 'dye-transfer', hint: 'Color bled from another fabric' },
    { label: 'Biological', refined_stain: 'blood', hint: 'Blood, urine, sweat — pick closest' },
    { label: 'Mildew', refined_stain: 'mildew' },
  ],
}

const SPILL_TREE: TreeEntry = {
  question: 'What spilled?',
  options: [
    { label: 'Food or drink', refined_stain: 'red-wine', hint: 'Pick closest: coffee, wine, tea, sauce…' },
    { label: 'Oil or grease', refined_stain: 'cooking-oil' },
    { label: 'Chemical', refined_stain: 'bleach-spot', hint: 'Bleach, solvent, cleaning product' },
  ],
}

const RING_TREE: TreeEntry = {
  question: 'What caused the ring?',
  options: [
    { label: 'Water ring', refined_stain: 'water-ring' },
    { label: 'Oil ring', refined_stain: 'cooking-oil' },
    { label: 'Coffee or tea ring', refined_stain: 'coffee-black' },
    { label: 'Sweat ring', refined_stain: 'sweat-stain' },
  ],
}

const DISCOLORATION_TREE: TreeEntry = {
  question: 'What kind of discoloration?',
  options: [
    { label: 'Yellowing (sweat, age)', refined_stain: 'sweat-stain' },
    { label: 'Color bleed', refined_stain: 'dye-transfer' },
    { label: 'Bleach damage', refined_stain: 'bleach-spot' },
    { label: 'Sun fade', refined_stain: 'sun-fade' },
  ],
}

const TREE_BY_TOKEN: Record<string, TreeEntry> = {
  'mark': MARK_TREE,
  'black mark': MARK_TREE,
  'dark mark': MARK_TREE,
  'dark spot': MARK_TREE,
  'blotch': MARK_TREE,
  'smudge': MARK_TREE,
  'spot': SPOT_TREE,
  'stain': SPOT_TREE,
  'spill': SPILL_TREE,
  'ring': RING_TREE,
  'discoloration': DISCOLORATION_TREE,
}

export function getDisambiguationPrompt(stain: string | null | undefined): DisambiguationPrompt | null {
  if (!stain) return null
  const token = normalize(stain)
  const tree = TREE_BY_TOKEN[token]
  if (!tree) return null
  return {
    original_stain: stain,
    question: tree.question,
    options: tree.options,
    unknown_option: unknownOption(stain),
  }
}
