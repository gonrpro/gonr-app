// app/api/solve/route.ts
import { NextResponse } from 'next/server'
import { lookupProtocol } from '@/lib/protocols/lookup'
import { runSafetyFilter, SAFE_FALLBACK } from '@/lib/safety/filter'

const OPENAI_API = 'https://api.openai.com/v1'

// ── Vision: identify stain from photo ──────────────────────────
async function identifyStain(imageBase64: string, apiKey: string): Promise<{ stain: string; surface: string; family: string }> {
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
            text: 'You are a professional dry cleaner. Identify the stain and surface/fabric in this image. Return ONLY valid JSON: { "stain": "specific stain name e.g. Red Wine, Blood, Grease", "surface": "surface/fabric e.g. Cotton Shirt, Silk Blouse, Wool Coat", "family": "tannin|protein|oil-grease|oxidizable|dye|combination|unknown" }',
          },
          { type: 'input_image', image_url: `data:image/jpeg;base64,${imageBase64}`, detail: 'high' },
        ],
      }],
    }),
  })
  if (!res.ok) return { stain: '', surface: '', family: 'unknown' }
  const data = await res.json()
  const raw = (data.output_text || data.output?.[0]?.content?.[0]?.text || '{}').trim()
  try {
    return JSON.parse(raw.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim())
  } catch {
    return { stain: '', surface: '', family: 'unknown' }
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
async function generateAIProtocol(stain: string, surface: string, fiberContext?: { fiber: string; careSymbols: string[]; warnings: string[] }) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey === 'placeholder-add-real-key') throw new Error('OpenAI API key not configured')

  const fiberNote = fiberContext?.fiber
    ? `\n\nFIBER/CARE LABEL INFO (from scanned care label — use this to adjust recommendations):
- Fiber content: ${fiberContext.fiber}
- Care symbols: ${fiberContext.careSymbols.join(', ') || 'none detected'}
- Label warnings: ${fiberContext.warnings.join('; ') || 'none'}
IMPORTANT: Adjust your protocol, material warnings, and home solutions to respect these fiber requirements. If the label says "dry clean only", the home solutions must reflect that. If the fiber is delicate (silk, wool, cashmere, acetate, rayon), adjust agent selection and technique accordingly.`
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
        { role: 'user', content: `Stain: ${stain}\nSurface/Fabric: ${surface || 'general fabric'}${fiberNote}` },
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
  const cacheKey = `${stain.toLowerCase().replace(/\s+/g, '-')}__${surface.toLowerCase().replace(/\s+/g, '-')}`
  await supabase.from('pending_protocols').insert({
    stain: stain,
    surface: surface,
    cache_key: cacheKey,
    card: card,
    source: 'ai',
    verified: false,
  })
}

// ── Main handler ───────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    let stain = ''
    let surface = ''
    let lang = 'en'
    let fiberContext: { fiber: string; careSymbols: string[]; warnings: string[] } | undefined

    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const imageFile = formData.get('image') as File | null
      const careLabelFile = formData.get('careLabel') as File | null
      const stainHint = (formData.get('stainHint') as string) || ''
      const surfaceHint = (formData.get('surfaceHint') as string) || ''
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
        if (stainImageBase64) tasks.push(identifyStain(stainImageBase64, apiKey).catch(() => null))
        else tasks.push(Promise.resolve(null))

        if (labelImageBase64) tasks.push(readCareLabel(labelImageBase64, apiKey).catch(() => null))
        else tasks.push(Promise.resolve(null))
      } else {
        tasks.push(Promise.resolve(null), Promise.resolve(null))
      }

      const [stainResult, labelResult] = await Promise.allSettled(tasks).then(results =>
        results.map(r => r.status === 'fulfilled' ? r.value : null)
      )

      if (stainHint) {
        stain = stainHint
        surface = surfaceHint
      } else if (stainResult?.stain) {
        stain = stainResult.stain
        surface = surfaceHint || stainResult.surface || ''
      } else {
        // Vision didn't identify stain — use fabric description or generic fallback
        const fabricHint = (formData.get('fabricDescription') as string) || ''
        stain = fabricHint || 'unknown stain'
        surface = surfaceHint || ''
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
    }

    if (!stain || typeof stain !== 'string') {
      return NextResponse.json({ error: 'Stain required' }, { status: 400 })
    }

    const effectiveSurface = surface || ''

    // Library lookup first
    const result = await lookupProtocol(stain, effectiveSurface)
    if (result.card) {
      // If we have fiber context, add it to the card for display
      if (fiberContext?.fiber) {
        (result.card as any)._fiberContext = fiberContext
      }
      return NextResponse.json(result)
    }

    // AI fallback with fiber context
    try {
      const aiCard = await generateAIProtocol(stain, effectiveSurface, fiberContext)
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
