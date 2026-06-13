// TASK-247 — server component. Chemistry family cards are imported HERE from
// data/chemistry/ (the canonical copy) instead of runtime-fetched from
// static-public /data/chemistry/*.json, so the corpus is served only through
// this proxy-gated route. Do NOT add 'use client' or reintroduce the
// public-data fetch — scripts/check-static-chunks.mjs guards the regression.

import tannin from '@/data/chemistry/tannin.json'
import protein from '@/data/chemistry/protein.json'
import oil from '@/data/chemistry/oil.json'
import dye from '@/data/chemistry/dye.json'
import combination from '@/data/chemistry/combination.json'
import mineral from '@/data/chemistry/mineral.json'
import mildew from '@/data/chemistry/mildew.json'
import odor from '@/data/chemistry/odor.json'
import resin from '@/data/chemistry/resin.json'
import particulate from '@/data/chemistry/particulate.json'
import chemicalDamage from '@/data/chemistry/chemical-damage.json'
import maintenance from '@/data/chemistry/maintenance.json'

import ChemistryClient, { type ChemistryCard } from './ChemistryClient'

// Same display order as the retired FAMILY_FILES fetch list. The cast crosses
// the same trust boundary the old `fetch().json()` did — the getters in
// ChemistryClient normalize the shape-drifted hand-authored JSON.
const cards = [
  tannin, protein, oil, dye, combination, mineral,
  mildew, odor, resin, particulate, chemicalDamage, maintenance,
] as ChemistryCard[]

export default function ChemistryPage() {
  return <ChemistryClient cards={cards} />
}
