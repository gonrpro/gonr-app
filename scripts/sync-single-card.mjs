#!/usr/bin/env node
/**
 * TASK-061 — sync a single protocol card JSON file to Supabase.
 *
 * Use when you've hand-edited one card in data/core/*.json and want
 * the change live on gonr.app WITHOUT running the full migrate-cards-to-db
 * pass over all 262+ cards (which bumps versions on everything).
 *
 * Updates `data` payload on the existing active, canonical row — no
 * version bump, no audit trail. Keep it for small benchmark rewrites
 * and hotfixes; use the full migrate for structural changes.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node scripts/sync-single-card.mjs data/core/red-wine-cotton.json
 *
 * Or sourced from the canonical Mac-mini creds file:
 *   eval "$(grep -E '^SUPABASE_(URL|SERVICE_KEY)=' ~/.openclaw/credentials/supabase \
 *     | sed -e 's/^SUPABASE_SERVICE_KEY=/SUPABASE_SERVICE_ROLE_KEY=/' -e 's/^/export /')" \
 *     && node scripts/sync-single-card.mjs data/core/red-wine-cotton.json
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const file = process.argv[2]
if (!file) {
  console.error('usage: node sync-single-card.mjs <path/to/card.json>')
  process.exit(1)
}

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in env')
  process.exit(1)
}

const card = JSON.parse(readFileSync(resolve(file), 'utf-8'))
const stainCanonical = card?.meta?.stainCanonical
const surfaceCanonical = card?.meta?.surfaceCanonical

// Fallback: derive card_key from filename or card.id when meta is missing
// (some older cards don't carry meta.stainCanonical/surfaceCanonical yet).
// card_key format in DB is `{stain}_{surface}`; filenames follow `stain-surface.json`.
// Stain may itself contain hyphens (baby-formula, coffee-cream, red-wine), so the
// LAST hyphen separates stain from surface — don't replace all hyphens.
const fileBase = file.split('/').pop().replace(/\.json$/, '')
function lastDashToUnderscore(s) {
  const i = s.lastIndexOf('-')
  return i === -1 ? s : `${s.slice(0, i)}_${s.slice(i + 1)}`
}
const derivedFromFile = lastDashToUnderscore(fileBase)
// Cover old single-dash naming too, in case any card_key predates the convention
const derivedFromFileSimple = fileBase.replace('-', '_')
const derivedFromId = card?.id ? lastDashToUnderscore(String(card.id)) : null

const supabase = createClient(url, key, { auth: { persistSession: false } })

let existing, fetchErr
if (stainCanonical && surfaceCanonical) {
  ({ data: existing, error: fetchErr } = await supabase
    .from('protocol_cards')
    .select('id, card_key, version, updated_at')
    .eq('stain_canonical', stainCanonical)
    .eq('surface_canonical', surfaceCanonical)
    .eq('is_active', true)
    .is('plant_id', null)
    .maybeSingle())
} else {
  const candidates = [...new Set([derivedFromFile, derivedFromId, derivedFromFileSimple].filter(Boolean))]
  if (!candidates.length) {
    console.error('card has no meta + no id/filename to derive card_key')
    process.exit(1)
  }
  ;({ data: existing, error: fetchErr } = await supabase
    .from('protocol_cards')
    .select('id, card_key, version, updated_at')
    .in('card_key', candidates)
    .eq('is_active', true)
    .is('plant_id', null)
    .maybeSingle())
}

if (fetchErr) {
  console.error('fetch failed:', fetchErr.message)
  process.exit(1)
}
if (!existing) {
  console.error(`no active canonical row for ${stainCanonical} on ${surfaceCanonical}`)
  process.exit(1)
}

const { error: updErr } = await supabase
  .from('protocol_cards')
  .update({ data: card })
  .eq('id', existing.id)

if (updErr) {
  console.error('update failed:', updErr.message)
  process.exit(1)
}

console.log(`synced ${existing.card_key} (id=${existing.id}, version=${existing.version})`)
console.log(`prior updated_at: ${existing.updated_at}`)
