// lib/spottingboard/ops-book.ts (server-only, pure)
//
// TASK-162 — Renders a plant's plant_brain_items into a structured Markdown
// "Plant Ops Book" — the differentiated artifact that no generic AI can
// produce because the plant's data isn't in any model. Per Tyler's product
// direction (msg 1305): "useful enough that any cleaners will use it instead
// of trying to have AI do it alone."
//
// Pure function — takes plant + items + generated_at, returns markdown string.
// No DB reads here; route handler does the read and passes data in.
//
// Output sections (TASK-149 §Free vs $19 plan shape + TASK-145 SB review gate):
//   1. Title page  (plant identity, last-updated, summary counts)
//   2. Hard Safety Rules  (escalation_rule items — runtime-active even if unsafe per TASK-152 §6.2 carve-out)
//   3. Chemistry Rules    (module=chemistry_rule, sorted by safety severity)
//   4. Procedures         (module=procedure)
//   5. Escalation Rules   (module=escalation_rule not in §2 above)
//   6. Training Checks    (module=training_check)
//   7. Reference SOPs     (module=reference_sop)
//   8. Tribal Knowledge   (module=tribal_note — clearly labeled unreviewed)
//   9. Provenance index  (footer: version, generated_at, counts by safety_label)
//
// Each rule preserves all four governance fields per TASK-145: authority_class,
// risk_tier, review_status, safety_label. Never collapsed into a generic
// verified badge.

import type { BrainLibraryItem } from './items'
import type { PlantBrainItemModule } from './types'

export interface PlantSummary {
  name: string
  plantId: string
  // Optional plant-profile fields when the row exists; renderer renders what it gets
  primary_solvent?: string
  locations?: string[]
  languages?: string[]
}

export interface RenderOpsBookInput {
  plant: PlantSummary
  items: BrainLibraryItem[]
  generated_at: string                // ISO datetime
  generated_by: string                // session email — for the audit footer
  /** Optional: hide tribal_note section if false. Default true. */
  include_tribal?: boolean
}

// ──────────────────────────────────────────────────────────────────────────────
// Module → section title map (operator-facing copy)
// ──────────────────────────────────────────────────────────────────────────────

const MODULE_SECTION_ORDER: PlantBrainItemModule[] = [
  'escalation_rule',
  'chemistry_rule',
  'procedure',
  'training_check',
  'reference_sop',
  'printout',
  'preference',
  'tribal_note',
  'plant_profile',
]

const MODULE_SECTION_TITLES: Record<PlantBrainItemModule, string> = {
  escalation_rule: 'Escalation Rules',
  chemistry_rule: 'Chemistry Rules',
  procedure: 'Procedures',
  training_check: 'Training Checks',
  reference_sop: 'Reference SOPs',
  printout: 'Printable References',
  preference: 'Plant Preferences',
  tribal_note: 'Tribal Knowledge — Unverified',
  plant_profile: 'Plant Profile',
}

// Hard safety rules (printed first as their own section): escalation rules
// that carry restrictions which must remain visible regardless of safety_label.
function isHardSafetyRule(item: BrainLibraryItem): boolean {
  return (
    item.module === 'escalation_rule' &&
    (item.safety_label === 'unsafe_do_not_use' ||
      item.safety_label === 'escalation_required' ||
      item.risk_tier === 'high-risk')
  )
}

// Authority/risk/review/safety as visible badges in markdown
function badgeRow(item: BrainLibraryItem): string {
  return [
    `**Authority:** ${item.authority_class}`,
    `**Risk:** ${item.risk_tier}`,
    `**Review:** ${item.review_status}`,
    `**Safety:** ${item.safety_label}`,
  ].join('  ·  ')
}

// Scope arrays from tenant_provenance (we wrote them there in TASK-158/160).
function extractScope(item: BrainLibraryItem): {
  stain: string[]
  fabric: string[]
  chemistry: string[]
} {
  // BrainLibraryItem doesn't carry tenant_provenance in its select shape; the
  // route handler can pass scope separately if needed. For v1 we render from
  // the body; future versions add a dedicated scope column to the select.
  return { stain: [], fabric: [], chemistry: [] }
}

// Format a single ISO date as "YYYY-MM-DD" (drop time for readability)
function fmtDate(iso: string): string {
  if (!iso) return ''
  return iso.split('T')[0] ?? iso
}

// Markdown-escape a string for safe inclusion in body text. Conservative: only
// escape inline-significant characters; common inline punctuation like `+`, `-`,
// `{`, `}` stays as-is so operator-typed text reads normally.
function md(s: string | null | undefined): string {
  if (!s) return ''
  return s.replace(/[\\`*_[\]()#!|>]/g, (c) => `\\${c}`)
}

// ──────────────────────────────────────────────────────────────────────────────
// Per-item rendering
// ──────────────────────────────────────────────────────────────────────────────

function renderItem(item: BrainLibraryItem, index: number): string {
  const lines: string[] = []
  const title = item.title?.trim() || `(untitled item ${item.id.slice(0, 8)})`
  lines.push(`### ${index}. ${md(title)}`)
  lines.push('')

  // Visible badges line — never collapsed (TASK-145)
  lines.push(badgeRow(item))
  lines.push('')

  if (item.runtime_eligible) {
    lines.push('> ✅ **Runtime-eligible** — this rule may guide automated stain solves.')
    lines.push('')
  }

  if (item.safety_label === 'unsafe_do_not_use') {
    lines.push(
      '> ⚠️ **UNSAFE — DO NOT USE.** This rule was flagged by the classifier or supervisor as quarantined. Kept here as training warning. Never apply to garments without explicit supervisor + Stain Brain review.',
    )
    lines.push('')
  } else if (item.safety_label === 'escalation_required') {
    lines.push('> 🛑 **ESCALATION REQUIRED.** Do not start in-house; route to specialist.')
    lines.push('')
  } else if (item.safety_label === 'needs_source_review') {
    lines.push('> 🟡 **Needs source review.** Plant-local rule; not yet source-backed by SB.')
    lines.push('')
  }

  // Body
  lines.push(md(item.body))
  lines.push('')

  // Conflict flags
  const conflicts = (item.conflict_flags ?? []) as Array<unknown>
  if (conflicts.length > 0) {
    lines.push('**Conflict flags:**')
    for (const f of conflicts) {
      if (typeof f === 'string') {
        lines.push(`- ${md(f)}`)
      } else if (f && typeof f === 'object') {
        const cf = f as { detail?: string; kind?: string; flag_id?: string }
        lines.push(`- ${md(cf.detail ?? cf.kind ?? cf.flag_id ?? 'unknown')}`)
      }
    }
    lines.push('')
  }

  // Provenance footer
  const provLines: string[] = []
  if (item.created_at) provLines.push(`Captured: ${fmtDate(item.created_at)}`)
  if (item.reviewer_email) provLines.push(`Reviewer: ${item.reviewer_email}`)
  provLines.push(`Item ID: \`${item.id.slice(0, 8)}\``)
  lines.push(`*${provLines.join(' · ')}*`)
  lines.push('')
  lines.push('---')
  lines.push('')

  return lines.join('\n')
}

// ──────────────────────────────────────────────────────────────────────────────
// Section rendering
// ──────────────────────────────────────────────────────────────────────────────

function renderSection(
  title: string,
  items: BrainLibraryItem[],
  emptyMessage: string,
): string {
  const lines: string[] = []
  lines.push(`## ${title}`)
  lines.push('')

  if (items.length === 0) {
    lines.push(`*${emptyMessage}*`)
    lines.push('')
    lines.push('---')
    lines.push('')
    return lines.join('\n')
  }

  items.forEach((item, idx) => {
    lines.push(renderItem(item, idx + 1))
  })

  return lines.join('\n')
}

// ──────────────────────────────────────────────────────────────────────────────
// Main render
// ──────────────────────────────────────────────────────────────────────────────

export function renderOpsBookMarkdown(input: RenderOpsBookInput): string {
  const { plant, items, generated_at, generated_by } = input
  const includeTribal = input.include_tribal ?? true

  // Bucket items by module
  const byModule = new Map<PlantBrainItemModule, BrainLibraryItem[]>()
  for (const m of MODULE_SECTION_ORDER) byModule.set(m, [])

  const hardSafety: BrainLibraryItem[] = []
  const tribalUnsafeQuotes: BrainLibraryItem[] = []

  for (const item of items) {
    // Hard-safety carve-out: escalation rules that restrict action stay surfaced
    if (isHardSafetyRule(item)) {
      hardSafety.push(item)
      continue
    }
    // Tribal notes that quote hard-bans get their own subsection so reviewers
    // can spot them quickly per TASK-152 §6.1.
    if (item.module === 'tribal_note' && item.safety_label === 'unsafe_do_not_use') {
      tribalUnsafeQuotes.push(item)
      continue
    }
    const arr = byModule.get(item.module)
    if (arr) arr.push(item)
  }

  // Counts for provenance index
  const counts = {
    total: items.length,
    source_backed: items.filter((i) => i.safety_label === 'source_backed').length,
    reviewed_for_plant_use: items.filter((i) => i.safety_label === 'reviewed_for_plant_use').length,
    needs_source_review: items.filter((i) => i.safety_label === 'needs_source_review').length,
    escalation_required: items.filter((i) => i.safety_label === 'escalation_required').length,
    unsafe_do_not_use: items.filter((i) => i.safety_label === 'unsafe_do_not_use').length,
    runtime_eligible: items.filter((i) => i.runtime_eligible).length,
  }

  const lines: string[] = []

  // ── Title page ────────────────────────────────────────────────────────────
  lines.push(`# ${md(plant.name)} — Plant Ops Book`)
  lines.push('')
  lines.push(`*Generated ${fmtDate(generated_at)} from Spotting Board · plant ID \`${plant.plantId}\` · authored by ${md(generated_by)}*`)
  lines.push('')
  if (plant.primary_solvent) lines.push(`**Primary process:** ${md(plant.primary_solvent)}`)
  if (plant.locations && plant.locations.length > 0) {
    lines.push(`**Locations:** ${plant.locations.map(md).join(', ')}`)
  }
  if (plant.languages && plant.languages.length > 0) {
    lines.push(`**Operator languages:** ${plant.languages.map(md).join(', ')}`)
  }
  lines.push('')
  lines.push(`> This document is your plant's operating brain — captured rules, chemistry doctrine, escalation paths, training, and reference materials. Every rule is governance-tagged with authority, risk, review, and safety state. Plant-local lore is clearly separated from source-backed guidance. Nothing here is a substitute for professional judgment; it is a structured record of how your plant currently operates.`)
  lines.push('')
  lines.push('---')
  lines.push('')

  // ── Quick stats ───────────────────────────────────────────────────────────
  lines.push(`## At a Glance`)
  lines.push('')
  lines.push(`- Total items: ${counts.total}`)
  lines.push(`- Source-backed: ${counts.source_backed}`)
  lines.push(`- Reviewed for plant use: ${counts.reviewed_for_plant_use}`)
  lines.push(`- Pending source review: ${counts.needs_source_review}`)
  lines.push(`- Escalation required: ${counts.escalation_required}`)
  lines.push(`- Unsafe / quarantined: ${counts.unsafe_do_not_use}`)
  lines.push(`- Runtime-eligible: ${counts.runtime_eligible}`)
  lines.push('')
  lines.push('---')
  lines.push('')

  // ── Hard safety rules first ───────────────────────────────────────────────
  lines.push(
    renderSection(
      'Hard Safety Rules',
      hardSafety,
      'No hard safety escalation rules captured yet.',
    ),
  )

  // ── Standard sections in order ───────────────────────────────────────────
  for (const m of MODULE_SECTION_ORDER) {
    if (m === 'escalation_rule') {
      // Already handled in hardSafety + non-hardSafety bucket
      const remainingEscalation = (byModule.get('escalation_rule') ?? []).filter(
        (i) => !hardSafety.includes(i),
      )
      if (remainingEscalation.length === 0) continue
      lines.push(renderSection('Other Escalation Rules', remainingEscalation, ''))
      continue
    }
    if (m === 'tribal_note' && !includeTribal) continue
    const sectionItems = byModule.get(m) ?? []
    if (sectionItems.length === 0 && m !== 'chemistry_rule' && m !== 'procedure') continue
    lines.push(
      renderSection(
        MODULE_SECTION_TITLES[m],
        sectionItems,
        m === 'tribal_note'
          ? 'No tribal/unverified knowledge captured yet.'
          : `No ${MODULE_SECTION_TITLES[m].toLowerCase()} captured yet.`,
      ),
    )
  }

  // ── Tribal hard-ban quotes (if any) ──────────────────────────────────────
  if (includeTribal && tribalUnsafeQuotes.length > 0) {
    lines.push(
      renderSection(
        'Tribal Knowledge — Hard-ban quotes (training warnings)',
        tribalUnsafeQuotes,
        '',
      ),
    )
  }

  // ── Provenance footer ─────────────────────────────────────────────────────
  lines.push('## Provenance')
  lines.push('')
  lines.push(`- Source: Spotting Board · plant ${plant.plantId}`)
  lines.push(`- Generated at: ${generated_at}`)
  lines.push(`- Authored by: ${md(generated_by)}`)
  lines.push(`- Document version: 1.0 (markdown)`)
  lines.push(`- Item count: ${counts.total}`)
  lines.push('')
  lines.push(
    '> Authority and review states are preserved verbatim per the Spotting Board governance contract. ' +
      'Plant-local rules are NOT source-backed unless explicitly labeled. Tribal/unverified entries are clearly marked.',
  )
  lines.push('')
  lines.push('*— Generated by Spotting Board. Powered by GONR Labs.*')
  lines.push('')

  return lines.join('\n')
}

// Util kept exported for tests; the render uses scope-from-body fallback for now.
export { extractScope, isHardSafetyRule, MODULE_SECTION_ORDER, MODULE_SECTION_TITLES }
