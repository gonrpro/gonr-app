import { NextRequest, NextResponse } from 'next/server'
import { readCareLabel } from '@/lib/vision'

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json()
    if (!image) return NextResponse.json({ error: 'No image provided' }, { status: 400 })

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'API key not configured' }, { status: 500 })

    const result = await readCareLabel(image, apiKey)
    return NextResponse.json(result)
  } catch (err) {
    console.error('scan-label exception:', err)
    return NextResponse.json({ fiber: 'unknown', careSymbols: [], warnings: [], confidence: 'low' })
  }
}
