import type { Colorfastness } from './types'

const DISPLAY_SPLIT_PATTERN =
  /(?:\s*[,.;]\s*|\s+\b(?:already|after|used|tried|blotted|rinsed|washed|dried|treated)\b)/i

function toDisplayCase(value: string): string {
  const lowercaseWords = new Set(['a', 'an', 'and', 'in', 'on', 'or', 'the', 'with'])
  return value
    .split(' ')
    .map((word, index) => {
      if (!word) return word
      const lower = word.toLowerCase()
      if (index > 0 && lowercaseWords.has(lower)) return lower
      return word[0].toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
}

export function extractConsumerDisplayQuery(description: string): string {
  const cleaned = description.trim().replace(/\s+/g, ' ')
  if (!cleaned) return ''

  const primary = cleaned.split(DISPLAY_SPLIT_PATTERN)[0]?.trim() ?? cleaned
  if (primary.length < 3) return ''

  return toDisplayCase(primary)
}

export function inferColorfastnessFromText(description: string, current: Colorfastness): Colorfastness {
  if (current !== 'unknown') return current

  const text = description.toLowerCase().replace(/\s+/g, ' ').trim()
  if (!text) return current

  if (/\bwhite\s+wine\b/.test(text)) return current
  if (/\bon\s+(?:a\s+|an\s+|the\s+)?(?:plain\s+)?(?:white|ivory|off white|off-white)\b/.test(text)) {
    return 'colorfast'
  }
  if (/\b(?:white|ivory|off white|off-white)\s+(?:cotton|linen|denim|polyester|nylon|shirt|pants|dress|blouse|fabric|garment|tee|t-shirt)\b/.test(text)) {
    return 'colorfast'
  }

  return current
}
