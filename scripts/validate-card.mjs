#!/usr/bin/env node
/**
 * scripts/validate-card.mjs
 *
 * Verified-card presentation standard enforcer. Codifies Atlas's 8138/8142/8184
 * rule: `verified: true` means chemistry reviewed AND presentation polished.
 *
 * Run modes:
 *   node scripts/validate-card.mjs data/core/blood-cotton.json      # single
 *   node scripts/validate-card.mjs --all                             # every card in data/core/
 *   node scripts/validate-card.mjs --verified-only                   # only cards with verified:true
 *
 * Exit codes:
 *   0 — all checked cards pass
 *   1 — one or more verified cards fail (blocking)
 *   2 — unverified cards with warnings (non-blocking; informational)
 *
 * Integrated into sync-single-card.mjs: a card with verified:true that fails
 * validation will refuse to sync.
 */

import { readFileSync, readdirSync } from 'node:fs'
import { resolve, join, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const CORE_DIR = resolve(process.cwd(), 'data/core')

// ─── Rule registry ──────────────────────────────────────────────────────────
// Each rule takes a card + context and returns { code, severity, message } on
// violation, or null when the card passes. Severity `block` gates verified
// publish; `warn` is informational. All-caps acronyms (NSD, POG, IPA, H₂O₂,
// PRENETT-A/B/C) are preserved as-is by the casing rules.

const ACRONYM_OK = /^([A-Z][A-Z₂0-9]*|H₂O₂|PRENETT[- ]?[A-E]?|3%|6%|8%|28%|1:10)$/
const TITLE_CASE_WORD = /^[A-Z]/
const NUMBER_LIKE = /^[≤≥~]?\d+([.,:–-]\d+)?[%°]?([CF°][A-Z]{0,2}|[A-Z]{1,3})?$/  // 15, 30%, ≤30°C, 86°F, 1:10, 1–2
const CONNECTOR = /^(on|with|or|and|of|to|for|in|&|–|—|-|\+|\/|:|,|\.|→|\||;|the|a|an|from|at|as|by|vs)$/i

/** Title Case check: every word starts with a capital OR is a known acronym.
 *  Strips leading/trailing punctuation so "(Test", "Dawn,", "Eucalan)" are judged
 *  on their alpha content. Plain numbers / units ("15", "30°C", "86°F") are OK. */
function isTitleCased(label) {
  if (!label) return true
  return label
    .split(/\s+/)
    .filter(Boolean)
    .every(w => {
      // Strip outer punctuation (parens, commas, periods, quotes) for the check
      const stripped = w.replace(/^[\(\[\{"'`]+|[\)\]\}"'`,.;:!?]+$/g, '')
      if (!stripped) return true  // pure punctuation (e.g., "—", "→" on its own)
      if (CONNECTOR.test(stripped)) return true
      if (ACRONYM_OK.test(stripped)) return true
      if (NUMBER_LIKE.test(stripped)) return true
      // Allow compound forms like "Wool-Rated", "Cotton/Polyester" — each segment
      // must itself be Title Cased or a known exception.
      if (/[-\/]/.test(stripped)) {
        return stripped.split(/[-\/]/).every(seg => {
          if (!seg) return true
          if (CONNECTOR.test(seg)) return true
          if (ACRONYM_OK.test(seg)) return true
          if (NUMBER_LIKE.test(seg)) return true
          return TITLE_CASE_WORD.test(seg)
        })
      }
      return TITLE_CASE_WORD.test(stripped)
    })
}

const rules = [
  // ─ Metadata sanity ──────────────────────────────────────────────────
  {
    name: 'meta.stainCanonical present',
    severity: 'block',
    check: (c) => c?.meta?.stainCanonical
      ? null
      : { code: 'META_STAIN_MISSING', message: 'meta.stainCanonical is required for sync + lookup' },
  },
  {
    name: 'meta.surfaceCanonical present',
    severity: 'block',
    check: (c) => c?.meta?.surfaceCanonical
      ? null
      : { code: 'META_SURFACE_MISSING', message: 'meta.surfaceCanonical is required for sync + lookup' },
  },

  // ─ Title rules ──────────────────────────────────────────────────────
  {
    name: 'title not SEO-long',
    severity: 'block',
    check: (c) => {
      const t = c?.title ?? ''
      if (/ Fabric\b|\bMaterial\b/i.test(t)) {
        return { code: 'TITLE_SEO_LONG', message: `title contains SEO-long phrasing ("Fabric" / "Material"): "${t}"` }
      }
      return null
    },
  },
  {
    name: 'title uses "on" separator',
    severity: 'warn',
    check: (c) => {
      const t = c?.title ?? ''
      // Allow dash-style titles and surface-damage specials; only flag titles
      // that have no clear separator and are multi-word.
      if (!t) return { code: 'TITLE_EMPTY', message: 'title is empty' }
      if (/ on /i.test(t)) return null
      if (/ — /.test(t)) return null
      if (/\b(Shrinkage|Luster|Sizing|Fogging)\b/i.test(t)) return null
      return { code: 'TITLE_NO_ON', message: `title may not follow [Stain] on [Surface] rule: "${t}"` }
    },
  },
  {
    name: 'title Title Cased',
    severity: 'block',
    check: (c) => {
      const t = c?.title ?? ''
      if (!isTitleCased(t)) {
        return { code: 'TITLE_NOT_TITLE_CASE', message: `title is not Title Cased: "${t}"` }
      }
      return null
    },
  },

  // ─ spottingProtocol rules ──────────────────────────────────────────
  {
    name: 'spottingProtocol exists',
    severity: 'block',
    check: (c) => Array.isArray(c?.spottingProtocol) && c.spottingProtocol.length > 0
      ? null
      : { code: 'SPOTTING_MISSING', message: 'spottingProtocol array is required and non-empty for verified cards' },
  },
  {
    name: 'spottingProtocol agents Title Cased',
    severity: 'block',
    check: (c) => {
      if (!Array.isArray(c?.spottingProtocol)) return null
      const bad = c.spottingProtocol
        .map((s, i) => ({ i, agent: s?.agent ?? '' }))
        .filter(({ agent }) => agent && !isTitleCased(agent))
      if (bad.length === 0) return null
      const examples = bad.slice(0, 3).map(b => `step ${b.i + 1}: "${b.agent}"`).join('; ')
      return { code: 'PRO_AGENT_LOWERCASE', message: `pro step agents not Title Cased (${bad.length}): ${examples}` }
    },
  },
  {
    name: 'spottingProtocol no raw camelCase in agent',
    severity: 'block',
    check: (c) => {
      if (!Array.isArray(c?.spottingProtocol)) return null
      const bad = c.spottingProtocol
        .map((s, i) => ({ i, agent: s?.agent ?? '' }))
        .filter(({ agent }) => /^[a-z][a-zA-Z]*[A-Z]/.test(agent))
      if (bad.length === 0) return null
      const examples = bad.slice(0, 3).map(b => `step ${b.i + 1}: "${b.agent}"`).join('; ')
      return { code: 'PRO_AGENT_CAMELCASE', message: `raw camelCase schema leaked to pro step label (${bad.length}): ${examples}` }
    },
  },
  {
    name: 'spottingProtocol agent not generic "Apply"',
    severity: 'warn',
    check: (c) => {
      if (!Array.isArray(c?.spottingProtocol)) return null
      const bad = c.spottingProtocol
        .map((s, i) => ({ i, agent: s?.agent ?? '' }))
        .filter(({ agent }) => agent.trim() === 'Apply')
      if (bad.length === 0) return null
      return { code: 'PRO_AGENT_GENERIC', message: `${bad.length} step(s) labeled generic "Apply" — regex-fallback residue` }
    },
  },

  // ─ homeSolutions rules ─────────────────────────────────────────────
  {
    name: 'homeSolutions exists',
    severity: 'warn',
    check: (c) => {
      const h = c?.homeSolutions
      if (!h) return { code: 'HOME_MISSING', message: 'homeSolutions array missing — home tier will fall back to pro protocol' }
      if (Array.isArray(h) && h.length === 0) return { code: 'HOME_EMPTY', message: 'homeSolutions array is empty' }
      return null
    },
  },
  {
    name: 'homeSolutions agents Title Cased',
    severity: 'block',
    check: (c) => {
      if (!Array.isArray(c?.homeSolutions)) return null
      const bad = c.homeSolutions
        .map((s, i) => ({ i, agent: typeof s === 'object' ? s?.agent ?? '' : '' }))
        .filter(({ agent }) => agent && !isTitleCased(agent))
      if (bad.length === 0) return null
      const examples = bad.slice(0, 3).map(b => `step ${b.i + 1}: "${b.agent}"`).join('; ')
      return { code: 'HOME_AGENT_LOWERCASE', message: `home step agents not Title Cased (${bad.length}): ${examples}` }
    },
  },

  // ─ Known phrasing traps (Atlas 8138: 'Protein powder' as default label) ─
  {
    name: 'no "Protein powder" headline label',
    severity: 'block',
    check: (c) => {
      const search = JSON.stringify([c?.spottingProtocol ?? [], c?.professionalProtocol?.steps ?? []])
      if (/Protein\s+powder/i.test(search)) {
        return {
          code: 'TRAP_PROTEIN_POWDER',
          message: '"Protein powder" language on a pro protocol — pros expect liquid Protein Spotter / PRENETT B. Demote powder framing to a fallback sentence.',
        }
      }
      return null
    },
  },
]

// ─── Runner ─────────────────────────────────────────────────────────────────

/** Validate a parsed card object. Exported for reuse by sync-single-card.mjs. */
export function validateCardObject(card, cardId) {
  const isVerified = card?.verified === true
  const violations = []
  for (const rule of rules) {
    const result = rule.check(card)
    if (result) {
      violations.push({
        severity: rule.severity,
        name: rule.name,
        ...result,
      })
    }
  }
  return { cardId: cardId ?? card?.id, isVerified, violations }
}

function validateOne(cardPath) {
  const raw = readFileSync(cardPath, 'utf-8')
  const card = JSON.parse(raw)
  const result = validateCardObject(card, card?.id ?? basename(cardPath, '.json'))
  return { cardPath, ...result }
}

function formatReport({ cardId, isVerified, violations }, { verbose = true } = {}) {
  const blocking = violations.filter(v => v.severity === 'block')
  const warnings = violations.filter(v => v.severity === 'warn')
  const status = isVerified
    ? (blocking.length > 0 ? '❌ VERIFIED BUT FAILING' : '✅ verified')
    : (blocking.length > 0 ? '⚠️  unverified + would-block' : (warnings.length > 0 ? '· unverified + warnings' : '✓ unverified'))
  const lines = [`[${status}] ${cardId}`]
  if (verbose || (isVerified && blocking.length > 0)) {
    for (const v of [...blocking, ...warnings]) {
      const sev = v.severity === 'block' ? 'BLOCK' : 'warn'
      lines.push(`  ${sev}  ${v.code}  ${v.message}`)
    }
  }
  return { status, lines, blocking, warnings }
}

function allCards() {
  return readdirSync(CORE_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => join(CORE_DIR, f))
    .sort()
}

function main() {
  const args = process.argv.slice(2)
  const allMode = args.includes('--all')
  const verifiedOnly = args.includes('--verified-only')
  const quiet = args.includes('--quiet')
  const target = args.find(a => a.startsWith('data/') || a.endsWith('.json'))

  let targets = []
  if (allMode || verifiedOnly) targets = allCards()
  else if (target) targets = [resolve(target)]
  else {
    console.error('usage: validate-card.mjs <path/to/card.json>')
    console.error('       validate-card.mjs --all')
    console.error('       validate-card.mjs --verified-only')
    process.exit(2)
  }

  const results = targets.map(validateOne)
  const filtered = verifiedOnly ? results.filter(r => r.isVerified) : results
  const verified = filtered.filter(r => r.isVerified)
  const verifiedFailing = verified.filter(r => r.violations.some(v => v.severity === 'block'))
  const unverifiedBlocking = filtered.filter(r => !r.isVerified && r.violations.some(v => v.severity === 'block'))

  if (!quiet) {
    for (const r of filtered) {
      const { lines } = formatReport(r, { verbose: !allMode })
      if (allMode && r.violations.length === 0) continue // hide passing in --all mode
      console.log(lines.join('\n'))
    }
  }

  if (allMode) {
    console.log('')
    console.log(`── Summary ──`)
    console.log(`  total cards checked:          ${filtered.length}`)
    console.log(`  verified: true:               ${verified.length}`)
    console.log(`  verified but FAILING:         ${verifiedFailing.length}`)
    console.log(`  unverified with would-block:  ${unverifiedBlocking.length}`)
    console.log(`  clean (no issues):            ${filtered.filter(r => r.violations.length === 0).length}`)
  }

  if (verifiedFailing.length > 0) process.exit(1)
  if (unverifiedBlocking.length > 0 && !verifiedOnly) process.exit(2)
  process.exit(0)
}

// Only run the CLI when executed directly (not when imported as a module).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
}
