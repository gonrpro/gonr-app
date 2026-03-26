import { NextResponse } from 'next/server'
import { lookupProtocol } from '@/lib/protocols/lookup'
import { runSafetyFilter, SAFE_FALLBACK } from '@/lib/safety/filter'

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
- Each step must be specific and actionable — no vague instructions
- Always start protein stains (blood, sweat, milk, egg) with COLD water flush — NEVER hot water (sets protein)
- Always sequence: mechanical removal → appropriate agent → flush → repeat if needed → final treatment
- Address the specific surface provided — Cotton protocols differ from Silk, Wool, Upholstery, etc.
- Include temperature warnings specific to the fiber
- The "difficulty" rating should reflect real-world spotting difficulty (blood on cotton = 4, ink on silk = 8)

You are Dan Eisen — DLI Hall of Fame textile spotter with 40 years of professional dry cleaning experience. Given a stain and surface, produce a JSON protocol card using PROFESSIONAL AGENT NAMES ONLY.

PROFESSIONAL AGENT NAMES — always use these exact terms, never consumer equivalents:
- "Protein" (NOT enzyme cleaner, enzymatic, bio-detergent)
- "NSD" or "Neutral Synthetic Detergent" (NOT dish soap, detergent, surfactant)
- "POG" or "Paint Oil Grease remover" (NOT degreaser, solvent, WD-40)
- "Tannin" (NOT stain remover, spot treatment)
- "H₂O₂ 6%" (NOT hydrogen peroxide, bleach)
- "Acetic Acid 28% diluted" (NOT vinegar)
- "Reducing Agent" (for reactive dyes)
- "Rust Remover" (oxalic acid based)
NEVER use: OxiClean, Tide, Shout, Dawn, baking soda, white vinegar, or any consumer brand.${languageInstruction}

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
        { role: 'user', content: `Stain: ${stain}\nSurface: ${surface || 'unknown fabric — ask for fiber content if possible'}` },
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

  // Parse JSON from response (handle markdown code blocks)
  const jsonStr = content.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(jsonStr)
}

export async function POST(req: Request) {
  try {
    let stain: string = ''
    let surface: string = ''
    let lang: string = 'en'

    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      // Camera path — FormData with image file
      const formData = await req.formData()
      const imageFile = formData.get('image') as File | null
      lang = (formData.get('lang') as string) || 'en'

      if (!imageFile) {
        return NextResponse.json({ error: 'No image provided' }, { status: 400 })
      }

      const arrayBuffer = await imageFile.arrayBuffer()
      const imageBase64 = Buffer.from(arrayBuffer).toString('base64')

      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) return NextResponse.json({ error: 'API key not configured' }, { status: 500 })

      // Inline vision call (avoid self-fetch which fails on Vercel)
      const visionRes = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gpt-5.4',
          input: [{
            role: 'user',
            content: [
              { type: 'input_text', text: `You are Dan Eisen — DLI Hall of Fame textile spotter. Analyze this stain image. Identify WHAT the stain is and WHAT SURFACE it's on (garment, carpet, bathtub, tile, couch, etc.).\n\nChemistry families: tannin (wine/coffee/tea), protein (blood/sweat/milk), oil-grease (cooking oil/makeup), combination (mixed), oxidizable (rust/mustard/curry), dye (ink/hair dye), mineral (hard water/lime), unknown.\n\nReturn ONLY valid JSON: { "family": "tannin|protein|oil-grease|oxidizable|dye|combination|mineral|unknown", "suggestion": "specific stain name e.g. Rust, Marker, Red Wine", "surface": "what it's on e.g. Cotton Shirt, Couch Cushion, Bathtub", "confidence": "high|medium|low", "reasoning": "one sentence" }` },
              { type: 'input_image', image_url: `data:image/jpeg;base64,${imageBase64}`, detail: 'high' },
            ],
          }],
        }),
      })

      if (!visionRes.ok) {
        const errText = await visionRes.text()
        console.error('vision error:', visionRes.status, errText)
        return NextResponse.json({ error: 'Image scan failed' }, { status: 502 })
      }

      const visionData = await visionRes.json()
      const visionContent = visionData.output_text || visionData.output?.[0]?.content?.[0]?.text || '{}'
      let scanData: { suggestion?: string; family?: string; surface?: string } = {}
      try {
        const clean = visionContent.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim()
        scanData = JSON.parse(clean)
      } catch {
        console.error('vision parse error:', visionContent)
        return NextResponse.json({ error: 'Image scan failed' }, { status: 502 })
      }

      stain = scanData.suggestion || scanData.family || 'unknown stain'
      surface = (formData.get('surface') as string) || scanData.surface || ''
    } else {
      // Text path — JSON body
      const body = await req.json()
      stain = body.stain || ''
      surface = body.surface || ''
      lang = body.lang || 'en'
    }

    if (!stain || typeof stain !== 'string') {
      return NextResponse.json({ error: 'Stain required' }, { status: 400 })
    }

    // Parse "Blood On Cotton" / "Blood Stain on Cotton Fabric" style inputs
    const onMatch = stain.match(/^(.+?)\s+(?:on|in|from|off)\s+(.+)$/i)
    if (onMatch && !surface) {
      stain = onMatch[1].trim()
      surface = onMatch[2].trim()
    }

    // Strip filler words from stain and surface for cleaner lookup
    stain = stain.replace(/\b(stain|spot|mark|drip|spill)\b/gi, '').trim().replace(/\s+/g, ' ')
    if (surface) surface = surface.replace(/\b(fabric|material|cloth|garment|item)\b/gi, '').trim().replace(/\s+/g, ' ')

    const effectiveLang = lang || 'en'
    const result = await lookupProtocol(stain, surface || '')

    if (result.card) {
      return NextResponse.json(result)
    }

    // Tier 4: AI fallback
    try {
      const aiCard = await generateAIProtocol(stain, surface || '', effectiveLang)
      
      // Apply safety filter to AI-generated cards
      const safetyResult = runSafetyFilter(aiCard, stain, surface || '')
      
      // If safety filter found nuclear violation, use safe fallback
      const finalCard = safetyResult.safe ? safetyResult.card : SAFE_FALLBACK
      
      return NextResponse.json({
        card: finalCard,
        tier: 4,
        confidence: 0.5,
        source: 'ai',
        safetyFiltered: safetyResult.filtered,
        safetyBlocked: !safetyResult.safe,
        violations: safetyResult.violations.length > 0 ? safetyResult.violations : undefined,
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
