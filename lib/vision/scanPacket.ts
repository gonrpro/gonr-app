// lib/vision/scanPacket.ts
// VISION track (TASK-218, Atlas-locked 2026-06-08).
//
// Reads a 3-image scan packet — (1) stain close-up (2) full garment/context
// (3) care label — via the OpenAI RESPONSES API with image detail "high".
// Cheap first pass on gpt-5-mini, escalates to gpt-5.2 (primary/authoritative)
// on any risk/low-confidence signal.
//
// HARD RULES (do not relax):
//   * Vision output is a HINT into intake, NEVER a verdict. The GONR safety
//     engine makes the final call. `failClosed`/`nextQuestion` tell intake to
//     ask one more question instead of treating the read as an answer.
//   * Care-label OCR facts (no-bleach / dry-clean-only / no-heat / do-not-wash)
//     are HARD constraints. They are surfaced as `careLabel.hardConstraints` and
//     are NEVER overridden by a stain-photo guess.
//   * `failClosed` is computed deterministically server-side — it does not trust
//     the model to volunteer caution.

import {
  OPENAI_API_BASE,
  VISION_PRIMARY_MODEL,
  VISION_CHEAP_MODEL,
  VISION_IMAGE_DETAIL,
} from './models'
import type { StainIdentification, CareLabelData } from './index'

// ── Public structured-output types ──────────────────────────────────────────

export type VisionConfidence = 'high' | 'medium' | 'low'

/** Care-label tokens — fixed enum shared with lib/vision readCareLabel vocab. */
export const CARE_SYMBOL_TOKENS = [
  'dry-clean-only',
  'no-bleach',
  'no-heat',
  'hand-wash-only',
  'do-not-wash',
  'no-iron',
  'machine-wash-warm',
  'tumble-dry-low',
] as const
export type CareSymbolToken = (typeof CARE_SYMBOL_TOKENS)[number]

/** Restrictive care symbols that become NON-OVERRIDABLE hard constraints. */
const RESTRICTIVE_SYMBOLS: ReadonlySet<string> = new Set<CareSymbolToken>([
  'dry-clean-only',
  'no-bleach',
  'no-heat',
  'hand-wash-only',
  'do-not-wash',
  'no-iron',
])

/** Fibers that force full intake regardless of model confidence (GLOBAL-001). */
const SPECIALTY_FIBER = /silk|cashmere|wool|angora|mohair|acetate|rayon|viscose|chiffon|organza|leather|suede|nubuck|aniline|velvet|down|gore-?tex/i

export interface FabricGuess {
  fabric: string
  confidence: number // 0–1
  evidence: string
}

export interface StainFamilyGuess {
  family: string // tannin|protein|oil-grease|oxidizable|dye|combination|mineral|wax-gum|adhesive|mildew|particulate|unknown
  confidence: number // 0–1
  evidence: string
}

export interface CareLabelRead {
  readable: boolean
  fiber: string // "" when unreadable — never fabricate
  careSymbols: CareSymbolToken[]
  warnings: string[]
  rawText: string
}

/** The raw structured shape the model is forced to emit (strict json_schema). */
export interface ScanPacketModelOutput {
  overallConfidence: VisionConfidence
  probableFabrics: FabricGuess[]
  probableStainFamilies: StainFamilyGuess[]
  visibleRiskSigns: string[]
  careLabel: CareLabelRead
  cannotKnow: string[]
  nextQuestion: string | null
  reasoning: string
}

/** Full packet result returned to callers (model output + server-derived safety). */
export interface ScanPacketResult extends ScanPacketModelOutput {
  /** Which model produced the authoritative read. */
  model: string
  /** True if the cheap pass was escalated to the primary model. */
  escalated: boolean
  /**
   * Deterministic fail-closed flag. When true, intake MUST ask one more
   * question rather than treat this read as an answer.
   */
  failClosed: boolean
  /** Machine-checkable reasons the packet failed closed (for logging/intake). */
  failClosedReasons: string[]
  /**
   * Care-label restrictions that are HARD constraints — never overridden by a
   * stain-photo guess. Subset of careLabel.careSymbols.
   */
  hardConstraints: CareSymbolToken[]
  /** Always false — a vision read is a hint, never a verdict. */
  isVerdict: false
}

// ── JSON Schema (strict) forced on the Responses API ────────────────────────

const SCAN_PACKET_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    overallConfidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    probableFabrics: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          fabric: { type: 'string' },
          confidence: { type: 'number' },
          evidence: { type: 'string' },
        },
        required: ['fabric', 'confidence', 'evidence'],
      },
    },
    probableStainFamilies: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          family: { type: 'string' },
          confidence: { type: 'number' },
          evidence: { type: 'string' },
        },
        required: ['family', 'confidence', 'evidence'],
      },
    },
    visibleRiskSigns: { type: 'array', items: { type: 'string' } },
    careLabel: {
      type: 'object',
      additionalProperties: false,
      properties: {
        readable: { type: 'boolean' },
        fiber: { type: 'string' },
        careSymbols: {
          type: 'array',
          items: { type: 'string', enum: [...CARE_SYMBOL_TOKENS] },
        },
        warnings: { type: 'array', items: { type: 'string' } },
        rawText: { type: 'string' },
      },
      required: ['readable', 'fiber', 'careSymbols', 'warnings', 'rawText'],
    },
    cannotKnow: { type: 'array', items: { type: 'string' } },
    nextQuestion: { type: ['string', 'null'] },
    reasoning: { type: 'string' },
  },
  required: [
    'overallConfidence',
    'probableFabrics',
    'probableStainFamilies',
    'visibleRiskSigns',
    'careLabel',
    'cannotKnow',
    'nextQuestion',
    'reasoning',
  ],
} as const

// ── Packet input ────────────────────────────────────────────────────────────

export interface ScanPacketInput {
  /** base64 (no data: prefix) of the stain close-up. */
  stainImage?: string
  /** base64 of the full garment / context shot. */
  garmentImage?: string
  /** base64 of the care label. */
  careLabelImage?: string
  /** Optional free-text the user already typed. */
  userNote?: string
}

const SYSTEM_PROMPT = `You are GONR's professional textile-care VISION reader, grounded in dry-cleaning chemistry, textile safety, manufacturer care guidance, and field-tested spotting practice.

You receive up to THREE images of ONE garment situation:
  1. STAIN CLOSE-UP — the soiled area in detail
  2. FULL GARMENT — the whole item for context (fiber sheen, construction, color)
  3. CARE LABEL — the manufacturer care/fiber label

Your job is to OBSERVE and HYPOTHESIZE — never to prescribe treatment. You produce a structured read that the GONR safety engine will use as ONE input among several. You are NOT giving the final answer.

NON-NEGOTIABLE RULES:
- The CARE LABEL text/fiber BEATS any visual guess. If the label says a fiber or a restriction, that is ground truth; a stain-photo guess never overrides it.
- If you cannot read the label clearly, set careLabel.readable=false and leave fiber "". NEVER invent a fiber, percentage, or symbol you cannot actually see.
- Report confidence honestly per item (0–1). Low confidence is correct and useful — do not inflate it.
- List what you CANNOT know from the images (e.g. exact fiber without the label, age of stain, prior treatment, dye colorfastness).
- If fabric OR stain identity is uncertain, populate nextQuestion with the single most useful clarifying question to ask the user. Otherwise nextQuestion = null.
- visibleRiskSigns = anything that raises risk: delicate/specialty fiber sheen, leather/suede, possible dye bleed, heat/scorch marks, prior-treatment residue, embellishment, color-on-color, set/old stain, spreading.

Chemistry families to choose from: tannin, protein, oil-grease, oxidizable, dye, combination, mineral, wax-gum, adhesive, mildew, particulate, unknown.

Care symbol tokens (use ONLY these, only when actually visible): dry-clean-only, no-bleach, no-heat, hand-wash-only, do-not-wash, no-iron, machine-wash-warm, tumble-dry-low.

Return strictly the required JSON object. No prose outside it.`

// ── Responses API wiring (typed, zero `any`) ────────────────────────────────

interface ResponsesContentPart {
  type: string
  text?: string
}
interface ResponsesOutputItem {
  type: string
  content?: ResponsesContentPart[]
}
interface ResponsesEnvelope {
  status?: string
  output_text?: string
  output?: ResponsesOutputItem[]
  incomplete_details?: { reason?: string } | null
  error?: { message?: string } | null
}

interface ResponsesInputImage {
  type: 'input_image'
  image_url: string
  detail: typeof VISION_IMAGE_DETAIL
}
interface ResponsesInputText {
  type: 'input_text'
  text: string
}
type ResponsesInputPart = ResponsesInputImage | ResponsesInputText

function dataUrl(b64: string): string {
  return b64.startsWith('data:') ? b64 : `data:image/jpeg;base64,${b64}`
}

function buildInputParts(input: ScanPacketInput): ResponsesInputPart[] {
  const parts: ResponsesInputPart[] = []
  parts.push({ type: 'input_text', text: SYSTEM_PROMPT })
  if (input.userNote?.trim()) {
    parts.push({ type: 'input_text', text: `User note: ${input.userNote.trim()}` })
  }
  if (input.stainImage) {
    parts.push({ type: 'input_text', text: 'IMAGE 1 — stain close-up:' })
    parts.push({ type: 'input_image', image_url: dataUrl(input.stainImage), detail: VISION_IMAGE_DETAIL })
  }
  if (input.garmentImage) {
    parts.push({ type: 'input_text', text: 'IMAGE 2 — full garment / context:' })
    parts.push({ type: 'input_image', image_url: dataUrl(input.garmentImage), detail: VISION_IMAGE_DETAIL })
  }
  if (input.careLabelImage) {
    parts.push({ type: 'input_text', text: 'IMAGE 3 — care label:' })
    parts.push({ type: 'input_image', image_url: dataUrl(input.careLabelImage), detail: VISION_IMAGE_DETAIL })
  }
  return parts
}

function extractText(env: ResponsesEnvelope): string {
  if (typeof env.output_text === 'string' && env.output_text.length) return env.output_text
  for (const item of env.output ?? []) {
    if (item.type !== 'message') continue
    for (const c of item.content ?? []) {
      if (c.type === 'output_text' && typeof c.text === 'string') return c.text
    }
  }
  return ''
}

class VisionError extends Error {}

async function callResponses(
  model: string,
  parts: ResponsesInputPart[],
  apiKey: string,
): Promise<ScanPacketModelOutput> {
  const res = await fetch(`${OPENAI_API_BASE}/responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      input: [{ role: 'user', content: parts }],
      text: {
        format: {
          type: 'json_schema',
          name: 'gonr_scan_packet',
          strict: true,
          schema: SCAN_PACKET_JSON_SCHEMA,
        },
      },
      max_output_tokens: 3000,
    }),
  })

  if (!res.ok) {
    const body = (await res.text().catch(() => '')).slice(0, 300)
    throw new VisionError(`Responses API ${res.status}: ${body}`)
  }

  const env = (await res.json()) as ResponsesEnvelope
  if (env.status && env.status !== 'completed') {
    throw new VisionError(`Responses status=${env.status} (${env.incomplete_details?.reason ?? 'unknown'})`)
  }
  const text = extractText(env)
  if (!text) throw new VisionError('Empty model output')
  return normalizeOutput(JSON.parse(text) as Partial<ScanPacketModelOutput>)
}

// ── Normalization (defensive — model is strict-schema'd but stay safe) ───────

function clamp01(n: unknown): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : 0
  return v < 0 ? 0 : v > 1 ? 1 : v
}

function normalizeOutput(raw: Partial<ScanPacketModelOutput>): ScanPacketModelOutput {
  const conf: VisionConfidence =
    raw.overallConfidence === 'high' || raw.overallConfidence === 'medium' ? raw.overallConfidence : 'low'

  const fabrics: FabricGuess[] = Array.isArray(raw.probableFabrics)
    ? raw.probableFabrics.map((f) => ({
        fabric: String(f?.fabric ?? '').trim(),
        confidence: clamp01(f?.confidence),
        evidence: String(f?.evidence ?? '').trim(),
      }))
    : []

  const families: StainFamilyGuess[] = Array.isArray(raw.probableStainFamilies)
    ? raw.probableStainFamilies.map((s) => ({
        family: String(s?.family ?? 'unknown').trim() || 'unknown',
        confidence: clamp01(s?.confidence),
        evidence: String(s?.evidence ?? '').trim(),
      }))
    : []

  const cl = raw.careLabel
  const careSymbols: CareSymbolToken[] = Array.isArray(cl?.careSymbols)
    ? (cl!.careSymbols.filter((s): s is CareSymbolToken =>
        (CARE_SYMBOL_TOKENS as readonly string[]).includes(s),
      ))
    : []

  const careLabel: CareLabelRead = {
    readable: cl?.readable === true,
    fiber: cl?.readable === true ? String(cl?.fiber ?? '').trim() : '',
    careSymbols,
    warnings: Array.isArray(cl?.warnings) ? cl!.warnings.map((w) => String(w).trim()).filter(Boolean) : [],
    rawText: String(cl?.rawText ?? '').trim(),
  }

  return {
    overallConfidence: conf,
    probableFabrics: fabrics,
    probableStainFamilies: families,
    visibleRiskSigns: Array.isArray(raw.visibleRiskSigns)
      ? raw.visibleRiskSigns.map((r) => String(r).trim()).filter(Boolean)
      : [],
    careLabel,
    cannotKnow: Array.isArray(raw.cannotKnow) ? raw.cannotKnow.map((c) => String(c).trim()).filter(Boolean) : [],
    nextQuestion:
      typeof raw.nextQuestion === 'string' && raw.nextQuestion.trim() ? raw.nextQuestion.trim() : null,
    reasoning: String(raw.reasoning ?? '').trim(),
  }
}

// ── Deterministic fail-closed + escalation logic ────────────────────────────

const CONFIDENCE_FLOOR = 0.6

function topFabric(out: ScanPacketModelOutput): FabricGuess | null {
  return out.probableFabrics.length
    ? [...out.probableFabrics].sort((a, b) => b.confidence - a.confidence)[0]
    : null
}
function topFamily(out: ScanPacketModelOutput): StainFamilyGuess | null {
  return out.probableStainFamilies.length
    ? [...out.probableStainFamilies].sort((a, b) => b.confidence - a.confidence)[0]
    : null
}

/** True if the cheap pass should be escalated to the authoritative model. */
function shouldEscalate(out: ScanPacketModelOutput): boolean {
  return computeFailReasons(out).length > 0 || out.visibleRiskSigns.length > 0
}

/** Deterministic fail-closed reasons (does NOT trust the model to ask for help). */
function computeFailReasons(out: ScanPacketModelOutput): string[] {
  const reasons: string[] = []
  if (out.overallConfidence === 'low') reasons.push('low_overall_confidence')

  const f = topFabric(out)
  if (!f || !f.fabric || /unknown/i.test(f.fabric)) reasons.push('fabric_unknown')
  else if (f.confidence < CONFIDENCE_FLOOR) reasons.push('fabric_low_confidence')

  const s = topFamily(out)
  if (!s || s.family === 'unknown') reasons.push('stain_family_unknown')
  else if (s.confidence < CONFIDENCE_FLOOR) reasons.push('stain_family_low_confidence')

  // GLOBAL-001: specialty fiber that the label did NOT positively confirm forces intake.
  const labelConfirmsFiber = out.careLabel.readable && out.careLabel.fiber.length > 0
  if (!labelConfirmsFiber && f && SPECIALTY_FIBER.test(f.fabric)) {
    reasons.push('specialty_fiber_unconfirmed')
  }
  return reasons
}

function hardConstraintsFrom(out: ScanPacketModelOutput): CareSymbolToken[] {
  return out.careLabel.careSymbols.filter((s) => RESTRICTIVE_SYMBOLS.has(s))
}

function finalize(out: ScanPacketModelOutput, model: string, escalated: boolean): ScanPacketResult {
  const failReasons = computeFailReasons(out)
  const failClosed = failReasons.length > 0
  // Guarantee intake gets a question whenever we fail closed.
  const nextQuestion =
    out.nextQuestion ??
    (failClosed
      ? 'I want to be safe here — what is the garment fabric, and do you know what caused the stain?'
      : null)
  return {
    ...out,
    nextQuestion,
    model,
    escalated,
    failClosed,
    failClosedReasons: failReasons,
    hardConstraints: hardConstraintsFrom(out),
    isVerdict: false,
  }
}

// ── Public entrypoint ───────────────────────────────────────────────────────

export interface AnalyzeOptions {
  /** Skip the cheap first pass and go straight to the primary model. */
  forcePrimary?: boolean
}

/**
 * Analyze a 3-image scan packet.
 * Cheap first pass (gpt-5-mini) → escalate to authoritative (gpt-5.2) on any
 * risk/low-confidence signal. Fails closed deterministically.
 */
export async function analyzeScanPacket(
  input: ScanPacketInput,
  apiKey: string,
  opts: AnalyzeOptions = {},
): Promise<ScanPacketResult> {
  const parts = buildInputParts(input)
  const hasImage = Boolean(input.stainImage || input.garmentImage || input.careLabelImage)
  if (!hasImage) {
    // Nothing to read → fail closed, ask for a photo / details.
    return finalize(
      {
        overallConfidence: 'low',
        probableFabrics: [],
        probableStainFamilies: [],
        visibleRiskSigns: [],
        careLabel: { readable: false, fiber: '', careSymbols: [], warnings: [], rawText: '' },
        cannotKnow: ['no image was provided'],
        nextQuestion: 'Add a photo of the stain (and the care label if you can) so I can read it safely.',
        reasoning: 'No image supplied.',
      },
      'none',
      false,
    )
  }

  try {
    if (opts.forcePrimary) {
      const primary = await callResponses(VISION_PRIMARY_MODEL, parts, apiKey)
      return finalize(primary, VISION_PRIMARY_MODEL, false)
    }

    // Cheap first pass.
    let cheap: ScanPacketModelOutput
    try {
      cheap = await callResponses(VISION_CHEAP_MODEL, parts, apiKey)
    } catch {
      // Cheap pass failed — go straight to the authoritative model.
      const primary = await callResponses(VISION_PRIMARY_MODEL, parts, apiKey)
      return finalize(primary, VISION_PRIMARY_MODEL, true)
    }

    if (!shouldEscalate(cheap)) {
      // Benign + high confidence — the cheap read stands (engine still gates).
      return finalize(cheap, VISION_CHEAP_MODEL, false)
    }

    // Risky / uncertain — authoritative model gets the case.
    try {
      const primary = await callResponses(VISION_PRIMARY_MODEL, parts, apiKey)
      return finalize(primary, VISION_PRIMARY_MODEL, true)
    } catch {
      // Primary unavailable — keep the cheap read but it will fail closed below.
      return finalize(cheap, VISION_CHEAP_MODEL, true)
    }
  } catch (err) {
    // Total failure → fail closed, ask one more question. Never throw to caller.
    console.error('[Vision:analyzeScanPacket] error:', err instanceof Error ? err.message : err)
    return finalize(
      {
        overallConfidence: 'low',
        probableFabrics: [],
        probableStainFamilies: [],
        visibleRiskSigns: [],
        careLabel: { readable: false, fiber: '', careSymbols: [], warnings: [], rawText: '' },
        cannotKnow: ['the image could not be analyzed'],
        nextQuestion: "I couldn't read the photo clearly — what is the fabric and what caused the stain?",
        reasoning: 'Vision analysis failed.',
      },
      'error',
      false,
    )
  }
}

// ── Backward-compat mappers (feed existing intake without breaking callers) ──

/** Map a packet to the legacy StainIdentification hint shape. */
export function packetToStainHint(p: ScanPacketResult): StainIdentification {
  const fabric = topFabric(p)
  const family = topFamily(p)
  return {
    stain: family?.family && family.family !== 'unknown' ? family.family : '',
    surface: fabric?.fabric ?? '',
    family: family?.family ?? 'unknown',
    confidence: p.failClosed ? 'low' : p.overallConfidence,
    reasoning: p.reasoning,
  }
}

/**
 * Map a packet to the legacy CareLabelData shape. Care-label facts are ground
 * truth — they flow through unchanged as hard constraints downstream.
 */
export function packetToCareLabel(p: ScanPacketResult): CareLabelData {
  return {
    fiber: p.careLabel.fiber,
    careSymbols: p.careLabel.careSymbols,
    warnings: p.careLabel.warnings,
    rawText: p.careLabel.rawText,
  }
}
