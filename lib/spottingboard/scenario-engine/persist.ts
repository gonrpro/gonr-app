// lib/spottingboard/scenario-engine/persist.ts — TASK-188 v0
//
// Persistence boundary. Wraps the existing /api/spottingboard/items contract
// Atlas locked at commit 63e67ef (TASK-165 fix):
//   - plant_id, module: 'chemistry_rule', body, title, chemistry_scope
//   - response shape: { governance_applied: { safety_label }, classifier: { hard_block } }
//
// V0 only commits plant-local drafts. Escalation outcomes can also commit via
// this function if the caller wants the row recorded (e.g., capture an
// unknown scenario for supervisor playback); the engine doesn't decide that
// — the consumer does.

import type { GuidedCaptureSession, PlantLocalDraft } from './types'

interface ItemsApiResponse {
  ok?: boolean
  item_id?: string
  governance_applied?: { safety_label?: string }
  classifier?: { hard_block?: boolean }
  error?: string
}

export async function commitAsPlantLocal(input: {
  session: GuidedCaptureSession
  draft: PlantLocalDraft
  /** Optional operator note appended to the draft body. */
  operatorNote?: string
}): Promise<{ itemId: string; safetyLabel: string; hardBlock: boolean }> {
  const body = input.operatorNote?.trim()
    ? `${input.draft.body}\nOperator note: ${input.operatorNote.trim()}`
    : input.draft.body

  const res = await fetch('/api/spottingboard/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      plant_id: input.session.plantId,
      module: 'chemistry_rule',
      title: input.draft.title,
      body,
      chemistry_scope: ['uncategorized'],
    }),
  })

  if (!res.ok) {
    throw new Error(`commit_failed_${res.status}`)
  }

  const data = (await res.json().catch(() => null)) as ItemsApiResponse | null

  const safetyLabel = data?.governance_applied?.safety_label ?? 'needs_source_review'
  const hardBlock = data?.classifier?.hard_block === true
  const itemId = data?.item_id ?? ''

  if (!itemId) {
    throw new Error('commit_response_missing_item_id')
  }

  return { itemId, safetyLabel, hardBlock }
}
