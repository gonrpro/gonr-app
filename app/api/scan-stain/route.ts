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
        model: 'gpt-4o',
        max_tokens: 300,
        messages: [
          {
            role: 'system',
            content: 'You are an expert textile spotter with 40 years of experience. Analyze stain images and identify chemistry families. Return ONLY valid JSON, no markdown.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this stain image. Return ONLY this JSON: { "family": "tannin|protein|oil-grease|oxidizable|dye|combination|unknown", "suggestion": "most likely stain type e.g. Red Wine", "confidence": "high|medium|low", "reasoning": "one sentence" }',
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

    if (!res.ok) {
      const errText = await res.text()
      console.error('OpenAI scan-stain error:', res.status, errText)
      return NextResponse.json({ family: 'unknown', suggestion: 'Unknown stain', confidence: 'low', reasoning: 'Vision API error.' })
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || '{}'
    
    // Handle potential JSON parse errors
    try {
      const clean = content.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed = JSON.parse(clean)
      return NextResponse.json(parsed)
    } catch {
      return NextResponse.json({ family: 'unknown', suggestion: content.slice(0, 50), confidence: 'low', reasoning: 'Parse error.' })
    }
  } catch (err) {
    console.error('scan-stain exception:', err)
    return NextResponse.json({ family: 'unknown', suggestion: 'Unknown stain', confidence: 'low', reasoning: 'Could not analyze image.' })
  }
}
