// lib/events/record.ts — TASK-040 Week 0 Day 2
// Scaffold for the append-only event log.
//
// Architecture Brief §4 Layer 2. Every important action writes a row here
// so the downstream loops (outcome feedback, training, dashboard) have a
// single source of truth to read from later.
//
// Usage — fire-and-forget (don't block the user-facing request on a failed
// event write; log internally and continue):
//
//   await recordEvent({
//     type: 'solve.requested',
//     actor_id: email,
//     plant_id: plantId ?? null,
//     payload: { stain, surface, lang, context_snapshot },
//     correlation_id: solveCorrelationId,
//   })
//
// Day 2 wires only two events: solve.requested + procedure.served. Every
// other event (outcome.reported, escalation.triggered, plant.rule_changed,
// etc.) is added the first time its surface ships.

import { createClient } from '@supabase/supabase-js'

// Dot-namespaced event names. Keep this list the single source of truth
// for valid event types. Add entries as new surfaces land.
export const EVENT_TYPES = {
  // Solve pipeline
  SOLVE_REQUESTED: 'solve.requested',
  PROCEDURE_SERVED: 'procedure.served',

  // TASK-056 — disambiguation routing events
  SOLVE_DISAMBIGUATION_PROMPTED: 'solve.disambiguation_prompted',
  SOLVE_DISAMBIGUATION_PICKED: 'solve.disambiguation_picked',
  SOLVE_AI_FALLBACK_SERVED: 'solve.ai_fallback_served',
  SOLVE_AI_FALLBACK_DISCLOSURE_RENDERED: 'solve.ai_fallback_disclosure_rendered',

  // Future (defined early for convention; add wiring when surface ships)
  OUTCOME_REPORTED: 'outcome.reported',
  ESCALATION_TRIGGERED: 'escalation.triggered',
  OPERATOR_EDITED_PROCEDURE: 'operator.edited_procedure',
  CUSTOMER_WARNED: 'customer.warned',
  REWORK_CREATED: 'rework.created',
  PLANT_RULE_CHANGED: 'plant.rule_changed',
  TRAINING_SESSION_COMPLETED: 'training.session_completed',
} as const

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES]

export interface RecordEventInput {
  type: EventType | string
  actor_id?: string | null
  plant_id?: string | null
  payload?: Record<string, unknown>
  correlation_id?: string | null
}

let _adminClient: ReturnType<typeof createClient> | null = null

function getAdmin() {
  if (_adminClient) return _adminClient
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('events/record: Supabase env missing')
  _adminClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  return _adminClient
}

/**
 * Append a single event row. Non-blocking by contract — callers should not
 * let a failed event write break the user-facing request flow.
 *
 * Swallows errors after logging. If we start caring about delivery guarantees,
 * upgrade to a queue/outbox pattern — but that's beyond Week 0.
 */
export async function recordEvent(input: RecordEventInput): Promise<{ id: string } | null> {
  try {
    const supabase = getAdmin()
    // Cast the insert — generated Supabase types don't know about the new
    // events table yet. Regenerate types later to drop the cast.
    const { data, error } = await (supabase
      .from('events') as any)
      .insert({
        type: input.type,
        actor_id: input.actor_id ?? null,
        plant_id: input.plant_id ?? null,
        payload: input.payload ?? {},
        correlation_id: input.correlation_id ?? null,
      })
      .select('id')
      .single()

    if (error) {
      console.warn('[events/record] insert failed:', error.message, 'type:', input.type)
      return null
    }
    return data as { id: string }
  } catch (err) {
    console.warn('[events/record] unexpected:', err instanceof Error ? err.message : err)
    return null
  }
}

/**
 * Convenience: generate a correlation id for a single logical user action.
 * Use when a flow will emit multiple events (e.g., solve.requested +
 * procedure.served) and you want to tie them together.
 */
export function newCorrelationId(): string {
  // crypto.randomUUID is available in Node 19+ and Next.js runtime.
  return crypto.randomUUID()
}
