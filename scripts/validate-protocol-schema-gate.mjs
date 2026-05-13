#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'

const root = process.cwd()
const dataDir = path.join(root, 'data/core')
const outDir = path.join(root, 'artifacts/protocol-factory')
const reportJson = path.join(outDir, 'schema-gate-report.json')
const reportMd = path.join(outDir, 'schema-gate-report.md')

const allowedTriageGroups = new Set(['charge_ready', 'cleanup_required', 'pro_only', 'pull_until_reviewed'])

const defaultSidecar = path.join(homedir(), 'shared-workspace/stainbrain-output/gonr-triage-2026-05-12/triage-map.json')
const sidecarPath = process.env.GONR_TRIAGE_SIDECAR ?? defaultSidecar
const triageSidecar = loadTriageSidecar(sidecarPath)

function loadTriageSidecar(file) {
  if (!file || !existsSync(file)) return { byFile: new Map(), byId: new Map(), path: file, loaded: false }
  try {
    const raw = JSON.parse(readFileSync(file, 'utf8'))
    if (!Array.isArray(raw)) return { byFile: new Map(), byId: new Map(), path: file, loaded: false }
    const byFile = new Map()
    const byId = new Map()
    for (const row of raw) {
      if (row?.file) byFile.set(String(row.file), row.group)
      if (row?.id) byId.set(String(row.id), row.group)
    }
    return { byFile, byId, path: file, loaded: true }
  } catch {
    return { byFile: new Map(), byId: new Map(), path: file, loaded: false }
  }
}

function resolveTriage(card, file) {
  const relFile = path.relative(root, file)
  if (triageSidecar.byFile.has(relFile)) return { group: triageSidecar.byFile.get(relFile), source: 'sidecar' }
  if (card?.id && triageSidecar.byId.has(String(card.id))) return { group: triageSidecar.byId.get(String(card.id)), source: 'sidecar' }
  const embedded = triageGroup(card)
  if (!isBlank(embedded)) return { group: embedded, source: 'card' }
  return { group: null, source: 'missing' }
}
const requiredTopLevel = [
  'id',
  'title',
  'stainType',
  'stainFamily',
  'surface',
  'difficulty',
  'stainChemistry',
  'whyThisWorks',
  ['homeSolutions', 'diyProtocol'],
  ['spottingProtocol', 'professionalProtocol'],
  'safetyMatrix',
  'sources',
]
const requiredSafetyMatrix = [
  'neverDo',
  'fiberSensitivities',
  'chemicalBoundaries',
  'homeAllowed',
  'proOnly',
  'testFirst',
  'flushNeutralizeDry',
  'escalationTriggers',
  'sourceConfidence',
]
const highRiskTerms = [
  'solvent', 'pog', 'petroleum ether', 'dry solvent', 'mineral spirits', 'acetone', 'alcohol', 'ipa',
  'oxidizer', 'oxidizing', 'peroxide', 'hydrogen peroxide', 'sodium percarbonate', 'oxygen bleach', 'chlorine', 'bleach',
  'reducer', 'reducing', 'hydrosulfite', 'metabisulfite', 'bisulfite', 'rust remover', 'oxalic',
  'caustic', 'alkaline', 'ammonia', 'sodium hydroxide', 'lye',
  'enzyme', 'enzymatic', 'digestant',
  'heat', 'hot water', 'steam',
  'mechanical abrasion', 'abrasion', 'scrub', 'scrubbing', 'brush', 'agitate', 'agitation',
]
const reducerTerms = ['reducer', 'reducing', 'hydrosulfite', 'metabisulfite', 'bisulfite', 'sodium sulfite']
const oxidizerTerms = ['oxidizer', 'oxidizing', 'peroxide', 'hydrogen peroxide', 'oxygen bleach', 'sodium percarbonate', 'chlorine bleach', 'hypochlorite']
const flushTerms = ['flush', 'rinse', 'neutralize', 'neutralise']
const dwellTerms = ['dwell', 'minutes', 'minute', 'seconds', 'second', 'until', 'maximum', 'max', 'ceiling', 'stop', 'no longer', 'then rinse']
const shrinkOverpromise = [/guarantee[^.]{0,80}(no|won't|will not) shrink/i, /(no|zero) shrink(age)? risk/i, /prevents? shrink(age)?/i]
const proGatedChemistry = [
  { name: 'KOH', regex: /\bKOH\b|\bpotassium hydroxide\b/i },
  { name: 'lye / NaOH', regex: /\b(NaOH|sodium hydroxide|lye)\b/i },
  { name: 'VDS', regex: /\bVDS\b|\bvolatile dry solvent\b/i },
  { name: 'perchloroethylene', regex: /\bperchloroethylene\b/i },
  { name: 'Stoddard', regex: /\bStoddard\b/i },
  { name: 'amyl acetate', regex: /\bamyl acetate\b/i },
]
const ppeVentilationLanguage = /\b(PPE|ventilat|respirator|gloves|fume hood|well[- ]ventilated|nitrile|protective|eye protection|safety goggles)\b/i

function parseArgs(argv) {
  const args = { strict: false, scope: 'all', triage: null }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--strict') args.strict = true
    else if (arg === '--baseline' || arg === '--warn') args.strict = false
    else if (arg === '--scope') args.scope = argv[++i] ?? args.scope
    else if (arg.startsWith('--scope=')) args.scope = arg.slice('--scope='.length)
    else if (arg === '--changed') args.scope = 'changed'
    else if (arg === '--new') args.scope = 'new'
    else if (arg === '--all') args.scope = 'all'
    else if (arg === '--triage') args.triage = argv[++i] ?? args.triage
    else if (arg.startsWith('--triage=')) args.triage = arg.slice('--triage='.length)
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node scripts/validate-protocol-schema-gate.mjs [--strict] [--scope all|changed|new] [--triage charge_ready|cleanup_required|pro_only|pull_until_reviewed]')
      process.exit(0)
    }
  }
  if (!['all', 'changed', 'new'].includes(args.scope)) throw new Error(`Unsupported --scope ${args.scope}`)
  if (args.triage && !allowedTriageGroups.has(args.triage)) throw new Error(`Unsupported --triage ${args.triage}`)
  return args
}

function git(args) {
  try { return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch { return '' }
}

function rel(file) { return path.relative(root, file) }
function normalizeFile(file) { return path.resolve(root, file) }
function safeJson(file) {
  try { return { value: JSON.parse(readFileSync(file, 'utf8')) } } catch (error) { return { error: error.message } }
}
function isObject(value) { return Boolean(value) && typeof value === 'object' && !Array.isArray(value) }
function isBlank(value) { return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0) }
function hasAny(card, keys) { return keys.some(key => !isBlank(card?.[key])) }
function textOf(value) {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(textOf).join(' ')
  if (isObject(value)) return Object.values(value).map(textOf).join(' ')
  return ''
}
function includesAny(text, terms) {
  const haystack = text.toLowerCase()
  return terms.some(term => haystack.includes(term))
}
function titleCasePart(value) {
  return String(value || '').split('-').filter(Boolean).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}
function expectedTitle(card, fallbackKey) {
  const stain = card?.stain_canonical ?? card?.meta?.stainCanonical ?? fallbackKey.split('-').slice(0, -1).join('-')
  const surface = card?.surface_canonical ?? card?.meta?.surfaceCanonical ?? card?.surface ?? fallbackKey.split('-').at(-1)
  return stain && surface ? `${titleCasePart(stain)} on ${titleCasePart(surface)}` : ''
}
function issue(severity, code, message, pathName = '') { return { severity, code, message, path: pathName } }
function triageGroup(card) {
  return card?.triageGroup ?? card?.metadata?.triageGroup ?? card?.metadata?.triage_group ?? card?.meta?.triageGroup ?? card?.meta?.triage_group ?? card?.factory?.triageGroup ?? card?.factory?.triage_group
}
function proSteps(card) {
  if (Array.isArray(card?.spottingProtocol)) return card.spottingProtocol
  if (Array.isArray(card?.professionalProtocol)) return card.professionalProtocol
  if (Array.isArray(card?.professionalProtocol?.steps)) return card.professionalProtocol.steps
  return []
}
function stepField(step, names) {
  if (!isObject(step)) return ''
  for (const name of names) if (!isBlank(step[name])) return step[name]
  return ''
}
function stepText(step) { return textOf(step) }
function hasProOnlyFlag(card, step) {
  if (isObject(step) && step.proOnly === true) return true
  if (card?.safetyMatrix?.homeAllowed === false) return true
  if (Array.isArray(card?.safetyMatrix?.proOnly) && card.safetyMatrix.proOnly.length > 0) return true
  return false
}
function bannedChemFiberIssues(card, fileIssues) {
  const surface = String(card?.surface ?? card?.meta?.surfaceCanonical ?? '').toLowerCase()
  const allText = textOf(card)
  const combos = [
    { fiber: 'silk', chem: /\b(acetone|peroxide|hydrogen peroxide|oxygen bleach|oxiclean|chlorine|bleach|ammonia|caustic|hot water|steam|isopropyl|\bipa\b|alcohol)\b/i, label: 'silk + acetone/peroxide/bleach/ammonia/alcohol/heat' },
    { fiber: 'wool', chem: /\b(chlorine|hypochlorite|bleach|caustic|sodium hydroxide|lye|hot water|steam)\b/i, label: 'wool + chlorine/caustic/heat' },
    { fiber: 'linen', chem: /\b(chlorine bleach|hypochlorite|hot water|hot dryer|steam)\b/i, label: 'linen + chlorine/high heat' },
    { fiber: 'denim', chem: /\b(chlorine bleach|hypochlorite)\b/i, label: 'denim + chlorine bleach' },
    { fiber: 'leather', chem: /\b(peroxide|oxygen bleach|chlorine|acetone|alcohol|ammonia|enzyme|hot water|steam)\b/i, label: 'leather + aggressive chemistry/heat' },
    { fiber: 'upholstery', chem: /\b(pour|soak|saturate|flood)\b/i, label: 'upholstery + overwetting language' },
    { fiber: 'carpet', chem: /\b(pour|soak|saturate|flood)\b/i, label: 'carpet + overwetting language' },
  ]
  for (const combo of combos) {
    if (surface.includes(combo.fiber) && combo.chem.test(allText)) {
      const guardText = textOf([card?.safetyMatrix?.neverDo, card?.professionalProtocol?.warnings, card?.materialWarnings]).toLowerCase()
      const guarded = guardText.includes('never') && combo.chem.test(guardText)
      if (!guarded) fileIssues.push(issue('error', 'banned_chem_fiber_combo', `Banned/high-risk combo needs explicit NEVER/guardrail: ${combo.label}`, 'safetyMatrix.neverDo'))
    }
  }
}

function auditCard(card, file) {
  const issues = []
  const key = path.basename(file, '.json')

  for (const req of requiredTopLevel) {
    if (Array.isArray(req)) {
      if (!hasAny(card, req)) issues.push(issue('error', 'missing_required_top_level', `Missing required top-level one-of: ${req.join(' or ')}`, req.join('|')))
    } else if (isBlank(card?.[req])) {
      const code = req === 'sources' ? 'missing_sources' : 'missing_required_top_level'
      const label = req === 'sources' ? 'Missing sources[]' : `Missing required top-level field: ${req}`
      issues.push(issue('error', code, label, req))
    }
  }


  if (!isObject(card?.safetyMatrix)) {
    issues.push(issue('error', 'missing_safety_matrix', 'Missing safetyMatrix object', 'safetyMatrix'))
  } else {
    for (const field of requiredSafetyMatrix) {
      if (isBlank(card.safetyMatrix[field])) {
        const severity = field === 'neverDo' ? 'error' : 'warn'
        issues.push(issue(severity, `missing_safety_matrix_${field}`, `Missing safetyMatrix.${field}`, `safetyMatrix.${field}`))
      }
    }
    if (!Array.isArray(card.safetyMatrix.neverDo) || card.safetyMatrix.neverDo.length === 0) {
      issues.push(issue('error', 'missing_safety_never_do', 'Missing safetyMatrix.neverDo[]', 'safetyMatrix.neverDo'))
    }
  }

  const steps = proSteps(card)
  if (steps.length === 0) issues.push(issue('error', 'missing_pro_protocol', 'Missing spottingProtocol/professionalProtocol steps', 'spottingProtocol'))
  steps.forEach((step, index) => {
    const stepPath = `spottingProtocol[${index}]`
    if (typeof step === 'string') {
      issues.push(issue('error', 'pro_step_not_structured', `Pro step ${index + 1} is a string; needs title/instruction/agent-or-action/safetyNote`, stepPath))
      if (includesAny(step, highRiskTerms)) issues.push(issue('error', 'high_risk_without_pro_only', `Pro step ${index + 1} has high-risk chemistry/action language but no proOnly flag`, stepPath))
      return
    }
    const title = stepField(step, ['title', 'agent', 'action'])
    const instruction = stepField(step, ['instruction', 'instructions'])
    const agentOrAction = stepField(step, ['agent', 'action'])
    if (isBlank(title)) issues.push(issue('error', 'missing_pro_step_title', `Pro step ${index + 1} missing title`, `${stepPath}.title`))
    if (isBlank(instruction)) issues.push(issue('error', 'missing_pro_step_instruction', `Pro step ${index + 1} missing instruction`, `${stepPath}.instruction`))
    if (isBlank(agentOrAction)) issues.push(issue('error', 'missing_pro_step_agent_or_action', `Pro step ${index + 1} missing agent/action`, `${stepPath}.agent`))
    if (isBlank(step?.safetyNote)) issues.push(issue('error', 'missing_pro_safety_note', `Pro step ${index + 1} missing safetyNote`, `${stepPath}.safetyNote`))
    const st = stepText(step)
    if (includesAny(st, highRiskTerms) && !hasProOnlyFlag(card, step)) {
      issues.push(issue('error', 'high_risk_without_pro_only', `Pro step ${index + 1} has solvent/oxidizer/reducer/caustic/enzyme/heat/steam/abrasion language but no proOnly flag`, `${stepPath}.proOnly`))
    }
    if (/\bdwell\b|\bwait\b|\blet (it )?(sit|stand)\b|\bsoak\b/i.test(st) && !includesAny(st, dwellTerms)) {
      issues.push(issue('warn', 'dwell_without_stop_condition', `Pro step ${index + 1} references dwell/wait/soak without an obvious stop condition`, stepPath))
    }
  })

  const proPayloadText = textOf([
    card?.spottingProtocol,
    card?.professionalProtocol,
    card?.professionalProtocol?.warnings,
    card?.materialWarnings,
  ])
  for (const gated of proGatedChemistry) {
    if (gated.regex.test(proPayloadText) && !ppeVentilationLanguage.test(proPayloadText)) {
      issues.push(issue(
        'error',
        'pro_chemistry_missing_ppe',
        `${gated.name} appears in pro protocol without PPE/ventilation language`,
        'professionalProtocol.warnings',
      ))
    }
  }

  const allText = textOf(card)
  if (includesAny(allText, reducerTerms) && includesAny(allText, oxidizerTerms) && !includesAny(allText, flushTerms)) {
    issues.push(issue('error', 'reducer_oxidizer_without_flush', 'Reducer + oxidizer both appear without flush/rinse/neutralize language', 'safetyMatrix.flushNeutralizeDry'))
  }
  bannedChemFiberIssues(card, issues)

  const canonicalTitle = expectedTitle(card, key)
  if (card?.title && canonicalTitle && card.title !== canonicalTitle) {
    issues.push(issue('warn', 'title_mismatch', `Title mismatch: expected "${canonicalTitle}"`, 'title'))
  }

  const homeText = textOf(card?.homeSolutions ?? card?.diyProtocol).toLowerCase()
  const proOnlyText = textOf([card?.safetyMatrix?.proOnly, card?.professionalProtocol?.warnings, card?.materialWarnings]).toLowerCase()
  if ((homeText.includes('safe at home') || homeText.includes('home-safe')) && (proOnlyText.includes('pro only') || proOnlyText.includes('professional only'))) {
    issues.push(issue('warn', 'home_pro_contradiction', 'Home-safe wording appears to conflict with pro-only guardrails', 'homeSolutions'))
  }
  if (shrinkOverpromise.some(pattern => pattern.test(allText))) {
    issues.push(issue('warn', 'overpromising_shrinkage', 'Possible overpromising shrinkage language', 'whyThisWorks'))
  }
  const sourceConfidence = card?.safetyMatrix?.sourceConfidence ?? card?.sourceConfidence
  if (typeof sourceConfidence === 'string' && ['low', 'unverified', 'unknown'].includes(sourceConfidence.toLowerCase())) {
    issues.push(issue('warn', 'low_source_confidence', `Low sourceConfidence: ${sourceConfidence}`, 'safetyMatrix.sourceConfidence'))
  }

  const { group, source: triageSource } = resolveTriage(card, file)
  if (isBlank(group)) issues.push(issue('warn', 'missing_triage_group', 'Missing triage group (sidecar + card both empty)', 'triageGroup'))
  else if (!allowedTriageGroups.has(String(group))) issues.push(issue('warn', 'unknown_triage_group', `Unknown triage group: ${group}`, 'triageGroup'))

  return { file: rel(file), id: card?.id ?? key, title: card?.title ?? '', triageGroup: group ?? null, triageSource, issues }
}

function allCoreFiles() {
  if (!existsSync(dataDir)) return []
  return readdirSync(dataDir).filter(file => file.endsWith('.json')).map(file => path.join(dataDir, file)).sort()
}
function diffFiles(filter) {
  const outputs = new Set()
  const diffFilter = filter === 'new' ? 'A' : 'ACMRT'
  const candidates = [
    ['diff', '--name-only', `--diff-filter=${diffFilter}`, 'HEAD', '--', 'data/core/*.json'],
    ['diff', '--cached', '--name-only', `--diff-filter=${diffFilter}`, '--', 'data/core/*.json'],
    ['diff', '--name-only', `--diff-filter=${diffFilter}`, 'HEAD~1', 'HEAD', '--', 'data/core/*.json'],
  ]
  for (const args of candidates) {
    for (const line of git(args).split('\n').filter(Boolean)) outputs.add(line)
  }
  if (filter !== 'new') {
    for (const line of git(['ls-files', '--others', '--modified', '--exclude-standard', '--', 'data/core/*.json']).split('\n').filter(Boolean)) outputs.add(line)
  } else {
    for (const line of git(['ls-files', '--others', '--exclude-standard', '--', 'data/core/*.json']).split('\n').filter(Boolean)) outputs.add(line)
  }
  return [...outputs].map(normalizeFile).filter(file => existsSync(file)).sort()
}
function filesForScope(scope) {
  if (scope === 'all') return allCoreFiles()
  return diffFiles(scope)
}

const args = parseArgs(process.argv.slice(2))
mkdirSync(outDir, { recursive: true })
const files = filesForScope(args.scope)
const skipped = []
const cards = []
for (const file of files) {
  const parsed = safeJson(file)
  if (parsed.error) {
    cards.push({ file: rel(file), id: path.basename(file, '.json'), title: '', triageGroup: null, triageSource: 'missing', issues: [issue('error', 'invalid_json', `Invalid JSON: ${parsed.error}`)] })
    continue
  }
  if (!isObject(parsed.value)) {
    skipped.push({ file: rel(file), reason: 'top-level JSON is not an object' })
    continue
  }
  cards.push(auditCard(parsed.value, file))
}

const targetedCards = args.triage ? cards.filter(card => card.triageGroup === args.triage) : cards
const targetedErrorCount = targetedCards.flatMap(card => card.issues).filter(item => item.severity === 'error').length

const issueCounts = cards.flatMap(card => card.issues).reduce((acc, item) => {
  acc.total += 1
  acc.bySeverity[item.severity] = (acc.bySeverity[item.severity] ?? 0) + 1
  acc.byCode[item.code] = (acc.byCode[item.code] ?? 0) + 1
  return acc
}, { total: 0, bySeverity: {}, byCode: {} })
const triageSourceCounts = cards.reduce((acc, card) => {
  const key = card.triageSource ?? 'missing'
  acc[key] = (acc[key] ?? 0) + 1
  return acc
}, {})
const generatedAt = new Date().toISOString()
const report = {
  generatedAt,
  mode: args.strict ? 'strict' : 'baseline-warn',
  scope: args.scope,
  triageTarget: args.triage,
  scanned: cards.length,
  targetedScanned: targetedCards.length,
  skipped: skipped.length,
  failed: args.strict && ((args.triage ? targetedErrorCount : issueCounts.bySeverity.error ?? 0) > 0),
  counts: issueCounts,
  triageSidecar: { path: triageSidecar.path, loaded: triageSidecar.loaded },
  triageSourceCounts,
  triageGroups: cards.reduce((acc, card) => {
    const key = card.triageGroup ?? 'missing'
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {}),
  cards,
  skippedFiles: skipped,
}
writeFileSync(reportJson, `${JSON.stringify(report, null, 2)}\n`)

const rows = cards.map(card => `| ${card.file} | ${card.id} | ${card.triageGroup ?? 'missing'} | ${card.triageSource ?? 'missing'} | ${card.issues.filter(i => i.severity === 'error').length} | ${card.issues.filter(i => i.severity === 'warn').length} | ${card.issues.map(i => `${i.severity.toUpperCase()} ${i.code}: ${i.message}`).join('<br>') || 'clean'} |`)
const md = [
  '# Protocol Schema Gate Report',
  '',
  `Generated: ${generatedAt}`,
  `Mode: ${report.mode}`,
  `Scope: ${report.scope}`,
  `Triage target: ${args.triage ?? '(none)'}`,
  `Sidecar: ${triageSidecar.loaded ? triageSidecar.path : '(not loaded)'}`,
  `Scanned: ${report.scanned}` + (args.triage ? ` (targeted: ${report.targetedScanned})` : ''),
  `Errors: ${issueCounts.bySeverity.error ?? 0}` + (args.triage ? ` (targeted: ${targetedErrorCount})` : ''),
  `Warnings: ${issueCounts.bySeverity.warn ?? 0}`,
  `Failed: ${report.failed ? 'yes' : 'no'}`,
  '',
  '## Triage source',
  '',
  '| Source | Count |',
  '|---|---:|',
  ...Object.entries(triageSourceCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `| ${k} | ${v} |`),
  '',
  '## Issue counts',
  '',
  '| Code | Count |',
  '|---|---:|',
  ...Object.entries(issueCounts.byCode).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([code, count]) => `| ${code} | ${count} |`),
  ...(Object.keys(issueCounts.byCode).length ? [] : ['| — | 0 |']),
  '',
  '## Triage groups',
  '',
  '| Group | Count |',
  '|---|---:|',
  ...Object.entries(report.triageGroups).sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))).map(([group, count]) => `| ${group} | ${count} |`),
  ...(Object.keys(report.triageGroups).length ? [] : ['| — | 0 |']),
  '',
  '## Per-card results',
  '',
  '| File | ID | Triage group | Triage source | Errors | Warnings | Findings |',
  '|---|---|---|---|---:|---:|---|',
  ...(rows.length ? rows : ['| — | — | — | — | 0 | 0 | No files matched scope |']),
  '',
  '## Skipped files',
  '',
  '| File | Reason |',
  '|---|---|',
  ...(skipped.length ? skipped.map(item => `| ${item.file} | ${item.reason} |`) : ['| — | none |']),
  '',
].join('\n')
writeFileSync(reportMd, md)

const errors = issueCounts.bySeverity.error ?? 0
const warnings = issueCounts.bySeverity.warn ?? 0
const triageSourceLabel = Object.entries(triageSourceCounts).map(([k, v]) => `${k}=${v}`).join(' ')
const triageGroupLabel = Object.entries(report.triageGroups).map(([k, v]) => `${k}=${v}`).join(' ')
console.log(`schema gate: ${cards.length} scanned, ${errors} errors, ${warnings} warnings, mode=${report.mode}, scope=${args.scope}${args.triage ? ` triage=${args.triage} targeted_errors=${targetedErrorCount}` : ''}`)
console.log(`triage source: ${triageSourceLabel || '(none)'}`)
console.log(`triage groups: ${triageGroupLabel || '(none)'}`)
console.log(`sidecar: ${triageSidecar.loaded ? triageSidecar.path : '(not loaded)'}`)
console.log(rel(reportJson))
console.log(rel(reportMd))
if (report.failed) process.exit(1)
