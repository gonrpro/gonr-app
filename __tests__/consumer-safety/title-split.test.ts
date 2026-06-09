import { splitTitle } from '@/components/consumer/screens/ResultsScreen'

// TASK-218 — the result hero title. A tier-4 AI card.title can be a verbose run-on
// that repeats the stain and crams the hero (Tyler 2026-06-08). splitTitle() keeps a
// concise head for the H1 and moves the rest to a subtitle — dropping no engine text.

describe('splitTitle', () => {
  it('condenses a verbose, stain-repeating AI title to a clean head + detail', () => {
    const raw =
      'Professional Assessment Required — Coffee with Cream. Coffee with cream (tannins + oils/proteins) — warm/hot water already applied on Cotton, prone to bleed'
    const { head, detail } = splitTitle(raw)
    expect(head).toBe('Professional Assessment Required — Coffee with Cream')
    expect(head).not.toMatch(/\.$/)
    expect(detail).toContain('tannins + oils/proteins')
    // no text is lost — head + detail together still carry the analysis
    expect(`${head}. ${detail}`).toContain('prone to bleed')
  })

  it('passes a clean curated title through unchanged, with no subtitle', () => {
    expect(splitTitle('Coffee on Cotton')).toEqual({ head: 'Coffee on Cotton', detail: '' })
  })

  it('hard-caps a single huge sentence so it can never cram the hero', () => {
    const long = `Stain ${'x'.repeat(120)}`
    const { head } = splitTitle(long)
    expect(head.length).toBeLessThanOrEqual(82)
    expect(head.endsWith('…')).toBe(true)
  })

  it('falls back to a sensible default for an empty title', () => {
    expect(splitTitle(undefined)).toEqual({ head: 'Your rescue plan', detail: '' })
    expect(splitTitle('   ')).toEqual({ head: 'Your rescue plan', detail: '' })
  })
})
