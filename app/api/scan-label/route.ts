import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json()
    if (!image) return NextResponse.json({ error: 'No image provided' }, { status: 400 })

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'API key not configured' }, { status: 500 })

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-5.4',
        max_tokens: 200,
        messages: [
          {
            role: 'system',
            content: 'You are an expert at reading clothing care labels. Return ONLY valid JSON, no markdown.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this clothing care label. Return ONLY this JSON: { "fiber": "silk|wool|cashmere|cotton|polyester|linen|leather|suede|nylon|unknown", "careSymbols": ["no-bleach"|"dry-clean-only"|"no-heat"|"hand-wash-only"], "confidence": "high|medium|low" }',
              },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${image}`, detail: 'high' },
              },
            ],
          },
        ],
      }),
    })

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || '{}'
    const parsed = JSON.parse(content.trim())
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ fiber: 'unknown', careSymbols: [], confidence: 'low' })
  }
}
