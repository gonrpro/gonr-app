import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import type { ProtocolCard, LookupResult } from '../types'

// ─── Paths ──────────────────────────────────────────────────────────────────
const DATA_DIR = join(process.cwd(), 'data')
const CORE_DIR = join(DATA_DIR, 'core')

// ─── Cached data (loaded once per server lifecycle) ─────────────────────────
let _indexPromise: Promise<void> | null = null

/** stainCanonical+surfaceCanonical -> ProtocolCard */
const coreIndex = new Map<string, ProtocolCard>()

/** All loaded cards for search / family matching */
const allCards: ProtocolCard[] = []

/** alias -> canonical stain name */
let stainAliases: Record<string, string> = {}

/** alias -> canonical surface name */
let surfaceAliases: Record<string, string> = {}

/** family id -> keyword list */
let familyKeywords: Record<string, string[]> = {}

// ─── Normalization ──────────────────────────────────────────────────────────
function normalize(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['']/g, "'")
    .replace(/\s+/g, ' ')
}

// Surface alias map — normalize UI surface names to card surface keys
const SURFACE_NORMALIZE: Record<string, string> = {
  'cotton-white': 'cotton',
  'cotton-color': 'cotton',
  'cotton color': 'cotton',
  'cotton white': 'cotton',
  'wool-cashmere': 'wool',
  'leather-suede': 'leather',
  'general fabric': 'cotton',
  'general': 'cotton',
}

function toSlug(input: string): string {
  return normalize(input)
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

function normalizeSurface(input: string): string {
  const n = normalize(input)
  return SURFACE_NORMALIZE[n] ?? toSlug(input)
}

// ─── Index builder ──────────────────────────────────────────────────────────
function ensureLoaded(): Promise<void> {
  if (!_indexPromise) {
    _indexPromise = loadAll()
  }
  return _indexPromise
}

async function loadAll(): Promise<void> {
  await Promise.all([
    loadCoreCards(),
    loadAliases(),
    loadFamilyKeywords(),
  ])
}

async function loadCoreCards(): Promise<void> {
  const files = await readdir(CORE_DIR)
  const jsonFiles = files.filter(f => f.endsWith('.json'))

  const seen = new Set<string>()

  // Sort so '+' files come first — they win the dedup race
  jsonFiles.sort((a, b) => {
    const aHasPlus = a.includes('+') ? 0 : 1
    const bHasPlus = b.includes('+') ? 0 : 1
    return aHasPlus - bHasPlus
  })

  for (const file of jsonFiles) {
    try {
      const raw = await readFile(join(CORE_DIR, file), 'utf-8')
      const card: ProtocolCard = JSON.parse(raw)

      // Support both v6 (meta.stainCanonical) and v5/new format (id: "stain-surface")
      let stainCanonical: string
      let surfaceCanonical: string

      if (card.meta?.stainCanonical && card.meta?.surfaceCanonical) {
        stainCanonical = card.meta.stainCanonical
        surfaceCanonical = card.meta.surfaceCanonical
      } else if (card.id && card.id.includes('-')) {
        // Derive from id: "blood-cotton" -> stain=blood, surface=cotton
        const parts = card.id.split('-')
        // Last part is surface if it's a known fiber/surface, otherwise use full id logic
        surfaceCanonical = parts[parts.length - 1]
        stainCanonical = parts.slice(0, -1).join('-')
        // Patch meta so downstream code works
        card.meta = card.meta ?? {} as any
        card.meta.stainCanonical = stainCanonical
        card.meta.surfaceCanonical = surfaceCanonical
      } else {
        continue
      }

      const key = `${stainCanonical}+${surfaceCanonical}`
      // Also index with dash separator for flexible lookup
      const dashKey = `${stainCanonical}-${surfaceCanonical}`

      if (!seen.has(key)) {
        seen.add(key)
        coreIndex.set(key, card)
        coreIndex.set(dashKey, card)
        allCards.push(card)
      }
    } catch {
      // Skip malformed files silently
    }
  }
}

async function loadAliases(): Promise<void> {
  try {
    const raw = await readFile(join(DATA_DIR, 'stain-aliases.json'), 'utf-8')
    const data = JSON.parse(raw)
    stainAliases = data.aliases ?? {}
  } catch {
    stainAliases = {}
  }

  try {
    const raw = await readFile(join(DATA_DIR, 'surface-aliases.json'), 'utf-8')
    const data = JSON.parse(raw)
    surfaceAliases = data.aliases ?? {}
  } catch {
    surfaceAliases = {}
  }
}

async function loadFamilyKeywords(): Promise<void> {
  try {
    const raw = await readFile(join(DATA_DIR, 'family-keywords.json'), 'utf-8')
    const data = JSON.parse(raw)
    const families = data.families ?? {}
    familyKeywords = {}
    for (const [familyId, familyData] of Object.entries(families)) {
      familyKeywords[familyId] = (familyData as any).keywords ?? []
    }
  } catch {
    familyKeywords = {}
  }
}

// ─── Lookup engine ──────────────────────────────────────────────────────────

/**
 * 4-tier protocol lookup:
 *   Tier 1 — exact canonical match (confidence 1.0)
 *   Tier 2 — alias-resolved match (confidence 0.85-0.9)
 *   Tier 3 — family-level fallback (confidence 0.5-0.7)
 *   Tier 4 — no match, caller uses AI (confidence 0)
 */
export async function lookupProtocol(
  stainInput: string,
  surfaceInput: string,
): Promise<LookupResult> {
  await ensureLoaded()

  const stainNorm = normalize(stainInput)
  const surfaceNorm = normalize(surfaceInput)
  const stainSlug = toSlug(stainInput)
  const surfaceSlug = normalizeSurface(surfaceInput)

  // ── Tier 1: Exact canonical match ─────────────────────────────────────
  const exactKey = `${stainSlug}+${surfaceSlug}`
  const exactKeyDash = `${stainSlug}-${surfaceSlug}`
  const exactCard = coreIndex.get(exactKey) ?? coreIndex.get(exactKeyDash)
  if (exactCard) {
    return { card: exactCard, tier: 1, confidence: 1.0, source: 'core' }
  }

  // ── Tier 2: Alias resolution ──────────────────────────────────────────
  const resolvedStain = stainAliases[stainNorm] ?? stainAliases[stainSlug] ?? stainSlug
  const resolvedSurface = surfaceAliases[surfaceNorm] ?? surfaceAliases[surfaceSlug] ?? surfaceSlug
  const aliasKey = `${resolvedStain}+${resolvedSurface}`

  if (aliasKey !== exactKey) {
    const aliasCard = coreIndex.get(aliasKey)
    if (aliasCard) {
      return { card: aliasCard, tier: 2, confidence: 0.9, source: 'core' }
    }
  }

  // Also try resolved stain with original surface and vice versa
  for (const tryKey of [
    `${resolvedStain}+${surfaceSlug}`,
    `${stainSlug}+${resolvedSurface}`,
  ]) {
    if (tryKey !== exactKey && tryKey !== aliasKey) {
      const card = coreIndex.get(tryKey)
      if (card) {
        return { card, tier: 2, confidence: 0.85, source: 'core' }
      }
    }
  }

  // ── Tier 3: Skip family fallback — wrong card is worse than AI ──────
  // Go straight to AI if no exact or alias match found.

  // ── Tier 4: No match ──────────────────────────────────────────────────
  return { card: null, tier: 4, confidence: 0, source: 'ai' }
}

/**
 * Detect which stain family a stain belongs to using family-keywords.json
 */
function detectFamily(stain: string): string | null {
  const stainLower = normalize(stain)
  const stainWords = stainLower.replace(/-/g, ' ')

  for (const [familyId, keywords] of Object.entries(familyKeywords)) {
    for (const keyword of keywords) {
      if (
        stainWords === keyword ||
        stainWords.includes(keyword) ||
        keyword.includes(stainWords)
      ) {
        return familyId
      }
    }
  }
  return null
}

// ─── Search ─────────────────────────────────────────────────────────────────

/**
 * Full-text search across all loaded protocol cards.
 * Searches title, tags, stainCanonical, surfaceCanonical.
 */
export async function searchProtocols(
  query: string,
  limit: number = 20,
): Promise<ProtocolCard[]> {
  await ensureLoaded()

  if (!query.trim()) return allCards.slice(0, limit)

  const terms = normalize(query).split(/\s+/)

  const scored = allCards.map(card => {
    const searchable = [
      card.title,
      card.meta.stainCanonical,
      card.meta.surfaceCanonical,
      ...(card.meta.tags ?? []),
      card.stainFamily ?? '',
      card.surface ?? '',
    ]
      .join(' ')
      .toLowerCase()

    let score = 0
    for (const term of terms) {
      if (searchable.includes(term)) score += 1
    }
    return { card, score }
  })

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.card)
}
