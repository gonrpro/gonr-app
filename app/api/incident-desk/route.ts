// app/api/incident-desk/route.ts — TASK-155 v0
//
// Garment Incident Desk API. Replaces the thinner garment-analysis route's
// 6-field response with a structured incident packet (operator-facing
// internal docs + customer-facing communications).
//
// Auth: requireProAuth + canAccessFeature(tier, 'incident_desk') with
// Operator-plan as the gating tier. Existing 'garment_analysis' feature
// flag is preserved (not removed) for backward-compat with founder access.
//
// Output: structured JSON matching IncidentPacket in lib/incident-desk/types.ts.
// Caller renders only the documents the intake.desired_outputs requested,
// but the full packet is always returned so the operator can pivot.

import { NextRequest, NextResponse } from 'next/server'
import { requireProAuth } from '@/lib/auth/requireProAuth'
import { canAccessFeature } from '@/lib/auth/features'
import type { Tier } from '@/lib/types'
import {
  validateIntake,
  buildSystemPrompt,
  buildUserContent,
} from '@/lib/incident-desk/intake'
import type {
  IncidentRequest,
  IncidentResponse,
  IncidentErrorResponse,
  IncidentPacket,
} from '@/lib/incident-desk/types'

const MODEL = 'gpt-4.1' // Pro model — never downgrade for liability/customer-comm work
const MAX_OUTPUT_TOKENS = 4000
const TEMPERATURE = 0.25 // Low — operator + customer docs need consistency

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey === 'placeholder-add-real-key') {
    return errorResponse('OPENAI_API_KEY not configured', 500)
  }

  try {
    const auth = await requireProAuth()
    if (!auth.allowed) return auth.response
    if (!canAccessFeature(auth.tier as Tier, 'incident_desk')) {
      return errorResponse('Operator tier required for Incident Desk', 403)
    }

    const body = (await req.json()) as Partial<IncidentRequest>
    const intake = body?.intake

    const validation = validateIntake(intake)
    if (!validation.ok) {
      return errorResponse(validation.error, 400, validation.field)
    }

    // Build prompt + user content (text + photos)
    const systemPrompt = buildSystemPrompt(intake!.lang ?? 'en')
    const userContent = buildUserContent(intake!)

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        max_tokens: MAX_OUTPUT_TOKENS,
        temperature: TEMPERATURE,
        response_format: { type: 'json_object' },
      }),
    })

    if (!aiResponse.ok) {
      const errBody = await aiResponse.text()
      console.error('Incident-desk OpenAI error:', errBody)
      return errorResponse('AI analysis failed', 502)
    }

    const aiData = await aiResponse.json()
    const raw = aiData.choices?.[0]?.message?.content
    if (!raw) return errorResponse('Empty AI response', 502)

    let packet: IncidentPacket
    try {
      packet = JSON.parse(raw) as IncidentPacket
    } catch {
      return errorResponse('Malformed AI JSON', 502)
    }

    // Always inject mandatory disclaimers — never trust the model alone.
    packet.disclaimers = mergeDisclaimers(packet.disclaimers, intake!.lang ?? 'en')

    const response: IncidentResponse = {
      ok: true,
      packet,
      intake_echo: intake!,
    }
    return NextResponse.json(response)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analysis failed'
    console.error('Incident-desk error:', err)
    return errorResponse(message, 500)
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function errorResponse(error: string, status: number, field?: string): NextResponse {
  const body: IncidentErrorResponse = { error, ...(field !== undefined ? { field } : {}) }
  return NextResponse.json(body, { status })
}

const REQUIRED_DISCLAIMERS_EN = [
  'Not legal advice. Use professional or legal counsel for liability decisions.',
  'Photo-only analysis may be inconclusive. In-person inspection is preferred for any claim-sensitive item.',
  'Preserve garment, photos, and ticket notes until the incident is resolved.',
]

const REQUIRED_DISCLAIMERS_ES = [
  'No es asesoría legal. Use asesoría profesional o legal para decisiones de responsabilidad.',
  'El análisis solo por foto puede ser inconclusivo. Se prefiere la inspección en persona para cualquier prenda con reclamo sensible.',
  'Conserve la prenda, las fotos y las notas del ticket hasta que el incidente se resuelva.',
]

function mergeDisclaimers(modelGenerated: unknown, lang: 'en' | 'es'): string[] {
  const required = lang === 'es' ? REQUIRED_DISCLAIMERS_ES : REQUIRED_DISCLAIMERS_EN
  const existing = Array.isArray(modelGenerated) ? modelGenerated.filter((s): s is string => typeof s === 'string') : []
  const merged = [...required]
  for (const d of existing) {
    if (!merged.includes(d)) merged.push(d)
  }
  return merged
}
