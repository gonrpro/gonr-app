// scripts/migrate-cards-to-db.ts
// TASK-024 — One-time migration: read 262 JSON cards, upsert into protocol_cards.
//
// Run: npx tsx scripts/migrate-cards-to-db.ts
//
// Idempotent — re-running is safe. Existing rows with the same card_key get
// version-bumped and the prior version is marked is_active=false (audit trail).
// Migration script bypasses RLS via service role key.

import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'
import type { ProtocolCard } from '../lib/types'
import { buildCardKey, toSlug } from '../lib/protocols/db'
import { validateCardDwells } from '../lib/protocols/validateDwell'

const DATA_DIR = join(process.cwd(), 'data')
const CORE_DIR = join(DATA_DIR, 'core')

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('FATAL: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for migration.')
    process.exit(1)
  }
  return createClient(url, key)
}

// Same normalizer logic as lib/protocols/lookup.ts:normalizeCard.
// Inlined here so the migration script is self-contained and the migration
// output matches what the runtime adapter expects.
function normalizeCard(card: ProtocolCard | Record<string, unknown>): ProtocolCard {
  const c = card as ProtocolCard
  if (!c) return c
  if (Array.isArray(c.spottingProtocol) && c.spottingProtocol.length > 0) return c

  // Map professionalProtocol.steps (string[]) → spottingProtocol
  const proSteps = (c as unknown as { professionalProtocol?: { steps?: string[] } }).professionalProtocol?.steps
  if (Array.isArray(proSteps)) {
    c.spottingProtocol = proSteps.map((s, i) => {
      const agentMatch = s.match(/apply\s+([A-Z][A-Za-z₂0-9\s%°]+?)[\s,.]|use\s+([A-Z][A-Za-z₂0-9\s%°]+?)[\s,.]/i)
      return {
        step: i + 1,
        agent: agentMatch ? (agentMatch[1] || agentMatch[2]).trim() : 'Apply',
        technique: '',
        temperature: '',
        dwellTime: '',
        instruction: s.replace(/^\d+\.\s*/, '').trim(),
      }
    })
  }

  return c
}

function deriveCanonicals(card: ProtocolCard): { stain: string; surface: string } | null {
  if (card.meta?.stainCanonical && card.meta?.surfaceCanonical) {
    return { stain: card.meta.stainCanonical, surface: card.meta.surfaceCanonical }
  }
  if (card.id && card.id.includes('-')) {
    const parts = card.id.split('-')
    return { stain: parts.slice(0, -1).join('-'), surface: parts[parts.length - 1] }
  }
  return null
}

interface MigrationResult {
  total: number
  inserted: number
  updated: number
  skipped: number
  errors: { file: string; reason: string }[]
}

async function migrate(): Promise<MigrationResult> {
  const supabase = getClient()
  const result: MigrationResult = { total: 0, inserted: 0, updated: 0, skipped: 0, errors: [] }

  const files = (await readdir(CORE_DIR)).filter(f => f.endsWith('.json'))
  // Sort '+' files first (same dedup-precedence rule as lookup.ts).
  files.sort((a, b) => (a.includes('+') ? 0 : 1) - (b.includes('+') ? 0 : 1))

  const seenKeys = new Set<string>()

  for (const file of files) {
    result.total++
    try {
      const raw = await readFile(join(CORE_DIR, file), 'utf-8')
      const card = normalizeCard(JSON.parse(raw))
      const canon = deriveCanonicals(card)
      if (!canon) {
        result.skipped++
        result.errors.push({ file, reason: 'cannot derive stainCanonical/surfaceCanonical' })
        continue
      }
      const cardKey = buildCardKey(canon.stain, canon.surface)
      if (seenKeys.has(cardKey)) {
        result.skipped++
        continue
      }
      seenKeys.add(cardKey)

      // Patch meta so the stored payload always carries the canonicals.
      card.meta = card.meta ?? ({} as ProtocolCard['meta'])
      card.meta.stainCanonical = canon.stain
      card.meta.surfaceCanonical = canon.surface

      // TASK-037 — block any card that carries a numeric dwell-time. Authors
      // must use soft descriptive language. See lib/protocols/validateDwell.ts.
      const dwellCheck = validateCardDwells(card)
      if (!dwellCheck.ok) {
        result.skipped++
        result.errors.push({ file, reason: `dwell validation failed: ${dwellCheck.reason}` })
        continue
      }

      // Look for existing canonical row.
      const { data: existing } = await supabase
        .from('protocol_cards')
        .select('id, version, data')
        .eq('card_key', cardKey)
        .is('plant_id', null)
        .eq('is_active', true)
        .maybeSingle()

      if (existing) {
        const existingVersion = (existing as { version: number }).version
        const existingId = (existing as { id: string }).id
        // Mark old version inactive
        await supabase.from('protocol_cards').update({ is_active: false }).eq('id', existingId)
        // Insert new version
        const { error: insertErr } = await supabase.from('protocol_cards').insert({
          card_key: cardKey,
          stain_canonical: toSlug(canon.stain),
          surface_canonical: toSlug(canon.surface),
          version: existingVersion + 1,
          is_active: true,
          data: card,
          source: 'core',
          plant_id: null,
          created_by: 'migration',
        })
        if (insertErr) {
          result.errors.push({ file, reason: `update insert failed: ${insertErr.message}` })
        } else {
          result.updated++
        }
      } else {
        const { error: insertErr } = await supabase.from('protocol_cards').insert({
          card_key: cardKey,
          stain_canonical: toSlug(canon.stain),
          surface_canonical: toSlug(canon.surface),
          version: 1,
          is_active: true,
          data: card,
          source: 'core',
          plant_id: null,
          created_by: 'migration',
        })
        if (insertErr) {
          result.errors.push({ file, reason: `insert failed: ${insertErr.message}` })
        } else {
          result.inserted++
        }
      }
    } catch (err) {
      result.errors.push({ file, reason: (err as Error).message })
    }
  }

  return result
}

async function main() {
  console.log('TASK-024 migration starting...')
  console.log(`Source: ${CORE_DIR}`)
  const t0 = Date.now()
  const result = await migrate()
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)

  console.log('')
  console.log(`Done in ${elapsed}s.`)
  console.log(`  total files:   ${result.total}`)
  console.log(`  inserted (new): ${result.inserted}`)
  console.log(`  updated (new version): ${result.updated}`)
  console.log(`  skipped (dup or unparseable): ${result.skipped}`)
  console.log(`  errors:        ${result.errors.length}`)
  if (result.errors.length > 0) {
    console.log('')
    console.log('Errors:')
    for (const e of result.errors.slice(0, 20)) {
      console.log(`  ${e.file}: ${e.reason}`)
    }
    if (result.errors.length > 20) {
      console.log(`  ...and ${result.errors.length - 20} more`)
    }
  }

  process.exit(result.errors.length > 0 ? 1 : 0)
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
