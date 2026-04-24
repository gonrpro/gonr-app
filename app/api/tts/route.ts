// app/api/tts/route.ts
// Hands-free voice endpoint — accepts a short text, returns streamed MP3.
// Primary provider: xAI TTS (voice "Ara"). Tyler approved after blind A/B
// (AtlasOps 8034). Provider is abstracted so swapping to OpenAI / ElevenLabs
// later is a one-line change.

import { NextResponse } from 'next/server'

const XAI_TTS_URL = 'https://api.x.ai/v1/tts'
const DEFAULT_VOICE = 'Ara'
const MAX_TEXT_CHARS = 4000

// Per-IP rate limit — reuses the same pattern as /api/solve.
// 30 TTS requests / minute / IP keeps abuse cost bounded while leaving plenty
// of headroom for a user tapping through an entire protocol step-by-step.
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const RATE_LIMIT_MAX = 30

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') || '127.0.0.1'
}

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const timestamps = rateLimitMap.get(ip) || []
  const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS)
  if (recent.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(ip, recent)
    return true
  }
  recent.push(now)
  rateLimitMap.set(ip, recent)
  return false
}

export async function POST(req: Request) {
  const clientIp = getClientIp(req)
  if (isRateLimited(clientIp)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  let body: { text?: string; lang?: string; voice?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const text = (body.text ?? '').trim()
  const lang = body.lang === 'es' ? 'es' : 'en'
  const voice = (body.voice ?? DEFAULT_VOICE).trim() || DEFAULT_VOICE

  if (!text) {
    return NextResponse.json({ error: 'empty_text' }, { status: 400 })
  }
  if (text.length > MAX_TEXT_CHARS) {
    return NextResponse.json({ error: 'text_too_long', limit: MAX_TEXT_CHARS }, { status: 400 })
  }

  const apiKey = process.env.XAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'tts_not_configured' }, { status: 503 })
  }

  let xaiRes: Response
  try {
    xaiRes = await fetch(XAI_TTS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voice_id: voice,
        output_format: { codec: 'mp3', sample_rate: 44100, bit_rate: 128000 },
        language: lang,
      }),
    })
  } catch (err) {
    console.warn('[TTS] xAI fetch failed:', err)
    return NextResponse.json({ error: 'tts_upstream_unreachable' }, { status: 502 })
  }

  if (!xaiRes.ok) {
    const errBody = await xaiRes.text().catch(() => '')
    console.warn('[TTS] xAI error', xaiRes.status, errBody.slice(0, 200))
    return NextResponse.json({ error: 'tts_upstream_error', status: xaiRes.status }, { status: 502 })
  }

  // Stream the audio directly through to the client. xAI returns an audio/mpeg
  // body we can pass straight to the browser <audio> element.
  return new Response(xaiRes.body, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
