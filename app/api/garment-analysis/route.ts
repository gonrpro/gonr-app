import { NextRequest, NextResponse } from 'next/server'

const SYSTEM_PROMPT = `You are a professional textile restoration expert trained in the Dan Eisen method.
A dry cleaner is showing you a photo of garment damage. Analyze it and provide:

1. ROOT CAUSE — What likely caused this damage (chemical, mechanical, heat, age, manufacturer defect, prior treatment error)
2. ASSESSMENT — Is this repairable? Partially? Or permanent?
3. PROTOCOL — If treatable, give professional steps (use Dan Eisen terminology: NSD, POG, tannin formula, protein formula, acetic acid, feathering agent). No home remedies.
4. CUSTOMER HANDOFF — What to tell the customer. Three versions:
   - IMPROVED: If treatment worked
   - TOUGH: If partial improvement
   - RELEASE: If damage is permanent

Rules:
- Professional voice. You're talking to a dry cleaner, not a consumer.
- Use specific chemistry names (NSD, POG, protein formula, tannin formula, not "soap" or "vinegar")
- If damage looks like prior cleaning error, say so directly — operators need to know
- If it's a manufacturer defect (poor dye, weak construction), identify it
- Safety first: check fiber type before recommending any chemical
- When uncertain, say "inconclusive from photo — examine under UV" or similar professional guidance
- Keep it concise. Operators don't read essays.

Return JSON:
{
  "rootCause": "string — 1-2 sentences",
  "damageType": "chemical|mechanical|heat|age|dye|defect|unknown",
  "repairable": "yes|partial|no|uncertain",
  "fiberConcerns": ["string — any fiber-specific warnings"],
  "protocol": [
    { "step": 1, "action": "string", "agent": "string|null" }
  ],
  "handoff": {
    "improved": "string",
    "tough": "string",
    "release": "string"
  },
  "proTip": "string — one actionable insight for the operator"
}`

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey === 'placeholder-add-real-key') {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY not configured' },
      { status: 500 }
    )
  }

  try {
    const body = await req.json()
    const { image, description, lang } = body

    if (!image && !description) {
      return NextResponse.json(
        { error: 'Provide an image or description' },
        { status: 400 }
      )
    }

    // Build message content
    const content: any[] = [
      {
        type: 'text',
        text: description
          ? `Analyze this garment damage. Operator notes: "${description}"`
          : 'Analyze this garment damage from the photo.',
      },
    ]

    if (image) {
      // image is base64 data URL
      content.push({
        type: 'image_url',
        image_url: {
          url: image,
          detail: 'high',
        },
      })
    }

    // Build Responses API input for gpt-5.4
    const inputContent: any[] = content.map((c: any) => {
      if (c.type === 'text') return { type: 'input_text', text: c.text }
      if (c.type === 'image_url') return { type: 'input_image', image_url: c.image_url.url, detail: 'high' }
      return c
    })

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.4',
        instructions: SYSTEM_PROMPT + (lang === 'es' ? '\n\nIMPORTANT: Write your ENTIRE response in professional Spanish. All field values — rootCause, fiberConcerns, protocol steps, and all handoff messages (improved, tough, release) and proTip — must be in Spanish. Use dry cleaning terminology. Agent names stay as-is (NSD, POG, Protein, Tannin).' : ''),
        input: [{ role: 'user', content: inputContent }],
        max_output_tokens: 1500,
        text: { format: { type: 'json_object' } },
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('OpenAI error:', err)
      return NextResponse.json(
        { error: 'AI analysis failed' },
        { status: 502 }
      )
    }

    const data = await response.json()
    const raw = data.output_text || data.output?.[0]?.content?.[0]?.text

    if (!raw) {
      return NextResponse.json(
        { error: 'Empty AI response' },
        { status: 502 }
      )
    }

    const analysis = JSON.parse(raw)
    return NextResponse.json({ analysis })
  } catch (err: any) {
    console.error('Garment analysis error:', err)
    return NextResponse.json(
      { error: err.message || 'Analysis failed' },
      { status: 500 }
    )
  }
}
