// app/spottingboard/(workbench)/dashboard/dashboard-script.ts — TASK-187 v0
//
// Picks the next "best question" for the guided dashboard. Reuses the
// onboarding `getNextStep` lattice for plants that still have wizard fields
// to fill; otherwise composes operational prompts from live DB-backed state.
//
// SB phrasing locks (TASK-187 Stain Brain review):
//   - "Based on what's in the plant brain so far…" / "Want to review this?"
//   - Never "Your plant needs…" unless evidence supports it
//   - No fake plant certainty; every prompt acknowledges current evidence

import type { UserPlant } from '@/lib/auth/getUserPlant'
import type { Provenance, ScriptStep } from '../onboarding/types'
import { getNextStep } from '../onboarding/intake-script'

export type DashboardStepKind =
  | 'onboarding'           // wizard step from getNextStep
  | 'review_queue'         // queueCount > 0
  | 'first_capture'        // totalItems === 0 but wizard complete
  | 'ongoing_capture'      // wizard complete, queue clear, has items
  | 'spotter_readonly'     // spotter role; read-only guided lane
  | 'no_plant'             // safety net

export interface DashboardChip {
  label: string
  action:
    | { kind: 'navigate'; href: string }
    | { kind: 'skip' }
}

export interface DashboardStep {
  kind: DashboardStepKind
  /** Assistant prompt rendered as the central question card. */
  assistantPrompt: string
  /** "Why I'm asking" — surfaces evidence/context for transparency. */
  why?: string
  /** "What this updates" — tells operator what the answer affects. */
  whatUpdates?: string
  /** Navigation/skip chips (always rendered). */
  chips: DashboardChip[]
  /** Onboarding step embedded for kind === 'onboarding'. */
  onboardingStep?: ScriptStep
  /** Composer config when free-text capture is appropriate. */
  composer?: {
    placeholder: string
    /** Always POSTs /api/spottingboard/items with module=chemistry_rule for v0. */
    captureModule: 'chemistry_rule'
    provenance: Provenance
    /** Pill label rendered after successful capture. */
    successPillLabel: string
  }
}

export interface DashboardContext {
  plant: UserPlant | null
  totalItems: number
  queueCount: number
}

export function pickDashboardStep(ctx: DashboardContext): DashboardStep {
  const { plant, totalItems, queueCount } = ctx

  if (!plant) {
    return {
      kind: 'no_plant',
      assistantPrompt: "You don't have a plant set up yet. Want to start building one?",
      chips: [{ label: 'Start plant setup', action: { kind: 'navigate', href: '/plant-brain-builder' } }],
    }
  }

  if (plant.role === 'spotter') {
    return {
      kind: 'spotter_readonly',
      assistantPrompt: 'You can browse the plant brain and review queue. Where do you want to look?',
      why: 'Spotters have read-only access. Capture and review actions need owner or operator role.',
      chips: [
        { label: 'Browse Library', action: { kind: 'navigate', href: '/spottingboard/library' } },
        { label: 'View Review Queue', action: { kind: 'navigate', href: '/spottingboard/supervisor' } },
        { label: 'View Export', action: { kind: 'navigate', href: '/spottingboard/export' } },
      ],
    }
  }

  if (queueCount > 0) {
    return {
      kind: 'review_queue',
      assistantPrompt:
        queueCount === 1
          ? 'You have 1 rule waiting in supervisor review. Want to look at it?'
          : `You have ${queueCount} rules waiting in supervisor review. Want to walk through them?`,
      why: 'Based on what is in the plant brain so far, these rules have not been promoted or rejected yet.',
      whatUpdates: 'Review status, safety label, and feed mode on each rule you action.',
      chips: [
        { label: 'Open Supervisor Review', action: { kind: 'navigate', href: '/spottingboard/supervisor' } },
        { label: 'Skip for now', action: { kind: 'skip' } },
      ],
    }
  }

  // Once there is nothing awaiting supervisor review, fill missing plant-DNA
  // fields before driving new capture. Review queue stays first because
  // unreviewed operator evidence is the highest-value daily-driver action.
  const onboardingStep = getNextStep(plant, totalItems)
  if (onboardingStep && onboardingStep.kind !== 'first_capture_prompt' && onboardingStep.kind !== 'complete') {
    return {
      kind: 'onboarding',
      assistantPrompt: onboardingStep.assistantPrompt,
      why: 'Based on what is in the plant brain so far, this field is still empty.',
      whatUpdates: 'Plant DNA. Saved directly to your plant record.',
      chips: [{ label: 'Skip for now', action: { kind: 'skip' } }],
      onboardingStep,
    }
  }

  if (totalItems === 0) {
    return {
      kind: 'first_capture',
      assistantPrompt:
        "Your plant brain has no rules yet. What is one thing your floor knows that new staff always miss?",
      why: 'Based on what is in the plant brain so far, there are no captured rules.',
      whatUpdates: 'A new plant_brain_item is created as plant-local, unreviewed, and routed to supervisor review.',
      chips: [{ label: 'Skip for now', action: { kind: 'skip' } }],
      composer: {
        placeholder: 'e.g. Never use chlorine bleach on wool — it dissolves the fibers.',
        captureModule: 'chemistry_rule',
        provenance: 'unreviewed_tribal_note',
        successPillLabel: 'Captured · Plant-local · Needs supervisor review',
      },
    }
  }

  return {
    kind: 'ongoing_capture',
    assistantPrompt:
      'Queue is clear. Got another exception, fabric quirk, or chemistry trick your floor relies on? Tell me in your own words.',
    why: 'Based on what is in the plant brain so far, capturing one more rule is the next highest-value move.',
    whatUpdates: 'A new plant_brain_item is created as plant-local, unreviewed, and routed to supervisor review.',
    chips: [
      { label: 'Browse what is captured', action: { kind: 'navigate', href: '/spottingboard/library' } },
      { label: 'Open Export', action: { kind: 'navigate', href: '/spottingboard/export' } },
      { label: 'Skip for now', action: { kind: 'skip' } },
    ],
    composer: {
      placeholder: 'e.g. We pretreat coffee on silk with cold water and a soft brush — never hot.',
      captureModule: 'chemistry_rule',
      provenance: 'unreviewed_tribal_note',
      successPillLabel: 'Captured · Plant-local · Needs supervisor review',
    },
  }
}
