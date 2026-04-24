export type Tier = 'free' | 'home' | 'spotter' | 'operator' | 'founder'
export type StainFamily = 'protein' | 'tannin' | 'oil' | 'dye' | 'combination' | 'specialty' | 'mildew' | 'rust' | 'carbon' | 'resin' | 'salt' | 'chemical'
export type Source = 'verified' | 'ai' | 'ai-cached' | 'core'

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
