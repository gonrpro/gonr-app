import { NextRequest, NextResponse } from 'next/server'
import { requireProAuth } from '@/lib/auth/requireProAuth'

const SYSTEM_PROMPT = `You are a professional textile restoration expert trained in the Dan Eisen method.
A dry cleaner is showing you a photo of garment damage. Analyze it and provide:

1. ROOT CAUSE — What likely caused this damage (chemical, mechanical, heat, age, manufacturer defect, prior treatment error)
2. ASSESSMENT — Is this repairable? Partially? Or permanent?
3. PROTOCOL — If treatable, give professional steps (use Dan Eisen terminology: NSD, POG, tannin formula, protein formula, acetic acid, feathering agent). No home remedies.
4. CUSTOMER HANDOFF — What to tell the customer. Three versions:
   - IMPROVED: If treatment worked — a brief, warm counter script (2-3 sentences)
   - TOUGH: If partial improvement — honest script acknowledging the result (2-3 sentences)
   - DECLINE NOTE: A formatted document for when the garment cannot be treated. Must include:
     * Garment description (type, color, fiber if known)
     * Specific reason for decline (use the actual chemistry/damage identified — not generic language)
     * The specific risk that makes treatment inadvisable
     * A closing line: "This garment is being returned untreated and in the condition it was received."
     * One professional recommendation if applicable (e.g. textile restoration specialist)
     Format it as a ready-to-read document, not a script. Professional tone. No signature line.

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
    "improved": "string — counter script for successful treatment",
    "tough": "string — counter script for partial result",
    "release": "string — formatted decline note document, ready to read or hand to customer"
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
    const auth = await requireProAuth()
    if (!auth.allowed) return auth.response

    const body = await req.json()
    const { image, description, lang } = body

    if (!image && !description) {
      return NextResponse.json(
        { error: 'Provide an image or description' },
        { status: 400 }
      )
    }

    const systemPrompt = SYSTEM_PROMPT + (lang === 'es' ? '\n\nIMPORTANT: Write your ENTIRE response in professional Spanish. All field values — rootCause, fiberConcerns, protocol steps, and all handoff messages (improved, tough, release) and proTip — must be in Spanish. Use dry cleaning terminology. Agent names stay as-is (NSD, POG, Protein, Tannin).' : '')

    // Build Responses API input — same format as scan-stain (which works)
    const inputContent: any[] = [
      {
        type: 'input_text',
        text: description
          ? `Analyze this garment damage. Operator notes: "${description}"`
          : 'Analyze this garment damage from the photo.',
      },
    ]

    if (image) {
      inputContent.push({
        type: 'input_image',
        image_url: image,
        detail: 'high',
      })
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: inputContent }],
        max_tokens: 1500,
        temperature: 0.3,
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
    const raw = data.choices?.[0]?.message?.content

    if (!raw) {
      return NextResponse.json(
        { error: 'Empty AI response' },
        { status: 502 }
      )
    }

    const analysis = JSON.parse(raw.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim())
    return NextResponse.json({ analysis })
  } catch (err: any) {
    console.error('Garment analysis error:', err)
    return NextResponse.json(
      { error: err.message || 'Analysis failed' },
      { status: 500 }
    )
  }
}
