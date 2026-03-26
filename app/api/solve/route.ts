/**
 * File: app/api/solve/route.ts
 *
 * TASK-122: Added write-through cache layer.
 * - Before AI call → check Supabase pending_protocols cache
 * - Cache hit → return cached card, increment solve_count
 * - Cache miss → AI generate → write to cache → return
 * - Safety-filtered responses are NOT cached
 *
 * Card structure is UNTOUCHED. Cache wraps around existing format.
 */

import { NextResponse } from 'next/server'
import { lookupProtocol } from '@/lib/protocols/lookup'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

/* ── Cache helpers ────────────────────────────── */

function buildCacheKey(stain: string, surface: string): string {
  return `${stain.toLowerCase().trim()}::${(surface || '').toLowerCase().trim()}`
}

async function checkCache(cacheKey: string) {
  try {
    const admin = getSupabaseAdmin()
    if (!admin) return null
    const { data, error } = await admin
      .from('pending_protocols')
      .select('card, verified, solve_count, source')
      .eq('cache_key', cacheKey)
      .single()

    if (error || !data) return null

    // Increment solve_count (fire-and-forget)
    getSupabaseAdmin()?.from('pending_protocols')
      .update({ solve_count: data.solve_count + 1, updated_at: new Date().toISOString() })
      .eq('cache_key', cacheKey)

    return data
  } catch {
    return null
  }
}

async function writeCache(stain: string, surface: string, cacheKey: string, card: any) {
  try {
    await getSupabaseAdmin()?.from('pending_protocols').upsert({
      stain: stain.toLowerCase().trim(),
      surface: (surface || '').toLowerCase().trim(),
      cache_key: cacheKey,
      card,
      source: 'ai',
      verified: false,
      solve_count: 1,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'cache_key' })
  } catch (err) {
    console.error('[solve] Cache write failed:', err)
  }
}

/* ── AI Generation (unchanged) ───────────────── */

async function generateAIProtocol(stain: string, surface: string, lang: string = 'en') {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey === 'placeholder-add-real-key') {
    throw new Error('OpenAI API key not configured')
  }

  const languageInstruction = lang === 'es'
    ? `\n\nIMPORTANT: Write EVERYTHING in Spanish. All field values — title, stainChemistry, whyThisWorks, instructions, homeSolutions, materialWarnings, escalation text, product notes — must be in Spanish. Use professional dry cleaning terminology in Spanish. Agent names stay in their standard professional form (NSD, POG, Protein, Tannin) but all descriptions, instructions, and explanations must be in natural, professional Spanish.`
    : ''

  const systemPrompt = `You are an expert stain removal chemist and 3rd-generation dry cleaner. Given a stain and surface, produce a JSON protocol card.${languageInstruction}

Return ONLY valid JSON in this exact format:
{
  "id": "<stain>-<surface>",
  "title": "<descriptive title>",
  "stainFamily": "<protein|tannin|oil-grease|dye|oxidizable|combination|particulate|wax-gum|bleach-damage|adhesive|pigment|unknown>",
  "surface": "<surface>",
  "stainChemistry": "<1-2 sentences on the chemistry of this stain on this surface>",
  "whyThisWorks": "<1-2 sentences explaining why the recommended approach works>",
  "spottingProtocol": [
    {
      "step": 1,
      "agent": "<chemical or tool>",
      "technique": "<brief technique>",
      "temperature": "<temperature guidance>",
      "dwellTime": "<time range>",
      "instruction": "<detailed instruction paragraph>"
    }
  ],
  "homeSolutions": ["<paragraph 1>", "<paragraph 2>"],
  "materialWarnings": ["<warning 1>", "<warning 2>"],
  "products": {
    "professional": [{"name": "<product>", "use": "<use case>", "note": "<note>"}],
    "consumer": [{"name": "<product>", "use": "<use case>", "note": "<note>"}]
  },
  "escalation": {
    "when": "<when to escalate>",
    "whatToTell": "<what to tell the cleaner>",
    "specialistType": "<type of specialist>"
  },
  "difficulty": 5,
  "meta": { "riskLevel": "medium", "tier": "ai-generated" }
}`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Stain: ${stain}\nSurface: ${surface || 'general fabric'}` },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  })

  if (!res.ok) {
    const errData = await res.text()
    console.error('OpenAI API error:', errData)
    throw new Error('AI generation failed')
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty AI response')

  const jsonStr = content.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(jsonStr)
}

/* ── Route Handler ───────────────────────────── */

export async function POST(req: Request) {
  try {
    const { stain, surface, lang } = await req.json()

    if (!stain || typeof stain !== 'string') {
      return NextResponse.json({ error: 'Stain required' }, { status: 400 })
    }

    const effectiveLang = lang || 'en'

    // 1. Local protocol lookup (Tier 1-3)
    const result = await lookupProtocol(stain, surface || '')

    if (result.card) {
      return NextResponse.json({
        ...result,
        source: result.source === 'verified' ? 'core' : result.source,
      })
    }

    // 2. Cache lookup (Tier 4 — cached AI)
    const cacheKey = buildCacheKey(stain, surface || '')
    const cached = await checkCache(cacheKey)

    if (cached) {
      const sourceLabel = cached.verified ? 'verified' : 'ai-cached'
      return NextResponse.json({
        card: cached.card,
        tier: cached.verified ? 2 : 4,
        confidence: cached.verified ? 0.9 : 0.75,
        source: sourceLabel,
      })
    }

    // 3. AI generation (Tier 4 — fresh)
    try {
      const aiCard = await generateAIProtocol(stain, surface || '', effectiveLang)

      // Don't cache safety-filtered responses.
      // NOTE: _safetyFiltered is a forward-looking guard. Currently the AI prompt
      // doesn't produce this flag, but if a post-processing safety layer is added
      // (or the prompt is updated to detect unsafe combos), this check prevents
      // caching of flagged responses. Safe to leave as-is.
      if (!aiCard._safetyFiltered) {
        writeCache(stain, surface || '', cacheKey, aiCard)
      }

      return NextResponse.json({
        card: aiCard,
        tier: 4,
        confidence: 0.5,
        source: 'ai',
      })
    } catch (err) {
      console.error('AI fallback failed:', err)
      return NextResponse.json(
        { error: 'No protocol found and AI generation unavailable' },
        { status: 404 }
      )
    }
  } catch (err) {
    console.error('Solve error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
