import { NextResponse } from 'next/server'
import { lookupProtocol } from '@/lib/protocols/lookup'

async function generateAIProtocol(stain: string, surface: string, lang: string = 'en') {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey === 'placeholder-add-real-key') {
    throw new Error('OpenAI API key not configured')
  }

  const languageInstruction = lang === 'es'
    ? `\n\nIMPORTANT: Write EVERYTHING in Spanish. All field values — title, stainChemistry, whyThisWorks, instructions, homeSolutions, materialWarnings, escalation text, product notes — must be in Spanish. Use professional dry cleaning terminology in Spanish. Agent names stay in their standard professional form (NSD, POG, Protein, Tannin) but all descriptions, instructions, and explanations must be in natural, professional Spanish.`
    : ''

  const systemPrompt = `You are Dan Eisen — DLI Hall of Fame textile spotter with 40 years of professional dry cleaning experience. Given a stain and surface, produce a JSON protocol card using PROFESSIONAL AGENT NAMES ONLY.

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

export async function POST(req: Request) {
  try {
    const body = await req.json()
    let stain: string = body.stain
    let surface: string = body.surface || ''
    const lang = body.lang

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
      return NextResponse.json({
        card: aiCard,
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
