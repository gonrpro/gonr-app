import { NextResponse } from 'next/server'

const SYSTEM_PROMPT = `You are a professional dry cleaner with 30 years of experience. Write customer communication that is warm, professional, honest, and brief. Never use "Dear Valued Customer." Use plain conversational language. 2-4 sentences maximum.`

const OUTCOME_PROMPTS: Record<string, string> = {
  intake: 'The garment has just been received for cleaning. Write a professional, warm message to the customer acknowledging receipt and setting expectations.',
  improved: 'The stain was successfully treated and the garment looks great. Write a positive, confident message to the customer.',
  tough: 'The stain was difficult and may not be fully removed. Write an honest, professional message managing expectations without alarming the customer.',
  release: 'The garment is ready for pickup. Write a brief, professional ready-for-pickup message.',
  defect: 'A pre-existing defect or manufacturer issue was discovered. Write a professional message explaining the situation clearly and protecting the cleaner.',
}

export async function POST(req: Request) {
  try {
    const { stain, surface, outcome, details, lang } = await req.json()

    if (!stain || !outcome) {
      return NextResponse.json({ error: 'Stain and outcome required' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const outcomePrompt = OUTCOME_PROMPTS[outcome] || OUTCOME_PROMPTS.intake
    const fabric = surface || 'fabric'
    const langInstruction = lang === 'es' ? '\n\nIMPORTANT: Write your entire response in professional Spanish.' : ''

    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-5.4',
        instructions: SYSTEM_PROMPT + langInstruction,
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: `${outcomePrompt}\n\nStain: ${stain}\nFabric: ${fabric}\n${details ? `Additional context: ${details}` : ''}`,
              },
            ],
          },
        ],
        max_output_tokens: 300,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Handoff API error:', res.status, err)
      return NextResponse.json({ error: 'Failed to generate message' }, { status: 502 })
    }

    const data = await res.json()
    const message = (data.output_text || data.output?.[0]?.content?.[0]?.text || '').trim()

    if (!message) {
      return NextResponse.json({ error: 'Failed to generate message' }, { status: 500 })
    }

    return NextResponse.json({ message })
  } catch (err) {
    console.error('Handoff error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
