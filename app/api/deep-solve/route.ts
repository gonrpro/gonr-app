import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { stain, cardId, context, situations, lang } = await req.json()

    if (!stain) {
      return NextResponse.json({ error: 'Stain required' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey || apiKey === 'placeholder-add-real-key') {
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 503 }
      )
    }

    const isSpanish = lang === 'es'

    // Build situational context string
    const situationLabels: Record<string, string> = {
      stain_old: 'Stain is old / set-in',
      already_treated: 'Previously treated by customer or another cleaner',
      high_value: 'High-value garment — extra caution required',
      customer_upset: 'Customer is upset or anxious',
      delicate_fiber: 'Delicate fiber (silk, rayon, acetate, etc.)',
      unknown_fiber: 'Fiber content unknown — no care label',
      dye_bleed: 'Dye bleed suspected',
      heat_damage: 'Heat damage suspected (dryer, iron, press)',
    }

    const activeSituations = (situations || [])
      .map((s: string) => situationLabels[s] || s)
      .join('\n- ')

    const userMessage = [
      `Case: ${stain}`,
      cardId ? `Base protocol ID: ${cardId}` : null,
      activeSituations ? `Situations:\n- ${activeSituations}` : null,
      context ? `Operator notes: ${context}` : null,
    ].filter(Boolean).join('\n\n')

    const systemPrompt = `You are Dan Eisen — 40+ years in professional dry cleaning and textile restoration. You've seen every stain, every fiber, every mistake. You consult for cleaners worldwide.

A dry cleaning operator is bringing you a complex case. They already have a standard protocol but need your expert read on THIS specific situation — accounting for stain age, prior treatments, garment value, and customer dynamics.

Your job:
1. ASSESS the situation — read between the lines. What's really going on?
2. MODIFY the protocol — adjust steps for the specific complications. Use professional agents only: NSD (non-soluble detergent), POG (paint/oil/grease remover), protein formula, tannin formula, acetic acid, amyl acetate, hydrogen peroxide 3-6%, feathering agent, steam gun, spotting board, etc. NO consumer products in protocol steps.
3. IDENTIFY RISKS — what could go wrong. Be honest.
4. PROJECT OUTCOMES — best, likely, and worst case. Never promise what you can't deliver.
5. MAKE A CALL — proceed, proceed with caution, or recommend release (return to customer untreated).

Voice: Direct, professional, experienced. You're talking to a fellow professional. No hedging, no filler. Say what you mean.

${isSpanish ? 'IMPORTANT: Return ALL text fields in Spanish. Keep agent names in English (NSD, POG, etc.) but all descriptions, assessments, and instructions in natural professional Spanish.' : ''}

You MUST return valid JSON matching this exact schema:
{
  "assessment": "string — Your read on this case. 2-3 sentences. What's the real situation here?",
  "modifiedProtocol": [
    {
      "step": 1,
      "agent": "string — Professional agent name (NSD, POG, Protein, Tannin, H₂O₂ 3%, etc.)",
      "instruction": "string — Detailed step instruction",
      "warning": "string | null — Step-specific caution if any"
    }
  ],
  "riskFactors": ["string — 2-3 specific risks for this case"],
  "outcomes": {
    "best": "string — Best realistic outcome",
    "likely": "string — Most probable outcome",
    "worst": "string — Worst case if stain is set or fiber compromised"
  },
  "recommendation": "proceed | caution | release",
  "recommendationNote": "string — Why this recommendation. 1-2 sentences."
}

Rules:
- modifiedProtocol must have 3-7 steps. Each step must name a specific professional agent.
- riskFactors must have exactly 2-3 items.
- recommendation must be exactly one of: "proceed", "caution", or "release"
- If the stain has been heat-set or bleached, lean toward "release" — don't give false hope.
- If fiber is unknown, ALWAYS include a test step first.
- Be specific. "Apply protein formula" is not enough. "Apply protein formula to spotting board, work wet side with bone spatula, 30-second dwell, flush with steam gun" — that's the standard.`

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.4,
        max_tokens: 3000,
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) {
      console.error('OpenAI deep-solve error:', await res.text())
      return NextResponse.json({ error: 'AI analysis failed' }, { status: 500 })
    }

    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content

    if (!raw) {
      return NextResponse.json({ error: 'Empty AI response' }, { status: 500 })
    }

    const result = JSON.parse(raw)

    // Validate required fields
    if (!result.assessment || !result.modifiedProtocol || !result.outcomes || !result.recommendation) {
      console.error('Deep-solve response missing required fields:', Object.keys(result))
      return NextResponse.json({ error: 'Incomplete AI response' }, { status: 500 })
    }

    // Validate recommendation enum
    if (!['proceed', 'caution', 'release'].includes(result.recommendation)) {
      result.recommendation = 'caution' // safe fallback
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('Deep solve error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
