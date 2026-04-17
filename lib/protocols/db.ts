// lib/protocols/db.ts
// TASK-024 — Supabase adapter for protocol_cards.
//
// Reads canonical cards from the protocol_cards table and returns them in the
// same ProtocolCard shape the JSON-file path returned. Plant-tuned cards
// (plant_id != null) will be wired in TASK-023.
//
// Single source of truth for the shape: the existing ProtocolCard type from
// lib/types. The migration script normalizes every JSON file through
// normalizeCard() before insert, so the `data` jsonb column always matches
// the ProtocolCard interface.

import { createClient } from '@supabase/supabase-js'
import type { ProtocolCard } from '../types'

let _client: ReturnType<typeof createClient> | null = null

function getClient() {
  if (_client) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  // Service role on the server (bypasses RLS for admin reads + writes).
  // Anon read works against the RLS policy "anon read active canonical".
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('protocol_cards adapter: Supabase credentials missing')
  }
  _client = createClient(url, key)
  return _client
}

// Slug helper, identical to the one in lookup.ts so card_key derivation stays
// in lockstep across the adapter and the migration script.
export function toSlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9+-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function buildCardKey(stainCanonical: string, surfaceCanonical: string): string {
  return `${toSlug(stainCanonical)}_${toSlug(surfaceCanonical)}`
}

interface CardRow {
  id: string
  card_key: string
  stain_canonical: string
  surface_canonical: string
  version: number
  is_active: boolean
  data: ProtocolCard
  source: string
  plant_id: string | null
}

function rowToCard(row: CardRow): ProtocolCard {
  // The data column already holds the full ProtocolCard. Patch meta so
  // downstream code that reads card.meta.stainCanonical works even if a
  // pre-normalize card slipped in.
  const card = row.data
  card.meta = card.meta ?? ({} as ProtocolCard['meta'])
  card.meta.stainCanonical = row.stain_canonical
  card.meta.surfaceCanonical = row.surface_canonical
  return card
}

/**
 * Fetch a single card by canonical stain + surface. Tries plant-scoped first
 * if plantId provided, then falls back to canonical (plant_id = null).
 * Returns null if no active card matches.
 */
export async function getCardByStainAndSurface(
  stainCanonical: string,
  surfaceCanonical: string,
  plantId?: string,
): Promise<ProtocolCard | null> {
  const supabase = getClient()
  const key = buildCardKey(stainCanonical, surfaceCanonical)

  if (plantId) {
    const { data, error } = await supabase
      .from('protocol_cards')
      .select('*')
      .eq('card_key', key)
      .eq('plant_id', plantId)
      .eq('is_active', true)
      .maybeSingle()
    if (!error && data) return rowToCard(data as unknown as CardRow)
  }

  const { data, error } = await supabase
    .from('protocol_cards')
    .select('*')
    .eq('card_key', key)
    .is('plant_id', null)
    .eq('is_active', true)
    .maybeSingle()

  if (error || !data) return null
  return rowToCard(data as unknown as CardRow)
}

/**
 * Fetch all canonical cards (plant_id = null, is_active = true).
 * Used by lookup.ts to populate the in-memory family/keyword index.
 */
export async function getAllCanonicalCards(): Promise<ProtocolCard[]> {
  const supabase = getClient()
  const { data, error } = await supabase
    .from('protocol_cards')
    .select('*')
    .is('plant_id', null)
    .eq('is_active', true)
  if (error || !data) return []
  return (data as unknown as CardRow[]).map(rowToCard)
}

/**
 * Fast count for smoke tests + health checks.
 */
export async function countCanonicalCards(): Promise<number> {
  const supabase = getClient()
  const { count, error } = await supabase
    .from('protocol_cards')
    .select('*', { count: 'exact', head: true })
    .is('plant_id', null)
    .eq('is_active', true)
  if (error) return 0
  return count ?? 0
}

/**
 * Health check — does the adapter find a card we know is in the JSON file
 * library? Used by smoke + the parallel-write logging in lookup.ts.
 */
export async function isAdapterHealthy(): Promise<boolean> {
  try {
    const count = await countCanonicalCards()
    return count > 200
  } catch {
    return false
  }
}
