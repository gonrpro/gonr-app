// TASK-247 — server component. The pro chemical corpus is imported HERE so it
// serializes only into this route's proxy-gated RSC payload, never into the
// unauthenticated static chunks (`.next/static/chunks/*`). Do NOT add
// `'use client'` to this file and do NOT import these JSONs from any client
// module — scripts/check-static-chunks.mjs fails the build if corpus terms
// reappear in a client chunk.

import crosswalkData from '@/data/chemicals/agent-brand-crosswalk.json'
import fiberData from '@/data/chemicals/fiber-expertise-index.json'

// Company imports
import rrStreet from '@/data/chemicals/companies/rr-street.json'
import kreussler from '@/data/chemicals/companies/kreussler.json'
import alWilson from '@/data/chemicals/companies/al-wilson.json'
import adco from '@/data/chemicals/companies/adco.json'
import pariser from '@/data/chemicals/companies/pariser.json'
import seitz from '@/data/chemicals/companies/seitz.json'
import royaltone from '@/data/chemicals/companies/royaltone.json'
import bufa from '@/data/chemicals/companies/bufa.json'
import greenearth from '@/data/chemicals/companies/greenearth.json'
import nationalChemical from '@/data/chemicals/companies/national-chemical.json'

import ChemicalsClient, {
  type ChemicalsData,
  type CompanyData,
  type CrosswalkAgent,
  type FiberEntry,
} from './ChemicalsClient'

// Agent categories in display order. Lives server-side with the corpus: the
// slugs double as forbidden consumer terms, so they stay out of client chunks.
const AGENT_KEYS = [
  'NSD', 'POG', 'protein', 'tannin', 'leveling',
  'rustRemover', 'enzymatic', 'solvent', 'oxidizingBleach',
  'reducingAgent', 'wetCleaningDetergent', 'finishingAgent',
]

const data: ChemicalsData = {
  agentKeys: AGENT_KEYS,
  crosswalk: crosswalkData as unknown as Record<string, CrosswalkAgent>,
  fibers: fiberData as unknown as Record<string, FiberEntry>,
  companies: [
    rrStreet, kreussler, alWilson, adco, pariser,
    seitz, royaltone, bufa, greenearth, nationalChemical,
  ] as CompanyData[],
}

export default function ChemicalReferencePage() {
  return <ChemicalsClient data={data} />
}
