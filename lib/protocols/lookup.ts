import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import type { ProtocolCard, LookupResult } from '../types'
import { getAllCanonicalCards, isAdapterHealthy } from './db'

// ─── TASK-024 — Source-of-truth for protocol cards ──────────────────────────
// PROTOCOL_SOURCE env flag controls where lookup.ts loads from:
//   "json"     — original behavior, read data/core/*.json (default)
//   "supabase" — read protocol_cards table; fall back to JSON if DB is empty/down
// Set in Vercel + .env.local. After 30 days of clean Supabase operation in
// prod, the JSON fallback path can be removed.
const PROTOCOL_SOURCE = (process.env.PROTOCOL_SOURCE || 'json').toLowerCase()

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

// ─── Card normalizer — maps legacy core card format to ProtocolCard schema ──
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeCard(card: any): any {
  if (!card) return card
  // Already has spottingProtocol — no-op
  if (Array.isArray(card.spottingProtocol) && card.spottingProtocol.length > 0) return card

  // Map professionalProtocol.steps (string[]) → spottingProtocol
  if (card.professionalProtocol?.steps && Array.isArray(card.professionalProtocol.steps)) {
    card.spottingProtocol = card.professionalProtocol.steps.map((s: string, i: number) => {
      // Try to extract agent from step text (e.g. "1. Apply NSD to...")
      const agentMatch = s.match(/apply\s+([A-Z][A-Za-z₂0-9\s%°]+?)[\s,.]|use\s+([A-Z][A-Za-z₂0-9\s%°]+?)[\s,.]/i)
      const rawAgent = agentMatch ? (agentMatch[1] || agentMatch[2]).trim() : 'Apply'
      // Title-case the capture — the regex's /i flag lets lowercase first
      // letters through (e.g. "apply amyl acetate" → "amyl"), which leaks
      // schema-grammar to the user. Keep 2+ char all-caps acronyms
      // (POG / NSD / IPA) intact, sentence-case everything else.
      const agent = rawAgent
        .split(/\s+/)
        .map(w => (w.length >= 2 && w === w.toUpperCase()) ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ')
      return {
        step: i + 1,
        agent,
        technique: '',
        temperature: '',
        dwellTime: '',
        instruction: s.replace(/^\d+\.\s*/, '').trim(),
      }
    })
  }

  // Map diyProtocol → homeSolutions if missing
  if (!card.homeSolutions && card.diyProtocol?.steps) {
    card.homeSolutions = Array.isArray(card.diyProtocol.steps)
      ? card.diyProtocol.steps.map((s: string) => s.replace(/^\d+\.\s*/, '').trim())
      : []
  }

  // Map safetyMatrix → materialWarnings if missing
  if (!card.materialWarnings && card.safetyMatrix?.warnings) {
    card.materialWarnings = card.safetyMatrix.warnings
  }

  // Generate customerHandoff for core cards that don't have one
  if (!card.customerHandoff && card.title) {
    const diff = card.difficulty ?? 5
    const canTreat = diff <= 4 ? 'yes' : diff <= 7 ? 'likely' : 'high-risk'
    const surface = card.surface || 'the fabric'
    const stainFamily = card.stainFamily || 'stain'
    card.customerHandoff = {
      canTreat,
      customerScript: `This appears to be a ${stainFamily} stain on ${surface}. We'll treat it with our professional spotting process. ${canTreat === 'yes' ? `${surface} responds well to this type of treatment and we expect good results.` : canTreat === 'likely' ? "Results depend on how long the stain has been set, but we'll do our best and let you know." : "This is a challenging combination and we want to be upfront — full removal is not guaranteed. We'll treat it carefully and let you know what we find."}`,
      intakeNotes: {
        stainType: card.title || stainFamily,
        fiber: surface,
        treatment: `Professional ${stainFamily} spotting`,
        risk: canTreat === 'yes' ? 'Low' : canTreat === 'likely' ? 'Medium — results may vary' : 'High — no guarantee',
      },
      watchFor: (card.materialWarnings || []).slice(0, 2),
    }
  }

  return card
}

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

// TASK-045 follow-up — cosmetic color prefix strip. Common eval/user inputs
// like "White carpet" or "White cotton tablecloth" should collapse to the
// underlying substrate for lookup. Color alone doesn't change chemistry.
// Kept narrow and deterministic — only purely cosmetic adjectives that would
// never alter how a stain is treated. Stain-relevant fiber types (silk, wool,
// cotton, linen, etc.) are NOT in this list.
const COSMETIC_PREFIX = /^(white|black|off[-\s]?white|cream|ivory|beige|grey|gray|tan|dark|light|colored|natural|plain|dyed)\s+/i

function stripCosmeticPrefix(input: string): string {
  const stripped = input.replace(COSMETIC_PREFIX, '').trim()
  return stripped || input
}

function toSlug(input: string): string {
  return normalize(input)
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

function normalizeSurface(input: string): string {
  const n = normalize(input)
  if (n in SURFACE_NORMALIZE) return SURFACE_NORMALIZE[n]
  const stripped = stripCosmeticPrefix(n)
  if (stripped !== n && stripped in SURFACE_NORMALIZE) return SURFACE_NORMALIZE[stripped]
  return toSlug(stripped)
}

// ─── Index builder ──────────────────────────────────────────────────────────
function ensureLoaded(): Promise<void> {
  if (!_indexPromise) {
    _indexPromise = loadAll()
  }
  return _indexPromise
}

async function loadAll(): Promise<void> {
  // TASK-024: pick the card-source loader based on env flag.
  // The aliases + family keywords still come from JSON (out of scope).
  await Promise.all([
    loadCoreCardsRouted(),
    loadAliases(),
    loadFamilyKeywords(),
  ])
}

async function loadCoreCardsRouted(): Promise<void> {
  if (PROTOCOL_SOURCE === 'supabase') {
    const ok = await loadCoreCardsFromDb()
    if (!ok) {
      // Hard fall-back: DB unavailable. Load from JSON so solve still works.
      console.warn('[lookup] Supabase load failed — falling back to JSON.')
    }
    // Always overlay JSON cards that are missing from DB. This lets newly
    // added canonical cards ship immediately even when protocol_cards is the
    // primary source of truth, without overriding existing DB-backed cards.
    await loadCoreCards(true)
    return
  }
  await loadCoreCards()
}

async function loadCoreCardsFromDb(): Promise<boolean> {
  try {
    if (!(await isAdapterHealthy())) {
      console.warn('[lookup] protocol_cards adapter unhealthy — falling back to JSON.')
      return false
    }
    const cards = await getAllCanonicalCards()
    if (cards.length < 200) {
      console.warn(`[lookup] protocol_cards count=${cards.length} (<200) — falling back to JSON.`)
      return false
    }
    indexCards(cards)
    console.log(`[lookup] loaded ${cards.length} cards from Supabase.`)
    return true
  } catch (err) {
    console.warn('[lookup] DB load threw — falling back to JSON:', err)
    return false
  }
}

// Shared indexer extracted from loadCoreCards so the DB loader can use the
// same key-derivation logic. Populates coreIndex (4 key variants) + allCards.
function indexCards(cards: ProtocolCard[]): void {
  const seen = new Set<string>()
  for (const card of cards) {
    let stainCanonical: string
    let surfaceCanonical: string

    if (card.meta?.stainCanonical && card.meta?.surfaceCanonical) {
      stainCanonical = card.meta.stainCanonical
      surfaceCanonical = card.meta.surfaceCanonical
    } else if (card.id && card.id.includes('-')) {
      const parts = card.id.split('-')
      surfaceCanonical = parts[parts.length - 1]
      stainCanonical = parts.slice(0, -1).join('-')
      card.meta = card.meta ?? ({} as ProtocolCard['meta'])
      card.meta.stainCanonical = stainCanonical
      card.meta.surfaceCanonical = surfaceCanonical
    } else {
      continue
    }

    const key = `${stainCanonical}+${surfaceCanonical}`
    const dashKey = `${stainCanonical}-${surfaceCanonical}`
    const slugKey = `${toSlug(stainCanonical)}+${toSlug(surfaceCanonical)}`
    const slugDashKey = `${toSlug(stainCanonical)}-${toSlug(surfaceCanonical)}`

    if (!seen.has(key)) {
      seen.add(key)
      coreIndex.set(key, card)
      coreIndex.set(dashKey, card)
      coreIndex.set(slugKey, card)
      coreIndex.set(slugDashKey, card)
      allCards.push(card)
    }
  }
}

async function loadCoreCards(overlayOnly: boolean = false): Promise<void> {
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
      const dashKey = `${stainCanonical}-${surfaceCanonical}`
      // Also index with slugified keys so lookup (which uses toSlug) always hits
      const slugKey = `${toSlug(stainCanonical)}+${toSlug(surfaceCanonical)}`
      const slugDashKey = `${toSlug(stainCanonical)}-${toSlug(surfaceCanonical)}`

      if (!seen.has(key)) {
        seen.add(key)

        if (
          overlayOnly &&
          (coreIndex.has(key) || coreIndex.has(dashKey) || coreIndex.has(slugKey) || coreIndex.has(slugDashKey))
        ) {
          continue
        }

        coreIndex.set(key, card)
        coreIndex.set(dashKey, card)
        coreIndex.set(slugKey, card)
        coreIndex.set(slugDashKey, card)
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
 *
 * TASK-045 follow-up: surface input is tried in both original and
 * cosmetic-prefix-stripped form so "White carpet" hits the same card as
 * "carpet" and "White cotton tablecloth" resolves through "cotton tablecloth"
 * alias to "cotton". Original form is tried FIRST so specific cards
 * (e.g. a hypothetical "red-wine-white-carpet") still win when they exist.
 */
export async function lookupProtocol(
  stainInput: string,
  surfaceInput: string,
): Promise<LookupResult> {
  await ensureLoaded()

  const stainNorm = normalize(stainInput)
  const surfaceNorm = normalize(surfaceInput)
  const surfaceNormStripped = stripCosmeticPrefix(surfaceNorm)
  const stainSlug = toSlug(stainInput)
  const surfaceSlug = normalizeSurface(surfaceInput)
  const surfaceSlugStripped = normalizeSurface(surfaceNormStripped)

  // Surface variants to try, in preference order (specific → general)
  type SurfaceVariant = { norm: string; slug: string }
  const surfaceVariants: SurfaceVariant[] = [{ norm: surfaceNorm, slug: surfaceSlug }]
  if (surfaceNormStripped !== surfaceNorm || surfaceSlugStripped !== surfaceSlug) {
    surfaceVariants.push({ norm: surfaceNormStripped, slug: surfaceSlugStripped })
  }

  // ── Tier 1: Exact canonical match ─────────────────────────────────────
  for (const { slug } of surfaceVariants) {
    const exactKey = `${stainSlug}+${slug}`
    const exactKeyDash = `${stainSlug}-${slug}`
    const exactCard = coreIndex.get(exactKey) ?? coreIndex.get(exactKeyDash)
    if (exactCard) {
      return { card: normalizeCard(exactCard), tier: 1, confidence: 1.0, source: 'core' }
    }
  }

  // ── Tier 2: Alias resolution ──────────────────────────────────────────
  const resolvedStain = stainAliases[stainNorm] ?? stainAliases[stainSlug] ?? stainSlug

  for (const { norm, slug } of surfaceVariants) {
    const resolvedSurface = surfaceAliases[norm] ?? surfaceAliases[slug] ?? slug
    const aliasKey = `${resolvedStain}+${resolvedSurface}`
    const baseKey = `${stainSlug}+${slug}`

    // Prefer preserving the more specific user stain when only the surface
    // needs alias resolution, e.g. "black tea" + "cotton tablecloth" should
    // hit black-tea-cotton before falling back to a generic tea-cotton card.
    for (const tryKey of [
      `${stainSlug}+${resolvedSurface}`,
      `${resolvedStain}+${slug}`,
      aliasKey,
    ]) {
      if (tryKey !== baseKey) {
        const card = coreIndex.get(tryKey)
        if (card) {
          return { card: normalizeCard(card), tier: 2, confidence: tryKey === aliasKey ? 0.9 : 0.85, source: 'core' }
        }
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
export function detectFamily(stain: string): string | null {
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
