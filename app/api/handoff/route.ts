import { NextResponse } from 'next/server'

type HandoffOutcome = 'intake' | 'improved' | 'tough' | 'release'

const VALID_OUTCOMES = new Set<string>(['intake', 'improved', 'tough', 'release'])

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { stain, surface, outcome, details, steps } = body

    if (!stain || !outcome) {
      return NextResponse.json({ error: 'Stain and outcome required' }, { status: 400 })
    }

    if (!VALID_OUTCOMES.has(outcome as string)) {
      return NextResponse.json({ error: 'Invalid outcome type' }, { status: 400 })
    }

    // Proxy to Netlify function (has its own OpenAI key)
    const netlifyRes = await fetch('https://gonr.app/.netlify/functions/customer-handoff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stain,
        surface,
        situation: outcome as HandoffOutcome,
        details: details || `${stain} on ${surface}`,
        protocolContext: steps ? { steps } : undefined,
      }),
    })

    if (!netlifyRes.ok) {
      const errText = await netlifyRes.text().catch(() => 'Unknown error')
      console.error('Netlify handoff error:', netlifyRes.status, errText)
      return NextResponse.json({ error: 'Message generation failed' }, { status: 502 })
    }

    const data = await netlifyRes.json()
    const message = data.message || data.response || data.text

    if (!message) {
      return NextResponse.json({ error: 'Empty response from handoff service' }, { status: 502 })
    }

    return NextResponse.json({ message })
  } catch (err) {
    console.error('Handoff error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
