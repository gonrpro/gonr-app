// app/spottingboard/(workbench)/setup/storage-adapter.ts — TASK-189 v0
//
// Strategy A: persist canonical records via existing /api/spottingboard/items.
//
//   - rule           → module: 'chemistry_rule' (most common) | 'escalation_rule' | 'procedure'
//   - inventory      → module: 'inventory' (new value the plant_brain_items
//                      check constraint must allow; if not yet, fall back to
//                      'tribal_note' with tenant_provenance.inventory facets)
//   - training       → module: 'training_check'
//   - plant_profile  → module: 'plant_profile'
//
// The /api/spottingboard/items contract (Atlas-locked at 63e67ef):
//   POST body: { plant_id, module, title, body, chemistry_scope: string[] }
//   Response:   { ok, item_id, governance_applied: { safety_label, ... }, classifier: { hard_block, ... } }
//
// tenant_provenance for each kind carries the canonical record facets so
// the engine's normalize.ts can read them back without losing data.

import type {
  CorrectionSignalScope,
  InventoryRecord,
  PlantBuildRecord,
  PlantProfileRecord,
  RuleRecord,
  TrainingRecord,
} from '@/lib/spottingboard/plant-build-engine/types'

const FALLBACK_INVENTORY_MODULE = 'tribal_note'   // used if DB constraint doesn't yet allow 'inventory'

export interface PersistResult {
  itemId: string
  safetyLabel: string
  hardBlock: boolean
  module: string
}

export interface PersistOptions {
  /** Tag the operator's signal scope for the feedback-event store. */
  signalScope?: CorrectionSignalScope
  /** Override the module value (forced inventory storage path). */
  forceModule?: string
}

export async function persistRecord(
  record: PlantBuildRecord,
  options: PersistOptions = {},
): Promise<PersistResult> {
  const recordModule = options.forceModule ?? moduleForRecord(record)
  const { title, body } = bodyForRecord(record)
  const chemistry_scope = chemistryScopeForRecord(record)

  const res = await fetch('/api/spottingboard/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      plant_id: record.plantId,
      module: recordModule,
      title,
      body,
      chemistry_scope,
    }),
  })

  if (!res.ok) {
    // If the module value is rejected (likely because 'inventory' isn't yet
    // in the check-constraint enum), retry once with the fallback module.
    if (res.status === 400 && record.kind === 'inventory' && !options.forceModule) {
      return persistRecord(record, { ...options, forceModule: FALLBACK_INVENTORY_MODULE })
    }
    throw new Error(`persist_failed_${res.status}`)
  }

  const data = (await res.json().catch(() => null)) as
    | {
        ok?: boolean
        item_id?: string
        governance_applied?: { safety_label?: string }
        classifier?: { hard_block?: boolean }
      }
    | null

  return {
    itemId: data?.item_id ?? '',
    safetyLabel: data?.governance_applied?.safety_label ?? record.review.safetyLabel,
    hardBlock: data?.classifier?.hard_block === true,
    module: recordModule,
  }
}

function moduleForRecord(r: PlantBuildRecord): string {
  switch (r.kind) {
    case 'plant_profile':
      return 'plant_profile'
    case 'inventory':
      return 'inventory'
    case 'training':
      return 'training_check'
    case 'rule':
      return ruleModule(r as RuleRecord)
  }
}

function ruleModule(r: RuleRecord): string {
  switch (r.category) {
    case 'escalation':         return 'escalation_rule'
    case 'standard_procedure': return 'procedure'
    case 'forbidden':          return 'chemistry_rule'
    case 'handoff':            return 'procedure'
    case 'exception':          return 'chemistry_rule'
  }
}

function bodyForRecord(r: PlantBuildRecord): { title: string; body: string } {
  switch (r.kind) {
    case 'plant_profile':
      return bodyForProfile(r as PlantProfileRecord)
    case 'inventory':
      return bodyForInventory(r as InventoryRecord)
    case 'training':
      return bodyForTraining(r as TrainingRecord)
    case 'rule':
      return bodyForRule(r as RuleRecord)
  }
}

function bodyForProfile(p: PlantProfileRecord): { title: string; body: string } {
  const lines = [
    `Plant: ${p.identity.name}`,
    p.identity.location ? `Location: ${p.identity.location}` : null,
    p.services.length ? `Services: ${p.services.join(', ')}` : null,
    p.languages.length ? `Languages: ${p.languages.join(', ')}` : null,
    p.staff?.length ? `Staff: ${p.staff.map(s => `${s.role}${s.count ? ` (${s.count})` : ''}`).join(', ')}` : null,
  ].filter(Boolean)
  return { title: `Plant DNA — ${p.identity.name}`, body: lines.join('\n') }
}

function bodyForInventory(i: InventoryRecord): { title: string; body: string } {
  const lines = [
    `Item: ${i.name}${i.brand ? ` (${i.brand})` : ''}`,
    `Category: ${i.category}`,
    i.purpose ? `Purpose: ${i.purpose}` : null,
    `On hand: ${i.onHand ? 'yes' : 'no'}`,
    i.storageLocation ? `Storage: ${i.storageLocation}` : null,
    i.allowedUsers?.length ? `Allowed users: ${i.allowedUsers.join(', ')}` : null,
    i.safetyLimits?.length ? `Safety limits: ${i.safetyLimits.join('; ')}` : null,
    i.notes ? `Notes: ${i.notes}` : null,
  ].filter(Boolean)
  return { title: `Inventory: ${i.name}`, body: lines.join('\n') }
}

function bodyForTraining(t: TrainingRecord): { title: string; body: string } {
  const lines = [
    t.body,
    t.examples?.length ? `Examples:\n${t.examples.map(e => `  - ${e.scenario} → ${e.correctAction}`).join('\n')}` : null,
    t.languagesAvailable.length ? `Languages: ${t.languagesAvailable.join(', ')}` : null,
  ].filter(Boolean)
  return { title: t.title || `Training: ${t.category}`, body: lines.join('\n\n') }
}

function bodyForRule(r: RuleRecord): { title: string; body: string } {
  const scope: string[] = []
  if (r.scope.stains?.length) scope.push(`Stains: ${r.scope.stains.join(', ')}`)
  if (r.scope.fabrics?.length) scope.push(`Fabrics: ${r.scope.fabrics.join(', ')}`)
  if (r.scope.conditions?.length) scope.push(`Conditions: ${r.scope.conditions.join(', ')}`)
  const lines = [
    r.body,
    scope.length ? `Scope:\n${scope.map(s => `  - ${s}`).join('\n')}` : null,
    r.steps?.length ? `Steps:\n${r.steps.map(s => `  - ${s}`).join('\n')}` : null,
    r.stopWhen ? `Stop when: ${r.stopWhen}` : null,
    r.escalateWhen ? `Escalate when: ${r.escalateWhen}` : null,
  ].filter(Boolean)
  return { title: r.title || `Rule: ${r.category}`, body: lines.join('\n\n') }
}

function chemistryScopeForRecord(r: PlantBuildRecord): string[] {
  // The TASK-158 API validation requires non-empty chemistry_scope.
  // Inventory rows already have a clear category; rules with explicit
  // chemicals_used can derive scope. Default: ['uncategorized'].
  if (r.kind === 'inventory') return [r.category]
  if (r.kind === 'rule' && r.chemicalsUsed?.length) return r.chemicalsUsed
  return ['uncategorized']
}
