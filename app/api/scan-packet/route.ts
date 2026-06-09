import { NextRequest, NextResponse } from 'next/server'
import { analyzeScanPacket, type ScanPacketInput } from '@/lib/vision/scanPacket'

// VISION track (TASK-218): 3-image scan packet → structured intake HINT.
// This sits ALONGSIDE /api/scan-stain and /api/scan-label (which are untouched).
// The response is a HINT for intake, never a verdict — the GONR safety engine
// makes the final call. When failClosed=true, the UI must ask one more question.

export const runtime = 'nodejs'
export const maxDuration = 60

interface PacketBody {
  stainImage?: unknown
  garmentImage?: unknown
  careLabelImage?: unknown
  userNote?: unknown
  // legacy/single-field aliases tolerated:
  image?: unknown
  careLabel?: unknown
}

function asB64(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim().length > 0 ? v : undefined
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PacketBody

    const input: ScanPacketInput = {
      stainImage: asB64(body.stainImage) ?? asB64(body.image),
      garmentImage: asB64(body.garmentImage),
      careLabelImage: asB64(body.careLabelImage) ?? asB64(body.careLabel),
      userNote: typeof body.userNote === 'string' ? body.userNote : undefined,
    }

    if (!input.stainImage && !input.garmentImage && !input.careLabelImage) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const result = await analyzeScanPacket(input, apiKey)
    return NextResponse.json(result)
  } catch (err) {
    console.error('scan-packet exception:', err)
    // Fail closed: tell intake to ask one more question rather than guess.
    return NextResponse.json(
      {
        error: 'analysis_failed',
        failClosed: true,
        nextQuestion: "I couldn't read the photos — what is the fabric and what caused the stain?",
        isVerdict: false,
      },
      { status: 200 },
    )
  }
}
