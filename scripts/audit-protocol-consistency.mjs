#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { homedir } from 'node:os'

const root = process.cwd()
const labRoot = path.resolve(process.env.LAB_OUTPUT_ROOT ?? path.join(homedir(), 'lab/output'))
const outDir = path.join(root, 'artifacts/protocol-factory')
mkdirSync(outDir, { recursive: true })

function safeJson(file) { try { return JSON.parse(readFileSync(file, 'utf8')) } catch { return null } }
function normalKey(card, fallback) { return String(card?.id ?? card?.card_key ?? fallback).toLowerCase().replaceAll('_', '-') }
function titleCasePart(s) { return String(s).split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') }
function expectedTitle(stain, surface) { return `${titleCasePart(stain)} on ${titleCasePart(surface)}` }
function audit(card, key) {
  const issues = []
  const stain = String(card?.stain_canonical ?? card?.meta?.stainCanonical ?? key.split('-').slice(0, -1).join('-') ?? '')
  const surface = String(card?.surface_canonical ?? card?.meta?.surfaceCanonical ?? key.split('-').at(-1) ?? '')
  const title = String(card?.title ?? '')
  if (!title) issues.push('missing title')
  if (stain && surface && title && title !== expectedTitle(stain, surface)) issues.push(`title mismatch: expected "${expectedTitle(stain, surface)}"`)
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
  return { stain, surface, title, issues }
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
const rows = files().map(x => {
  const card = safeJson(x.file)
  const fallback = path.basename(x.file).replace(/-v\d+\.json$/, '').replace(/\.json$/, '')
  const key = normalKey(card, fallback)
  const a = card ? audit(card, key) : { stain: '', surface: '', title: '', issues: ['invalid json'] }
  return { key, ...x, title: a.title, stain: a.stain, surface: a.surface, issueCount: a.issues.length, issues: a.issues }
}).sort((a,b) => a.key.localeCompare(b.key) || a.source.localeCompare(b.source))

writeFileSync(path.join(outDir, 'protocol-consistency-audit.json'), JSON.stringify({ generatedAt: new Date().toISOString(), total: rows.length, flagged: rows.filter(r => r.issueCount).length, rows }, null, 2))
const md = ['# Protocol Consistency Audit', '', `Generated: ${new Date().toISOString()}`, '', `Files: ${rows.length}`, `Flagged: ${rows.filter(r => r.issueCount).length}`, '', '| Combo | Source | Title | Flags |', '|---|---|---|---|', ...rows.map(r => `| ${r.key} | ${r.source} | ${String(r.title).replaceAll('|','/')} | ${r.issues.length ? r.issues.join('<br>') : 'clean'} |`)].join('\n')
writeFileSync(path.join(outDir, 'protocol-consistency-audit.md'), md)
console.log(`protocol audit: ${rows.length} files, ${rows.filter(r => r.issueCount).length} flagged`)
console.log(path.join(outDir, 'protocol-consistency-audit.md'))
