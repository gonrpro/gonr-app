// app/api/solve/route.ts
import { NextResponse } from 'next/server'
import { lookupProtocol } from '@/lib/protocols/lookup'
import { runSafetyFilter, SAFE_FALLBACK } from '@/lib/safety/filter'

async function generateAIProtocol(stain: string, surface: string) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey === 'placeholder-add-real-key') {
    throw new Error('OpenAI API key not configured')
  }

  const systemPrompt = `You are an expert stain removal chemist and 3rd-generation dry cleaner. Given a stain and surface, produce a JSON protocol card.

Return ONLY valid JSON in this exact format:
{
  "id": "<stain>-<surface>",
  "title": "<descriptive title>",
  "stainFamily": "<protein|tannin|oil-grease|dye|oxidizable|combination|particulate|wax-gum|bleach-damage|adhesive|pigment|unknown>",
  "surface": "<surface>",
  "stainChemistry": "<1-2 sentences on the chemistry of this stain on this surface>",
  "whyThisWorks": "<1-2 sentences explaining why the recommended approach works>",
  "spottingProtocol": [
    {
      "step": 1,
      "agent": "<chemical or tool>",
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

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Stain: ${stain}\nSurface: ${surface || 'general fabric'}` },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  })

  if (!res.ok) {
    const errData = await res.text()
    console.error('OpenAI API error:', errData)
    throw new Error('AI generation failed')
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty AI response')

  // Parse JSON from response (handle markdown code blocks)
  const jsonStr = content.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(jsonStr)
}

// Fire-and-forget: queue every safe AI response for human review
async function queueForReview(card: any, stain: string, surface: string, safetyResult: any) {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !supabaseKey) return

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, supabaseKey)

  await supabase.from('pending_protocols').insert({
    stain_canonical: stain.toLowerCase().replace(/\s+/g, '-'),
    surface_canonical: surface.toLowerCase().replace(/\s+/g, '-'),
    card_json: card,
    source_model: 'gpt-4o-mini',
    safety_filtered: safetyResult.filtered,
    safety_violation_count: safetyResult.violations.length,
    status: 'pending_review',
    created_at: new Date().toISOString(),
  })
}

export async function POST(req: Request) {
  try {
    let stain: string = ''
    let surface: string = ''
    let imageBase64: string | null = null

    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      // Camera path — FormData with image file
      const formData = await req.formData()
      const imageFile = formData.get('image') as File | null
      if (!imageFile) {
        return NextResponse.json({ error: 'No image provided' }, { status: 400 })
      }
      // Convert to base64 and send to scan-stain API for identification
      const arrayBuffer = await imageFile.arrayBuffer()
      imageBase64 = Buffer.from(arrayBuffer).toString('base64')

      // Call scan-stain to identify stain from photo
      const scanRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://gonr-app.vercel.app'}/api/scan-stain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64 }),
      })
      if (!scanRes.ok) {
        return NextResponse.json({ error: 'Image scan failed' }, { status: 502 })
      }
      const scanData = await scanRes.json()
      // scan-stain returns { family, suggestion, confidence, reasoning }
      stain = scanData.suggestion || scanData.family || 'unknown stain'
      surface = formData.get('surface') as string || ''
    } else {
      // Text path — JSON body
      const body = await req.json()
      stain = body.stain
      surface = body.surface || ''
    }

    if (!stain || typeof stain !== 'string') {
      return NextResponse.json({ error: 'Stain required' }, { status: 400 })
    }

    // Parse "Blood On Cotton" / "Red Wine on Silk" style inputs
    // Split on " on ", " in ", " from " and extract stain + surface
    const onMatch = stain.match(/^(.+?)\s+(?:on|in|from|off)\s+(.+)$/i)
    if (onMatch && !surface) {
      stain = onMatch[1].trim()
      surface = onMatch[2].trim()
    }

    const effectiveSurface = surface || ''

    const result = await lookupProtocol(stain, effectiveSurface)

    if (result.card) {
      return NextResponse.json(result)
    }

    // Tier 4: AI fallback
    try {
      const aiCard = await generateAIProtocol(stain, effectiveSurface)

      // Run safety filter on every AI-generated response
      const safetyResult = runSafetyFilter(aiCard, stain, effectiveSurface)

      if (!safetyResult.safe) {
        // Nuclear violation — return safe fallback, never the dangerous output
        console.error(`[SafetyFilter] BLOCKED: ${safetyResult.violations.map(v => v.rule).join(', ')}`)
        return NextResponse.json({
          card: { ...SAFE_FALLBACK, surface: effectiveSurface },
          tier: 4,
          confidence: 0,
          source: 'ai',
          _safetyBlocked: true,
        })
      }

      // Auto-corrections applied — use the mutated card
      const safeCard = safetyResult.card
      if (safetyResult.filtered) {
        console.log(`[SafetyFilter] Auto-corrected ${safetyResult.violations.length} violation(s)`)
        safeCard._safetyFiltered = true
      }

      // Queue for library review (fire-and-forget — never block the response)
      queueForReview(safeCard, stain, effectiveSurface, safetyResult).catch(e =>
        console.warn('[ProtocolCache] Queue failed (non-blocking):', e.message)
      )

      return NextResponse.json({
        card: safeCard,
        tier: 4,
        confidence: 0.5,
        source: 'ai',
      })
    } catch (err) {
      console.error('AI fallback failed:', err)
      return NextResponse.json(
        { error: 'No protocol found and AI generation unavailable' },
        { status: 404 }
      )
    }
  } catch (err) {
    console.error('Solve error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
