import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json()
    if (!image) return NextResponse.json({ error: 'No image provided' }, { status: 400 })

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'API key not configured' }, { status: 500 })

    // gpt-5.4 vision uses the Responses API with input_image type
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
                text: 'You are an expert textile spotter with 40 years of experience. Analyze this stain image. Return ONLY valid JSON, no markdown: { "family": "tannin|protein|oil-grease|oxidizable|dye|combination|unknown", "suggestion": "most likely stain type e.g. Red Wine", "confidence": "high|medium|low", "reasoning": "one sentence" }',
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
      console.error('scan-stain error:', res.status, errText)
      return NextResponse.json({ family: 'unknown', suggestion: 'Unknown stain', confidence: 'low', reasoning: 'Vision API error.' })
    }

    const data = await res.json()
    const content = data.output_text || data.output?.[0]?.content?.[0]?.text || '{}'

    try {
      const clean = content.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed = JSON.parse(clean)
      return NextResponse.json(parsed)
    } catch {
      return NextResponse.json({ family: 'unknown', suggestion: 'Unknown stain', confidence: 'low', reasoning: 'Parse error.' })
    }
  } catch (err) {
    console.error('scan-stain exception:', err)
    return NextResponse.json({ family: 'unknown', suggestion: 'Unknown stain', confidence: 'low', reasoning: 'Could not analyze image.' })
  }
}
