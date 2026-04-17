// lib/protocols/applyPlantFilters.ts
// TASK-023 Phase C v1 — apply plant-level overrides to a canonical card
// before returning it from the solve route.
//
// v1 supports:
//   - bleach_allowed=false: strip chlorine-bleach steps + warn the user
//   - solvent='wet-only': flag dry-side steps (does not strip — operator decides)
//
// More overrides come as TASK-023 matures (skill-level language calibration,
// board-equipment step substitution, house-rules injection).

import type { ProtocolCard, Step } from '../types'
import type { UserPlant } from '../auth/getUserPlant'

const CHLORINE_BLEACH_PATTERNS = [
  /\bchlorine bleach\b/i,
  /\bchlorine-bleach\b/i,
  /\bsodium hypochlorite\b/i,
  /\bclorox\b/i,
  /\bbleach(?!\s*neutralizer|\s*neutralization)\b/i, // exclude "bleach neutralizer"
]

function stepMentionsChlorine(step: Step | string): boolean {
  const text = typeof step === 'string' ? step : `${step.agent || ''} ${step.instruction || ''}`
  return CHLORINE_BLEACH_PATTERNS.some(re => re.test(text))
}

/**
 * Returns a (shallow) modified copy of the card with plant-level filters applied.
 * Does NOT mutate the input card.
 *
 * If no plant is provided or no filters apply, returns the input unchanged.
 */
export function applyPlantFilters(card: ProtocolCard, plant: UserPlant | null): ProtocolCard {
  if (!card || !plant) return card
  let modified = card
  let madeChange = false

  // ── bleach_allowed=false: strip chlorine bleach steps ───────────────────
  if (plant.bleachAllowed === false) {
    const filteredPro = (modified.spottingProtocol ?? []).filter((s) => !stepMentionsChlorine(s))
    const filteredHome = (modified.homeSolutions ?? []).filter((s) => !stepMentionsChlorine(s))
    const proRemoved = (modified.spottingProtocol?.length ?? 0) - filteredPro.length
    const homeRemoved = (modified.homeSolutions?.length ?? 0) - filteredHome.length
    if (proRemoved > 0 || homeRemoved > 0) {
      modified = { ...modified, spottingProtocol: filteredPro, homeSolutions: filteredHome }
      // Renumber steps so the user sees a clean 1..N sequence
      modified.spottingProtocol = (modified.spottingProtocol ?? []).map((s, i) => {
        if (typeof s === 'string') return s
        return { ...s, step: i + 1 }
      })
      // Add a plant-level warning so the user knows we suppressed steps
      const warnings = modified.materialWarnings ?? []
      const note = `Plant policy: chlorine bleach not allowed — ${proRemoved + homeRemoved} step(s) suppressed.`
      modified.materialWarnings = [note, ...warnings]
      madeChange = true
    }
  }

  // ── Solvent fit (TASK-023 Phase C — multi-solvent) ─────────────────────
  // If the plant has solvents defined and the protocol references a dry-side
  // agent that the plant DOESN'T have, flag it. Wet cleaning alone is not
  // enough to handle every dry-side agent — surface the gap.
  const plantSolvents = Array.isArray(plant.solvents) ? plant.solvents : []
  const hasDrySideCapability =
    plantSolvents.some(s => ['perc', 'hydrocarbon', 'green-earth', 'solvon-k4', 'sensene', 'co2'].includes(s))
  if (plantSolvents.length > 0 && !hasDrySideCapability) {
    // Plant runs wet only (or just 'other'). Flag dry-side steps.
    const drySidePattern = /\b(perc|hydrocarbon|drycle|dry side|POG|VDS|naphtha|RTU)\b/i
    const hasDrySide =
      (modified.spottingProtocol ?? []).some((s) => {
        const text = typeof s === 'string' ? s : `${s.agent || ''} ${s.instruction || ''}`
        return drySidePattern.test(text)
      })
    if (hasDrySide) {
      const warnings = modified.materialWarnings ?? []
      modified = {
        ...modified,
        materialWarnings: [
          'Plant policy: wet-only capabilities. This protocol references dry-side agents — substitute wet-side equivalents (enzyme, surfactant, oxidizer) or escalate.',
          ...warnings,
        ],
      }
      madeChange = true
    }
  }

  // ── house_rules: append as advisory note ────────────────────────────────
  if (plant.houseRules && plant.houseRules.trim().length > 0) {
    const warnings = modified.materialWarnings ?? []
    const houseNote = `House rules — ${plant.name}: ${plant.houseRules.trim()}`
    if (!warnings.some((w) => w.includes(houseNote))) {
      modified = { ...modified, materialWarnings: [...warnings, houseNote] }
      madeChange = true
    }
  }

  // Tag the card so downstream UI can show "tuned to your plant" if desired
  if (madeChange) {
    ;(modified as ProtocolCard & { _plantTuned?: boolean })._plantTuned = true
  }

  return modified
}
