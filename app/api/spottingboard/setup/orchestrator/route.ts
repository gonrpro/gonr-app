// app/api/spottingboard/setup/orchestrator/route.ts — TASK-189 v0
//
// Interview Orchestrator. One LLM call per user turn. Given the current
// setup session state, returns the next assistant question (or pushback)
// in a strict JSON shape.
//
// Auth: session email via cookies → plant_users membership check via
// service-role (mirrors /api/spottingboard/items pattern). Spotters are
// 403; the setup surface is owner/operator only.
//
// LLM lane: env-configurable. ANTHROPIC_API_KEY required; SB_SETUP_MODEL
// defaults to claude-opus-4-7. Fail-closed if env missing.
//
// Full prompt contract: ~/lab/output/TASK-189-chat-setup/prompt-contracts.md

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

interface OrchestratorRequestBody {
  plant_id?: string
  plant_summary?: Record<string, unknown>
  current_phase?: string
  phase_target?: Record<string, unknown>
  captured_records_summary?: Array<Record<string, unknown>>
  recent_transcript?: Array<{ role: string; content: string }>
  open_followups?: Array<Record<string, unknown>>
  safety_flags?: string[]
  user_turn_count?: number
}

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MODEL = 'claude-opus-4-7'
const DEFAULT_MAX_TURNS = 30
const DEFAULT_MAX_TOKENS = 1500

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

const SYSTEM_PROMPT = `You are an expert dry-cleaning consultant interviewing a plant operator to build their plant brain. Your job is to extract structured plant intelligence — not to give cleaning advice in this surface. You ask one focused question at a time.

You operate inside a fixed phase spine: Plant Profile → Equipment → Chemistry Inventory → Standard Workflows → Exceptions/Never-do Rules → Training Knowledge → Review/Publish. The current phase is provided in current_phase. You pick the next question to advance that phase, not to skip ahead.

Use the captured records and recent transcript to avoid repeating questions, to ground follow-ups, and to spot ambiguity or contradictions.

Push back — concisely, expertly, non-judgmentally — when the operator says something that is:
  - vague: "we use the usual stuff", "the normal way"
  - unsafe: "we steam everything first", "we use chlorine bleach on wool"
  - contradictory: contradicts a prior captured record
  - overbroad: "this works on everything"
  - unscoped: a rule with no stain, fabric, or condition
  - risky prior treatment: heat, home product, unknown chemical on a stain we're about to advise on

Pushback wording pattern: "Small catch: <restate the issue>. <Ask the targeted follow-up.>"

When asking a normal question, propose 3-6 chip-style short answers when answers are likely to cluster (e.g., solvent system, fabric class, severity).

Output must be valid JSON matching this exact shape, with no prose before or after:

{
  "next_question": {
    "phase_id": "string",
    "prompt": "string",
    "why_asking": "string",
    "expected_field_path": "string or null",
    "chips": [{ "value": "string", "label": "string" }],
    "allow_text": true,
    "is_pushback": false,
    "pushback_reason": null
  },
  "progress_note": "string or null"
}

pushback_reason must be one of: "vague" | "unsafe" | "contradictory" | "overbroad" | "unscoped" | "risky_prior_treatment" | "unreviewed_treated_as_approved" | null.

Hard rules:
- Never give cleaning advice in this surface. That is GONR's lane.
- Never produce a question outside the current phase unless safety_flags has an unresolved issue.
- If unsure whether to push back, push back. False-positive pushback is cheaper than false-negative.`

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
  // 1. Auth
  const email = await getSessionEmail()
  if (!email) {
    return NextResponse.json({ error: 'login_required' }, { status: 401 })
  }

  let body: OrchestratorRequestBody
  try {
    body = (await req.json()) as OrchestratorRequestBody
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!body.plant_id) {
    return NextResponse.json({ error: 'plant_id_required' }, { status: 400 })
  }

  // 2. Membership
  try {
    const ok = await verifyOwnerOrOperator(email, body.plant_id)
    if (!ok) {
      return NextResponse.json({ error: 'not_owner_or_operator' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: 'membership_check_failed' }, { status: 503 })
  }

  // 3. Cap policy
  const maxTurns = Number(process.env.SB_SETUP_MAX_TURNS ?? DEFAULT_MAX_TURNS)
  const turnCount = body.user_turn_count ?? 0
  if (turnCount >= maxTurns) {
    return NextResponse.json({
      next_question: {
        phase_id: body.current_phase ?? 'review_publish',
        prompt: "We've captured a strong starting set. Want me to summarise and let you pick up where you left off?",
        why_asking: `Session reached the ${maxTurns}-turn cap. Pause + resume later.`,
        expected_field_path: null,
        chips: [
          { value: 'summarise', label: 'Summarise what we have' },
          { value: 'resume_later', label: 'Resume later' },
        ],
        allow_text: false,
        is_pushback: false,
        pushback_reason: null,
      },
      progress_note: 'Session capped; resume available.',
      cappedSession: true,
    })
  }

  // 4. LLM env
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'setup_llm_not_configured' }, { status: 503 })
  }
  const model = process.env.SB_SETUP_MODEL ?? DEFAULT_MODEL
  const maxTokens = Number(process.env.SB_SETUP_MAX_TOKENS_PER_CALL ?? DEFAULT_MAX_TOKENS)

  // 5. Build user message — compact JSON of state.
  const userMessage = JSON.stringify({
    plant_id: body.plant_id,
    plant_summary: body.plant_summary ?? null,
    current_phase: body.current_phase ?? 'plant_profile',
    phase_target: body.phase_target ?? null,
    captured_records_summary: body.captured_records_summary ?? [],
    recent_transcript: body.recent_transcript ?? [],
    open_followups: body.open_followups ?? [],
    safety_flags: body.safety_flags ?? [],
  })

  // 6. Call Anthropic
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

  // 7. Echo through.  Client validates shape further.
  return NextResponse.json(parsed)
}
