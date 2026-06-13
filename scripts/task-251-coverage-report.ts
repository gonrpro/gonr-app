import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { decide } from '@/lib/decision/engine'

type CoreCard = {
  id: string
  stainFamily?: string
  stainType?: string
  meta?: { stainCanonical?: string; surfaceCanonical?: string }
}

type CaseRow = {
  label: string
  stain: string
  surface: string
  expectedCardId: string
  family: string
}

type FamilyStats = {
  cases: number
  beforeLibrary: number
  afterLibrary: number
  denied: number
  aiOrNoMatch: number
}

const root = process.cwd()
const coreDir = join(root, 'data', 'core')
const outDir = join(root, 'artifacts', 'task-251')
const outPath = join(outDir, 'coverage-report.md')

function slugToWords(value: string): string {
  return value.replace(/-/g, ' ')
}

function canonicalFromId(id: string): { stain: string; surface: string } {
  const parts = id.split('-')
  return { stain: parts.slice(0, -1).join('-'), surface: parts.at(-1) ?? '' }
}

async function loadJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T
}

async function buildCases(): Promise<CaseRow[]> {
  const files = (await readdir(coreDir)).filter((file) => file.endsWith('.json')).sort()
  const stainAliases = await loadJson<{ aliases?: Record<string, string> }>(join(root, 'data', 'stain-aliases.json'))
  const surfaceAliases = await loadJson<{ aliases?: Record<string, string> }>(join(root, 'data', 'surface-aliases.json'))
  const stainAliasByCanonical = new Map<string, string>()
  const surfaceAliasByCanonical = new Map<string, string>()

  for (const [alias, canonical] of Object.entries(stainAliases.aliases ?? {})) {
    if (!stainAliasByCanonical.has(canonical) && alias !== canonical) stainAliasByCanonical.set(canonical, alias)
  }
  for (const [alias, canonical] of Object.entries(surfaceAliases.aliases ?? {})) {
    if (!surfaceAliasByCanonical.has(canonical) && alias !== canonical) surfaceAliasByCanonical.set(canonical, alias)
  }

  const rows: CaseRow[] = []
  for (const file of files) {
    const card = await loadJson<CoreCard>(join(coreDir, file))
    const derived = canonicalFromId(card.id || basename(file, '.json'))
    const stainCanonical = card.meta?.stainCanonical ?? derived.stain
    const surfaceCanonical = card.meta?.surfaceCanonical ?? derived.surface
    const family = card.stainFamily ?? card.stainType ?? 'unknown'

    rows.push({
      label: 'exact',
      stain: slugToWords(stainCanonical),
      surface: slugToWords(surfaceCanonical),
      expectedCardId: card.id,
      family,
    })

    const stainAlias = stainAliasByCanonical.get(stainCanonical)
    const surfaceAlias = surfaceAliasByCanonical.get(surfaceCanonical)
    if (stainAlias || surfaceAlias) {
      rows.push({
        label: 'alias',
        stain: stainAlias ?? slugToWords(stainCanonical),
        surface: surfaceAlias ?? slugToWords(surfaceCanonical),
        expectedCardId: card.id,
        family,
      })
    }
  }
  return rows
}

function familyLine([family, stats]: [string, FamilyStats]): string {
  return `| ${family} | ${stats.cases} | ${stats.beforeLibrary} | ${stats.afterLibrary} | ${stats.denied} | ${stats.aiOrNoMatch} |`
}

async function main() {
  const cases = await buildCases()
  const families = new Map<string, FamilyStats>()
  let beforeLibrary = 0
  let afterLibrary = 0
  let denied = 0
  let aiOrNoMatch = 0

  for (const row of cases) {
    const before = await decide({ stain: row.stain, surface: row.surface, lang: 'en', viewerTier: 'founder' })
    const after = await decide({ stain: row.stain, surface: row.surface, lang: 'en', viewerTier: 'anon' })
    const stats = families.get(row.family) ?? { cases: 0, beforeLibrary: 0, afterLibrary: 0, denied: 0, aiOrNoMatch: 0 }
    stats.cases += 1

    if (before.card && before.source === 'core' && (before.tier === 1 || before.tier === 2)) {
      beforeLibrary += 1
      stats.beforeLibrary += 1
    }
    if (after.card && after.source === 'core' && (after.tier === 1 || after.tier === 2)) {
      afterLibrary += 1
      stats.afterLibrary += 1
    } else if (after.legacyDenied) {
      denied += 1
      stats.denied += 1
    } else {
      aiOrNoMatch += 1
      stats.aiOrNoMatch += 1
    }
    families.set(row.family, stats)
  }

  const lines = [
    '# TASK-251 Coverage Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Summary',
    '',
    `- Replay cases: ${cases.length}`,
    `- Before gate library tier-1/2 matches: ${beforeLibrary}`,
    `- After gate consumer library tier-1/2 serves: ${afterLibrary}`,
    `- After gate denied to safe fallback: ${denied}`,
    `- After gate AI/no-match path: ${aiOrNoMatch}`,
    `- Ratified allowlist: data/ratified-cards.json (initial entries: 0)`,
    '',
    '## Per-Family Breakdown',
    '',
    '| Family | Cases | Before library | After library | Denied | AI/no-match |',
    '|---|---:|---:|---:|---:|---:|',
    ...[...families.entries()].sort(([a], [b]) => a.localeCompare(b)).map(familyLine),
    '',
    '## Interpretation',
    '',
    'With the initial empty allowlist, anon/free/home traffic cannot receive legacy data/core card bodies. Every tier-1/2 match that founder/pro would have served is redirected to the safe fallback until a future allowlist entry cites explicit SB/source ratification.',
    '',
  ]

  await mkdir(outDir, { recursive: true })
  await writeFile(outPath, lines.join('\n'), 'utf8')
  console.log(outPath)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
