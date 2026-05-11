// lib/spottingboard/scenario-engine/events.ts — TASK-188 v0
//
// V0 events are in-memory only — held inside `GuidedCaptureSession.events`.
// No event-store DDL in TASK-188. Future consumers (supervisor playback,
// outcome ingest, GONR feedback) speak this vocabulary.

import type { GuidedCaptureSession, ScenarioEvent, ScenarioEventType } from './types'

export function makeEvent(input: {
  session: GuidedCaptureSession
  type: ScenarioEventType
  payload: Record<string, unknown>
}): ScenarioEvent {
  return {
    type: input.type,
    at: new Date().toISOString(),
    sessionId: input.session.id,
    plantId: input.session.plantId,
    payload: input.payload,
  }
}
