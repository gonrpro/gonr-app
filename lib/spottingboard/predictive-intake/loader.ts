// lib/spottingboard/predictive-intake/loader.ts — TASK-165 v0
//
// Runtime validator for SB's predictive-intake-gate-spec.json. Throws on
// schema drift so an upstream SB delivery can never silently ship a
// malformed gate spec. No external deps.

import type {
  GateSpec,
  DecisionFamily,
  GlobalRule,
  HardBlockRule,
  InferenceLabel,
  ShortcutOutcome,
} from './types'

export class GateSpecSchemaError extends Error {
  constructor(message: string, public readonly path?: string) {
    super(path ? `${path}: ${message}` : message)
    this.name = 'GateSpecSchemaError'
  }
}

const VALID_INFERENCE_LABELS: ReadonlySet<InferenceLabel> = new Set([
  'source_backed_default',
  'plant_local_preference',
  'predicted_plant_pattern',
  'needs_supervisor_confirmation',
  'unsafe_cannot_infer',
])

const VALID_OUTCOMES: ReadonlySet<ShortcutOutcome> = new Set([
  'allow_fast_path',
  'force_full_intake',
  'needs_supervisor_confirmation',
  'unsafe_cannot_infer',
])

export function validateGateSpec(raw: unknown): GateSpec {
  if (!isRecord(raw)) throw new GateSpecSchemaError('gate spec must be an object')

  for (const f of [
    'schema_version', 'task', 'owner', 'status', 'generated_at', 'principle',
    'inference_labels', 'global_rules', 'decision_families', 'lab_encoding_notes',
  ]) {
    if (!(f in raw)) throw new GateSpecSchemaError(`missing top-level field "${f}"`)
  }

  if (!Array.isArray(raw.inference_labels)) {
    throw new GateSpecSchemaError('inference_labels must be an array')
  }
  raw.inference_labels.forEach((label, i) => {
    if (!VALID_INFERENCE_LABELS.has(label as InferenceLabel)) {
      throw new GateSpecSchemaError(
        `inference_labels[${i}] = "${String(label)}" not in valid set`,
      )
    }
  })

  if (!Array.isArray(raw.global_rules)) {
    throw new GateSpecSchemaError('global_rules must be an array')
  }
  raw.global_rules.forEach((r, i) => validateGlobalRule(r, `global_rules[${i}]`))

  if (!Array.isArray(raw.decision_families)) {
    throw new GateSpecSchemaError('decision_families must be an array')
  }
  raw.decision_families.forEach((f, i) => validateFamily(f, `decision_families[${i}]`))

  enforceUniqueFamilyIds(raw.decision_families as DecisionFamily[])

  if (!isRecord(raw.lab_encoding_notes)) {
    throw new GateSpecSchemaError('lab_encoding_notes must be an object')
  }
  for (const f of ['deny_precedence', 'unknown_semantics', 'output_contract', 'audit_fields_required']) {
    if (!(f in raw.lab_encoding_notes)) {
      throw new GateSpecSchemaError(`lab_encoding_notes missing "${f}"`)
    }
  }

  return raw as unknown as GateSpec
}

function validateGlobalRule(raw: unknown, path: string): void {
  if (!isRecord(raw)) throw new GateSpecSchemaError('must be an object', path)
  if (typeof raw.id !== 'string' || raw.id.length === 0) {
    throw new GateSpecSchemaError('id must be a non-empty string', path)
  }
  if (typeof raw.rule !== 'string' || raw.rule.length === 0) {
    throw new GateSpecSchemaError('rule must be a non-empty string', path)
  }
  // action is open-vocab — SB owns the keyword set, engine normalizes at runtime.
  // Loader only checks it's a non-empty string when present.
  if (raw.action !== undefined && (typeof raw.action !== 'string' || raw.action.length === 0)) {
    throw new GateSpecSchemaError('action must be a non-empty string when present', path)
  }
  if (raw.label !== undefined && !VALID_INFERENCE_LABELS.has(raw.label as InferenceLabel)) {
    throw new GateSpecSchemaError(
      `label "${String(raw.label)}" not in valid set`, path,
    )
  }
}

function validateFamily(raw: unknown, path: string): void {
  if (!isRecord(raw)) throw new GateSpecSchemaError('must be an object', path)

  for (const f of [
    'family_id', 'display_name', 'shortcut_allowed_when_all_known',
    'hard_blocks', 'required_disambiguation',
  ]) {
    if (!(f in raw)) throw new GateSpecSchemaError(`missing field "${f}"`, path)
  }
  if (typeof raw.family_id !== 'string' || raw.family_id.length === 0) {
    throw new GateSpecSchemaError('family_id must be a non-empty string', path)
  }
  if (!Array.isArray(raw.shortcut_allowed_when_all_known)) {
    throw new GateSpecSchemaError('shortcut_allowed_when_all_known must be an array', path)
  }
  if (!Array.isArray(raw.required_disambiguation)) {
    throw new GateSpecSchemaError('required_disambiguation must be an array', path)
  }
  if (!Array.isArray(raw.hard_blocks)) {
    throw new GateSpecSchemaError('hard_blocks must be an array', path)
  }
  raw.hard_blocks.forEach((hb, i) => validateHardBlock(hb, `${path}.hard_blocks[${i}]`))
}

function validateHardBlock(raw: unknown, path: string): void {
  if (!isRecord(raw)) throw new GateSpecSchemaError('must be an object', path)
  if (!Array.isArray(raw.combo) || raw.combo.length === 0) {
    throw new GateSpecSchemaError('combo must be a non-empty array', path)
  }
  if (!VALID_OUTCOMES.has(raw.action as ShortcutOutcome)) {
    throw new GateSpecSchemaError(
      `action "${String(raw.action)}" not in valid set`, path,
    )
  }
  if (typeof raw.reason !== 'string' || raw.reason.length === 0) {
    throw new GateSpecSchemaError('reason must be a non-empty string', path)
  }
}

function enforceUniqueFamilyIds(families: DecisionFamily[]): void {
  const seen = new Set<string>()
  for (const f of families) {
    if (seen.has(f.family_id)) {
      throw new GateSpecSchemaError(`duplicate family_id "${f.family_id}"`)
    }
    seen.add(f.family_id)
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

// Re-export types to avoid unused-import warnings
export type { GateSpec, DecisionFamily, GlobalRule, HardBlockRule }
