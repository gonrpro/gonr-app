import { NextRequest, NextResponse } from 'next/server'
import { identifyStain } from '@/lib/vision'

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json()
    if (!image) return NextResponse.json({ error: 'No image provided' }, { status: 400 })

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'API key not configured' }, { status: 500 })

    const result = await identifyStain(image, apiKey)
    return NextResponse.json(result)
  } catch (err) {
    console.error('scan-stain exception:', err)
    return NextResponse.json({ family: 'unknown', stain: 'Unknown stain', confidence: 'low', reasoning: 'Could not analyze image.' })
  }
}
