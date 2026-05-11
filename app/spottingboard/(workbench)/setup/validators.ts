// app/spottingboard/(workbench)/setup/validators.ts — TASK-189 v0
//
// Deterministic validator / critic. Runs after the extractor returns a
// list of candidates. Decides:
//   - reject (drop) — confidence too low or schema invalid
//   - approve for confirmation — operator will see a confirmation card
//   - hold for follow-up — emit OpenFollowup so the orchestrator can push
//     back on the next turn
//
// Never calls an LLM. Never mutates external state.

import type { PlantBuildRecord, RuleRecord } from '@/lib/spottingboard/plant-build-engine/types'
import type { CandidateRecord, OpenFollowup, ValidatorFlag } from './types'

const MIN_CONFIDENCE = 0.6

export interface ValidationOutcome {
  approved: CandidateRecord[]
  rejected: Array<{ candidate: CandidateRecord; reason: string }>
  newOpenFollowups: OpenFollowup[]
  newSafetyFlags: ValidatorFlag[]
}

interface ValidationContext {
  existingRecords: PlantBuildRecord[]
  /** Used so we don't re-emit followups already pending. */
  existingFollowups: OpenFollowup[]
}

export function validateCandidates(
  candidates: CandidateRecord[],
  ctx: ValidationContext,
): ValidationOutcome {
  const approved: CandidateRecord[] = []
  const rejected: ValidationOutcome['rejected'] = []
  const newOpenFollowups: OpenFollowup[] = []
  const newSafetyFlags: ValidatorFlag[] = []

  for (const candidate of candidates) {
    const issues = inspectCandidate(candidate, ctx)
    if (issues.reject) {
      rejected.push({ candidate, reason: issues.reject })
      continue
    }

    // Apply safety-driven review state mutations.
    const adjusted: CandidateRecord = applySafetyAdjustments(candidate, issues.flags)
    approved.push(adjusted)

    for (const f of issues.flags) {
      if (!newSafetyFlags.includes(f)) newSafetyFlags.push(f)
    }
    for (const fu of issues.followups) {
      if (!isDuplicateFollowup(fu, ctx.existingFollowups.concat(newOpenFollowups))) {
        newOpenFollowups.push(fu)
      }
    }
  }

  return { approved, rejected, newOpenFollowups, newSafetyFlags }
}

interface InspectionResult {
  reject?: string
  flags: ValidatorFlag[]
  followups: OpenFollowup[]
}

function inspectCandidate(c: CandidateRecord, ctx: ValidationContext): InspectionResult {
  const flags: ValidatorFlag[] = [...c.safetyFlags]
  const followups: OpenFollowup[] = []

  // 1. Confidence floor.
  if (c.confidence < MIN_CONFIDENCE) {
    return { reject: `confidence below ${MIN_CONFIDENCE}`, flags, followups }
  }

  // 2. Source span required.
  if (!c.sourceSpan) {
    return { reject: 'missing source_span', flags, followups }
  }

  // 3. Rule-specific checks.
  if (c.kind === 'rule') {
    const fields = c.fields as Partial<RuleRecord>

    if (isUnscoped(fields)) {
      if (!flags.includes('unscoped')) flags.push('unscoped')
      followups.push({
        field: 'rule.scope',
        reason: 'Rule has no stain/fabric/condition. Push back for scope before storing as a procedure.',
        raisedAt: new Date().toISOString(),
        raisedBy: 'validator',
      })
    }

    if (isOverbroad(fields)) {
      if (!flags.includes('overbroad')) flags.push('overbroad')
      followups.push({
        field: 'rule.scope',
        reason: 'Rule body claims broad applicability ("works on everything"). Push back for scope.',
        raisedAt: new Date().toISOString(),
        raisedBy: 'validator',
      })
    }

    if (isVague(fields)) {
      if (!flags.includes('vague')) flags.push('vague')
      followups.push({
        field: 'rule.body',
        reason: 'Rule wording is vague ("usual stuff", "the normal way"). Push back for specifics.',
        raisedAt: new Date().toISOString(),
        raisedBy: 'validator',
      })
    }

    // 4. Contradiction check against existing rules.
    const contradicted = findContradiction(c, ctx.existingRecords)
    if (contradicted) {
      if (!flags.includes('contradictory')) flags.push('contradictory')
      followups.push({
        field: 'rule.body',
        reason: `Contradicts existing rule ${contradicted.id}: ${shortBody(contradicted as RuleRecord)}`,
        raisedAt: new Date().toISOString(),
        raisedBy: 'validator',
      })
    }
  }

  // 5. Inventory chemical/spotting_agent needs allowedUsers — emit followup
  //    rather than auto-storing without role gating.
  if (c.kind === 'inventory') {
    const fields = c.fields as { category?: string; allowedUsers?: string[] }
    const needsRoleGate = fields.category === 'chemical' || fields.category === 'spotting_agent'
    const noRoles = !fields.allowedUsers || fields.allowedUsers.length === 0
    if (needsRoleGate && noRoles && c.missingFields.includes('allowedUsers')) {
      followups.push({
        field: 'inventory.allowedUsers',
        reason: 'Chemical/spotting agent captured without role gating. Push back on next turn for who may use it.',
        raisedAt: new Date().toISOString(),
        raisedBy: 'validator',
      })
    }
  }

  return { flags, followups }
}

function applySafetyAdjustments(c: CandidateRecord, flags: ValidatorFlag[]): CandidateRecord {
  let adjustedReview = c.review
  // Unsafe rules go to escalation with unsafe_do_not_use safety label.
  if (c.kind === 'rule' && flags.includes('unsafe')) {
    adjustedReview = {
      ...adjustedReview,
      status: 'escalated',
      safetyLabel: 'unsafe_do_not_use',
    }
  }
  // Unscoped/overbroad/vague rules go to needs_review.
  if (c.kind === 'rule' && (flags.includes('unscoped') || flags.includes('overbroad') || flags.includes('vague'))) {
    adjustedReview = {
      ...adjustedReview,
      status: adjustedReview.status === 'escalated' ? 'escalated' : 'needs_review',
    }
  }
  return { ...c, safetyFlags: flags, review: adjustedReview }
}

// ── heuristics ──────────────────────────────────────────────────────────

function isUnscoped(fields: Partial<RuleRecord>): boolean {
  const scope = fields.scope ?? {}
  const stains = scope.stains ?? []
  const fabrics = scope.fabrics ?? []
  const conditions = scope.conditions ?? []
  return stains.length === 0 && fabrics.length === 0 && conditions.length === 0
}

const OVERBROAD_PATTERNS = [
  /works on everything/i,
  /good for everything/i,
  /always use/i,
  /never fails/i,
  /one-size-fits-all/i,
]

function isOverbroad(fields: Partial<RuleRecord>): boolean {
  const text = `${fields.title ?? ''} ${fields.body ?? ''}`
  return OVERBROAD_PATTERNS.some(p => p.test(text))
}

const VAGUE_PATTERNS = [
  /usual stuff/i,
  /the normal way/i,
  /you know how it is/i,
  /standard approach/i,
  /\bjust\s+the\b/i,
]

function isVague(fields: Partial<RuleRecord>): boolean {
  const text = `${fields.title ?? ''} ${fields.body ?? ''}`
  return VAGUE_PATTERNS.some(p => p.test(text))
}

function findContradiction(c: CandidateRecord, existing: PlantBuildRecord[]): PlantBuildRecord | null {
  if (c.kind !== 'rule') return null
  const candidateText = `${(c.fields as Partial<RuleRecord>).title ?? ''} ${(c.fields as Partial<RuleRecord>).body ?? ''}`.toLowerCase()
  const candidateStains = (c.fields as Partial<RuleRecord>).scope?.stains ?? []
  // Simple v0 heuristic: same stain + opposite directive ("never X" / "always X").
  for (const r of existing) {
    if (r.kind !== 'rule') continue
    const rText = `${r.title} ${r.body}`.toLowerCase()
    const overlap = (r.scope.stains ?? []).some(s => candidateStains.map(x => x.toLowerCase()).includes(s.toLowerCase()))
    if (!overlap) continue
    if (
      (candidateText.includes('never') && rText.includes('always')) ||
      (candidateText.includes('always') && rText.includes('never'))
    ) {
      return r
    }
  }
  return null
}

function isDuplicateFollowup(fu: OpenFollowup, all: OpenFollowup[]): boolean {
  return all.some(x => x.field === fu.field && x.reason === fu.reason)
}

function shortBody(r: RuleRecord): string {
  const s = (r.body ?? '').trim().replace(/\s+/g, ' ')
  return s.length <= 80 ? s : s.slice(0, 77) + '…'
}
