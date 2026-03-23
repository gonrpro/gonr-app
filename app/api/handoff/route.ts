import { NextResponse } from 'next/server'

type HandoffOutcome = 'intake' | 'improved' | 'tough' | 'release'

interface HandoffRequest {
  stain: string
  surface: string
  outcome: HandoffOutcome
  stainType?: string
  steps?: string[]
  riskLevel?: string
}

const OUTCOME_PROMPTS: Record<HandoffOutcome, string> = {
  intake: `Generate a professional intake message for a customer dropping off a garment.
Acknowledge the stain, set expectations, explain what you'll try, and note any risks.
Tone: confident, knowledgeable, reassuring.`,

  improved: `Generate a message for a customer whose stain was successfully treated.
Explain what was done (in simple terms), any care instructions going forward.
Tone: warm, professional, educational.`,

  tough: `Generate a message for a customer whose stain is proving difficult.
Be honest about the challenge, explain what's been tried, propose next steps or escalation.
Tone: transparent, professional, solution-oriented.`,

  release: `Generate a release message for a customer whose garment is ready.
Summarize the outcome, any residual marks, and care tips to prevent future stains.
Tone: professional, thorough, helpful.`,
}

export async function POST(req: Request) {
  try {
    const body: HandoffRequest = await req.json()
    const { stain, surface, outcome, stainType, steps, riskLevel } = body

    if (!stain || !outcome) {
      return NextResponse.json({ error: 'Stain and outcome required' }, { status: 400 })
    }

    if (!OUTCOME_PROMPTS[outcome]) {
      return NextResponse.json({ error: 'Invalid outcome type' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey || apiKey === 'placeholder-add-real-key') {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
    }

    const contextParts = [
      `Stain: ${stain}`,
      surface ? `Surface/Fabric: ${surface}` : null,
      stainType ? `Stain family: ${stainType}` : null,
      riskLevel ? `Risk level: ${riskLevel}` : null,
      steps && steps.length > 0 ? `Treatment steps taken:\n${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}` : null,
    ].filter(Boolean).join('\n')

    const systemPrompt = `You are an expert dry cleaner writing a professional customer-facing message.
${OUTCOME_PROMPTS[outcome]}

Keep the message concise (2-4 paragraphs). Use plain language — avoid jargon unless briefly explaining chemistry.
Do NOT use bullet points. Write in natural paragraphs.
Sign off as "Your GONR Care Team".`

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
          { role: 'user', content: contextParts },
        ],
        temperature: 0.5,
        max_tokens: 1000,
      }),
    })

    if (!res.ok) {
      console.error('OpenAI handoff error:', await res.text())
      return NextResponse.json({ error: 'Message generation failed' }, { status: 500 })
    }

    const data = await res.json()
    const message = data.choices?.[0]?.message?.content

    if (!message) {
      return NextResponse.json({ error: 'Empty AI response' }, { status: 500 })
    }

    return NextResponse.json({ message })
  } catch (err) {
    console.error('Handoff error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
