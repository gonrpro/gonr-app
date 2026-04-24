#!/usr/bin/env node
/**
 * scripts/title-case-agents.mjs
 *
 * Title-Cases every `agent` field on every step in a card's spottingProtocol
 * and homeSolutions arrays. Preserves:
 *   - all-caps acronyms (NSD, POG, IPA, PRENETT-B, H₂O₂, percentages)
 *   - connector words (on, with, and, or, of, to, for, in, the, a, an, from)
 *   - symbols and punctuation
 *
 * Run:
 *   node scripts/title-case-agents.mjs data/core/blood-nylon.json
 *   node scripts/title-case-agents.mjs --all-verified  # every card where verified:true
 *
 * Writes in place. Does NOT touch instruction text (that's meaningful prose
 * with real sentence grammar, not a label).
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { resolve, join } from 'node:path'

const CORE_DIR = resolve(process.cwd(), 'data/core')

const CONNECTORS = new Set(['on', 'with', 'or', 'and', 'of', 'to', 'for', 'in', 'the', 'a', 'an', 'from', 'as', 'at'])

const ACRONYM_OK = /^([A-Z][A-Z₂0-9]*|H₂O₂|PRENETT[- ]?[A-E]?|3%|6%|8%|28%|1:10|≤30°C|86°F)$/

function titleCaseWord(word, index) {
  if (!word) return word
  // Preserve symbol-only tokens
  if (!/[A-Za-z]/.test(word)) return word
  // Preserve acronyms exactly
  if (ACRONYM_OK.test(word)) return word
  // Preserve already-uppercase (≥2 chars of capitals in a row)
  if (/^[A-Z]{2,}/.test(word)) return word
  // Connectors stay lowercase except if they're the first word
  const lower = word.toLowerCase()
  if (index > 0 && CONNECTORS.has(lower)) return lower
  // Capitalize first letter, preserve the rest as written (so "iPhone"-like
  // intentional mixed case survives — not expected here but safe default)
  return word.charAt(0).toUpperCase() + word.slice(1)
}

function titleCaseLabel(label) {
  if (!label) return label
  // Split on whitespace while preserving the original separators
  const tokens = label.split(/(\s+)/)
  let wordIndex = 0
  return tokens
    .map(tok => {
      if (/^\s+$/.test(tok)) return tok
      // Multi-punctuation chunks: split on boundaries, title each, rejoin
      // Keep it simple: treat whole token as one word (connectors live alone)
      const out = titleCaseWord(tok, wordIndex)
      wordIndex++
      return out
    })
    .join('')
}

function processCard(cardPath) {
  const raw = readFileSync(cardPath, 'utf-8')
  const card = JSON.parse(raw)
  let changes = 0

  if (Array.isArray(card.spottingProtocol)) {
    card.spottingProtocol.forEach(step => {
      if (step && typeof step === 'object' && typeof step.agent === 'string') {
        const before = step.agent
        const after = titleCaseLabel(before)
        if (before !== after) {
          step.agent = after
          changes++
        }
      }
    })
  }

  if (Array.isArray(card.homeSolutions)) {
    card.homeSolutions.forEach(step => {
      if (step && typeof step === 'object' && typeof step.agent === 'string') {
        const before = step.agent
        const after = titleCaseLabel(before)
        if (before !== after) {
          step.agent = after
          changes++
        }
      }
    })
  }

  if (changes > 0) {
    // Preserve trailing newline
    const serialized = JSON.stringify(card, null, 2) + '\n'
    writeFileSync(cardPath, serialized, 'utf-8')
  }
  return { cardPath, cardId: card.id, changes }
}

function allVerifiedCards() {
  return readdirSync(CORE_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => join(CORE_DIR, f))
    .filter(p => {
      try {
        const c = JSON.parse(readFileSync(p, 'utf-8'))
        return c.verified === true
      } catch { return false }
    })
    .sort()
}

function main() {
  const args = process.argv.slice(2)
  const allVerified = args.includes('--all-verified')
  const target = args.find(a => a.endsWith('.json'))

  let targets = []
  if (allVerified) targets = allVerifiedCards()
  else if (target) targets = [resolve(target)]
  else {
    console.error('usage: title-case-agents.mjs <path/to/card.json>')
    console.error('       title-case-agents.mjs --all-verified')
    process.exit(1)
  }

  let totalChanges = 0
  for (const path of targets) {
    const { cardId, changes } = processCard(path)
    totalChanges += changes
    if (changes > 0) console.log(`  ${cardId.padEnd(36)} ${changes} agent(s) title-cased`)
  }
  console.log(`\n${totalChanges} total relabels across ${targets.length} card(s)`)
}

main()
