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
    const { protocolId, protocolJson, targetLang } = body

    if (!protocolJson || !targetLang) {
      return NextResponse.json({ error: 'Missing protocolJson or targetLang' }, { status: 400 })
    }

    const langName = targetLang === 'es' ? 'Spanish' : 'English'

    const systemPrompt = `You are a professional translator for textile cleaning protocols. Translate the following protocol card JSON into ${langName}.

Translate ALL user-facing text fields: title, stainChemistry, whyThisWorks, all instruction texts in spottingProtocol steps, homeSolutions, materialWarnings, escalation text, commonMistakes, and any other descriptive text.

Do NOT translate: field names/keys, chemical formulas, product names, agent names (NSD, POG, etc.), or the id field.

Return ONLY the translated JSON object, no extra text.`

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
          { role: 'user', content: JSON.stringify(protocolJson) },
        ],
        temperature: 0.2,
        max_tokens: 3000,
      }),
    })

    if (!aiRes.ok) {
      const errText = await aiRes.text()
      console.error('[protocols/translate] OpenAI error:', errText)
      throw new Error('Translation failed')
    }

    const aiData = await aiRes.json()
    const raw = aiData.choices?.[0]?.message?.content || ''

    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw]
    let translatedJson
    try {
      translatedJson = JSON.parse(jsonMatch[1]!.trim())
    } catch {
      console.error('[protocols/translate] Failed to parse translated JSON:', raw)
      throw new Error('Translation returned invalid format')
    }

    // Cache translation in DB if we have a protocol ID
    if (protocolId) {
      const sb = getSupabaseAdmin()
      await sb
        .from('saved_protocols')
        .update({
          translated_json: translatedJson,
          language: targetLang,
          updated_at: new Date().toISOString(),
        })
        .eq('id', protocolId)
    }

    return NextResponse.json({ translated: translatedJson })
  } catch (err: any) {
    console.error('[protocols/translate]', err)
    return NextResponse.json({ error: err.message || 'Translation failed' }, { status: 500 })
  }
}
