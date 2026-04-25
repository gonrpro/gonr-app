#!/usr/bin/env node
/**
 * Tranche-4 voice sweep: substitute banned clinical phrases in visible fields
 * with cleaner-talk equivalents. Pushes technical mechanism to scienceNote
 * where appropriate. Does NOT touch protocols (spottingProtocol/diyProtocol
 * step instructions) since those are surgical and any phrase match should
 * use the safe cleaner-talk substitution.
 *
 * Visible fields: stainChemistry, whyThisWorks, customerExplanation,
 * defaultAssumption, materialWarnings, deepSolveHooks.modifierNotes, and
 * inside arrays: spottingProtocol[*].instruction, homeSolutions[*].instruction,
 * diyProtocol.warnings, safetyMatrix.neverDo, safetyMatrix.fiberSensitivities,
 * escalation.modifierNotes.
 *
 * Strategy:
 *   1) parenthetical-strip first: remove parentheticals containing only
 *      banned chemistry terms — they're glosses that don't add meaning
 *      after the cleaner-talk substitution
 *   2) phrase substitutions: targeted swaps that preserve sentence flow
 *   3) lastValidated bump to 2026-04-25 if any change was made
 */

import fs from 'node:fs';
import path from 'node:path';

const CORE = 'data/core';
const TODAY = '2026-04-25';

// Phrase substitutions — order matters; longest/most-specific first.
// Each entry: [regex, replacement]. Regex must use 'gi' flags via constructor.
const SUBS = [
  // Multi-word abstract mechanism phrases
  [/\bhydrogen[- ]?bond(?:ing|s|ed)?\s+to\s+(?:the\s+)?amino[- ]acid\s+side[- ]chains?/gi, 'grip on the fiber'],
  [/\bhydrogen[- ]?bond(?:ing|s|ed)?\s+to\s+(?:the\s+same\s+)?amino[- ]acid\s+sites?/gi, 'grip on the fiber'],
  [/\bvia\s+hydrogen[- ]?bonding\s+(?:and\s+van\s+der\s+waals\s+forces?)?/gi, 'tightly'],
  [/\bthrough\s+hydrogen[- ]?bonding\s+(?:and\s+van\s+der\s+waals\s+forces?)?/gi, 'tightly'],
  [/\bthrough\s+a\s+combination\s+of\s+hydrogen[- ]?bonding\s+and\s+van\s+der\s+waals\s+forces?/gi, 'tightly'],
  [/\bhydrogen[- ]?bonding\s+and\s+van\s+der\s+waals\s+forces?/gi, 'molecular grip'],
  [/\bvan\s+der\s+waals\s+forces?/gi, 'molecular grip'],
  [/\bhydrogen[- ]?bond(?:ing|s|ed)?/gi, 'grip'],
  [/\bamino[- ]acid\s+(?:side[- ])?chains?/gi, 'fiber surface'],
  [/\bpeptide\s+bonds?/gi, 'protein bond'],
  [/\bpolyphenolic\s+compounds?/gi, 'tannin compounds'],
  [/\bpolyphenolic\b/gi, 'tannin-type'],
  [/\bpolymer\s+matrix\b/gi, 'sticky film'],
  [/\bhemoglobin\s+oxidation\b/gi, 'blood browning'],
  [/\btannin\s+polyphenols?/gi, 'tannins'],
  [/\bdisulfide\s+bonds?/gi, 'fiber bonds'],
  [/\bdisulfide\b/gi, 'fiber-bond'],

  // Cross-link family — preserve "cooks into the fabric" / "lock together" feel
  [/\bcross[- ]?link(?:ing|s|ed)\b/gi, 'lock together'],
  [/\bcross[- ]?link\b/gi, 'lock together'],
  [/\bre[- ]?cross[- ]?link\b/gi, 're-bond'],

  // Denature family
  [/\bdenature\b/gi, 'set'],
  [/\bdenatures\b/gi, 'sets'],
  [/\bdenatured\b/gi, 'set'],
  [/\bdenaturing\b/gi, 'setting'],
  [/\bdenaturation\b/gi, 'setting'],

  // Specific protein names — keep "milk protein" etc. for clarity
  [/\bcasein\s+protein\b/gi, 'milk protein'],
  [/\bcasein\b/gi, 'milk protein'],
  [/\bfibroin\b/gi, 'silk protein'],
  [/\bkeratin\s+protein\b/gi, 'wool protein'],

  // Triglyceride — replace with "fat"
  [/\btriglycerides?\b/gi, 'fat'],

  // Maillard / melanoidin / browning compounds
  [/\bmaillard[- ](?:reaction\s+)?(?:products?|browning|pigments?|compounds?)/gi, 'browning compounds'],
  [/\bmaillard[- ]type\s+(?:cross[- ]?links?|bonds?)/gi, 'browning bonds'],
  [/\bmaillard\b/gi, 'browning'],
  [/\bmelanoidins?\b/gi, 'browning pigments'],

  // Carotenoids / lycopene / curcumin / capsanthin / capsaicin
  [/\bcarotenoid\s+pigments?/gi, 'yellow-orange pigments'],
  [/\bcarotenoids?\b/gi, 'yellow-orange pigments'],
  [/\blycopene\b/gi, 'tomato red pigment'],
  [/\bcurcumin\b/gi, 'turmeric pigment'],
  [/\bcapsanthin\b/gi, 'chili red pigment'],
  [/\bcapsaicin\b/gi, 'chili oil'],

  // Tea pigments
  [/\btheaflavins?\s+(?:and|\+|plus)?\s*thearubigins?\b/gi, 'tea browning pigments'],
  [/\btheaflavins?\b/gi, 'tea pigment'],
  [/\bthearubigins?\b/gi, 'tea pigment'],

  // Chromophore
  [/\bchromophores?\b/gi, 'color'],

  // Enzymes — protease/urease pushed to scienceNote / replaced with cleaner-talk
  [/\bprotease\s+digests?\s+silk\s+(?:fibroin|protein)/gi, 'protein-digesting enzymes damage silk'],
  [/\bprotease\s+digests?\s+wool\s+(?:keratin|protein)/gi, 'protein-digesting enzymes damage wool'],
  [/\bprotease\s+digests?\s+(?:keratin|fibroin)/gi, 'protein-digesting enzymes damage the fiber'],
  [/\burease[- ]only\s+enzyme/gi, 'urine-targeted enzyme'],
  [/\bprotease\b/gi, 'protein-digesting enzyme'],
  [/\burease\b/gi, 'urine-targeted enzyme'],

  // Mildew biology
  [/\bhyphae\b/gi, 'fungal roots'],

  // Polish / gum chemistry
  [/\bnitrocellulose\b/gi, 'polish film'],
  [/\bpolyisobutylene\b/gi, 'gum polymer'],
  [/\bchicle\b/gi, 'natural gum base'],
];

// Parenthetical chemistry-only glosses — drop entirely.
// Match (foo bar baz) where the contents are largely banned chemistry terms.
const PAREN_BANNED_RE =
  /\s*\((?:[^()]*?(?:hydrogen[- ]?bond[a-z]*|van\s+der\s+waals|amino[- ]acid|polyphenolic[a-z]*|fibroin|cross[- ]?link[a-z]*|denatur[a-z]*|chromophore[a-z]*|hyphae|peptide bond|polymer matrix|maillard|triglyceride|melanoidin[a-z]*|carotenoid[a-z]*|curcumin|lycopene|capsaicin|capsanthin|casein|disulfide|theaflavin|thearubigin|nitrocellulose|polyisobutylene|chicle|protease|urease)[^()]*?)\)/gi;

const VISIBLE_FIELD_KEYS = [
  'stainChemistry',
  'whyThisWorks',
  'customerExplanation',
  'defaultAssumption',
];

function applySubs(s) {
  if (typeof s !== 'string') return s;
  let out = s;
  // First pass: strip parentheticals that exist only as chemistry glosses
  out = out.replace(PAREN_BANNED_RE, '');
  // Then phrase substitutions
  for (const [re, rep] of SUBS) {
    out = out.replace(re, rep);
  }
  // Tidy: collapse multiple spaces, dangling commas, etc.
  out = out.replace(/\s{2,}/g, ' ');
  out = out.replace(/\s+([,.;:!?])/g, '$1');
  out = out.replace(/\(\s*\)/g, '');
  out = out.replace(/\s+\)/g, ')').replace(/\(\s+/g, '(');
  return out.trim();
}

function walkAndSub(obj, path = []) {
  if (typeof obj === 'string') {
    return applySubs(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map((v, i) => walkAndSub(v, [...path, i]));
  }
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      // Never touch scienceNote / solventNote / sources / cross_refs / id / canonical fields
      if (['scienceNote', 'solventNote', 'sources', 'cross_refs', 'id', 'card_key', 'meta'].includes(k)) {
        out[k] = v;
        continue;
      }
      out[k] = walkAndSub(v, [...path, k]);
    }
    return out;
  }
  return obj;
}

const files = fs
  .readdirSync(CORE)
  .filter((f) => f.endsWith('.json'))
  .sort();

let scanned = 0;
let touched = 0;
const touchedList = [];

for (const f of files) {
  scanned++;
  const fp = path.join(CORE, f);
  const orig = fs.readFileSync(fp, 'utf8');
  let data;
  try {
    data = JSON.parse(orig);
  } catch (e) {
    console.error(`PARSE_ERROR ${f}: ${e.message}`);
    continue;
  }
  const before = JSON.stringify(data);
  const out = walkAndSub(data);
  const after = JSON.stringify(out);
  if (after !== before) {
    out.lastValidated = TODAY;
    fs.writeFileSync(fp, JSON.stringify(out, null, 2) + '\n');
    touched++;
    touchedList.push(f);
  }
}

console.log(`SCANNED: ${scanned}`);
console.log(`TOUCHED: ${touched}`);
console.log('---');
console.log(touchedList.join('\n'));
