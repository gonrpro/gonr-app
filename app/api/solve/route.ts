import { NextResponse } from 'next/server'
import { lookupProtocol } from '@/lib/protocols/lookup'
import { runSafetyFilter, SAFE_FALLBACK } from '@/lib/safety/filter'

// ─── Text-based AI protocol generation (existing, unchanged) ───

async function generateAIProtocol(stain: string, surface: string, lang: string = 'en') {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey === 'placeholder-add-real-key') {
    throw new Error('OpenAI API key not configured')
  }

  const languageInstruction = lang === 'es'
    ? `\n\nIMPORTANT: Write EVERYTHING in Spanish. All field values — title, stainChemistry, whyThisWorks, instructions, homeSolutions, materialWarnings, escalation text, product notes — must be in Spanish. Use professional dry cleaning terminology in Spanish. Agent names stay in their standard professional form (NSD, POG, Protein, Tannin) but all descriptions, instructions, and explanations must be in natural, professional Spanish.`
    : ''

  const systemPrompt = `You are Dan Eisen — DLI Hall of Fame textile spotter with 40 years of professional dry cleaning experience. Given a stain and surface, produce a THOROUGH, PROFESSIONAL JSON protocol card.

PROTOCOL REQUIREMENTS:
- MINIMUM 3 steps, ideally 4-6 for complex stains
- Each step must be specific and actionable
- Always start protein stains (blood, sweat, milk, egg) with COLD water flush — NEVER hot water
- Always sequence: mechanical removal → appropriate agent → flush → repeat if needed → final treatment
- Address the specific surface provided — Cotton protocols differ from Silk, Wool, Upholstery, etc.

PROFESSIONAL AGENT NAMES — use ONLY these exact terms, never consumer equivalents:
- "Protein" (NOT enzyme cleaner, enzymatic, bio-detergent, laundry detergent)
- "NSD" or "Neutral Synthetic Detergent" (NOT dish soap, detergent, surfactant, liquid laundry detergent)
- "POG" or "Paint Oil Grease remover" (NOT degreaser, solvent, WD-40)
- "Tannin" (NOT stain remover, spot treatment)
- "H₂O₂ 6%" (NOT hydrogen peroxide, bleach)
- "Acetic Acid 28% diluted" (NOT vinegar, white vinegar)
- "Reducing Agent" (for reactive dyes)
- "Rust Remover" (oxalic acid based)
NEVER use: OxiClean, Tide, Shout, Dawn, baking soda, white vinegar, liquid laundry detergent, or any consumer brand in the protocol steps.

PROFESSIONAL PRODUCT REFERENCE — use these in products.professional:
${PRODUCT_REFERENCE}

For products.consumer, recommend well-known home products (Wine Away, Carbona Stain Devils, Zout, Woolite, Lestoil).${languageInstruction}

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
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Stain: ${stain}\nSurface: ${surface || 'unknown — ask for fiber content if possible'}` },
      ],
      temperature: 0.3,
      max_tokens: 3000,
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

  const jsonStr = content.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(jsonStr)
}

// ─── Care label vision decode ───

async function decodeCareLabel(imageBase64: string, apiKey: string): Promise<{
  fiber?: string
  washTemp?: string
  dryCleanOnly?: boolean
  bleachAllowed?: boolean
  symbols?: string[]
}> {
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-5.4',
      input: [{
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: 'Read this care label. Return JSON: { "fiber": "fiber content e.g. 100% Cotton, 60% Polyester 40% Rayon", "washTemp": "max wash temp", "dryCleanOnly": true/false, "bleachAllowed": true/false, "symbols": ["list of care symbols you see"] }',
          },
          {
            type: 'input_image',
            image_url: `data:image/jpeg;base64,${imageBase64}`,
            detail: 'high',
          },
        ],
      }],
    }),
  })

  if (!res.ok) {
    console.error('Care label vision failed:', await res.text())
    return {}
  }

  const data = await res.json()
  const text = data.output_text || data.output?.[0]?.content?.[0]?.text || '{}'
  const jsonStr = text.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim()

  try {
    return JSON.parse(jsonStr)
  } catch {
    console.error('Care label parse failed:', jsonStr)
    return {}
  }
}

// ─── Stain identification from image ───

async function identifyStainFromImage(
  imageBase64: string,
  contextLines: string,
  apiKey: string
): Promise<{
  family: string
  suggestion: string
  surface: string
  confidence: string
  reasoning: string
}> {
  const userText = `Analyze this stain image and identify what the stain is and what surface/fiber it's on.
${contextLines ? `\nAdditional context from the operator:\n${contextLines}` : ''}

Return ONLY valid JSON: { "family": "protein|tannin|oil-grease|dye|oxidizable|combination|particulate|wax-gum|bleach-damage|adhesive|pigment|unknown", "suggestion": "specific stain name", "surface": "fiber/surface", "confidence": "high|medium|low", "reasoning": "one sentence" }`

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-5.4',
      input: [{
        role: 'user',
        content: [
          { type: 'input_text', text: userText },
          {
            type: 'input_image',
            image_url: `data:image/jpeg;base64,${imageBase64}`,
            detail: 'high',
          },
        ],
      }],
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error('Stain vision failed:', errText)
    throw new Error('Stain identification failed')
  }

  const data = await res.json()
  const text = data.output_text || data.output?.[0]?.content?.[0]?.text || '{}'
  const jsonStr = text.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(jsonStr)
}

// ─── Route handler ───

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || ''

    // ── Image-based solve (FormData from camera flow) ──
    if (contentType.includes('multipart/form-data')) {
      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey || apiKey === 'placeholder-add-real-key') {
        return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
      }

      const formData = await req.formData()
      const image = formData.get('image') as File | null
      const careLabel = formData.get('careLabel') as File | null
      const fabricDescription = (formData.get('fabricDescription') as string) || ''
      const garmentLocation = (formData.get('garmentLocation') as string) || ''
      const stainHint = (formData.get('stainHint') as string) || ''
      const surfaceHint = (formData.get('surfaceHint') as string) || ''
      const lang = (formData.get('lang') as string) || 'en'

      if (!image) {
        return NextResponse.json({ error: 'Image required' }, { status: 400 })
      }

      // Convert stain image to base64
      const imageBase64 = Buffer.from(await image.arrayBuffer()).toString('base64')

      // Decode care label if provided
      let careLabelContext = ''
      let surface = ''

      if (careLabel) {
        const clBase64 = Buffer.from(await careLabel.arrayBuffer()).toString('base64')
        const cl = await decodeCareLabel(clBase64, apiKey)
        if (cl.fiber) {
          careLabelContext = `Care label: ${cl.fiber}. Max wash: ${cl.washTemp || 'unknown'}. Dry clean only: ${cl.dryCleanOnly ?? 'unknown'}. Bleach allowed: ${cl.bleachAllowed ?? 'unknown'}.`
          // Override surface with fiber from care label
          surface = cl.fiber
        }
      }

      // Build context string for vision prompt
      const contextLines = [
        stainHint ? `User suspects: ${stainHint}` : '',
        surfaceHint ? `User says surface is: ${surfaceHint}` : '',
        fabricDescription ? `Fabric feel: ${fabricDescription}` : '',
        garmentLocation ? `Location on garment: ${garmentLocation}` : '',
        careLabelContext,
      ].filter(Boolean).join('\n')

      // Identify stain from image
      const identification = await identifyStainFromImage(imageBase64, contextLines, apiKey)
      const stain = stainHint || identification.suggestion || 'unknown stain'
      if (!surface) surface = surfaceHint || identification.surface || ''

      // Look up verified protocol first
      const result = await lookupProtocol(stain, surface)
      if (result.card) {
        // Apply safety filter
        const filterResult = runSafetyFilter(result.card, stain, surface)
        if (!filterResult.safe) {
          return NextResponse.json({
            card: SAFE_FALLBACK,
            tier: 0,
            source: 'safety-blocked' as const,
            violations: filterResult.violations,
          })
        }
        return NextResponse.json({
          ...result,
          card: filterResult.card,
          filtered: filterResult.filtered,
          violations: filterResult.violations.length > 0 ? filterResult.violations : undefined,
        })
      }

      // AI fallback
      try {
        const aiCard = await generateAIProtocol(stain, surface, lang)
        
        // Apply safety filter to AI-generated card
        const filterResult = runSafetyFilter(aiCard, stain, surface)
        if (!filterResult.safe) {
          return NextResponse.json({
            card: SAFE_FALLBACK,
            tier: 0,
            source: 'safety-blocked' as const,
            violations: filterResult.violations,
          })
        }

        return NextResponse.json({
          card: filterResult.card,
          tier: 4,
          confidence: identification.confidence === 'high' ? 0.7 : identification.confidence === 'medium' ? 0.5 : 0.3,
          source: 'ai' as const,
          filtered: filterResult.filtered,
          violations: filterResult.violations.length > 0 ? filterResult.violations : undefined,
        })
      } catch (err) {
        console.error('AI fallback failed:', err)
        return NextResponse.json(
          { error: 'No protocol found and AI generation unavailable' },
          { status: 404 }
        )
      }
    }

    // ── Text-based solve (JSON from text/chip flow) ──
    const { stain, surface, lang } = await req.json()

    if (!stain || typeof stain !== 'string') {
      return NextResponse.json({ error: 'Stain required' }, { status: 400 })
    }

    const effectiveLang = lang || 'en'
    const result = await lookupProtocol(stain, surface || '')

    if (result.card) {
      // Apply safety filter
      const filterResult = runSafetyFilter(result.card, stain, surface || '')
      if (!filterResult.safe) {
        return NextResponse.json({
          card: SAFE_FALLBACK,
          tier: 0,
          source: 'safety-blocked' as const,
          violations: filterResult.violations,
        })
      }
      return NextResponse.json({
        ...result,
        card: filterResult.card,
        filtered: filterResult.filtered,
        violations: filterResult.violations.length > 0 ? filterResult.violations : undefined,
      })
    }

    // Tier 4: AI fallback
    try {
      const aiCard = await generateAIProtocol(stain, surface || '', effectiveLang)
      
      // Apply safety filter to AI-generated card
      const filterResult = runSafetyFilter(aiCard, stain, surface || '')
      if (!filterResult.safe) {
        return NextResponse.json({
          card: SAFE_FALLBACK,
          tier: 0,
          source: 'safety-blocked' as const,
          violations: filterResult.violations,
        })
      }

      return NextResponse.json({
        card: filterResult.card,
        tier: 4,
        confidence: 0.5,
        source: 'ai' as const,
        filtered: filterResult.filtered,
        violations: filterResult.violations.length > 0 ? filterResult.violations : undefined,
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
