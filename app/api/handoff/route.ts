import { NextResponse } from 'next/server'
import { checkProAccess } from '@/lib/auth/serverGate'

const SYSTEM_PROMPT = `You are Dan Eisen — DLI Hall of Fame textile expert and customer service coach with 40 years in professional dry cleaning. You help counter staff handle difficult conversations with confidence and professionalism.

Generate four distinct customer communication pieces for this stain/fabric situation. Each piece serves a different purpose and must be unique — not the same text repeated.

Rules:
- Use your deep knowledge of stain chemistry and fiber behavior to set accurate expectations
- Counter staff need to sound knowledgeable, not scripted
- Include specific fiber/stain context where relevant (e.g. "linen fibers are hollow and can trap protein stains deeply")
- Never over-promise. Never under-explain.
- Brief but substantive. 2-4 sentences per section.
- Never use "Dear Valued Customer"

Return JSON with exactly these fields:
{
  "intake": "What to say when receiving the garment — set expectations, show expertise, build trust",
  "ticketNotes": "Short internal ticket annotation for the cleaning staff — what to watch for, chemistry notes, risk flags",
  "pickup": "What to say at pickup — honest result communication, next steps if partial",
  "writtenNote": "A brief written note to leave with the garment if needed — professional, signed from the cleaner"
}`

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { stain, surface, outcome, details, lang, email } = body

    // Server-side auth: Spotter+ required
    const access = await checkProAccess(email)
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason || 'Unauthorized' }, { status: 401 })
    }

    if (!stain || !outcome) {
      return NextResponse.json({ error: 'Stain and outcome required' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const fabric = surface || 'fabric'
    const langInstruction = lang === 'es'
      ? '\n\nIMPORTANT: Write ALL four sections in professional Spanish. Use dry cleaning terminology. Keep brand/agent names in English.'
      : ''

    const outcomeDescriptions: Record<string, string> = {
      improved: 'Treatment was successful — stain is gone or nearly gone. Confident, positive tone.',
      tough: 'Stain was difficult — partial improvement or uncertain result. Honest, professional tone managing expectations without alarming the customer.',
      release: `We are recommending RELEASE AT INTAKE — declining to treat this garment before we touch it. The cleaner has assessed the risks and determined that treatment would likely cause damage.

This conversation happens AT THE COUNTER, BEFORE any treatment. The customer is standing there with the garment. We are explaining WHY we cannot accept it for treatment.

The four sections for a RELEASE AT INTAKE must:
- INTAKE: This IS the primary conversation. Explain clearly and specifically why treatment is too risky for this garment. Reference the actual construction and chemistry risks: unstable or hand-applied dyes that will migrate with any solvent, heat-sensitive adhesives holding beading or trim that will fail with moisture or heat, couture construction with conflicting fiber requirements between lining and shell, delicate embellishments that cannot survive agitation, or pre-existing damage that cleaning would worsen. Be educational and empathetic — the customer needs to understand the WHY. Sound like an expert protecting their investment, not a shop avoiding work.
- TICKET NOTES: Brief internal note documenting the specific risk factors assessed at intake. For liability records.
- PICKUP: Not applicable for release at intake — but write a short professional statement for IF they return later asking about other options or referrals.
- WRITTEN NOTE: A formal written release document the customer takes home. States that the garment was assessed at intake, documents the specific risks identified, confirms the garment is being returned in its received condition untreated. Protective language for the cleaner. Professional signature line.`,
      intake: 'Garment just received — setting expectations before treatment. Knowledgeable, reassuring tone.',
    }

    const outcomeContext = outcomeDescriptions[outcome] || outcomeDescriptions.intake

    const userMessage = `Stain: ${stain}
Fabric/Surface: ${fabric}
Outcome context: ${outcomeContext}
${details ? `Additional context: ${details}` : ''}

Generate four distinct customer communication pieces as specified. Make each one genuinely different — intake sets expectations, ticket notes are internal shorthand, pickup communicates the result, written note is a leave-behind.`

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4.1',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT + langInstruction },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 800,
        temperature: 0.3,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Handoff API error:', res.status, err)
      return NextResponse.json({ error: 'Failed to generate handoff' }, { status: 502 })
    }

    const data = await res.json()
    const raw = (data.choices?.[0]?.message?.content || '').trim()

    if (!raw) {
      return NextResponse.json({ error: 'Empty AI response' }, { status: 500 })
    }

    const result = JSON.parse(raw.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim())

    // Validate all 4 sections present
    if (!result.intake || !result.ticketNotes || !result.pickup || !result.writtenNote) {
      console.error('Handoff missing fields:', Object.keys(result))
      return NextResponse.json({ error: 'Incomplete handoff response' }, { status: 500 })
    }

    return NextResponse.json({
      intake: result.intake,
      ticketNotes: result.ticketNotes,
      pickup: result.pickup,
      writtenNote: result.writtenNote,
    })
  } catch (err) {
    console.error('Handoff error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
