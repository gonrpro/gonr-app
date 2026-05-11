// app/spottingboard/(workbench)/onboarding/types.ts — TASK-165 v0
//
// Shared types for the conversational intake cockpit. Kept in their own file
// so server (page.tsx) and client (ConversationalIntakeClient.tsx) reference
// the same definitions without re-import drift.

import type { UserPlant } from '@/lib/auth/getUserPlant'

export type Provenance =
  | 'plant_local_preference'
  | 'unreviewed_tribal_note'
  | 'needs_supervisor_confirmation'

export type ScriptStepKind =
  | 'create_plant_name'
  | 'wizard_solvent'
  | 'wizard_board'
  | 'wizard_skill'
  | 'wizard_bleach'
  | 'wizard_house_rules'
  | 'first_capture_prompt'
  | 'complete'

export interface ScriptChip {
  label: string
  value: unknown
}

export type ScriptTarget =
  | { kind: 'patch_plant'; field: 'name' | 'solvents' | 'board' | 'skill_level' | 'bleach_allowed' | 'house_rules' | 'wizard_completed' }
  | { kind: 'post_item'; module: 'chemistry_rule' }

export interface ScriptStep {
  kind: ScriptStepKind
  assistantPrompt: string
  chips: ScriptChip[]
  /** When true the chips are multi-select (with a Confirm button); otherwise single-select. */
  multiSelect?: boolean
  allowFreeText: boolean
  composerPlaceholder: string
  target: ScriptTarget
  provenance: Provenance
}

export interface TranscriptMessage {
  id: string
  role: 'assistant' | 'operator'
  content: string
  /** When set, this message displayed a provenance pill below it. */
  pill?: { label: string; tone: 'plant-dna' | 'plant-local' | 'needs-review' | 'unsafe' }
}

export interface CockpitInitialState {
  plant: UserPlant | null
  itemCount: number
}
