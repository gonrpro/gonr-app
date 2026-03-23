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
                text: `You are Dan Eisen — DLI Hall of Fame textile spotter with 40 years experience. Analyze this stain image on a garment.

IMPORTANT CONTEXT: This is a spotting board in a dry cleaning shop. Stains are almost always food, beverage, body fluid, oil, ink, or dye — NOT rust or industrial chemicals unless clearly visible metal contact marks.

Chemistry families:
- tannin: wine, coffee, tea, beer, juice, tomato sauce (red/brown liquid stains)
- protein: blood, urine, sweat, egg, milk, grass (yellowish/brownish organic)
- oil-grease: cooking oil, butter, lipstick, makeup, motor oil (greasy/shiny)
- combination: chocolate, coffee with cream, tomato sauce with meat, pasta sauce (mixed)
- oxidizable: rust (actual metal rust marks), mustard, curry, turmeric (bright yellow/orange)
- dye: hair dye, ink, food coloring (vivid unnatural color)
- unknown: cannot determine

Return ONLY valid JSON: { "family": "tannin|protein|oil-grease|oxidizable|dye|combination|unknown", "suggestion": "specific stain name e.g. Tomato Sauce, Red Wine, Blood", "confidence": "high|medium|low", "reasoning": "one confident sentence about what you see and why" }`,
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
