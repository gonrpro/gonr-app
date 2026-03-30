// lib/vision/index.ts
// Single vision pipeline — one place, one prompt, used by all routes

const OPENAI_API = 'https://api.openai.com/v1'

export interface StainIdentification {
  stain: string       // e.g. "Red Wine"
  surface: string     // e.g. "Silk Blouse"
  family: string      // chemistry family
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
}

export interface CareLabelData {
  fiber: string           // e.g. "100% Silk" or "80% Wool 20% Nylon"
  careSymbols: string[]   // e.g. ["dry-clean-only", "no-bleach"]
  warnings: string[]      // any explicit label warnings
  rawText?: string        // any readable text from the label
}

const EMPTY_STAIN: StainIdentification = {
  stain: '', surface: '', family: 'unknown', confidence: 'low', reasoning: ''
}

const EMPTY_LABEL: CareLabelData = {
  fiber: '', careSymbols: [], warnings: []
}

export async function identifyStain(
  imageBase64: string,
  apiKey: string,
  hints?: { fabricDescription?: string; garmentLocation?: string }
): Promise<StainIdentification> {
  const contextLines: string[] = []
  if (hints?.fabricDescription) contextLines.push(`User describes the fabric as: ${hints.fabricDescription}`)
  if (hints?.garmentLocation) contextLines.push(`Stain location on garment: ${hints.garmentLocation}`)
  const contextNote = contextLines.length
    ? `\n\nAdditional user context:\n${contextLines.join('\n')}`
    : ''

  const prompt = `You are Dan Eisen — DLI Hall of Fame textile spotter with 40 years experience. Analyze this stain image.

Identify WHAT the stain is and WHAT SURFACE/MATERIAL it's on. The surface may be a garment, fabric, carpet, upholstery, bathtub, tile, grout, countertop, or any other material.

Chemistry families:
- tannin: wine, coffee, tea, beer, juice, tomato sauce (red/brown liquid stains)
- protein: blood, urine, sweat, egg, milk, grass (yellowish/brownish organic)
- oil-grease: cooking oil, butter, lipstick, makeup, motor oil (greasy/shiny)
- combination: chocolate, coffee with cream, tomato sauce with meat (mixed)
- oxidizable: rust (orange/red metal marks), mustard, curry, turmeric (bright yellow/orange)
- dye: hair dye, ink, food coloring (vivid unnatural color)
- mineral: hard water deposits, calcium, lime scale (white crusty buildup)
- unknown: cannot determine${contextNote}

Return ONLY valid JSON:
{
  "stain": "specific stain name e.g. Red Wine, Blood, Rust",
  "surface": "what the stain is on e.g. Cotton Shirt, Bathtub, Wool Coat",
  "family": "tannin|protein|oil-grease|oxidizable|dye|combination|mineral|unknown",
  "confidence": "high|medium|low",
  "reasoning": "one confident sentence about what you see and why"
}`

  try {
    const res = await fetch(`${OPENAI_API}/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-5.4',
        input: [{
          role: 'user',
          content: [
            { type: 'input_text', text: prompt },
            { type: 'input_image', image_url: `data:image/jpeg;base64,${imageBase64}`, detail: 'high' },
          ],
        }],
      }),
    })

    if (!res.ok) {
      console.error('[Vision:identifyStain] API error:', res.status)
      return EMPTY_STAIN
    }

    const data = await res.json()
    const raw = (data.output_text || data.output?.[0]?.content?.[0]?.text || '{}').trim()
    const parsed = JSON.parse(raw.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim())

    if (parsed.confidence === 'low') {
      console.warn('[Vision:identifyStain] Low confidence:', parsed.reasoning)
    }

    return {
      stain: parsed.stain || '',
      surface: parsed.surface || '',
      family: parsed.family || 'unknown',
      confidence: parsed.confidence || 'medium',
      reasoning: parsed.reasoning || '',
    }
  } catch (err) {
    console.error('[Vision:identifyStain] Error:', err)
    return EMPTY_STAIN
  }
}

export async function readCareLabel(
  imageBase64: string,
  apiKey: string
): Promise<CareLabelData> {
  const prompt = `You are an expert textile care specialist. Read this clothing care label carefully.

Extract ALL information visible on the label:
- Fiber/fabric content (exact percentages if shown)
- Care symbols (washing, drying, ironing, bleaching, dry cleaning instructions)
- Any explicit written warnings or instructions

Return ONLY valid JSON:
{
  "fiber": "exact fiber content e.g. '100% Silk' or '80% Wool, 20% Nylon'",
  "careSymbols": ["dry-clean-only", "no-bleach", "no-heat", "hand-wash-only", "do-not-wash", "no-iron"],
  "warnings": ["any explicit written warnings from the label"],
  "rawText": "any other readable text on the label"
}`

  try {
    const res = await fetch(`${OPENAI_API}/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-5.4',
        input: [{
          role: 'user',
          content: [
            { type: 'input_text', text: prompt },
            { type: 'input_image', image_url: `data:image/jpeg;base64,${imageBase64}`, detail: 'high' },
          ],
        }],
      }),
    })

    if (!res.ok) {
      console.error('[Vision:readCareLabel] API error:', res.status)
      return EMPTY_LABEL
    }

    const data = await res.json()
    const raw = (data.output_text || data.output?.[0]?.content?.[0]?.text || '{}').trim()
    const parsed = JSON.parse(raw.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim())

    return {
      fiber: parsed.fiber || '',
      careSymbols: Array.isArray(parsed.careSymbols) ? parsed.careSymbols : [],
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      rawText: parsed.rawText || '',
    }
  } catch (err) {
    console.error('[Vision:readCareLabel] Error:', err)
    return EMPTY_LABEL
  }
}
