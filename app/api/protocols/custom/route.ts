import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const OPENAI_API = 'https://api.openai.com/v1'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase credentials not configured')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, stain, surface, steps, notes } = body

    if (!email || !stain || !surface) {
      return NextResponse.json({ error: 'Missing required fields: email, stain, surface' }, { status: 400 })
    }

    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      return NextResponse.json({ error: 'At least one step is required' }, { status: 400 })
    }

    // Use AI to structure into full protocol card
    const stepsText = steps
      .map((s: { agent?: string; instruction: string }, i: number) =>
        `Step ${i + 1}: ${s.agent ? `[${s.agent}] ` : ''}${s.instruction}`
      )
      .join('\n')

    const systemPrompt = `You are a professional textile cleaning protocol structurer. Given a user's custom protocol steps for a specific stain and surface, structure it into a complete protocol card JSON object.

Return ONLY valid JSON with this exact structure:
{
  "id": "custom-<stain-slug>-<surface-slug>",
  "title": "<Stain> on <Surface>",
  "stainFamily": "<protein|tannin|oil|dye|combination|specialty|unknown>",
  "surface": "<surface>",
  "meta": {
    "stainCanonical": "<stain>",
    "surfaceCanonical": "<surface>",
    "riskLevel": "<low|medium|high>",
    "tags": []
  },
  "stainChemistry": "<brief chemistry explanation>",
  "whyThisWorks": "<1-2 sentences explaining the approach>",
  "spottingProtocol": [
    { "step": 1, "agent": "<agent or empty>", "instruction": "<detailed instruction>", "technique": "<if applicable>", "dwellTime": "<if applicable>" }
  ],
  "homeSolutions": ["<1-2 home alternatives>"],
  "materialWarnings": ["<safety warnings>"],
  "escalation": { "when": "<when to escalate>", "whatToTell": "<what to say>" },
  "commonMistakes": ["<common mistakes>"],
  "difficulty": <1-10>
}`

    const userPrompt = `Stain: ${stain}
Surface/Material: ${surface}
User's Steps:
${stepsText}
${notes ? `Notes: ${notes}` : ''}`

    const aiRes = await fetch(`${OPENAI_API}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    })

    if (!aiRes.ok) {
      const errText = await aiRes.text()
      console.error('[protocols/custom] OpenAI error:', errText)
      throw new Error('AI structuring failed')
    }

    const aiData = await aiRes.json()
    const raw = aiData.choices?.[0]?.message?.content || ''

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw]
    let protocolCard
    try {
      protocolCard = JSON.parse(jsonMatch[1]!.trim())
    } catch {
      console.error('[protocols/custom] Failed to parse AI JSON:', raw)
      throw new Error('AI returned invalid protocol format')
    }

    // Save to database
    const sb = getSupabaseAdmin()
    const { data, error } = await sb
      .from('saved_protocols')
      .insert({
        user_email: email.toLowerCase(),
        protocol_json: protocolCard,
        is_custom: true,
        title: protocolCard.title || `${stain} on ${surface}`,
        stain,
        surface,
        notes: notes || null,
      })
      .select('id')
      .single()

    if (error) throw error

    return NextResponse.json({ id: data.id, card: protocolCard })
  } catch (err: any) {
    console.error('[protocols/custom]', err)
    return NextResponse.json({ error: err.message || 'Custom protocol creation failed' }, { status: 500 })
  }
}
