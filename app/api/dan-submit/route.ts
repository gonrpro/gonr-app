import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const card = await req.json()

    if (!card.stain || !card.fiber || !card.steps?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'API key not configured' }, { status: 500 })

    // Step 1: AI enrichment — fill in chemistry, why it works, customer language, tips, escalation
    const stepsText = card.steps.map((s: any, i: number) =>
      `Step ${i + 1}: [${s.agent}] ${s.instruction}${s.dwellTime ? ` (${s.dwellTime})` : ''}`
    ).join('\n')

    const enrichPrompt = `You are an expert textile care chemist. Dan Eisen (DLI Hall of Fame, 40 years experience) has provided a professional spotting protocol. Your job is to add the scientific context around his steps — NOT change his steps.

Stain: ${card.stain}
Fiber: ${card.fiber}

Dan's Protocol Steps:
${stepsText}

${card.warnings?.length ? `Safety Warnings:\n${card.warnings.join('\n')}` : ''}
${card.neverDo?.length ? `Never Do:\n${card.neverDo.join('\n')}` : ''}

Return ONLY valid JSON:
{
  "stainChemistry": "2-3 sentences on WHY this stain bonds to this fiber — professional chemistry level",
  "whyThisWorks": "2-3 sentences explaining why Dan's protocol works — the mechanism behind the agents he chose",
  "customerHandoff": "1-2 plain language sentences a counter person can say to a customer about this stain on this fiber. No jargon.",
  "homeTips": ["tip 1", "tip 2", "tip 3"],
  "escalation": "One sentence: when should this go to a specialist and what should the customer tell them"
}`

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4.1',
        max_tokens: 1000,
        temperature: 0.2,
        messages: [
          { role: 'system', content: 'You are an expert textile care chemist. Return ONLY valid JSON, no markdown.' },
          { role: 'user', content: enrichPrompt },
        ],
      }),
    })

    const aiData = await aiRes.json()
    const aiContent = aiData.choices?.[0]?.message?.content?.trim() || '{}'
    const enriched = JSON.parse(aiContent.replace(/```json?\n?/g, '').replace(/```\n?/g, ''))

    // Step 2: Build full card
    const stainSlug = card.stain.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const fiberSlug = card.fiber.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const id = `${stainSlug}-${fiberSlug}`

    const fullCard = {
      id,
      title: `${card.stain} on ${card.fiber}`,
      stainFamily: detectFamily(card.stain),
      surface: fiberSlug,
      source: 'dan-eisen',
      danVerified: true,
      meta: {
        stainCanonical: stainSlug,
        surfaceCanonical: fiberSlug,
        danReview: true,
        sourceKnowledge: ['dan-eisen'],
      },
      stainChemistry: enriched.stainChemistry || '',
      whyThisWorks: enriched.whyThisWorks || '',
      customerHandoff: enriched.customerHandoff || '',
      spottingProtocol: card.steps.map((s: any, i: number) => ({
        step: i + 1,
        agent: s.agent,
        instruction: s.instruction,
        dwellTime: s.dwellTime || '',
        technique: '',
      })),
      homeSolutions: enriched.homeTips || [],
      materialWarnings: card.warnings || [],
      escalation: enriched.escalation || '',
      neverDo: card.neverDo || [],
      difficulty: 5,
      submittedAt: card.submittedAt,
    }

    // Step 3: Send email to atlas@gonr.pro
    const emailBody = `New Dan Eisen Protocol Submission

Card ID: ${id}
Stain: ${card.stain}
Fiber: ${card.fiber}
Steps: ${card.steps.length}
Submitted: ${card.submittedAt}

--- FULL CARD JSON ---
${JSON.stringify(fullCard, null, 2)}

--- DEPLOY COMMAND ---
Save to ~/Desktop/gonr-app/data/core/${id}.json and git push to deploy.`

    // Use SendGrid or fallback to a simple fetch to an email service
    const emailKey = process.env.SENDGRID_API_KEY
    if (emailKey) {
      await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${emailKey}`,
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: 'atlas@gonr.pro' }] }],
          from: { email: 'atlas@gonr.pro', name: 'GONR Dan Builder' },
          subject: `New Dan Protocol: ${card.stain} on ${card.fiber}`,
          content: [{ type: 'text/plain', value: emailBody }],
        }),
      })
    }

    return NextResponse.json({ ok: true, id, card: fullCard })
  } catch (err) {
    console.error('Dan submit error:', err)
    return NextResponse.json({ error: 'Save failed' }, { status: 500 })
  }
}

function detectFamily(stain: string): string {
  const s = stain.toLowerCase()
  if (['blood', 'urine', 'sweat', 'egg', 'milk', 'vomit', 'grass'].some(x => s.includes(x))) return 'protein'
  if (['wine', 'coffee', 'tea', 'beer'].some(x => s.includes(x))) return 'tannin'
  if (['oil', 'butter', 'lipstick', 'cosmetic'].some(x => s.includes(x))) return 'oil-grease'
  if (['rust', 'mustard', 'curry'].some(x => s.includes(x))) return 'oxidizable'
  if (['chocolate', 'cream'].some(x => s.includes(x))) return 'combination'
  if (['dye', 'ink', 'marker'].some(x => s.includes(x))) return 'dye'
  return 'unknown'
}
