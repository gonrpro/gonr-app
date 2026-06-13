#!/usr/bin/env node
// TASK-247 — post-build gate: the pro chemical corpus must never ship in
// unauthenticated static chunks. `.next/static/**` bypasses the proxy
// allowlist entirely (proxy.ts matcher excludes _next/static), so anything
// in a client chunk is world-readable regardless of route gating. This is
// the check that would have caught the TASK-237 leak when it was introduced.
//
// Wired as `postbuild` in package.json so every `npm run build` (local,
// pre-push, Vercel) runs it. Exit 1 = build fails.
//
// Two detection tiers, calibrated against the 2026-06-12 build:
//
// Tier 1 — corpus-unique brand terms, ZERO tolerance anywhere in any chunk.
// These names exist only in the pro corpus / pro rule additions; one hit in
// a chunk means corpus content (or pro rule-table regexes) got client-bundled.
//
// Tier 2 — NSD/POG conjunction. The bare acronyms cannot be zero-tolerance:
// they appear as 1–4-count UI strings across legacy solve/spotter surfaces
// and in PUBLIC SpottingBoard marketing copy (app/spottingboard/page.tsx).
// (Pre-TASK-250 the course module chunk also carried POG≈26 with NSD=0; that
// content is server-gated now.) Corpus content is
// different: it discusses BOTH agents densely
// (data/chemicals ≈ NSD 52 / POG 51; data/chemistry ≈ NSD 21 / POG 48).
// So the rule is per-chunk min(NSD, POG) — UI copy stays ≤4 on one side,
// a corpus leak puts both sides ≥20. Threshold 8 sits well clear of both.

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const chunksDir = join(root, '.next', 'static', 'chunks')

// Tier 1 — zero tolerance (mirrors lib/safety/rule-table.ts FORBIDDEN_CONSUMER_TERMS)
const FORBIDDEN_UNIQUE = [
  { id: 'bongo', re: /\bbongo\b/i },
  { id: 'streetan', re: /\bstreetan\b/i },
  { id: 'streepro', re: /\bstreepro\b/i },
  { id: 'mulsolite', re: /\bmulsolite\b/i },
  { id: 'pyratex', re: /\bpyratex\b/i },
  { id: 'formula-209', re: /(?:general\s+)?formula\s*(?:no\.?\s*)?209/i },
  // TASK-249 — plant-brain admin training-corpus fingerprints. Scenario ids +
  // distinctive pro-voice phrases that exist ONLY in
  // app/admin/plant-brain-intake/{scenarios,questions}.ts (verified corpus-only
  // before wiring; the client's literal scenario-id fallback was removed for
  // this). If corpus copy is rewritten, swap fingerprints in the same change.
  { id: 'pb-scenario-id', re: /red-wine-silk-3day/ },
  { id: 'pb-couture-restorer', re: /couture\s+textile\s+restorer/i },
  { id: 'pb-silk-pressure', re: /silk\s+records\s+pressure\s+marks/i },
  { id: 'pb-blood-question', re: /fresh\s+blood\s+on\s+a\s+cotton\s+shirt\s+walks\s+in/i },
  // TASK-250 — course training-corpus fingerprints. These are distinctive
  // phrases from lib/courses/module{1,2}.ts; they should only ride gated RSC
  // payloads, not static client chunks.
  { id: 'course-targeted-chemical-removal', re: /targeted,\s+chemical-level\s+removal\s+of\s+a\s+specific\s+substance/i },
  { id: 'course-judgment-under-pressure', re: /judgment\s+under\s+pressure/i },
  { id: 'course-pog-oil-component', re: /POG\s+first\s+for\s+the\s+oil\s+component/ },
  { id: 'course-set-stain-spanish', re: /Esta\s+mancha\s+se\s+ha\s+fijado/ },
]

// Tier 2 — corpus-density conjunction
const CONJUNCTION_TERMS = [/\bNSD\b/g, /\bPOG\b/g]
const CONJUNCTION_MIN_THRESHOLD = 8

// Dedupe durability: the static-public corpus copies removed in TASK-247 must
// not silently reappear — anything under public/ is one proxy bug away from
// world-readable.
const FORBIDDEN_PUBLIC_DIRS = ['public/data/chemicals', 'public/data/chemistry']

function listJsFiles(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    if (statSync(p).isDirectory()) out.push(...listJsFiles(p))
    else if (entry.endsWith('.js')) out.push(p)
  }
  return out
}

const failures = []

for (const rel of FORBIDDEN_PUBLIC_DIRS) {
  if (existsSync(join(root, rel))) {
    failures.push(`${rel}/ exists — pro corpus must not live under public/ (statically servable). Serve it from a gated route instead.`)
  }
}

if (!existsSync(chunksDir)) {
  console.error('[check-static-chunks] FAIL: .next/static/chunks not found — run after `next build`.')
  process.exit(1)
}

const files = listJsFiles(chunksDir)
for (const file of files) {
  const text = readFileSync(file, 'utf8')
  const name = file.slice(file.indexOf('.next'))

  for (const { id, re } of FORBIDDEN_UNIQUE) {
    const m = text.match(re)
    if (m) failures.push(`${name}: forbidden pro term "${m[0]}" (${id})`)
  }

  const counts = CONJUNCTION_TERMS.map((re) => (text.match(re) || []).length)
  const floor = Math.min(...counts)
  if (floor > CONJUNCTION_MIN_THRESHOLD) {
    failures.push(
      `${name}: NSD=${counts[0]} POG=${counts[1]} — both above ${CONJUNCTION_MIN_THRESHOLD}, corpus-density signature (UI copy never reaches this on both terms)`,
    )
  }
}

if (failures.length > 0) {
  console.error(`[check-static-chunks] FAIL — pro corpus content in unauthenticated static output (${failures.length}):`)
  for (const f of failures) console.error(`  - ${f}`)
  console.error('Fix: keep corpus imports in server components only (see app/pro/chemicals/page.tsx).')
  process.exit(1)
}

console.log(`[check-static-chunks] PASS — ${files.length} chunks scanned, no pro corpus content in static output.`)
