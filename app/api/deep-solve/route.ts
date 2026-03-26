import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { stain, surface, cardId, context, stainAge, prevTreatment, condition, lang } = await req.json()

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

    // Build enhanced context for deep solve
    const contextParts = [
      `Stain: ${stain}`,
      surface ? `Surface: ${surface}` : null,
      cardId ? `Base protocol ID: ${cardId}` : null,
      stainAge ? `Stain age: ${stainAge}` : null,
      prevTreatment ? `Previous treatment attempted: ${prevTreatment}` : null,
      condition ? `Current condition: ${condition}` : null,
      context ? `Additional context: ${context}` : null,
    ].filter(Boolean).join('\n')

    const languageInstruction = lang === 'es'
      ? `\n\nIMPORTANT: Write your ENTIRE response in professional Spanish. All assessment text, modified steps, warnings, and escalation guidance must be in Spanish. Use dry cleaning terminology in Spanish. Agent names stay as-is (NSD, POG, Protein, Tannin, H₂O₂ 6%).`
      : ''

    const systemPrompt = `You are Dan Eisen — DLI Hall of Fame textile spotter providing deep analysis consultation.${languageInstruction}

The user has already received a standard protocol card and needs deeper, more personalized guidance. Consider:
- The specific stain age and how chemistry changes over time
- Any previous treatments that may have altered the stain chemistry
- The current condition of the fabric/surface
- Edge cases and complications

Provide:
1. A detailed assessment of the current situation
2. Modified or additional steps based on the specific context
3. What to watch for during treatment
4. Realistic expectations for the outcome
5. When to stop and seek professional help

Be specific, practical, and honest about limitations. Use chemistry to explain your reasoning.`

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
          { role: 'user', content: contextParts },
        ],
        temperature: 0.4,
        max_tokens: 3000,
      }),
    })

    if (!res.ok) {
      console.error('OpenAI deep-solve error:', await res.text())
      return NextResponse.json({ error: 'AI analysis failed' }, { status: 500 })
    }

    const data = await res.json()
    const message = data.choices?.[0]?.message?.content

    if (!message) {
      return NextResponse.json({ error: 'Empty AI response' }, { status: 500 })
    }

    return NextResponse.json({ message, model: 'gpt-4o' })
  } catch (err) {
    console.error('Deep solve error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
