// lib/solve/context.ts
// Single synthesis layer — all inputs in, one coherent SolveContext out

import type { StainIdentification, CareLabelData } from '@/lib/vision'

export interface SolveContext {
  // What we're treating
  stain: string               // canonical stain name
  surface: string             // canonical surface/material
  family: string              // chemistry family

  // Fiber intelligence (care label is ground truth over vision)
  fiber: string               // e.g. "100% Silk"
  careSymbols: string[]       // care restrictions
  labelWarnings: string[]     // explicit label warnings

  // User-supplied context
  fabricDescription: string   // tactile/visual description
  garmentLocation: string     // where on garment

  // Confidence
  stainConfidence: 'high' | 'medium' | 'low'
  stainReasoning: string

  // Flags derived from synthesis
  isDryCleanOnly: boolean
  isDelicateFiber: boolean
  hasNoBleach: boolean
  hasNoHeat: boolean

  // Full prompt brief — the single string passed to AI
  brief: string
}

const DELICATE_FIBERS = /silk|cashmere|wool|angora|mohair|acetate|rayon|viscose|chiffon|organza/i

// Location-specific complications known to affect protocol
const LOCATION_NOTES: Record<string, string> = {
  collar:    'collar area may have interfacing underneath — avoid soaking through',
  underarm:  'likely combination stain: sweat (protein) + deodorant (wax/mineral) — treat both components',
  cuff:      'cuff area prone to ink, food, and soil combinations',
  sleeve:    'sleeve stains often contain multiple components — check for ink or food combo',
  hem:       'hem may have been dragged through soil or outdoor contaminants',
  pocket:    'pocket area may have residue from carried items (pen, food)',
}

export function buildSolveContext(params: {
  stainResult: StainIdentification | null
  labelResult: CareLabelData | null
  stainHint?: string
  surfaceHint?: string
  fabricDescription?: string
  garmentLocation?: string
}): SolveContext {
  const {
    stainResult,
    labelResult,
    stainHint,
    surfaceHint,
    fabricDescription = '',
    garmentLocation = '',
  } = params

  // ── Stain resolution ──────────────────────────────────────
  // Text hint overrides vision (user knows what it is)
  const stain = stainHint || stainResult?.stain || ''
  const family = stainResult?.family || 'unknown'
  const stainConfidence = stainHint ? 'high' : (stainResult?.confidence || 'low')
  const stainReasoning = stainResult?.reasoning || ''

  // ── Surface resolution ────────────────────────────────────
  // Priority: surfaceHint > care label fiber > vision surface
  // Care label is ground truth for fiber content — always beats vision
  const fiber = labelResult?.fiber || ''
  const visionSurface = stainResult?.surface || ''

  let surface: string
  if (surfaceHint) {
    surface = surfaceHint
  } else if (fiber) {
    // Care label confirmed fiber — use it as the surface descriptor
    // but keep vision surface if it adds context (e.g. "Shirt" vs just fiber)
    surface = visionSurface
      ? `${visionSurface} (${fiber})`
      : fiber
  } else {
    surface = visionSurface
  }

  // ── Care label flags ──────────────────────────────────────
  const careSymbols = labelResult?.careSymbols || []
  const labelWarnings = labelResult?.warnings || []
  const isDryCleanOnly = careSymbols.includes('dry-clean-only')
  const isDelicateFiber = DELICATE_FIBERS.test(fiber) || DELICATE_FIBERS.test(fabricDescription)
  const hasNoBleach = careSymbols.includes('no-bleach')
  const hasNoHeat = careSymbols.includes('no-heat')

  // ── Build unified brief ───────────────────────────────────
  const briefParts: string[] = []

  briefParts.push(`STAIN: ${stain || 'Unknown stain'}`)
  briefParts.push(`SURFACE/GARMENT: ${surface || 'Unknown surface'}`)
  briefParts.push(`CHEMISTRY FAMILY: ${family}`)

  if (fiber) {
    briefParts.push(`\nFIBER (from care label — authoritative):`)
    briefParts.push(`- Content: ${fiber}`)
    if (careSymbols.length) briefParts.push(`- Care restrictions: ${careSymbols.join(', ')}`)
    if (labelWarnings.length) briefParts.push(`- Label warnings: ${labelWarnings.join('; ')}`)
  }

  if (fabricDescription) {
    briefParts.push(`\nFABRIC FEEL (user-reported): ${fabricDescription}`)
  }

  if (garmentLocation) {
    briefParts.push(`\nSTAIN LOCATION: ${garmentLocation}`)
    const locationNote = Object.entries(LOCATION_NOTES).find(([key]) =>
      garmentLocation.toLowerCase().includes(key)
    )
    if (locationNote) briefParts.push(`  ↳ ${locationNote[1]}`)
  }

  if (stainConfidence === 'low') {
    briefParts.push(`\nNOTE: Stain identification confidence is LOW. Write a conservative protocol with broader coverage and lower escalation threshold.`)
  }

  if (isDryCleanOnly) {
    briefParts.push(`\n⚠️ DRY CLEAN ONLY — Home solutions must be minimal/emergency only. Primary recommendation is professional cleaning.`)
  }

  if (isDelicateFiber && !isDryCleanOnly) {
    briefParts.push(`\n⚠️ DELICATE FIBER — Use cold water only, gentle agitation, test all agents on hidden area first.`)
  }

  if (hasNoBleach) {
    briefParts.push(`⚠️ NO BLEACH — Do not recommend any bleach, hydrogen peroxide, or oxidizing agents.`)
  }

  if (hasNoHeat) {
    briefParts.push(`⚠️ NO HEAT — Do not recommend hot water, steam, or heat drying at any step.`)
  }

  const brief = briefParts.join('\n')

  return {
    stain,
    surface,
    family,
    fiber,
    careSymbols,
    labelWarnings,
    fabricDescription,
    garmentLocation,
    stainConfidence,
    stainReasoning,
    isDryCleanOnly,
    isDelicateFiber,
    hasNoBleach,
    hasNoHeat,
    brief,
  }
}
