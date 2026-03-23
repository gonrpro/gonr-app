import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json()
    if (!image) return NextResponse.json({ error: 'No image provided' }, { status: 400 })

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'API key not configured' }, { status: 500 })

    // gpt-5.4 vision uses the Responses API
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-5.4',
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: 'Analyze this clothing care label. Return ONLY valid JSON, no markdown: { "fiber": "silk|wool|cashmere|cotton|polyester|linen|leather|suede|nylon|unknown", "careSymbols": ["no-bleach"|"dry-clean-only"|"no-heat"|"hand-wash-only"], "confidence": "high|medium|low" }',
              },
              {
                type: 'input_image',
                image_url: `data:image/jpeg;base64,${image}`,
                detail: 'high',
              },
            ],
          },
        ],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('scan-label error:', res.status, errText)
      return NextResponse.json({ fiber: 'unknown', careSymbols: [], confidence: 'low' })
    }

    const data = await res.json()
    const content = data.output_text || data.output?.[0]?.content?.[0]?.text || '{}'

    try {
      const clean = content.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed = JSON.parse(clean)
      return NextResponse.json(parsed)
    } catch {
      return NextResponse.json({ fiber: 'unknown', careSymbols: [], confidence: 'low' })
    }
  } catch (err) {
    console.error('scan-label exception:', err)
    return NextResponse.json({ fiber: 'unknown', careSymbols: [], confidence: 'low' })
  }
}
