import ratifiedCards from '@/data/ratified-cards.json'
import { PAID_TIERS } from '@/lib/solve/sanitize-card'

export interface RatifiedCardEntry {
  cardId: string
  ratificationSource: string
  ratifiedAt: string
  notes?: string
}

export interface RatifiedCardAllowlist {
  schemaVersion: string
  task?: string
  description?: string
  entries: RatifiedCardEntry[]
}

const DEFAULT_ALLOWLIST = ratifiedCards as RatifiedCardAllowlist

export const RATIFIED_CARD_ALLOWLIST_VERSION = DEFAULT_ALLOWLIST.schemaVersion

export function isConsumerSolveTier(viewerTier: string | null | undefined): boolean {
  return !viewerTier || !PAID_TIERS.has(viewerTier)
}

function validEntry(entry: RatifiedCardEntry): boolean {
  return Boolean(
    entry &&
      typeof entry.cardId === 'string' &&
      entry.cardId.trim() &&
      typeof entry.ratificationSource === 'string' &&
      entry.ratificationSource.trim() &&
      typeof entry.ratifiedAt === 'string' &&
      entry.ratifiedAt.trim(),
  )
}

export function isCardRatifiedForConsumer(
  cardId: string | null | undefined,
  allowlist: RatifiedCardAllowlist = DEFAULT_ALLOWLIST,
): boolean {
  if (!cardId) return false
  const wanted = cardId.trim()
  return (allowlist.entries ?? []).some((entry) => validEntry(entry) && entry.cardId.trim() === wanted)
}

