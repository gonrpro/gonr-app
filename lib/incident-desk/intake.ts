// lib/incident-desk/intake.ts — TASK-155 v0
//
// Intake validation + prompt construction for the Incident Desk API. Pure
// functions; no I/O. Tested in __tests__/intake.test.ts.

import type { IncidentIntake, DesiredOutput, DamageDiscoveredAt } from './types'

const VALID_DISCOVERED_AT: ReadonlySet<DamageDiscoveredAt> = new Set([
  'intake', 'inspection', 'after_cleaning', 'after_pressing',
  'customer_pickup', 'customer_return',
])

const VALID_DESIRED_OUTPUTS: ReadonlySet<DesiredOutput> = new Set([
  'intake_note', 'decline_note', 'post_treatment_explanation',
  'claim_response', 'internal_report',
])

// ──────────────────────────────────────────────────────────────────────────────
// Validation
// ──────────────────────────────────────────────────────────────────────────────

export type ValidationResult =
  | { ok: true }
  | { ok: false; error: string; field?: string }

export function validateIntake(intake: unknown): ValidationResult {
  if (!isRecord(intake)) {
    return { ok: false, error: 'intake must be an object' }
  }

  if (typeof intake.garment_type !== 'string' || intake.garment_type.trim().length === 0) {
    return { ok: false, error: 'garment_type required', field: 'garment_type' }
  }

  if (!Array.isArray(intake.damage_types) || intake.damage_types.length === 0) {
    return { ok: false, error: 'damage_types must be a non-empty array', field: 'damage_types' }
  }
  if (!intake.damage_types.every((d): d is string => typeof d === 'string')) {
    return { ok: false, error: 'damage_types must be strings', field: 'damage_types' }
  }

  if (!VALID_DISCOVERED_AT.has(intake.damage_discovered_at as DamageDiscoveredAt)) {
    return {
      ok: false,
      error: `damage_discovered_at must be one of: ${Array.from(VALID_DISCOVERED_AT).join(', ')}`,
      field: 'damage_discovered_at',
    }
  }

  if (!Array.isArray(intake.desired_outputs) || intake.desired_outputs.length === 0) {
    return { ok: false, error: 'desired_outputs must be a non-empty array', field: 'desired_outputs' }
  }
  for (const o of intake.desired_outputs) {
    if (!VALID_DESIRED_OUTPUTS.has(o as DesiredOutput)) {
      return {
        ok: false,
        error: `desired_outputs contains invalid value "${String(o)}"`,
        field: 'desired_outputs',
      }
    }
  }

  if (intake.lang !== undefined && intake.lang !== 'en' && intake.lang !== 'es') {
    return { ok: false, error: 'lang must be "en" or "es"', field: 'lang' }
  }

  if (intake.photos !== undefined) {
    if (!Array.isArray(intake.photos)) {
      return { ok: false, error: 'photos must be an array', field: 'photos' }
    }
    for (let i = 0; i < intake.photos.length; i++) {
      const p = intake.photos[i]
      if (!isRecord(p) || typeof p.kind !== 'string' || typeof p.url !== 'string') {
        return {
          ok: false,
          error: 'photos[*] must have { kind: string, url: string }',
          field: `photos[${i}]`,
        }
      }
    }
  }

  return { ok: true }
}

// ──────────────────────────────────────────────────────────────────────────────
// Prompt construction
// ──────────────────────────────────────────────────────────────────────────────

const BASE_SYSTEM_PROMPT_EN = `You are GONR's Garment Incident Desk — a professional documentation engine for dry-cleaning operators handling damage claims, post-treatment incidents, and high-risk garment situations.

ROLE
- Audience: dry cleaning OPERATORS (not consumers, not legal counsel).
- Job: produce internal analysis + customer-facing communications + retainable documents based on the operator's intake.
- Tone: professional, evidence-based, careful. Use specific dry-cleaning terminology (NSD, POG, tannin formula, protein formula, acetic acid, peroxide, perc, hydrocarbon).

NON-NEGOTIABLE RULES
1. Never state definitive liability when evidence is insufficient — prefer "inconclusive" with rationale.
2. Photo-only analysis can be limited. Say so when relevant.
3. NO legal advice. NO admission of fault in any customer-facing document unless the operator's intake explicitly establishes it.
4. NO Eisen references — Eisen is a textbook, not a brand. Do not cite it.
5. Use professional dry-cleaning language but avoid overclaiming.
6. Separate FACTS (what was captured at intake) from INFERENCE (your reasoning). Never present inference as fact.
7. Identify EVIDENCE GAPS explicitly — what would change your analysis if known.

OUTPUT
Return a single JSON object matching this shape exactly:

{
  "operator_summary": "2-4 sentence internal analysis",
  "likely_causes": [
    {
      "cause": "string",
      "confidence": "low" | "medium" | "high",
      "evidence_for": ["string"],
      "evidence_gaps": ["string"]
    }
  ],
  "risk_assessment": {
    "treatment_risks": ["string"],
    "do_not": ["string"],
    "proceed_only_if": ["string"]
  },
  "liability_position": {
    "position": "manufacturer" | "cleaner" | "customer" | "pre_existing" | "inconclusive" | "shared",
    "rationale": "string",
    "inconclusive_flag": true | false
  },
  "recommended_next_steps": ["string"],
  "missing_evidence_questions": [
    { "question": "string", "why_it_matters": "string" }
  ],
  "customer_intake_script": "string — counter conversation, professional",
  "customer_sms": "string — concise, <= 160 chars where possible",
  "customer_email": "string — full professional email body, no signature line",
  "ticket_note": "string — 1-3 line internal ticket annotation",
  "written_decline_or_release_note": "string — formatted document, ready-to-print",
  "incident_report": "string — printable structured report with sections",
  "documentation_checklist": {
    "preserve": ["string — items to retain"],
    "capture_now": ["string — additional evidence to collect"],
    "retain_until": "string — e.g. 'claim resolution + 90 days'"
  },
  "disclaimers": ["string"]
}

WRITING STYLE
- Customer-facing docs: respectful, factual, no admission of fault.
- Internal docs: direct, specific, includes uncertainty markers.
- SMS: short, action-oriented (call/visit invitation, not full explanation).
- Email: full context, evidence-based, professional close.
- Decline note: includes garment description, specific reason, the risk that prevented treatment, and a returned-as-received closing line. NO signature line.
- Incident report: structured sections (Garment | Incident | Process History | Analysis | Recommended Action | Evidence Status).`

const SPANISH_AMENDMENT = `

LANGUAGE
Write the ENTIRE response in professional Spanish (español). All field values, all customer-facing documents, all internal docs. Use professional Spanish dry-cleaning terminology. Agent names stay as-is (NSD, POG, tannin formula, protein formula, etc.).`

export function buildSystemPrompt(lang: 'en' | 'es'): string {
  return lang === 'es' ? BASE_SYSTEM_PROMPT_EN + SPANISH_AMENDMENT : BASE_SYSTEM_PROMPT_EN
}

interface OpenAIInputContent {
  type: 'input_text' | 'input_image' | 'text' | 'image_url'
  text?: string
  image_url?: string | { url: string; detail?: string }
  detail?: string
}

/**
 * Build the user-message content array for OpenAI chat-completions.
 * Combines a structured intake summary text block + each photo as an image.
 */
export function buildUserContent(intake: IncidentIntake): OpenAIInputContent[] {
  const summary = renderIntakeSummary(intake)
  const content: OpenAIInputContent[] = [
    { type: 'text', text: summary },
  ]
  if (intake.photos) {
    for (const p of intake.photos) {
      content.push({
        type: 'image_url',
        image_url: { url: p.url, detail: 'high' },
      })
    }
  }
  return content
}

/**
 * Render the intake as a structured text block. Operator transparency rule:
 * the summary is what the model sees; intake_echo on the response surfaces
 * the same data to the operator so there's no hidden reasoning input.
 */
export function renderIntakeSummary(intake: IncidentIntake): string {
  const lines: string[] = []
  lines.push('GARMENT INCIDENT INTAKE')
  lines.push('========================')
  lines.push('')
  lines.push('## Garment')
  lines.push(`- type: ${intake.garment_type}`)
  if (intake.brand_label_notes) lines.push(`- brand/label: ${intake.brand_label_notes}`)
  if (intake.fiber_content) lines.push(`- fiber content: ${intake.fiber_content}`)
  if (intake.has_care_label !== undefined) {
    lines.push(`- care label present: ${intake.has_care_label ? 'yes' : 'no'}`)
  }
  if (intake.color) lines.push(`- color: ${intake.color}`)
  if (intake.construction_notes) lines.push(`- construction: ${intake.construction_notes}`)
  if (intake.trim_or_embellishments) lines.push(`- trim/embellishments: ${intake.trim_or_embellishments}`)

  lines.push('')
  lines.push('## Damage')
  lines.push(`- types: ${intake.damage_types.join(', ')}`)
  if (intake.damage_locations) lines.push(`- locations: ${intake.damage_locations}`)
  lines.push(`- discovered at: ${intake.damage_discovered_at}`)
  if (intake.prior_condition_at_intake) {
    lines.push(`- prior condition noted at intake: ${intake.prior_condition_at_intake}`)
  }

  if (intake.customer_claim_language || intake.customer_expectations) {
    lines.push('')
    lines.push('## Customer claim')
    if (intake.customer_claim_language) {
      lines.push(`- claim (verbatim): ${intake.customer_claim_language}`)
    }
    if (intake.customer_expectations) {
      lines.push(`- expectations: ${intake.customer_expectations}`)
    }
  }

  if (intake.treatment_already_attempted || intake.chemicals_or_process_used) {
    lines.push('')
    lines.push('## Process history')
    if (intake.treatment_already_attempted) {
      lines.push(`- treatment attempted: ${intake.treatment_already_attempted}`)
    }
    if (intake.chemicals_or_process_used) {
      lines.push(`- chemicals/process used: ${intake.chemicals_or_process_used}`)
    }
    if (intake.staff_involved) {
      lines.push(`- staff involved: ${intake.staff_involved}`)
    }
    if (intake.plant_or_location) {
      lines.push(`- plant/location: ${intake.plant_or_location}`)
    }
  }

  if (intake.ticket_or_order_number) {
    lines.push('')
    lines.push(`## Order ref: ${intake.ticket_or_order_number}`)
  }

  if (intake.photos && intake.photos.length > 0) {
    lines.push('')
    lines.push(`## Photos attached (${intake.photos.length})`)
    intake.photos.forEach((p, i) => lines.push(`- [${i}] ${p.kind}`))
  }

  if (intake.free_text_notes) {
    lines.push('')
    lines.push('## Free-text notes')
    lines.push(intake.free_text_notes)
  }

  lines.push('')
  lines.push(`## Desired outputs: ${intake.desired_outputs.join(', ')}`)

  return lines.join('\n')
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}
