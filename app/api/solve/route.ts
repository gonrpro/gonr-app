import { NextResponse } from 'next/server'
import { lookupProtocol } from '@/lib/protocols/lookup'

const FIBER_SAFETY: Record<string, string> = {
  silk: 'CRITICAL FIBER — Silk requires extreme care. NEVER use alkaline agents, enzymes, oxidizers (H₂O₂ only at 3% max), hot water, or mechanical agitation. Use only neutral pH agents. Acetic acid neutralizer required after every treatment.',
  wool: 'CRITICAL FIBER — Wool felts and shrinks with heat and agitation. NEVER use hot water, enzymes on protein stains, or alkaline detergents. Gentle handling only. Neutral pH throughout.',
  cashmere: 'CRITICAL FIBER — Same as wool but even more delicate. Absolute minimum agitation. No enzymes, no heat, no alkaline.',
  leather: 'CRITICAL SURFACE — No water saturation. Saddle soap or leather-specific agents only. Always condition after treatment.',
  suede: 'CRITICAL SURFACE — No liquid solvents on suede. Dry methods preferred. Professional only for most stains.',
  linen: 'Linen tolerates more than silk/wool but avoid high heat. Can handle dilute oxidizers on white linen.',
  cotton: 'Cotton has wide treatment latitude. Tolerates enzymes, mild oxidizers, most pH ranges. Test colored cotton for H₂O₂ colorfastness.',
  polyester: 'Polyester is resilient but can absorb oil-based stains deeply. Avoid high heat which can set synthetic dyes.',
  nylon: 'Nylon is sensitive to strong oxidizers. Avoid chlorine bleach. Moderate pH range.',
}

const STAIN_FAMILY_RULES: Record<string, string> = {
  protein: 'PROTEIN FAMILY: Blood, urine, sweat, egg, milk, vomit. KEY RULE: COLD WATER ONLY — heat permanently sets protein. Use Protein (enzyme digester) first. NSD flush. Acetic acid neutralizer. NEVER hot water. NEVER ammonia on fresh protein.',
  tannin: 'TANNIN FAMILY: Red wine, coffee, tea, beer, fruit juice. KEY RULE: Tannin FIRST to break pigment bonds. NEVER use alkaline agents (ammonia, baking soda) — permanently darkens tannins. NSD flush. Acetic acid neutralizer. H₂O₂ for residual color on colorfast fabrics.',
  'oil-grease': 'OIL/GREASE FAMILY: Cooking oil, butter, motor oil, lipstick, cosmetics. KEY RULE: POG (Paint Oil Grease remover) or dry solvent first to break the lipid bond. NSD to emulsify. Flush thoroughly. No water until solvent is removed.',
  oxidizable: 'OXIDIZABLE FAMILY: Rust, mustard, curry, turmeric. KEY RULE: Rust Remover (oxalic acid) for rust. Oxidizer (H₂O₂) for mustard/curry. Never use reducing agents on oxidizable stains.',
  dye: 'DYE FAMILY: Hair dye, food coloring, permanent marker, ballpoint pen. KEY RULE: Reducing agent for reactive dyes. POG for ballpoint. Most dye stains require professional treatment on delicate fibers.',
  combination: 'COMBINATION FAMILY: Chocolate (protein+tannin+fat), coffee with cream, nail polish. KEY RULE: Treat each component in order — protein component first (cold enzyme), then tannin component (Tannin), then fat component (POG). Never combine treatments simultaneously.',
}

async function generateAIProtocol(stain: string, surface: string, fiber: string) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey === 'placeholder-add-real-key') {
    throw new Error('OpenAI API key not configured')
  }

  const fiberKey = fiber?.toLowerCase() || ''
  const fiberSafety = FIBER_SAFETY[fiberKey] || ''

  // Detect likely stain family for grounding
  const stainLower = stain.toLowerCase()
  let familyRules = ''
  if (['blood', 'urine', 'sweat', 'egg', 'milk', 'vomit', 'grass'].some(s => stainLower.includes(s))) {
    familyRules = STAIN_FAMILY_RULES.protein
  } else if (['wine', 'coffee', 'tea', 'beer', 'juice'].some(s => stainLower.includes(s))) {
    familyRules = STAIN_FAMILY_RULES.tannin
  } else if (['oil', 'grease', 'butter', 'lipstick', 'makeup', 'lotion'].some(s => stainLower.includes(s))) {
    familyRules = STAIN_FAMILY_RULES['oil-grease']
  } else if (['rust', 'mustard', 'curry', 'turmeric'].some(s => stainLower.includes(s))) {
    familyRules = STAIN_FAMILY_RULES.oxidizable
  } else if (['chocolate'].some(s => stainLower.includes(s))) {
    familyRules = STAIN_FAMILY_RULES.combination
  }

  const effectiveSurface = fiber || surface || 'cotton'
  const title = `${stain.charAt(0).toUpperCase() + stain.slice(1)} on ${effectiveSurface.charAt(0).toUpperCase() + effectiveSurface.slice(1)}`

  const systemPrompt = `You are Dan Eisen — DLI Hall of Fame textile care expert with 40 years of professional spotting experience. You are writing a protocol for a professional dry cleaner or spotter, NOT a home user.

PROFESSIONAL AGENT NAMES ONLY — use these exact terms:
- NSD (Neutral Synthetic Detergent) — not "dish soap" or "detergent"
- POG (Paint Oil Grease remover) — not "solvent" or "degreaser"  
- Protein — not "enzyme cleaner" or "enzymatic cleaner"
- Tannin — not "stain remover"
- H₂O₂ 6% — not "hydrogen peroxide" or "bleach"
- 28% Acetic Acid (diluted) — not "vinegar"
- Reducing Agent — for reactive dyes
- Rust Remover (oxalic acid based) — for rust/iron

NEVER suggest: OxiClean, chlorine bleach, baking soda, white vinegar, dish soap, Tide, Shout, or any consumer brand name. Professional agents only.

${familyRules ? `STAIN CHEMISTRY RULES:\n${familyRules}\n` : ''}
${fiberSafety ? `FIBER SAFETY CONSTRAINTS:\n${fiberSafety}\n` : ''}

Return ONLY valid JSON:
{
  "id": "${stain.toLowerCase().replace(/\s+/g, '-')}-${effectiveSurface.toLowerCase().replace(/\s+/g, '-')}",
  "title": "${title}",
  "stainFamily": "protein|tannin|oil-grease|dye|oxidizable|combination|unknown",
  "surface": "${effectiveSurface}",
  "stainChemistry": "1-2 sentences on the chemistry — professional level",
  "whyThisWorks": "1-2 sentences explaining the mechanism",
  "spottingProtocol": [
    {
      "step": 1,
      "agent": "Professional agent name",
      "technique": "tamping|flushing|blotting|feathering",
      "temperature": "cold|lukewarm|avoid heat",
      "dwellTime": "X-Y minutes",
      "instruction": "Detailed professional instruction"
    }
  ],
  "homeSolutions": ["Step 1 for home user", "Step 2"],
  "materialWarnings": ["Critical warning 1", "Critical warning 2"],
  "escalation": {
    "when": "When to send to specialist",
    "whatToTell": "What to tell the cleaner",
    "specialistType": "Type of specialist"
  },
  "difficulty": 5,
  "meta": { "stainCanonical": "${stain.toLowerCase().replace(/\s+/g, '-')}", "surfaceCanonical": "${effectiveSurface.toLowerCase().replace(/\s+/g, '-')}", "riskLevel": "medium", "tier": "ai-generated" }
}`

  // gpt-5.4 uses the Responses API
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-5.4',
      instructions: systemPrompt,
      input: `Stain: ${stain}\nFiber/Surface: ${effectiveSurface}\n\nWrite at Dan Eisen level — DLI Hall of Fame spotter. Each step must include:\n- The specific agent and exact application method\n- WHY this agent works on this chemistry (1 sentence)\n- What to watch for / what success looks like\n- Temperature guidance (cold/lukewarm/avoid heat) and dwell time\n- Any critical warnings for THIS fiber\n\nMinimum 3 sentences per step instruction. Return ONLY valid JSON.`,
      max_output_tokens: 4000,
    }),
  })

  if (!res.ok) {
    const errData = await res.text()
    console.error('OpenAI API error:', res.status, errData)
    throw new Error('AI generation failed')
  }

  const data = await res.json()
  const content = data.output_text || data.output?.[0]?.content?.[0]?.text
  if (!content) throw new Error('Empty AI response')

  const jsonStr = content.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(jsonStr)
}

export async function POST(req: Request) {
  try {
    const { stain, surface, fiber } = await req.json()

    if (!stain || typeof stain !== 'string') {
      return NextResponse.json({ error: 'Stain required' }, { status: 400 })
    }

    // Use fiber if provided, otherwise fall back to surface, then default to cotton
    const effectiveSurface = fiber || surface || 'cotton'

    const result = await lookupProtocol(stain, effectiveSurface)

    if (result.card) {
      return NextResponse.json(result)
    }

    // AI fallback with full grounding
    try {
      const aiCard = await generateAIProtocol(stain, surface || '', fiber || '')
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
// force redeploy Mon Mar 23 16:37:40 EDT 2026
