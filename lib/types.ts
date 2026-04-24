export type Tier = 'free' | 'home' | 'spotter' | 'operator' | 'founder'
export type StainFamily = 'protein' | 'tannin' | 'oil' | 'dye' | 'combination' | 'specialty' | 'mildew' | 'rust' | 'carbon' | 'resin' | 'salt' | 'chemical'
export type Source = 'verified' | 'ai' | 'ai-cached' | 'core'

/**
 * Provenance tier for a protocol card. Added in TASK-055 — every card the
 * library serves carries an honest verification level so downstream UI +
 * partner API can surface "how confident are we?" alongside the content.
 *
 *   draft         — no verified external source, or AI-drafted
 *   single_source — exactly one verified source
 *   cross_ref     — 2+ independent verified sources agree
 *   pro_verified  — pro-team reviewer signed off
 */
export type VerificationLevel = 'draft' | 'single_source' | 'cross_ref' | 'pro_verified'

export interface Step {
  step: number
  agent?: string
  instruction: string
  technique?: string
  temperature?: string
  dwellTime?: string
  why?: string
  safetyNote?: string
}

export interface ProtocolCard {
  id: string
  version?: string
  title: string
  stainFamily?: string
  surface: string
  sector?: string
  /**
   * Explicit verification flag on the card data itself. Only `true` earns
   * the green ✓ Verified badge on the UI. Separate from `source` (which
   * describes *where the card came from*, not whether it's been reviewed).
   * See ResultCard.tsx trust-badge block + Atlas 8071.
   */
  verified?: boolean
  meta: {
    stainCanonical: string
    surfaceCanonical: string
    tier?: string
    riskLevel?: string
    tags?: string[]
    danReview?: boolean
    sourceKnowledge?: string[]
    freePreview?: boolean
  }
  stainChemistry?: string
  whyThisWorks?: string
  spottingProtocol?: Step[]
  homeSolutions?: (string | Step)[]
  materialWarnings?: string[]
  escalation?: string | { when: string; whatToTell: string; specialistType?: string }
  products?: {
    professional?: { name: string; use?: string; note?: string }[]
    consumer?: { name: string; use?: string; note?: string }[]
  } | { name: string; type?: string; link?: string }[]
  customerExplanation?: string
  commonMistakes?: string[]
  customerHandoff?: {
    canTreat: 'yes' | 'likely' | 'high-risk'
    customerScript: string
    intakeNotes: {
      stainType: string
      fiber: string
      treatment: string
      risk: string
      location?: string
    }
    watchFor: string[]
  }
  scienceNote?: string
  callPro?: string
  solventNote?: string
  difficulty?: number
  difficulty_factors?: string[]
  components?: string[]
  component_order?: string[]
  // Legacy v5 format support
  pro?: any
  diy?: any
  pro_es?: any
  diy_es?: any
  source?: Source
  /** TASK-055 provenance — source labels/URLs/citations the card was built from. */
  sources?: string[]
  /** TASK-055 provenance — external IDs or URIs cross-referenced against (Dan Eisen sections, ASTM codes, etc). */
  cross_refs?: string[]
  /** TASK-055 provenance — verification tier. See `VerificationLevel`. */
  verification_level?: VerificationLevel
}

export interface LookupResult {
  card: ProtocolCard | null
  tier: 1 | 2 | 3 | 4
  confidence: number
  source: Source
}

export interface User {
  id: string
  email: string
  tier: Tier
  isFounder: boolean
  isActive: boolean
}
