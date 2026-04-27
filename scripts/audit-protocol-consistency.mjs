#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { homedir } from 'node:os'

const root = process.cwd()
const labRoot = path.resolve(process.env.LAB_OUTPUT_ROOT ?? path.join(homedir(), 'lab/output'))
const outDir = path.join(root, 'artifacts/protocol-factory')
mkdirSync(outDir, { recursive: true })

const KNOWN_STAIN_ALIASES = new Map([
  ['blood-dried', 'Dried Blood'],
  ['coffee-cream', 'Coffee with Cream'],
  ['coffee-with-cream', 'Coffee with Cream'],
  ['candle-wax', 'Candle Wax'],
  ['motor-oil', 'Motor Oil'],
  ['pet-urine', 'Pet Urine'],
  ['red-wine', 'Red Wine'],
  ['dye-transfer', 'Dye Transfer'],
  ['dye-transfer-white', 'Dye Transfer on White'],
])

function safeJson(file) { try { return JSON.parse(readFileSync(file, 'utf8')) } catch { return null } }
function isObject(x) { return Boolean(x) && typeof x === 'object' && !Array.isArray(x) }
function isCardShape(card) {
  if (!isObject(card)) return false
  const hasIdentity = Boolean(card.id || card.card_key || card.title)
  const hasSurface = Boolean(card.surface || card.surface_canonical || card?.meta?.surfaceCanonical)
  const hasProtocol = Array.isArray(card.spottingProtocol) || Array.isArray(card.homeSolutions) || isObject(card.safetyMatrix)
  return hasIdentity && hasSurface && hasProtocol
}
function normalKey(card, fallback) { return String(card?.id ?? card?.card_key ?? fallback).toLowerCase().replaceAll('_', '-') }
function titleCasePart(s) {
  const raw = String(s)
  if (KNOWN_STAIN_ALIASES.has(raw)) return KNOWN_STAIN_ALIASES.get(raw)
  return raw.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}
function expectedTitle(stain, surface) { return `${titleCasePart(stain)} on ${titleCasePart(surface)}` }
function issueCategory(issue) {
  if (issue.includes('missing sources')) return 'sources_missing'
  if (issue.includes('missing safety note')) return 'step_safety_note_missing'
  if (issue.startsWith('title mismatch')) return 'title_mismatch'
  if (issue.includes('missing step title')) return 'step_title_missing'
  if (issue.includes('missing instruction')) return 'instruction_missing'
  if (issue.includes('dwell') || issue.includes('timing')) return 'timing_missing'
  if (issue.includes('meta.tags')) return 'badges_missing'
  if (issue.includes('safetyMatrix')) return 'safety_matrix_missing'
  if (issue.includes('homeSolutions')) return 'home_protocol_missing'
  if (issue.includes('spottingProtocol')) return 'pro_protocol_missing'
  if (issue.includes('id/card key')) return 'key_mismatch'
  return 'other'
}
function audit(card, key) {
  const issues = []
  const stain = String(card?.stain_canonical ?? card?.meta?.stainCanonical ?? key.split('-').slice(0, -1).join('-') ?? '')
  const surface = String(card?.surface_canonical ?? card?.meta?.surfaceCanonical ?? key.split('-').at(-1) ?? '')
  const title = String(card?.title ?? '')
  if (!title) issues.push('missing title')
  const canonicalTitle = expectedTitle(stain, surface)
  if (stain && surface && title && title !== canonicalTitle) issues.push(`title mismatch: expected "${canonicalTitle}"`)
  if (String(card?.id ?? '').replaceAll('_', '-') !== key) issues.push('id/card key mismatch')
  const pro = Array.isArray(card?.spottingProtocol) ? card.spottingProtocol : []
  if (!pro.length) issues.push('missing spottingProtocol')
  pro.forEach((step, i) => {
    if (Number(step?.step) !== i + 1) issues.push(`pro step ${i + 1}: non-sequential step number`)
    if (!step?.agent) issues.push(`pro step ${i + 1}: missing step title/agent`)
    if (!step?.instruction) issues.push(`pro step ${i + 1}: missing instruction`)
    if (!step?.dwellTime && !step?.dwell) issues.push(`pro step ${i + 1}: missing dwell/process timing`)
    if (!step?.safetyNote) issues.push(`pro step ${i + 1}: missing safety note`)
  })
  const home = Array.isArray(card?.homeSolutions) ? card.homeSolutions : []
  if (!home.length) issues.push('missing homeSolutions')
  home.forEach((step, i) => {
    if (!step?.agent) issues.push(`home step ${i + 1}: missing step title/agent`)
    if (!step?.instruction) issues.push(`home step ${i + 1}: missing instruction`)
  })
  if (!card?.stainChemistry && !card?.whyThisWorks) issues.push('missing chemistry/why-this-works text')
  if (!card?.safetyMatrix?.neverDo?.length) issues.push('missing safetyMatrix.neverDo')
  if (!card?.meta?.tags?.length) issues.push('missing meta.tags badges')
  if (!card?.sources?.length) issues.push('missing sources')
  return { stain, surface, title, canonicalTitle, issues }
}
function files() {
  const all = []
  for (const [dir, source] of [[path.join(root, 'data/core'), 'core'], [path.join(root, 'data/core-drafts'), 'core-draft']]) {
    if (existsSync(dir)) for (const f of readdirSync(dir).filter(x => x.endsWith('.json'))) all.push({ source, file: path.join(dir, f), taskId: null })
  }
  if (existsSync(labRoot)) for (const taskId of readdirSync(labRoot)) {
    const dir = path.join(labRoot, taskId)
    if (existsSync(dir) && statSync(dir).isDirectory()) for (const f of readdirSync(dir).filter(x => x.endsWith('.json'))) all.push({ source: 'lab-draft', file: path.join(dir, f), taskId })
  }
  return all
}

const skipped = []
const rows = []
for (const x of files()) {
  const card = safeJson(x.file)
  if (!isCardShape(card)) {
    skipped.push({ ...x, reason: card ? 'not card-shaped json' : 'invalid json' })
    continue
  }
  const fallback = path.basename(x.file).replace(/-v\d+\.json$/, '').replace(/\.json$/, '')
  const key = normalKey(card, fallback)
  const a = audit(card, key)
  rows.push({ key, ...x, title: a.title, canonicalTitle: a.canonicalTitle, stain: a.stain, surface: a.surface, issueCount: a.issues.length, issues: a.issues, categories: [...new Set(a.issues.map(issueCategory))] })
}
rows.sort((a,b) => a.key.localeCompare(b.key) || a.source.localeCompare(b.source))

const categoryCounts = rows.flatMap(r => r.issues.map(issueCategory)).reduce((acc, c) => { acc[c] = (acc[c] ?? 0) + 1; return acc }, {})
const titlePreview = rows
  .filter(r => r.title && r.canonicalTitle && r.title !== r.canonicalTitle)
  .map(r => ({ key: r.key, source: r.source, currentTitle: r.title, canonicalTitle: r.canonicalTitle, file: r.file }))

const generatedAt = new Date().toISOString()
writeFileSync(path.join(outDir, 'protocol-consistency-audit.json'), JSON.stringify({ generatedAt, total: rows.length, flagged: rows.filter(r => r.issueCount).length, skipped: skipped.length, categoryCounts, titlePreview, rows, skippedFiles: skipped }, null, 2))
const md = [
  '# Protocol Consistency Audit',
  '',
  `Generated: ${generatedAt}`,
  '',
  `Card files scanned: ${rows.length}`,
  `Flagged: ${rows.filter(r => r.issueCount).length}`,
  `Skipped non-card JSON: ${skipped.length}`,
  '',
  '## Flag category breakdown',
  '',
  '| Category | Count |',
  '|---|---:|',
  ...Object.entries(categoryCounts).sort((a,b) => b[1] - a[1]).map(([k,v]) => `| ${k} | ${v} |`),
  '',
  '## Title normalization preview (no writes)',
  '',
  '| Combo | Source | Current | Canonical preview |',
  '|---|---|---|---|',
  ...(titlePreview.length ? titlePreview.map(r => `| ${r.key} | ${r.source} | ${String(r.currentTitle).replaceAll('|','/')} | ${String(r.canonicalTitle).replaceAll('|','/')} |`) : ['| — | — | clean | — |']),
  '',
  '## Per-card audit',
  '',
  '| Combo | Source | Title | Flags |',
  '|---|---|---|---|',
  ...rows.map(r => `| ${r.key} | ${r.source} | ${String(r.title).replaceAll('|','/')} | ${r.issues.length ? r.issues.join('<br>') : 'clean'} |`),
  '',
  '## Skipped non-card JSON',
  '',
  '| Source | File | Reason |',
  '|---|---|---|',
  ...(skipped.length ? skipped.map(s => `| ${s.source} | ${s.file.replace(root, '').replace(homedir(), '~')} | ${s.reason} |`) : ['| — | — | none |']),
].join('\n')
writeFileSync(path.join(outDir, 'protocol-consistency-audit.md'), md)
console.log(`protocol audit: ${rows.length} card files, ${rows.filter(r => r.issueCount).length} flagged, ${skipped.length} skipped`)
console.log('top categories:', Object.entries(categoryCounts).sort((a,b) => b[1] - a[1]).slice(0, 5).map(([k,v]) => `${k}=${v}`).join(', '))
console.log(path.join(outDir, 'protocol-consistency-audit.md'))
