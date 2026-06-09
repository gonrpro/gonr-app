import { NextRequest, NextResponse } from 'next/server'
import { runIntakeTurn, type IntakeRequest, type IntakeTurn, type IntakeHints } from '@/lib/intake/orchestrator'

// TASK-218 FRONTIER — AGENTIC INTAKE ORCHESTRATOR ROUTE.
//
// One turn of the conversational intake loop. The LLM (gpt-5.2 primary / gpt-5-mini
// cheap pass, via the orchestrator) INTERPRETS + SYNTHESIZES the accumulated
// context and either asks ONE sharp question or signals it has enough.
//
// When it has enough (or the user opts to proceed, or the question budget is spent)
// THIS ROUTE calls the deterministic GONR safety engine (/api/solve) with the
// assembled facts and returns ITS verdict. The LLM NEVER writes the verdict — it
// only prepares the read and asks questions. The engine is the final authority.
//
// Sits ALONGSIDE /api/solve, /api/scan-packet, /api/scan-stain, /api/scan-label —
// it reuses them, it does not reinvent the safety engine.

export const runtime = 'nodejs'
export const maxDuration = 60

interface RequestBody {
  transcript?: unknown
  hints?: unknown
  proceed?: unknown
  lang?: unknown
}

// Only languages the engine is wired to answer in. Anything else falls back to 'en'.
function asLang(v: unknown): 'en' | 'es' {
  return v === 'es' ? 'es' : 'en'
}

function asTranscript(v: unknown): IntakeTurn[] {
  if (!Array.isArray(v)) return []
  const out: IntakeTurn[] = []
  for (const item of v) {
    if (!item || typeof item !== 'object') continue
    const t = item as { role?: unknown; text?: unknown }
    const role = t.role === 'assistant' ? 'assistant' : 'user'
    const text = typeof t.text === 'string' ? t.text.trim() : ''
    if (text) out.push({ role, text })
  }
  return out.slice(-24) // bound the transcript we forward to the model
}

function asHints(v: unknown): IntakeHints | undefined {
  if (!v || typeof v !== 'object') return undefined
  const h = v as Record<string, unknown>
  const strArr = (x: unknown): string[] =>
    Array.isArray(x) ? x.map((s) => String(s).trim()).filter(Boolean) : []
  const str = (x: unknown): string | undefined =>
    typeof x === 'string' && x.trim() ? x.trim() : undefined

  const stainRaw = h.stain as Record<string, unknown> | undefined
  const careRaw = h.careLabel as Record<string, unknown> | undefined

  return {
    userNote: str(h.userNote),
    stain: stainRaw
      ? {
          stain: str(stainRaw.stain),
          surface: str(stainRaw.surface),
          family: str(stainRaw.family),
          confidence: str(stainRaw.confidence),
        }
      : undefined,
    careLabel: careRaw
      ? {
          fiber: str(careRaw.fiber),
          careSymbols: strArr(careRaw.careSymbols),
          warnings: strArr(careRaw.warnings),
        }
      : undefined,
    hardConstraints: strArr(h.hardConstraints),
  }
}

export async function POST(req: NextRequest) {
  let body: RequestBody
  try {
    body = (await req.json()) as RequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey === 'placeholder-add-real-key') {
    // Fail closed: tell the client to fall back to the deterministic guided intake.
    return NextResponse.json(
      { phase: 'unavailable', reason: 'intake_agent_unconfigured' },
      { status: 503 },
    )
  }

  const lang = asLang(body.lang)
  const intakeReq: IntakeRequest = {
    transcript: asTranscript(body.transcript),
    hints: asHints(body.hints),
    proceed: body.proceed === true,
  }

  const decision = await runIntakeTurn(intakeReq, apiKey)

  // ── MODEL UNAVAILABLE: the configured model ids 404 (gone, not transient). ──
  // Fail closed to the deterministic guided intake — same contract as a missing
  // key — instead of silently degrading to an endless safe-question loop.
  if (decision.unavailable === 'model_unavailable') {
    return NextResponse.json(
      { phase: 'unavailable', reason: 'intake_agent_model_unavailable' },
      { status: 503 },
    )
  }

  // ── ASK: return ONE question to the client; the loop continues. ─────────────
  if (decision.action === 'ask') {
    return NextResponse.json({
      phase: 'question',
      read: decision.read,
      knows: decision.knows,
      suspects: decision.suspects,
      cannotKnow: decision.cannotKnow,
      riskFlags: decision.riskFlags,
      hardConstraints: decision.hardConstraints,
      failClosedReasons: decision.failClosedReasons,
      // Deterministic "ask only what matters" evidence: the facts we resolved without
      // the LLM, and any redundant model question the guard suppressed this turn.
      parsedFacts: decision.parsedFacts,
      suppressions: decision.suppressions,
      nextQuestion: decision.nextQuestion,
      model: decision.model,
    })
  }

  // ── SOLVE: hand the assembled facts to the DETERMINISTIC ENGINE. ────────────
  // The LLM never writes the verdict; /api/solve does. We forward the caller's
  // session cookie (so tier/gating is preserved) and IP (so rate-limiting works).
  const origin = req.nextUrl.origin
  const fwdHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
  const cookie = req.headers.get('cookie')
  if (cookie) fwdHeaders.cookie = cookie
  // Forward the server-to-server eval-runner secret if the caller supplied it, so an
  // authenticated eval/smoke can prove the engine verdict without tripping the anon
  // paywall. This opens no hole: /api/solve already gates it against GONR_EVAL_SECRET,
  // so the header is only honored when the caller already knows the secret.
  const evalSecret = req.headers.get('x-gonr-eval-secret')
  if (evalSecret) fwdHeaders['x-gonr-eval-secret'] = evalSecret
  const xff = req.headers.get('x-forwarded-for')
  if (xff) fwdHeaders['x-forwarded-for'] = xff
  const xri = req.headers.get('x-real-ip')
  if (xri) fwdHeaders['x-real-ip'] = xri

  let solveHttp = 0
  let solveData: unknown = null
  try {
    const solveRes = await fetch(`${origin}/api/solve`, {
      method: 'POST',
      headers: fwdHeaders,
      body: JSON.stringify({ ...decision.solveBody, lang }),
    })
    solveHttp = solveRes.status
    solveData = await solveRes.json().catch(() => ({}))
  } catch (err) {
    console.error('[intake] /api/solve call failed:', err instanceof Error ? err.message : err)
    return NextResponse.json(
      {
        phase: 'verdict',
        read: decision.read,
        parsedFacts: decision.parsedFacts,
        suppressions: decision.suppressions,
        assembledInput: decision.assembledInput,
        solveHttp: 503,
        solve: { error: 'engine_unreachable', reason: 'temporary_error' },
        model: decision.model,
      },
      { status: 200 },
    )
  }

  return NextResponse.json({
    phase: 'verdict',
    read: decision.read,
    knows: decision.knows,
    suspects: decision.suspects,
    cannotKnow: decision.cannotKnow,
    riskFlags: decision.riskFlags,
    hardConstraints: decision.hardConstraints,
    failClosedReasons: decision.failClosedReasons,
    // Deterministic fact-extraction + suppression evidence (audit-visible).
    parsedFacts: decision.parsedFacts,
    suppressions: decision.suppressions,
    assembledInput: decision.assembledInput,
    solveBody: decision.solveBody,
    solveHttp,
    solve: solveData,
    model: decision.model,
  })
}
