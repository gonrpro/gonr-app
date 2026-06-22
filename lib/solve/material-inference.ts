import type { Material } from '@/lib/consumer-safety/types'

const DENIM_TERMS = /\b(?:denim|jeans?|blue jeans?|jean jacket|denim jacket|denim pants)\b/i
const OTHER_MATERIAL_TERMS = /\b(?:cotton|linen|polyester|nylon|wool|silk|rayon|viscose|acetate|leather|suede|nubuck|cashmere)\b/i
const SURFACE_MATERIAL_PATTERNS: Array<{ value: Material; pattern: RegExp }> = [
  { value: 'cotton', pattern: /\bcotton\b/i },
  { value: 'linen', pattern: /\blinen\b/i },
  { value: 'denim', pattern: DENIM_TERMS },
  { value: 'polyester', pattern: /\bpoly(?:ester)?\b/i },
  { value: 'nylon', pattern: /\bnylon\b/i },
  { value: 'wool', pattern: /\b(?:wool|cashmere|merino|angora|mohair)\b/i },
  { value: 'silk', pattern: /\bsilk\b/i },
  { value: 'rayon_viscose', pattern: /\b(?:rayon|viscose)\b/i },
  { value: 'acetate', pattern: /\b(?:acetate|triacetate)\b/i },
  { value: 'leather', pattern: /\bleather\b/i },
  { value: 'suede', pattern: /\b(?:suede|nubuck)\b/i },
  { value: 'blend', pattern: /\bblend\b/i },
]

export function inferMaterialFromText(text: string, current: Material): Material {
  if (current !== 'unknown') return current
  if (!DENIM_TERMS.test(text)) return current
  if (OTHER_MATERIAL_TERMS.test(text)) return current
  return 'denim'
}

// TASK-228 — broad material inference for the /solve-v2 progressive intake.
// Unlike inferMaterialFromText (denim-only, intentionally conservative for the
// legacy hint path), this maps any single clearly-named fabric in free text to
// its Material enum so the consumer intake can skip the "what is it made of?"
// question when the user already said it. Stays 'unknown' when the text names
// zero or multiple fabrics (ambiguous → ask), and never overrides an explicit
// current value.
export function inferMaterialFromDescription(text: string, current: Material): Material {
  if (current !== 'unknown') return current
  if (!text.trim()) return 'unknown'
  const matches = [...new Set(SURFACE_MATERIAL_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(({ value }) => value))]
  return matches.length === 1 ? matches[0] : 'unknown'
}

export function normalizeSurfaceHint(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return trimmed

  const matches = SURFACE_MATERIAL_PATTERNS.filter(({ pattern }) => pattern.test(trimmed)).map(({ value }) => value)
  const unique = [...new Set(matches)]
  if (unique.length === 1) return unique[0]

  return trimmed
}
