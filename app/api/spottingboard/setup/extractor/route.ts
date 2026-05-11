// app/api/spottingboard/setup/extractor/route.ts — TASK-189 v0
//
// Structured Extractor. Second LLM call per user turn (after the
// orchestrator). Takes a transcript chunk + schema hint and returns
// candidate canonical records. The validator runs separately client-side
// after the response arrives.
//
// Auth + env conventions match /api/spottingboard/setup/orchestrator.
// Full prompt contract: ~/lab/output/TASK-189-chat-setup/prompt-contracts.md

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

interface ExtractorRequestBody {
  plant_id?: string
  current_phase?: string
  transcript_chunk?: Array<{ role: string; content: string }>
  schema_hint?: 'plant_profile' | 'inventory' | 'rule' | 'training'
}

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MODEL = 'claude-opus-4-7'
const DEFAULT_MAX_TOKENS = 2000

async function getSessionEmail(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      },
    )
    const { data } = await supabase.auth.getUser()
    return data.user?.email ?? null
  } catch {
    return null
  }
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('supabase_admin_unconfigured')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function verifyOwnerOrOperator(email: string, plantId: string): Promise<boolean> {
  const sb = getSupabaseAdmin()
  const { data } = await sb
    .from('plant_users')
    .select('role')
    .eq('plant_id', plantId)
    .eq('user_email', email.toLowerCase())
    .maybeSingle()
  if (!data) return false
  const role = (data as { role: string }).role
  return role === 'owner' || role === 'operator'
}

const SYSTEM_PROMPT = `You are a structured-data extractor for a dry-cleaning plant-brain intake. Your job: read a short transcript chunk and emit candidate canonical records in strict JSON. You do not converse with the user. You do not invent fields the operator did not state. Confidence below 0.6 for any field means the field must be left out, not guessed.

Use the schema_hint to pick the canonical record kind. The 4 kinds are:
  - plant_profile — identity, services, languages, staff, capabilities
  - inventory     — equipment, chemicals, spotting agents, exclusions
  - rule          — standard procedures, exceptions, escalation, forbidden, handoff
  - training      — basics, SOPs, escalation paths, bilingual material

Every extracted field must have a confidence (0..1) and a source transcript span (turn_index + start + end character offsets in the operator's text). The validator will reject extractions with no source span.

When the operator's message contains multiple distinct facts (e.g., two inventory items + a rule), emit multiple candidate records, not one.

If the operator's claim is unsafe ("we steam everything first", "chlorine bleach on wool"), still emit the candidate but attach "unsafe" to safety_flags. The validator decides what to do.

Output must be valid JSON in this exact shape, with no prose before or after:

{
  "candidates": [
    {
      "kind": "inventory" | "rule" | "training" | "plant_profile",
      "fields": { ... canonical fields per kind ... },
      "confidence": 0.0,
      "source_span": { "turn_index": 0, "start": 0, "end": 0 },
      "missing_fields": ["..."],
      "safety_flags": []
    }
  ],
  "global_safety_flags": []
}

safety_flags items must be drawn from: "vague" | "unsafe" | "contradictory" | "overbroad" | "unscoped" | "risky_prior_treatment" | "unreviewed_treated_as_approved".

Hard rules:
- No guessing. Every field tied to a quoted span.
- No advice to the user. Extractor output is data only.
- Multiple records per chunk OK; the validator deduplicates against existing records.`

function extractJsonObject(text: string): unknown | null {
  let s = text.trim()
  const fence = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  if (fence) s = fence[1].trim()
  try { return JSON.parse(s) } catch { /* fall through */ }
  const first = s.indexOf('{')
  const last = s.lastIndexOf('}')
  if (first >= 0 && last > first) {
    try { return JSON.parse(s.slice(first, last + 1)) } catch { return null }
  }
  return null
}

interface AnthropicTextBlock { type: 'text'; text: string }
interface AnthropicResponse {
  content?: Array<AnthropicTextBlock | { type: string }>
  error?: { message?: string }
}

export async function POST(req: Request) {
  const email = await getSessionEmail()
  if (!email) {
    return NextResponse.json({ error: 'login_required' }, { status: 401 })
  }

  let body: ExtractorRequestBody
  try {
    body = (await req.json()) as ExtractorRequestBody
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!body.plant_id) {
    return NextResponse.json({ error: 'plant_id_required' }, { status: 400 })
  }
  if (!body.transcript_chunk || body.transcript_chunk.length === 0) {
    return NextResponse.json({ error: 'transcript_chunk_required' }, { status: 400 })
  }

  try {
    const ok = await verifyOwnerOrOperator(email, body.plant_id)
    if (!ok) {
      return NextResponse.json({ error: 'not_owner_or_operator' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: 'membership_check_failed' }, { status: 503 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'setup_llm_not_configured' }, { status: 503 })
  }
  const model = process.env.SB_SETUP_MODEL ?? DEFAULT_MODEL
  const maxTokens = Number(process.env.SB_SETUP_MAX_TOKENS_PER_CALL ?? DEFAULT_MAX_TOKENS)

  const userMessage = JSON.stringify({
    plant_id: body.plant_id,
    current_phase: body.current_phase ?? 'plant_profile',
    transcript_chunk: body.transcript_chunk,
    schema_hint: body.schema_hint ?? 'rule',
  })

  let llmRes: Response
  try {
    llmRes = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })
  } catch {
    return NextResponse.json({ error: 'llm_request_failed' }, { status: 503 })
  }

  if (!llmRes.ok) {
    return NextResponse.json({ error: `llm_status_${llmRes.status}` }, { status: 502 })
  }

  const data = (await llmRes.json().catch(() => null)) as AnthropicResponse | null
  if (!data) {
    return NextResponse.json({ error: 'llm_invalid_json_response' }, { status: 502 })
  }
  const textBlock = (data.content ?? []).find((c): c is AnthropicTextBlock => (c as AnthropicTextBlock).type === 'text')
  const parsed = textBlock ? extractJsonObject(textBlock.text) : null
  if (!parsed || typeof parsed !== 'object') {
    return NextResponse.json({ error: 'llm_output_not_parsable' }, { status: 502 })
  }

  return NextResponse.json(parsed)
}
