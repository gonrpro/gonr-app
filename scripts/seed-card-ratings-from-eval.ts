#!/usr/bin/env tsx
/**
 * TASK-052 Stage A — seed card_ratings from eval outputs.
 *
 * Reads a manifest JSON that maps eval test id → canonical card_id + outcome,
 * and upserts card_ratings rows with source='internal_eval' (or 'gonr_lab' /
 * 'pilot' via flag). Strictly idempotent.
 *
 * Why a manifest instead of auto-parsing the eval runner output: the runner's
 * JSON doesn't carry card_id directly (only test.id + test.name + grade), and
 * we don't want to resolve test → card via a live /api/solve call from a
 * cold-start seed script. The pro team maintains the manifest by hand (once)
 * or via a small tool in a later follow-up.
 *
 * Usage:
 *   tsx scripts/seed-card-ratings-from-eval.ts <manifest.json> [--source gonr_lab]
 *
 * Manifest shape:
 *   [
 *     { "card_id": "blood-silk",       "grade": "A",  "worked": "yes", "run_id": "2026-04-15" },
 *     { "card_id": "red-wine-cotton",  "grade": "B",  "worked": "yes", "run_id": "2026-04-15" }
 *   ]
 *
 * Grade → stars mapping:
 *   A → 5, B → 4, C → 3, D → 2, F → 1  (or pass `stars` explicitly per row)
 *
 * Seed rows use rater_key = `<source>:<run_id>:<card_id>`, rater_tier = 'founder'.
 * That guarantees idempotency on re-run (unique on card_id + rater_key).
 */

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

type ManifestRow = {
  card_id: string
  grade?: 'A' | 'B' | 'C' | 'D' | 'F'
  stars?: number
  worked?: 'yes' | 'no' | 'partial'
  run_id?: string
  note?: string
}

type AllowedSource = 'internal_eval' | 'gonr_lab' | 'pilot'

const GRADE_TO_STARS: Record<string, number> = { A: 5, B: 4, C: 3, D: 2, F: 1 }

function parseArgs(): { manifestPath: string; source: AllowedSource } {
  const args = process.argv.slice(2)
  const manifestPath = args.find((a) => !a.startsWith('--'))
  if (!manifestPath) {
    console.error('Usage: tsx seed-card-ratings-from-eval.ts <manifest.json> [--source gonr_lab|internal_eval|pilot]')
    process.exit(2)
  }
  const sourceIdx = args.indexOf('--source')
  const sourceRaw = sourceIdx >= 0 ? args[sourceIdx + 1] : 'internal_eval'
  if (sourceRaw !== 'internal_eval' && sourceRaw !== 'gonr_lab' && sourceRaw !== 'pilot') {
    console.error(`Invalid --source: ${sourceRaw}. Must be internal_eval | gonr_lab | pilot.`)
    process.exit(2)
  }
  return { manifestPath, source: sourceRaw }
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.')
    process.exit(2)
  }
  return createClient(url, key)
}

async function main() {
  const { manifestPath, source } = parseArgs()
  const raw = readFileSync(manifestPath, 'utf8')
  const manifest = JSON.parse(raw) as ManifestRow[]
  if (!Array.isArray(manifest)) throw new Error('Manifest must be a JSON array.')

  const supabase = getSupabaseAdmin()
  let inserted = 0
  let skipped = 0
  let errored = 0

  for (const row of manifest) {
    if (!row.card_id) {
      console.warn('[skip] row missing card_id:', row)
      skipped++
      continue
    }
    const stars = row.stars ?? (row.grade ? GRADE_TO_STARS[row.grade] : undefined)
    if (!stars || stars < 1 || stars > 5) {
      console.warn(`[skip] ${row.card_id}: no valid stars (grade=${row.grade}, stars=${row.stars})`)
      skipped++
      continue
    }
    const worked = row.worked ?? (stars >= 4 ? 'yes' : stars === 3 ? 'partial' : 'no')
    const runId = row.run_id ?? 'unknown'
    const raterKey = `${source}:${runId}:${row.card_id}`

    const { error } = await supabase
      .from('card_ratings')
      .upsert(
        {
          card_id: row.card_id,
          rater_key: raterKey,
          rater_tier: 'founder',
          stars,
          worked,
          note: row.note ?? null,
          note_status: 'private',
          source,
          correlation_id: null,
        },
        { onConflict: 'card_id,rater_key' }
      )
    if (error) {
      console.error(`[error] ${row.card_id}: ${error.message}`)
      errored++
    } else {
      inserted++
    }
  }

  console.log(`\nSeed complete.`)
  console.log(`  source:   ${source}`)
  console.log(`  upserted: ${inserted}`)
  console.log(`  skipped:  ${skipped}`)
  console.log(`  errors:   ${errored}`)
  process.exit(errored > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
