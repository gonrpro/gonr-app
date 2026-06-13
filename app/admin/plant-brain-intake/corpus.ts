// TASK-249 — server-side corpus assembly, shared by the two founder-gated
// pages (/admin/plant-brain-intake and /plant-brain-builder). This module is
// the ONLY place that value-imports the training corpus; the client island
// receives it as a prop so it rides gated RSC payloads, never static chunks.
// Never import this from a 'use client' module — scripts/check-static-chunks.mjs
// fails the build if corpus fingerprints reappear in a client chunk.

import { SEED_SCENARIOS } from './scenarios'
import { QUESTIONS, MODULES, PHASE_THRESHOLDS } from './questions'
import type { PlantBrainCorpus } from './PlantBrainIntakeClient'

export const plantBrainCorpus: PlantBrainCorpus = {
  scenarios: SEED_SCENARIOS,
  questions: QUESTIONS,
  modules: MODULES,
  phaseThresholds: PHASE_THRESHOLDS,
}
