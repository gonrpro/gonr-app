// app/api/solve/route.ts
import { NextResponse } from 'next/server'
import { lookupProtocol } from '@/lib/protocols/lookup'
import { runSafetyFilter, SAFE_FALLBACK } from '@/lib/safety/filter'
import { createClient } from '@supabase/supabase-js'
import { resolveTier } from '@/lib/auth/tier'
import type { Tier } from '@/lib/types'

const OPENAI_API = 'https://api.openai.com/v1'

// ── Server-side solve gating ───────────────────────────────────
const FREE_SOLVE_LIMIT = 3
const TRIAL_DAYS = 7

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function checkAndIncrementSolve(email: string | null): Promise<{ allowed: boolean; reason?: string }> {
  // Unauthenticated — allow through, client handles login prompt
  if (!email) return { allowed: true }

  const supabase = getSupabaseAdmin()
  const user = await resolveTier(email)
  const paidTiers: Tier[] = ['home', 'spotter', 'operator', 'founder']

  // Paid tier — unlimited
  if (paidTiers.includes(user.tier) && user.isActive) return { allowed: true }

  // Free tier — enforce server-side trial
  const { data: usage } = await supabase
    .from('solve_usage')
    .select('solve_count, trial_started_at')
    .eq('email', email.toLowerCase())
    .single()

  const now = new Date()

  if (!usage) {
    // First solve — create record
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

  if (usage.solve_count >= FREE_SOLVE_LIMIT && daysSinceTrial > TRIAL_DAYS) {
    return { allowed: false, reason: 'trial_expired' }
  }

  await supabase
    .from('solve_usage')
    .update({ solve_count: usage.solve_count + 1, last_solve_at: now.toISOString() })
    .eq('email', email.toLowerCase())

  return { allowed: true }
}

// ── Vision: identify stain from photo ──────────────────────────
async function identifyStain(
  imageBase64: string,
  apiKey: string,
  fabricDescription?: string,
  garmentLocation?: string,
): Promise<{ stain: string; surface: string; family: string; confidence: string; reasoning: string }> {
  const contextLines: string[] = []
  if (fabricDescription) contextLines.push(`User describes the fabric as: ${fabricDescription}`)
  if (garmentLocation) contextLines.push(`Stain location on garment: ${garmentLocation}`)
  const contextNote = contextLines.length ? `\n\nAdditional user context:\n${contextLines.join('\n')}` : ''

  const res = await fetch(`${OPENAI_API}/responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-5.4',
      input: [{
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `You are Dan Eisen — DLI Hall of Fame textile spotter with 40 years experience. Analyze this stain image.

First identify WHAT the stain is and WHAT SURFACE it's on. The surface may be a garment, fabric, carpet, upholstery, bathtub, tile, grout, countertop, or any other material.

Chemistry families:
- tannin: wine, coffee, tea, beer, juice, tomato sauce (red/brown liquid stains)
- protein: blood, urine, sweat, egg, milk, grass (yellowish/brownish organic)
- oil-grease: cooking oil, butter, lipstick, makeup, motor oil (greasy/shiny)
- combination: chocolate, coffee with cream, tomato sauce with meat (mixed)
- oxidizable: rust (orange/red metal marks), mustard, curry, turmeric (bright yellow/orange)
- dye: hair dye, ink, food coloring (vivid unnatural color)
- mineral: hard water deposits, calcium, lime scale (white crusty buildup)
- unknown: cannot determine${contextNote}

Return ONLY valid JSON: { "family": "tannin|protein|oil-grease|oxidizable|dye|combination|mineral|unknown", "suggestion": "specific stain name e.g. Rust, Red Wine, Blood", "surface": "what the stain is on e.g. Cotton Shirt, Bathtub, Carpet, Grout", "confidence": "high|medium|low", "reasoning": "one confident sentence about what you see and why" }`,
          },
          { type: 'input_image', image_url: `data:image/jpeg;base64,${imageBase64}`, detail: 'high' },
        ],
      }],
    }),
  })
  if (!res.ok) return { stain: '', surface: '', family: 'unknown', confidence: 'low', reasoning: '' }
  const data = await res.json()
  const raw = (data.output_text || data.output?.[0]?.content?.[0]?.text || '{}').trim()
  try {
    const parsed = JSON.parse(raw.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim())
    // Normalize: suggestion → stain
    return {
      stain: parsed.suggestion || parsed.stain || '',
      surface: parsed.surface || '',
      family: parsed.family || 'unknown',
      confidence: parsed.confidence || 'medium',
      reasoning: parsed.reasoning || '',
    }
  } catch {
    return { stain: '', surface: '', family: 'unknown', confidence: 'low', reasoning: '' }
  }
}

// ── Vision: read care label ────────────────────────────────────
async function readCareLabel(imageBase64: string, apiKey: string): Promise<{ fiber: string; careSymbols: string[]; warnings: string[] }> {
  const res = await fetch(`${OPENAI_API}/responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-5.4',
      input: [{
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: 'Read this clothing care label. Return ONLY valid JSON: { "fiber": "primary fiber content e.g. 100% Silk, 80% Wool 20% Nylon", "careSymbols": ["dry-clean-only", "no-bleach", "no-heat", "hand-wash-only", "do-not-wash", "no-iron"], "warnings": ["any specific warnings from the label"] }',
          },
          { type: 'input_image', image_url: `data:image/jpeg;base64,${imageBase64}`, detail: 'high' },
        ],
      }],
    }),
  })
  if (!res.ok) return { fiber: '', careSymbols: [], warnings: [] }
  const data = await res.json()
  const raw = (data.output_text || data.output?.[0]?.content?.[0]?.text || '{}').trim()
  try {
    return JSON.parse(raw.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim())
  } catch {
    return { fiber: '', careSymbols: [], warnings: [] }
  }
}

// ── AI Protocol Generator ──────────────────────────────────────
function applyFiberModifications(card: any, fiberContext?: { fiber: string; careSymbols: string[]; warnings: string[] }): void {
  if (!fiberContext?.fiber) return
  const fiber = fiberContext.fiber.toLowerCase()
  const symbols = fiberContext.careSymbols || []
  const additions: string[] = []

  if (symbols.includes('dry-clean-only'))
    additions.push('⚠️ Care label says DRY CLEAN ONLY — home solutions may risk damage. Take to a professional cleaner.')
  if (symbols.includes('hand-wash-only'))
    additions.push('⚠️ Care label says HAND WASH ONLY — avoid machine washing and aggressive scrubbing.')
  if (symbols.includes('no-bleach') && card.spottingProtocol?.some((s: any) => /bleach|hydrogen peroxide|oxygen/i.test(s.agent || '')))
    additions.push('⚠️ Care label says NO BLEACH — skip any bleach or hydrogen peroxide steps.')
  if (/silk|cashmere|wool|angora|mohair|acetate|rayon|viscose/.test(fiber))
    additions.push(`⚠️ Delicate fiber detected (${fiberContext.fiber}) — use gentle agitation, cold water only, and test agents on a hidden area first.`)

  if (!card.materialWarnings) card.materialWarnings = []
  for (const warning of additions) {
    if (!card.materialWarnings.includes(warning)) card.materialWarnings.unshift(warning)
  }
}

async function generateAIProtocol(
  stain: string,
  surface: string,
  fiberContext?: { fiber: string; careSymbols: string[]; warnings: string[] },
  fabricDescription?: string,
  garmentLocation?: string,
) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey === 'placeholder-add-real-key') throw new Error('OpenAI API key not configured')

  const fiberNote = fiberContext?.fiber
    ? `\n\nFIBER/CARE LABEL INFO (from scanned care label — use this to adjust recommendations):
- Fiber content: ${fiberContext.fiber}
- Care symbols: ${fiberContext.careSymbols.join(', ') || 'none detected'}
- Label warnings: ${fiberContext.warnings.join('; ') || 'none'}
IMPORTANT: Adjust your protocol, material warnings, and home solutions to respect these fiber requirements. If the label says "dry clean only", the home solutions must reflect that. If the fiber is delicate (silk, wool, cashmere, acetate, rayon), adjust agent selection and technique accordingly.`
    : ''

  const userContextNote = (fabricDescription || garmentLocation)
    ? `\n\nADDITIONAL USER CONTEXT:${fabricDescription ? `\n- Fabric feel/description: ${fabricDescription}` : ''}${garmentLocation ? `\n- Stain location on garment: ${garmentLocation}` : ''}
Use this to refine your protocol steps, home solutions, and material warnings.`
    : ''

  const systemPrompt = `You are an expert stain removal chemist and 3rd-generation dry cleaner. Given a stain and surface/fabric, produce a JSON protocol card.

Return ONLY valid JSON in this exact format:
{
  "id": "<stain-slug>-<surface-slug>",
  "title": "<descriptive title>",
  "stainFamily": "<protein|tannin|oil-grease|dye|oxidizable|combination|particulate|wax-gum|bleach-damage|adhesive|pigment|unknown>",
  "surface": "<surface>",
  "stainChemistry": "<1-2 sentences on the chemistry of this stain on this surface>",
  "whyThisWorks": "<1-2 sentences explaining why the recommended approach works>",
  "spottingProtocol": [
    {
      "step": 1,
      "agent": "<professional chemical or tool>",
      "technique": "<brief technique>",
      "temperature": "<temperature guidance>",
      "dwellTime": "<time range>",
      "instruction": "<detailed instruction paragraph>"
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
        { role: 'user', content: `Stain: ${stain}\nSurface/Fabric: ${surface || 'general fabric'}${fiberNote}${userContextNote}` },
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

// ── Queue for review ───────────────────────────────────────────
async function queueForReview(card: any, stain: string, surface: string, safetyResult: any) {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !supabaseKey) return
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, supabaseKey)
  const stainKey = stain.toLowerCase().replace(/\s+/g, '-')
  const surfaceKey = surface.toLowerCase().replace(/\s+/g, '-')
  await supabase.from('pending_protocols').insert({
    stain: stainKey,
    surface: surfaceKey,
    cache_key: `${stainKey}::${surfaceKey}`,
    card: card,
    source: safetyResult.filtered ? 'ai-safety-filtered' : 'ai-generated',
    verified: false,
    solve_count: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
}

// ── Fire-and-forget solve history logging ─────────────────────
async function logSolveHistory(params: {
  stain: string
  surface: string
  title: string
  tier: string
  source: string
  protocolId?: string
  stainType?: string
  confidence?: number
}) {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !supabaseKey) return
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseKey)
    await supabase.from('solve_history').insert({
      stain: params.stain || 'unknown',
      surface: params.surface || 'unknown',
      title: params.title || '',
      is_pro: params.tier === 'operator' || params.tier === 'pro',
      solution_json: JSON.stringify({
        source: params.source,
        tier: params.tier,
        stainType: params.stainType || null,
        _protocolId: params.protocolId || null,
        confidence: params.confidence || null,
      }),
    })
  } catch (e: any) {
    // Non-blocking — never throw
    console.warn('[SolveHistory] Log failed:', e.message)
  }
}

// ── Main handler ───────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    let stain = ''
    let surface = ''
    let lang = 'en'
    let email: string | null = null
    let fiberContext: { fiber: string; careSymbols: string[]; warnings: string[] } | undefined
    let fabricDescription = ''
    let garmentLocation = ''

    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const imageFile = formData.get('image') as File | null
      const careLabelFile = formData.get('careLabel') as File | null
      const stainHint = (formData.get('stainHint') as string) || ''
      const surfaceHint = (formData.get('surfaceHint') as string) || ''
      fabricDescription = (formData.get('fabricDescription') as string) || ''
      garmentLocation = (formData.get('garmentLocation') as string) || ''
      email = (formData.get('email') as string) || null
      lang = (formData.get('lang') as string) || 'en'

      const apiKey = process.env.OPENAI_API_KEY

      // Run stain vision + care label vision in parallel
      const tasks: Promise<any>[] = []

      let stainImageBase64 = ''
      let labelImageBase64 = ''

      if (imageFile && !stainHint) {
        const buf = await imageFile.arrayBuffer()
        stainImageBase64 = Buffer.from(buf).toString('base64')
      }
      if (careLabelFile) {
        const buf = await careLabelFile.arrayBuffer()
        labelImageBase64 = Buffer.from(buf).toString('base64')
      }

      if (apiKey) {
        if (stainImageBase64) tasks.push(identifyStain(stainImageBase64, apiKey, fabricDescription, garmentLocation))
        else tasks.push(Promise.resolve(null))

        if (labelImageBase64) tasks.push(readCareLabel(labelImageBase64, apiKey))
        else tasks.push(Promise.resolve(null))
      } else {
        tasks.push(Promise.resolve(null), Promise.resolve(null))
      }

      const [stainResult, labelResult] = await Promise.all(tasks)

      if (stainHint) {
        stain = stainHint
        surface = surfaceHint
      } else if (stainResult) {
        stain = stainResult.stain || ''
        surface = surfaceHint || stainResult.surface || ''
        if (stainResult.confidence === 'low') {
          console.warn('[SolveRoute] Low confidence stain ID:', stainResult.reasoning)
        }
      }

      if (labelResult && (labelResult.fiber || labelResult.careSymbols?.length)) {
        fiberContext = labelResult
        // If no surface from stain scan, use fiber as surface hint
        if (!surface && labelResult.fiber) surface = labelResult.fiber
      }

    } else {
      const body = await req.json()
      stain = body.stain || ''
      surface = body.surface || ''
      lang = body.lang || 'en'
      email = body.email || null
    }

    // ── Solve gate ─────────────────────────────────────────────
    const gate = await checkAndIncrementSolve(email)
    if (!gate.allowed) {
      return NextResponse.json(
        { error: 'trial_expired', upgradeUrl: '/upgrade' },
        { status: 403 },
      )
    }

    if (!stain || typeof stain !== 'string') {
      // If we have a care label but couldn't identify the stain from photo,
      // return a specific error so the client can prompt for text input
      if (fiberContext?.fiber) {
        return NextResponse.json(
          { error: 'stain_not_identified', fiberContext, message: 'Care label scanned. Please describe the stain.' },
          { status: 422 }
        )
      }
      return NextResponse.json({ error: 'Stain required' }, { status: 400 })
    }

    const effectiveSurface = surface || ''

    // Library lookup first
    const result = await lookupProtocol(stain, effectiveSurface)
    if (result.card) {
      // Apply fiber-aware warnings to library cards
      applyFiberModifications(result.card, fiberContext)
      if (fiberContext?.fiber) {
        (result.card as any)._fiberContext = fiberContext
      }
      // Log to solve_history (fire-and-forget)
      logSolveHistory({
        stain,
        surface: effectiveSurface,
        title: result.card?.title || stain,
        tier: 'free', // tier isn't known at this level without auth — safe default
        source: 'library',
        protocolId: (result.card as any)?._protocolId,
        stainType: (result.card as any)?.stainType,
        confidence: result.confidence,
      }).catch(() => {})
      return NextResponse.json(result)
    }

    // AI fallback with fiber context + user context
    try {
      const aiCard = await generateAIProtocol(stain, effectiveSurface, fiberContext, fabricDescription, garmentLocation)
      if (fiberContext?.fiber) aiCard._fiberContext = fiberContext

      const safetyResult = runSafetyFilter(aiCard, stain, effectiveSurface)

      if (!safetyResult.safe) {
        console.error(`[SafetyFilter] BLOCKED: ${safetyResult.violations.map((v: any) => v.rule).join(', ')}`)
        return NextResponse.json({
          card: { ...SAFE_FALLBACK, surface: effectiveSurface },
          tier: 4, confidence: 0, source: 'ai', _safetyBlocked: true,
        })
      }

      const safeCard = safetyResult.card
      if (safetyResult.filtered) {
        console.log(`[SafetyFilter] Auto-corrected ${safetyResult.violations.length} violation(s)`)
        safeCard._safetyFiltered = true
      }

      queueForReview(safeCard, stain, effectiveSurface, safetyResult).catch(e =>
        console.warn('[ProtocolCache] Queue failed:', e.message)
      )

      // Log to solve_history (fire-and-forget)
      logSolveHistory({
        stain,
        surface: effectiveSurface,
        title: safeCard.title || stain,
        tier: 'free',
        source: 'ai',
        stainType: (safeCard as any).stainType,
        confidence: 0.5,
      }).catch(() => {})
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
