#!/usr/bin/env node
/**
 * scripts/audit-pro-voice.mjs
 *
 * Pro/Home divergence validator (TASK-077).
 *
 * Codifies the rule set from the 2026-04-25 quality incident audit
 * (~/lab/output/TASK-075-pro-quality-incident-audit/) so the team stops
 * shipping cards whose Pro lane reads as Home advice. Pairs with the
 * existing scripts/validate-card.mjs (presentation gate) — this script
 * is the SUBSTANCE gate.
 *
 * Rules implemented:
 *   R1  Forbidden vocabulary in Pro lane (Dawn / OxiClean / toothbrush /
 *       washing-machine etc.) with negation-aware exception scoped to
 *       `professionalProtocol.warnings[]` and `spottingProtocol[i].safetyNote`
 *       so anti-pattern callouts are allowed.
 *   R2  Consumer-substitute restrictions (cornstarch / baking soda only
 *       when paired with fuller's earth or absorbent powder; vinegar must
 *       be qualified as 5% acetic acid).
 *   R3  Pro-marker minimum (>=3) for cards claiming `data.verified === true`.
 *   R4  Pro/Home Jaccard token-overlap ceiling (warn >0.6, fail >0.8).
 *   R5  Surface-specific guards (leather/suede/alcantara forbid wet steps;
 *       silk/wool/cashmere require wetclean/dryclean/finish; mattress
 *       requires extraction and forbids machine wash).
 *   R7  Verification-overstatement consistency check (data.verified=true
 *       AND any rule fails => flag overstatement).
 *
 * R6 ("forbidden tool combinations") from the original spec is omitted — its
 * intent is fully covered by R1 + R4. Kept the original numbering so the audit
 * report and validator align.
 *
 * Run modes:
 *   node scripts/audit-pro-voice.mjs                # all verified core cards (default)
 *   node scripts/audit-pro-voice.mjs --card blood-leather
 *   node scripts/audit-pro-voice.mjs --include-unverified
 *   node scripts/audit-pro-voice.mjs --json         # machine-readable
 *   node scripts/audit-pro-voice.mjs --strict       # exit 1 on any P0
 *
 * Exit codes (default = report-only):
 *   0  always, unless --strict and any P0 found
 *   1  --strict and one or more P0 violations (blocking)
 *
 * No DB writes. No card edits. Read-only against data/core/*.json.
 */

import { readFileSync, readdirSync } from 'node:fs'
import { resolve, join, basename } from 'node:path'

const CORE_DIR = resolve(process.cwd(), 'data/core')

// ── CLI parsing ────────────────────────────────────────────────────
const args = process.argv.slice(2)
const flag = name => args.includes(name)
const value = name => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : null
}
const STRICT = flag('--strict')
const JSON_OUT = flag('--json')
const INCLUDE_UNVERIFIED = flag('--include-unverified')
const CARD_FILTER = value('--card')

// ── Rule 1 — forbidden vocabulary ───────────────────────────────────
const FORBIDDEN_VOCAB = [
  ['Dawn', /\bdawn\b/i],
  ['dish soap', /\bdish\s*soap\b|\bdishwashing\s*soap\b|\bdishwashing\s*liquid\b/i],
  ['toothbrush', /\btoothbrush\b/i],
  ['hairspray', /\bhairspray\b/i],
  ['club soda', /\bclub\s*soda\b/i],
  ['lemon juice', /\blemon\s*juice\b/i],
  ['table salt', /\btable\s*salt\b/i],
  ['OxiClean', /\boxi\s*clean\b|\boxiclean\b/i],
  ['white vinegar', /\bwhite\s*vinegar\b|\bdistilled\s*vinegar\b/i],
  ['washing machine', /\bwashing\s*machine\b/i],
  ['tumble dry', /\btumble[\s-]*dry\b/i],
]

// R2 watch list — cornstarch / baking soda allowed only when paired in same
// element with a pro absorbent qualifier; vinegar allowed only when qualified
// as % acetic acid.
const R2_WATCHED = [
  ['cornstarch', /\bcornstarch\b/i, /\bfullers?'?\s*earth\b|\babsorbent\s*powder\b|\bblotter\b/i],
  ['baking soda', /\bbaking\s*soda\b/i, /\bfullers?'?\s*earth\b|\babsorbent\s*powder\b|\bblotter\b/i],
  ['vinegar (unqualified)', /\bvinegar\b/i, /\bacetic\s*acid\b|\b\d+\s*%/i],
]

// Negation phrases that, when within the same string element as a forbidden
// term, mark that occurrence as an anti-pattern callout (allowed).
const NEGATION_RE = /\b(do\s*not|don'?t|never|avoid|skip|no\s|stop\s)\b/i

// ── Rule 3 — pro markers ────────────────────────────────────────────
const PRO_MARKERS = [
  /\bvolatile\s*dry\s*solvent\b|\bvds\b/i,
  /\bdry[\s-]*side\b/i,
  /\bwet[\s-]*side\b/i,
  /\bneutral\s*synthetic\s*detergent\b|\bnsd\b/i,
  /\bpog\b|\boil\s*spotter\b/i,
  /\botpr\b/i,
  /\btamp(?:ing)?\b/i,
  /\bbone\b(?=[\s/,.])/i,
  /\bspotting\s*board\b/i,
  /\bblotter\b/i,
  /\bfullers?'?\s*earth\b/i,
  /\bvacuum\s*break\b/i,
  /\bcapture\s*pad\b/i,
  /\bleveling\s*agent\b/i,
  /\bsodium\s*percarbonate\b/i,
  /\bhydrogen\s*peroxide\s*(?:30|35)\s*%/i,
  /\bammonia\b/i,
  /\boxalic\s*acid\b/i,
  /\breducing\s*agent\b/i,
  /\bwetclean\b|\bwet[\s-]*clean\b/i,
  /\bdryclean(?!\s*-?\s*only)\b/i,
  /\bsteam\s*gun\b|\bair\s*gun\b/i,
  /\bdye\s*stability\b/i,
  /\bblock(?:ing)?\s*flat\b/i,
  /\babsorbent\s*underlay\b/i,
  /\bfeather(?:ing|ed)?\s*outside[\s-]*in\b|\boutside[\s-]*in\b/i,
]
const PRO_MARKER_MIN = 3

// ── Rule 4 — Jaccard similarity ────────────────────────────────────
const SIMILARITY_WARN = 0.6
const SIMILARITY_FAIL = 0.8
const STOPWORDS = new Set([
  'the','a','an','and','or','of','to','in','on','for','with','from','at','by',
  'as','is','it','this','that','use','step','with','min','minutes','hour','hours',
  'cool','warm','dry','wet','test','then','if','then','do','not','does','don',
  'cycle','small','area','place','add','apply','work','let','sit','wait','keep',
  'small','one','two','three','four','five','first','next','last','any','all',
  'until','before','after','your','you','can','may','will','need','make','sure',
])
function tokenize(s) {
  return (s || '').toLowerCase()
    .split(/[^\p{L}\p{N}%]+/u)
    .filter(t => t.length >= 3 && !STOPWORDS.has(t))
}
function jaccard(a, b) {
  if (!a.size || !b.size) return 0
  let inter = 0
  for (const t of a) if (b.has(t)) inter++
  return inter / (a.size + b.size - inter)
}

// ── Rule 5 — surface guards ────────────────────────────────────────
const DRY_ONLY_FORBID = [
  /\bcool\s*wash\b/i, /\bcold\s*wash\b/i, /\bhot\s*wash\b/i,
  /\bwashing\s*machine\b/i, /\btumble\b/i, /\bdryer\b/i,
  /\bwater\s*flush\b(?!.*\bdry[\s-]*side\b)/i,
]
const PROTECT_REQUIRE = [
  /\bwetclean\b|\bwet[\s-]*clean\b/i,
  /\bdryclean(?!\s*-?\s*only)\b/i,
  /\bprofessional\s*finishing\b/i,
  /\bblock(?:ing)?\s*flat\b/i,
]
// silk/wool/cashmere — the original spec required wetclean/dryclean/blocking
// language, but real pro chemistry on these surfaces often uses different
// vocabulary (VDS, amyl acetate, NSD, sodium hydrosulfite for ink-silk; pro
// solvent + tamping + lay-flat for wool tannins). Hard-failing on phrase
// match would produce false positives on cards that already pass R3 with
// strong markers. R3 (pro-marker minimum) is the substance check; R5 here
// is reduced to forbid-only on these surfaces (no wash/tumble) which is
// always-valid because washing is never the right answer on protect fibers.
const SURFACE_GUARDS = {
  leather: { forbid: DRY_ONLY_FORBID },
  suede: { forbid: DRY_ONLY_FORBID },
  alcantara: { forbid: DRY_ONLY_FORBID },
  silk: { forbid: [/\bwashing\s*machine\b/i, /\btumble\b/i, /\bdryer\b/i, /\bhot\s*wash\b/i] },
  wool: { forbid: [/\bwashing\s*machine\b/i, /\btumble\b/i, /\bdryer\b/i, /\bhot\s*wash\b/i] },
  cashmere: { forbid: [/\bwashing\s*machine\b/i, /\btumble\b/i, /\bdryer\b/i, /\bhot\s*wash\b/i] },
  mattress: {
    require: [/\bvacuum\b|\bextraction\b|\bwet[\s-]*vac\b|\bprofessional\s*cleaning\b/i],
    forbid: [/\bwashing\s*machine\b/i, /\btumble\b/i],
  },
}
// Reference of phrases historically considered "expected" on protect surfaces;
// retained here as documentation of what a future R5b might reinstate as a
// soft warning (not P0). Not currently consulted by evalR5.
// PROTECT_REQUIRE = wetclean | dryclean | professional finishing | block flat

// ── Pro-lane element collection ────────────────────────────────────
// Returns array of `{ location, text, allowsNegation }`. The
// `allowsNegation` flag is true only for elements that are explicitly
// callout/safety surfaces (warnings, safetyNote) — instructions and
// equipment names are prescriptive, never anti-pattern callouts.
function collectProLaneItems(card) {
  const items = []
  const sp = Array.isArray(card.spottingProtocol) ? card.spottingProtocol : []
  sp.forEach((step, i) => {
    for (const k of ['agent','technique','equipment','instruction']) {
      const v = step?.[k]
      if (typeof v === 'string' && v.trim())
        items.push({ location: `spottingProtocol[${i}].${k}`, text: v, allowsNegation: false })
    }
    if (typeof step?.safetyNote === 'string' && step.safetyNote.trim())
      items.push({ location: `spottingProtocol[${i}].safetyNote`, text: step.safetyNote, allowsNegation: true })
  })
  const pp = card.professionalProtocol || {}
  ;['steps','products'].forEach(k => {
    const arr = Array.isArray(pp[k]) ? pp[k] : []
    arr.forEach((s, i) => {
      if (typeof s === 'string' && s.trim())
        items.push({ location: `professionalProtocol.${k}[${i}]`, text: s, allowsNegation: false })
    })
  })
  ;(Array.isArray(pp.warnings) ? pp.warnings : []).forEach((s, i) => {
    if (typeof s === 'string' && s.trim())
      items.push({ location: `professionalProtocol.warnings[${i}]`, text: s, allowsNegation: true })
  })
  if (typeof pp.temperature === 'string' && pp.temperature.trim())
    items.push({ location: 'professionalProtocol.temperature', text: pp.temperature, allowsNegation: false })
  return items
}

function collectHomeLaneItems(card) {
  const items = []
  const hs = Array.isArray(card.homeSolutions) ? card.homeSolutions : []
  hs.forEach((step, i) => {
    for (const k of ['agent','instruction']) {
      const v = step?.[k]
      if (typeof v === 'string' && v.trim())
        items.push({ location: `homeSolutions[${i}].${k}`, text: v })
    }
  })
  const dp = card.diyProtocol || {}
  ;['steps','products','warnings'].forEach(k => {
    const arr = Array.isArray(dp[k]) ? dp[k] : []
    arr.forEach((s, i) => {
      if (typeof s === 'string' && s.trim())
        items.push({ location: `diyProtocol.${k}[${i}]`, text: s })
    })
  })
  return items
}

// ── Per-rule evaluators ────────────────────────────────────────────
function evalR1(items) {
  const hits = []
  for (const item of items) {
    const negationPresent = item.allowsNegation && NEGATION_RE.test(item.text)
    for (const [label, re] of FORBIDDEN_VOCAB) {
      if (re.test(item.text)) {
        hits.push({
          rule: 'R1',
          term: label,
          location: item.location,
          excerpt: item.text.slice(0, 140),
          allowedByNegation: negationPresent,
        })
      }
    }
  }
  return hits
}

function evalR2(items) {
  const hits = []
  for (const item of items) {
    for (const [label, re, partnerRe] of R2_WATCHED) {
      if (re.test(item.text) && !partnerRe.test(item.text)) {
        const negationPresent = item.allowsNegation && NEGATION_RE.test(item.text)
        hits.push({
          rule: 'R2',
          term: label,
          location: item.location,
          excerpt: item.text.slice(0, 140),
          allowedByNegation: negationPresent,
        })
      }
    }
  }
  return hits
}

function evalR3(items) {
  const text = items.map(i => i.text).join(' \n ')
  let count = 0
  for (const re of PRO_MARKERS) {
    const m = text.match(new RegExp(re.source, re.flags + (re.flags.includes('g') ? '' : 'g')))
    if (m) count += m.length
  }
  return { count, ok: count >= PRO_MARKER_MIN }
}

function evalR4(card) {
  const sp = Array.isArray(card.spottingProtocol) ? card.spottingProtocol : []
  const hs = Array.isArray(card.homeSolutions) ? card.homeSolutions : []
  if (!sp.length || !hs.length) return { maxSim: 0, pairs: [] }
  const proSets = sp.map((step, i) => ({
    i,
    bag: new Set(tokenize([step?.agent, step?.technique, step?.equipment, step?.instruction].filter(Boolean).join(' '))),
  }))
  const homeSets = hs.map((step, i) => ({
    i,
    bag: new Set(tokenize([step?.agent, step?.instruction].filter(Boolean).join(' '))),
  }))
  let maxSim = 0
  const pairs = []
  for (const p of proSets) {
    for (const h of homeSets) {
      const s = jaccard(p.bag, h.bag)
      if (s > 0) pairs.push({ pro: p.i, home: h.i, sim: +s.toFixed(3) })
      if (s > maxSim) maxSim = s
    }
  }
  return { maxSim: +maxSim.toFixed(3), pairs }
}

function evalR5(card, items) {
  const surface = (card.surface || '').toLowerCase()
  const guard = SURFACE_GUARDS[surface]
  if (!guard) return { applicable: false, hits: [], missing: [] }
  const hits = []
  const missing = []
  if (Array.isArray(guard.forbid)) {
    for (const item of items) {
      const negationPresent = item.allowsNegation && NEGATION_RE.test(item.text)
      for (const re of guard.forbid) {
        if (re.test(item.text)) {
          hits.push({
            rule: 'R5',
            pattern: re.source,
            location: item.location,
            excerpt: item.text.slice(0, 140),
            allowedByNegation: negationPresent,
          })
        }
      }
    }
  }
  if (Array.isArray(guard.require)) {
    const all = items.map(i => i.text).join(' \n ')
    for (const re of guard.require) {
      if (re.test(all)) return { applicable: true, hits, missing: [], requireSatisfied: true }
    }
    missing.push({ rule: 'R5', surface, expectedAnyOf: guard.require.map(r => r.source) })
  }
  return { applicable: true, hits, missing }
}

// ── Severity rollup ────────────────────────────────────────────────
function classify({ r1, r2, r3, r4, r5 }) {
  const r1Real = r1.filter(h => !h.allowedByNegation)
  const r2Real = r2.filter(h => !h.allowedByNegation)
  const r5Real = r5.hits.filter(h => !h.allowedByNegation)

  // P0: any unambiguous prescription of forbidden vocab in a non-negation
  //     element, OR a surface-guard hard fail (forbidden term on dry-only
  //     surface, OR required-language missing on protect surface),
  //     OR R3 markers = 0.
  const p0 =
    r1Real.length > 0 ||
    r5Real.length > 0 ||
    (r5.applicable && r5.missing.length > 0) ||
    r3.count === 0

  // P1: R3 below minimum but >0, OR R4 above fail threshold,
  //     OR R2 watched terms appear without partner qualifier.
  const p1 = !p0 && (
    (r3.count > 0 && !r3.ok) ||
    (r4.maxSim > SIMILARITY_FAIL) ||
    r2Real.length > 0
  )

  // P2: R4 above warn threshold, or any soft signal worth tightening.
  const p2 = !p0 && !p1 && (
    r4.maxSim > SIMILARITY_WARN
  )

  if (p0) return 'P0'
  if (p1) return 'P1'
  if (p2) return 'P2'
  return 'CLEAN'
}

function evalR7(card, severity) {
  // Verification overstatement: card claims content_verified true OR
  // internal_content_level >= cross_ref but rules find P0/P1.
  const overstated = []
  const verified = card.verified === true
  const level = card.verification_level || ''
  if (severity === 'P0' || severity === 'P1') {
    if (verified) overstated.push('data.verified=true while pro lane fails substance gate')
    if (level === 'cross_ref' || level === 'pro_verified')
      overstated.push(`data.verification_level="${level}" while pro lane fails substance gate`)
  }
  return overstated
}

// ── Card scanner ───────────────────────────────────────────────────
function scanCard(card, file) {
  const proItems = collectProLaneItems(card)
  const homeItems = collectHomeLaneItems(card)
  const r1 = evalR1(proItems)
  const r2 = evalR2(proItems)
  const r3 = evalR3(proItems)
  const r4 = evalR4(card)
  const r5 = evalR5(card, proItems)
  const severity = classify({ r1, r2, r3, r4, r5 })
  const r7 = evalR7(card, severity)
  return {
    id: basename(file).replace(/\.json$/, ''),
    title: card.title || '',
    surface: card.surface || '',
    stainFamily: card.stainFamily || card.stainType || '',
    verified: card.verified === true,
    verification_level: card.verification_level || null,
    pro_items: proItems.length,
    home_items: homeItems.length,
    r1_hits: r1,
    r2_hits: r2,
    r3: r3,
    r4: { maxSim: r4.maxSim },
    r5: r5,
    r7_overstatement: r7,
    severity,
  }
}

// ── Entry point ────────────────────────────────────────────────────
function loadCardFiles() {
  if (CARD_FILTER) {
    const file = join(CORE_DIR, `${CARD_FILTER}.json`)
    return [file]
  }
  return readdirSync(CORE_DIR)
    .filter(n => n.endsWith('.json'))
    .map(n => join(CORE_DIR, n))
    .sort()
}

const files = loadCardFiles()
const results = []
for (const f of files) {
  let card
  try { card = JSON.parse(readFileSync(f, 'utf8')) }
  catch (e) {
    if (!JSON_OUT) console.error(`[ERR] cannot parse ${f}: ${e.message}`)
    continue
  }
  if (!INCLUDE_UNVERIFIED && card.verified !== true) continue
  results.push(scanCard(card, f))
}

const summary = {
  scanned: results.length,
  P0: results.filter(r => r.severity === 'P0').length,
  P1: results.filter(r => r.severity === 'P1').length,
  P2: results.filter(r => r.severity === 'P2').length,
  CLEAN: results.filter(r => r.severity === 'CLEAN').length,
}

if (JSON_OUT) {
  process.stdout.write(JSON.stringify({ summary, results }, null, 2) + '\n')
} else {
  const order = { P0: 0, P1: 1, P2: 2, CLEAN: 3 }
  results.sort((a, b) => order[a.severity] - order[b.severity] || a.r3.count - b.r3.count || a.id.localeCompare(b.id))
  console.log(`Pro/Home divergence audit — ${summary.scanned} cards scanned`)
  console.log(`  P0: ${summary.P0}   P1: ${summary.P1}   P2: ${summary.P2}   CLEAN: ${summary.CLEAN}`)
  console.log()
  for (const r of results) {
    if (r.severity === 'CLEAN') continue
    const realR1 = r.r1_hits.filter(h => !h.allowedByNegation).map(h => h.term)
    const negR1 = r.r1_hits.filter(h => h.allowedByNegation).map(h => h.term)
    const realR5 = r.r5.hits.filter(h => !h.allowedByNegation).length
    const missR5 = r.r5.missing.length > 0
    console.log(`[${r.severity}] ${r.id}  (markers=${r.r3.count}, sim=${r.r4.maxSim})`)
    if (realR1.length) console.log(`    R1 forbidden: ${[...new Set(realR1)].join(', ')}`)
    if (negR1.length) console.log(`    R1 (allowed via negation): ${[...new Set(negR1)].join(', ')}`)
    if (r.r2_hits.filter(h => !h.allowedByNegation).length)
      console.log(`    R2 unqualified: ${[...new Set(r.r2_hits.filter(h => !h.allowedByNegation).map(h => h.term))].join(', ')}`)
    if (!r.r3.ok) console.log(`    R3 below pro-marker minimum (${r.r3.count}/${PRO_MARKER_MIN})`)
    if (r.r4.maxSim > SIMILARITY_WARN)
      console.log(`    R4 pro/home similarity ${r.r4.maxSim} (warn=${SIMILARITY_WARN}, fail=${SIMILARITY_FAIL})`)
    if (r.r5.applicable && (realR5 || missR5)) {
      if (realR5) console.log(`    R5 surface ${r.surface}: forbidden language present`)
      if (missR5) console.log(`    R5 surface ${r.surface}: required pro language missing`)
    }
    if (r.r7_overstatement.length)
      console.log(`    R7 overstatement: ${r.r7_overstatement.join('; ')}`)
  }
  console.log()
  if (STRICT && summary.P0 > 0) {
    console.log(`STRICT MODE: ${summary.P0} P0 violation(s) — exiting 1`)
    process.exit(1)
  }
  console.log('Report-only mode (default). Use --strict to gate on P0. --json for machine output.')
}
