// app/api/solve/route.ts
import { NextResponse } from 'next/server'
import { lookupProtocol } from '@/lib/protocols/lookup'
import { runSafetyFilter, SAFE_FALLBACK } from '@/lib/safety/filter'
import { createClient } from '@supabase/supabase-js'
import { identifyStain, readCareLabel } from '@/lib/vision'
import { buildSolveContext } from '@/lib/solve/context'
import type { Tier } from '@/lib/types'
import type { SolveContext } from '@/lib/solve/context'

const OPENAI_API = 'https://api.openai.com/v1'

// ── Supabase admin client ──────────────────────────────────────
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// ── Server-side solve gating ───────────────────────────────────
async function checkAndIncrementSolve(email: string | null): Promise<{ allowed: boolean; reason?: string }> {
  if (!email) return { allowed: true }

  try {
  const supabase = getSupabaseAdmin()

  // Check tier directly via admin client — avoids SSR cookie/UUID issues
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('tier, status')
    .eq('email', email.toLowerCase())
    .single()

  const paidTiers: Tier[] = ['home', 'spotter', 'operator', 'founder']
  if (sub && paidTiers.includes(sub.tier as Tier) && sub.status === 'active') return { allowed: true }

  const { data: usage } = await supabase
    .from('solve_usage')
    .select('solve_count, trial_started_at')
    .eq('email', email.toLowerCase())
    .single()

  const now = new Date()

  if (!usage) {
    await supabase.from('solve_usage').insert({
      email: email.toLowerCase(),
      solve_count: 1,
      trial_started_at: now.toISOString(),
      last_solve_at: now.toISOString(),
    })
    return { allowed: true }
  }

  const trialStart = new Date(usage.trial_started_at)
  const daysSinceTrial = (now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24)

  if (usage.solve_count >= 3 && daysSinceTrial > 7) {
    return { allowed: false, reason: 'trial_expired' }
  }

  await supabase
    .from('solve_usage')
    .update({ solve_count: usage.solve_count + 1, last_solve_at: now.toISOString() })
    .eq('email', email.toLowerCase())

  return { allowed: true }
  } catch (err) {
    console.warn('[SolveGate] Error — allowing through:', err)
    return { allowed: true }
  }
}

// ── Fiber modifier for library hits ───────────────────────────
function applyFiberModifications(card: any, ctx: SolveContext): void {
  if (!ctx.fiber) return

  const additions: string[] = []

  if (ctx.isDryCleanOnly)
    additions.push('⚠️ Care label says DRY CLEAN ONLY — home solutions may risk damage. Take to a professional cleaner.')
  if (ctx.careSymbols.includes('hand-wash-only'))
    additions.push('⚠️ Care label says HAND WASH ONLY — avoid machine washing and aggressive scrubbing.')
  if (ctx.hasNoBleach && card.spottingProtocol?.some((s: any) => /bleach|hydrogen peroxide|oxygen/i.test(s.agent || '')))
    additions.push('⚠️ Care label says NO BLEACH — skip any bleach or hydrogen peroxide steps.')
  if (ctx.isDelicateFiber)
    additions.push(`⚠️ Delicate fiber (${ctx.fiber}) — cold water only, gentle agitation, test agents on hidden area first.`)

  if (!card.materialWarnings) card.materialWarnings = []
  for (const w of additions) {
    if (!card.materialWarnings.includes(w)) card.materialWarnings.unshift(w)
  }
}

// ── AI protocol generator ──────────────────────────────────────
async function generateAIProtocol(ctx: SolveContext): Promise<any> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OpenAI API key not configured')

  const systemPrompt = `You are Dan Eisen — DLI Hall of Fame master textile spotter with 40 years experience. You are also an expert stain removal chemist and 3rd-generation dry cleaner.

Given a complete stain brief, produce a precise JSON protocol card. Every recommendation must be safe for the specific fiber and respect all care label restrictions.

Return ONLY valid JSON:
{
  "id": "<stain-slug>-<surface-slug>",
  "title": "<descriptive title>",
  "stainFamily": "<protein|tannin|oil-grease|dye|oxidizable|combination|particulate|wax-gum|bleach-damage|adhesive|pigment|unknown>",
  "surface": "<surface>",
  "source": "ai-generated",
  "stainChemistry": "<1-2 sentences on the chemistry of this stain on this surface>",
  "whyThisWorks": "<1-2 sentences explaining why the recommended approach works>",
  "spottingProtocol": [
    {
      "step": 1,
      "agent": "<professional chemical or tool>",
      "technique": "<brief technique>",
      "temperature": "<temperature guidance>",
      "dwellTime": "<time range>",
      "instruction": "<clear, direct instruction — one action per step>"
    }
  ],
  "homeSolutions": ["<paragraph 1>", "<paragraph 2>"],
  "materialWarnings": ["<warning 1>", "<warning 2>"],
  "products": {
    "professional": [{"name": "<product>", "use": "<use case>", "note": "<note>"}],
    "consumer": [{"name": "<product>", "use": "<use case>", "note": "<note>"}]
  },
  "escalation": {
    "when": "<when to escalate>",
    "whatToTell": "<what to tell the cleaner>",
    "specialistType": "<type of specialist>"
  },
  "difficulty": 5,
  "meta": { "riskLevel": "medium", "tier": "ai-generated" }
}`

  const res = await fetch(`${OPENAI_API}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: ctx.brief },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  })

  if (!res.ok) throw new Error('AI generation failed')
  const data = await res.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty AI response')
  return JSON.parse(content.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim())
}

// ── Queue AI cards for review ──────────────────────────────────
async function queueForReview(card: any, ctx: SolveContext, safetyResult: any) {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !supabaseKey) return
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const stainKey = ctx.stain.toLowerCase().replace(/\s+/g, '-')
    const surfaceKey = ctx.surface.toLowerCase().replace(/\s+/g, '-')
    await supabase.from('pending_protocols').insert({
      stain: stainKey,
      surface: surfaceKey,
      cache_key: `${stainKey}::${surfaceKey}`,
      card,
      source: safetyResult.filtered ? 'ai-safety-filtered' : 'ai-generated',
      verified: false,
      solve_count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  } catch (e: any) {
    console.warn('[ProtocolCache] Queue failed:', e.message)
  }
}

// ── Solve history logging ──────────────────────────────────────
async function logSolveHistory(params: {
  stain: string; surface: string; title: string
  source: string; confidence?: number; protocolId?: string
}) {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !supabaseKey) return
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    await supabase.from('solve_history').insert({
      stain: params.stain || 'unknown',
      surface: params.surface || 'unknown',
      title: params.title || '',
      is_pro: false,
      solution_json: JSON.stringify({
        source: params.source,
        _protocolId: params.protocolId || null,
        confidence: params.confidence || null,
      }),
    })
  } catch (e: any) {
    console.warn('[SolveHistory] Log failed:', e.message)
  }
}

// ── Main handler ───────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    const contentType = req.headers.get('content-type') || ''

    let email: string | null = null
    let lang = 'en'
    let ctx: SolveContext

    // ── Parse inputs ───────────────────────────────────────────
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const imageFile = formData.get('image') as File | null
      const careLabelFile = formData.get('careLabel') as File | null
      const stainHint = (formData.get('stainHint') as string) || ''
      const surfaceHint = (formData.get('surfaceHint') as string) || ''
      const fabricDescription = (formData.get('fabricDescription') as string) || ''
      const garmentLocation = (formData.get('garmentLocation') as string) || ''
      email = (formData.get('email') as string) || null
      lang = (formData.get('lang') as string) || 'en'

      // Run vision in parallel — only if no text hints override
      const [stainResult, labelResult] = await Promise.all([
        (imageFile && !stainHint && apiKey)
          ? imageFile.arrayBuffer().then(buf =>
              identifyStain(Buffer.from(buf).toString('base64'), apiKey, { fabricDescription, garmentLocation })
            )
          : Promise.resolve(null),
        (careLabelFile && apiKey)
          ? careLabelFile.arrayBuffer().then(buf =>
              readCareLabel(Buffer.from(buf).toString('base64'), apiKey)
            )
          : Promise.resolve(null),
      ])

      // Synthesize all inputs into one coherent context
      ctx = buildSolveContext({
        stainResult,
        labelResult,
        stainHint,
        surfaceHint,
        fabricDescription,
        garmentLocation,
      })

    } else {
      const body = await req.json()
      email = body.email || null
      lang = body.lang || 'en'

      // Text-only solve — no vision needed
      ctx = buildSolveContext({
        stainResult: null,
        labelResult: null,
        stainHint: body.stain || '',
        surfaceHint: body.surface || '',
      })
    }

    // ── Solve gate ─────────────────────────────────────────────
    const gate = await checkAndIncrementSolve(email)
    if (!gate.allowed) {
      return NextResponse.json({ error: 'trial_expired', upgradeUrl: '/upgrade' }, { status: 403 })
    }

    // ── Validate we have a stain ───────────────────────────────
    if (!ctx.stain) {
      if (ctx.fiber) {
        // Care label scanned but stain not identified — prompt user
        return NextResponse.json(
          { error: 'stain_not_identified', fiberContext: { fiber: ctx.fiber, careSymbols: ctx.careSymbols, warnings: ctx.labelWarnings }, message: 'Care label scanned. Please describe the stain.' },
          { status: 422 }
        )
      }
      return NextResponse.json({ error: 'Stain required' }, { status: 400 })
    }

    // ── Library lookup ─────────────────────────────────────────
    const result = await lookupProtocol(ctx.stain, ctx.surface)
    if (result.card) {
      applyFiberModifications(result.card, ctx)
      if (ctx.fiber) (result.card as any)._fiberContext = { fiber: ctx.fiber, careSymbols: ctx.careSymbols, warnings: ctx.labelWarnings }
      logSolveHistory({ stain: ctx.stain, surface: ctx.surface, title: result.card.title, source: 'library', confidence: result.confidence }).catch(() => {})
      return NextResponse.json(result)
    }

    // ── AI fallback ────────────────────────────────────────────
    try {
      const aiCard = await generateAIProtocol(ctx)
      if (ctx.fiber) aiCard._fiberContext = { fiber: ctx.fiber, careSymbols: ctx.careSymbols, warnings: ctx.labelWarnings }

      const safetyResult = runSafetyFilter(aiCard, ctx.stain, ctx.surface)

      if (!safetyResult.safe) {
        console.error(`[SafetyFilter] BLOCKED: ${safetyResult.violations.map((v: any) => v.rule).join(', ')}`)
        return NextResponse.json({
          card: { ...SAFE_FALLBACK, surface: ctx.surface },
          tier: 4, confidence: 0, source: 'ai', _safetyBlocked: true,
        })
      }

      const safeCard = safetyResult.card
      if (safetyResult.filtered) {
        console.log(`[SafetyFilter] Auto-corrected ${safetyResult.violations.length} violation(s)`)
        safeCard._safetyFiltered = true
      }

      queueForReview(safeCard, ctx, safetyResult).catch(() => {})
      logSolveHistory({ stain: ctx.stain, surface: ctx.surface, title: safeCard.title || ctx.stain, source: 'ai', confidence: 0.5 }).catch(() => {})

      return NextResponse.json({ card: safeCard, tier: 4, confidence: 0.5, source: 'ai' })
    } catch (err) {
      console.error('AI fallback failed:', err)
      return NextResponse.json({ error: 'No protocol found and AI generation unavailable' }, { status: 404 })
    }

  } catch (err) {
    console.error('Solve error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
