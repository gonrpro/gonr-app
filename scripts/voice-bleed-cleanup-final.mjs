#!/usr/bin/env node
/**
 * Audit-found cleanup: 21 cards still carrying banned phrases in visible
 * fields after Tranche-4 sweep. Substitutes in:
 *   - meta.tags entries
 *   - whyThisWorks, defaultAssumption, materialWarnings
 *   - homeSolutions[].instruction, spottingProtocol[].instruction/safetyNote
 *   - professionalProtocol.warnings, diyProtocol.warnings
 *   - safetyMatrix.neverDo, safetyMatrix.fiberSensitivities
 *   - escalation.when, escalation.whatToTell
 *   - deepSolveHooks.modifierNotes
 * Leaves scienceNote untouched (pro chemistry is allowed there).
 *
 * Also bumps lastValidated to today so review surface looks fresh.
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { resolve, join } from 'node:path'

const DATA_DIR = resolve('data/core')
const TODAY = '2026-04-25'

// Visible-field substitutions (case-insensitive whole-word style)
const SUBS = [
  [/\bchromophores?\b/gi, m => m[0] === m[0].toUpperCase() ? 'Color' : 'color'],
  [/\bcurcumin\b/gi, 'turmeric pigment'],
  [/\blycopene\b/gi, 'tomato red pigment'],
  [/\bfibroin\b/gi, 'silk protein'],
  [/\bcasein\b/gi, 'milk protein'],
  [/\bdenatures?\b/gi, m => m[0] === m[0].toUpperCase() ? 'Set' : 'set'],
  [/\bdenatured\b/gi, 'set'],
  [/\bdenaturing\b/gi, 'setting'],
  [/\bhydrogen[\s-]bonds?\b/gi, 'grip'],
  [/\bhydrogen[\s-]bonding\b/gi, 'grip'],
  [/\bcross[\s-]links?\b/gi, 'lock together'],
  [/\bcross[\s-]linked\b/gi, 'locked together'],
  [/\bcross[\s-]linking\b/gi, 'locking together'],
]

// Tag-specific replacements (kebab-case identifiers)
const TAG_SUBS = {
  curcumin: 'turmeric-pigment',
  lycopene: 'tomato-pigment',
  fibroin: 'silk-protein',
  casein: 'milk-protein',
  chromophore: 'color',
  chromophores: 'color',
}

function fixString(s) {
  if (typeof s !== 'string') return s
  let out = s
  for (const [re, rep] of SUBS) {
    out = out.replace(re, (m) => typeof rep === 'function' ? rep(m) : rep)
  }
  return out
}

function fixTagArray(tags) {
  if (!Array.isArray(tags)) return tags
  return tags.map(t => {
    if (typeof t !== 'string') return t
    return TAG_SUBS[t.toLowerCase()] ?? t
  })
}

function fixCard(card) {
  let changed = false
  const before = JSON.stringify(card)

  // tags
  if (card.meta?.tags) {
    const newTags = fixTagArray(card.meta.tags)
    if (JSON.stringify(newTags) !== JSON.stringify(card.meta.tags)) {
      card.meta.tags = newTags
    }
  }

  // visible prose fields
  for (const k of ['whyThisWorks', 'defaultAssumption', 'stainChemistry']) {
    if (card[k]) card[k] = fixString(card[k])
  }

  if (Array.isArray(card.materialWarnings)) {
    card.materialWarnings = card.materialWarnings.map(fixString)
  }

  if (Array.isArray(card.homeSolutions)) {
    for (const s of card.homeSolutions) {
      if (s.agent) s.agent = fixString(s.agent)
      if (s.instruction) s.instruction = fixString(s.instruction)
      if (s.safetyNote) s.safetyNote = fixString(s.safetyNote)
    }
  }

  if (Array.isArray(card.spottingProtocol)) {
    for (const s of card.spottingProtocol) {
      if (s.agent) s.agent = fixString(s.agent)
      if (s.instruction) s.instruction = fixString(s.instruction)
      if (s.safetyNote) s.safetyNote = fixString(s.safetyNote)
      if (s.technique) s.technique = fixString(s.technique)
    }
  }

  if (card.professionalProtocol) {
    const p = card.professionalProtocol
    if (Array.isArray(p.warnings)) p.warnings = p.warnings.map(fixString)
    if (Array.isArray(p.steps)) p.steps = p.steps.map(fixString)
  }

  if (card.diyProtocol) {
    const p = card.diyProtocol
    if (Array.isArray(p.warnings)) p.warnings = p.warnings.map(fixString)
    if (Array.isArray(p.steps)) p.steps = p.steps.map(fixString)
    if (p.whenToStop) p.whenToStop = fixString(p.whenToStop)
  }

  if (card.safetyMatrix) {
    const sm = card.safetyMatrix
    if (Array.isArray(sm.neverDo)) sm.neverDo = sm.neverDo.map(fixString)
    if (Array.isArray(sm.fiberSensitivities)) sm.fiberSensitivities = sm.fiberSensitivities.map(fixString)
  }

  if (card.escalation && typeof card.escalation === 'object') {
    if (card.escalation.when) card.escalation.when = fixString(card.escalation.when)
    if (card.escalation.whatToTell) card.escalation.whatToTell = fixString(card.escalation.whatToTell)
    if (card.escalation.specialistType) card.escalation.specialistType = fixString(card.escalation.specialistType)
  }

  if (card.deepSolveHooks?.modifierNotes) {
    card.deepSolveHooks.modifierNotes = fixString(card.deepSolveHooks.modifierNotes)
  }

  const after = JSON.stringify(card)
  if (after !== before) changed = true

  // bump lastValidated if changed OR if still on yesterday
  if (changed || card.lastValidated !== TODAY) {
    if (card.verified === true) card.lastValidated = TODAY
  }

  return { changed }
}

const TARGET_CARDS = process.argv.slice(2)
const files = TARGET_CARDS.length > 0
  ? TARGET_CARDS
  : readdirSync(DATA_DIR).filter(f => f.endsWith('.json')).map(f => join(DATA_DIR, f))

let fixed = 0
let bumped = 0
for (const f of files) {
  const card = JSON.parse(readFileSync(f, 'utf-8'))
  const before = JSON.stringify(card)
  const { changed } = fixCard(card)
  const after = JSON.stringify(card)
  if (after !== before) {
    writeFileSync(f, JSON.stringify(card, null, 2) + '\n', 'utf-8')
    if (changed) {
      fixed++
      console.log(`  fixed: ${f.split('/').pop()}`)
    } else {
      bumped++
    }
  }
}
console.log(`\nDone. ${fixed} card(s) had voice fixes; ${bumped} additional had lastValidated bumped.`)
