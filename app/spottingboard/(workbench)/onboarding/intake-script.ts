// app/spottingboard/(workbench)/onboarding/intake-script.ts — TASK-165 v0
//
// Deterministic question lattice for the conversational intake cockpit.
// Pure functions, no I/O. Picks the next high-value question given current
// plant state + captured item count.
//
// v0 follows the "wizard fields → first capture prompt" sequence Lab and
// Atlas locked in 2026-05-11. The shortcut engine + predictive-intake
// pattern miner are intentionally out of scope for v0 — this lattice is
// the v0 question source.
//
// Open-question recommendation B (see open-questions.md §1): we use
// `plants.wizard_completed_at` as the "wizard fields answered" gate. Until
// it is set, we walk the wizard in order regardless of current field values.

import type { UserPlant } from '@/lib/auth/getUserPlant'
import type { ScriptStep } from './types'

export const MATURE_ITEM_THRESHOLD = 3

const SOLVENT_CHIPS = [
  { label: 'Hydrocarbon', value: ['hydrocarbon'] },
  { label: 'Perc', value: ['perc'] },
  { label: 'Green Earth', value: ['green-earth'] },
  { label: 'Solvon K4', value: ['solvon-k4'] },
  { label: 'Sensene', value: ['sensene'] },
  { label: 'Intense', value: ['intense'] },
  { label: 'CO₂', value: ['co2'] },
  { label: 'Wet only', value: ['wet'] },
]

const BOARD_CHIPS = [
  { label: 'Spotting board · steam · vacuum', value: 'spotting-board-steam-vacuum' },
  { label: 'Basic spotting board', value: 'spotting-board-basic' },
  { label: 'No board', value: 'no-board' },
]

const SKILL_CHIPS = [
  { label: 'Beginner', value: 'beginner' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Advanced', value: 'advanced' },
]

const BLEACH_CHIPS = [
  { label: 'Yes, bleach allowed', value: true },
  { label: 'No bleach', value: false },
]

export function getNextStep(plant: UserPlant | null, itemCount: number): ScriptStep | null {
  if (!plant) {
    return {
      kind: 'create_plant_name',
      assistantPrompt: "Welcome to Spotting Board. What's the name of your plant?",
      chips: [],
      allowFreeText: true,
      composerPlaceholder: "e.g. Jerry's Cleaners",
      target: { kind: 'patch_plant', field: 'name' },
      provenance: 'plant_local_preference',
    }
  }

  const wizardDone = plant.wizardCompletedAt !== null

  if (!wizardDone) {
    if (plant.solvents.length === 0) {
      return {
        kind: 'wizard_solvent',
        assistantPrompt: 'What solvent do you run? Tap one or more — or type your own.',
        chips: SOLVENT_CHIPS,
        multiSelect: true,
        allowFreeText: true,
        composerPlaceholder: 'Type a solvent name if it is not listed',
        target: { kind: 'patch_plant', field: 'solvents' },
        provenance: 'plant_local_preference',
      }
    }

    if (!plant.board) {
      return {
        kind: 'wizard_board',
        assistantPrompt: 'What spotting equipment do you have on the floor?',
        chips: BOARD_CHIPS,
        allowFreeText: false,
        composerPlaceholder: '',
        target: { kind: 'patch_plant', field: 'board' },
        provenance: 'plant_local_preference',
      }
    }

    if (!plant.skillLevel) {
      return {
        kind: 'wizard_skill',
        assistantPrompt: "What's the experience level of your primary spotter?",
        chips: SKILL_CHIPS,
        allowFreeText: false,
        composerPlaceholder: '',
        target: { kind: 'patch_plant', field: 'skill_level' },
        provenance: 'plant_local_preference',
      }
    }

    return {
      kind: 'wizard_bleach',
      assistantPrompt: 'Is bleach allowed in this plant?',
      chips: BLEACH_CHIPS,
      allowFreeText: false,
      composerPlaceholder: '',
      target: { kind: 'patch_plant', field: 'bleach_allowed' },
      provenance: 'plant_local_preference',
    }
  }

  if (itemCount < MATURE_ITEM_THRESHOLD) {
    return {
      kind: 'first_capture_prompt',
      assistantPrompt:
        "Got a rule you don't want to lose? Tell me in your own words. " +
        'I will save it as plant-local · unreviewed and route it to your supervisor for review.',
      chips: [],
      allowFreeText: true,
      composerPlaceholder: 'e.g. Never use chlorine bleach on wool — it will dissolve the fibers.',
      target: { kind: 'post_item', module: 'chemistry_rule' },
      provenance: 'unreviewed_tribal_note',
    }
  }

  return null
}
