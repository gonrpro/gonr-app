// lib/ratings/fetch.ts — TASK-052 Stage B client helper.
// Wraps /api/ratings/submit and /api/ratings/aggregate so components don't
// hand-roll fetch calls. No auth awareness; server decides based on session
// cookie (TASK-014 rule).

export type RatingAggregate = {
  card_id: string
  user_count: number
  user_avg_stars: number | null   // null until display_ready
  user_worked_pct: number | null  // null until display_ready
  display_ready: boolean
  gonr_lab_tested: boolean
  pilot_tested: boolean
  seeded_count: number
  seed_sources: string[]
  display_threshold: number
}

export type RatingSubmission = {
  card_id: string
  stars: 1 | 2 | 3 | 4 | 5
  worked: 'yes' | 'no' | 'partial'
  note?: string
  correlation_id?: string | null
}

export async function fetchRatingAggregate(cardId: string, signal?: AbortSignal): Promise<RatingAggregate | null> {
  if (!cardId) return null
  try {
    const res = await fetch(`/api/ratings/aggregate?card_id=${encodeURIComponent(cardId)}`, {
      cache: 'no-store',
      signal,
    })
    if (!res.ok) return null
    return (await res.json()) as RatingAggregate
  } catch {
    return null
  }
}

export async function submitRating(input: RatingSubmission): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/ratings/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { ok: false, error: (data && typeof data.error === 'string' ? data.error : `http_${res.status}`) }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network_error' }
  }
}
