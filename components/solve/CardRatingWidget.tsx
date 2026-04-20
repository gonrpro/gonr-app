'use client'

// TASK-052 Stage B — CardRatingWidget.
//
// Collapsed band at the bottom of the result card. Three UI states:
//
//   idle     — "Did this work? ⭐⭐⭐⭐⭐  [Yes] [Partial] [No]"
//   submitting — spinner on the primary CTA
//   thanked  — "Thanks — saved. Add a note (optional)?" → textarea → submit
//
// A rating is only sent when the user has picked BOTH stars and a worked-state
// (UX prevents partial submissions). No identity in the body (TASK-014 rule).
// Server derives the rater from the Supabase session cookie, or falls back to
// anon:<ip>. Notes are moderation-gated server-side (status='pending').

import { useState } from 'react'
import { submitRating } from '@/lib/ratings/fetch'

type WorkedValue = 'yes' | 'partial' | 'no'

type Props = {
  cardId: string
  correlationId?: string | null
  onRated?: (rating: { stars: number; worked: WorkedValue }) => void
}

export default function CardRatingWidget({ cardId, correlationId, onRated }: Props) {
  const [stars, setStars]   = useState<0 | 1 | 2 | 3 | 4 | 5>(0)
  const [hover, setHover]   = useState<number>(0)
  const [worked, setWorked] = useState<WorkedValue | null>(null)
  const [state, setState]   = useState<'idle' | 'submitting' | 'thanked' | 'error'>('idle')
  const [error, setError]   = useState<string>('')
  const [noteOpen, setNoteOpen]   = useState(false)
  const [noteText, setNoteText]   = useState('')
  const [noteState, setNoteState] = useState<'idle' | 'submitting' | 'submitted' | 'error'>('idle')

  async function handleSubmit() {
    if (stars < 1 || stars > 5 || !worked) return
    setState('submitting')
    setError('')
    const res = await submitRating({
      card_id: cardId,
      stars: stars as 1 | 2 | 3 | 4 | 5,
      worked,
      correlation_id: correlationId ?? undefined,
    })
    if (!res.ok) {
      setState('error')
      setError(res.error ?? 'submit_failed')
      return
    }
    setState('thanked')
    onRated?.({ stars, worked })
  }

  async function handleSubmitNote() {
    const trimmed = noteText.trim()
    if (!trimmed || !worked || stars < 1) return
    setNoteState('submitting')
    const res = await submitRating({
      card_id: cardId,
      stars: stars as 1 | 2 | 3 | 4 | 5,
      worked,
      note: trimmed,
      correlation_id: correlationId ?? undefined,
    })
    setNoteState(res.ok ? 'submitted' : 'error')
  }

  const canSubmit = stars >= 1 && worked !== null && state === 'idle'

  return (
    <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
        Did this work?
      </p>

      {state !== 'thanked' && (
        <>
          {/* Stars */}
          <div className="flex items-center gap-1 mb-2" role="radiogroup" aria-label="Star rating">
            {[1, 2, 3, 4, 5].map((n) => {
              const filled = (hover || stars) >= n
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setStars(n as 1 | 2 | 3 | 4 | 5)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  aria-label={`${n} star${n === 1 ? '' : 's'}`}
                  aria-pressed={stars === n}
                  disabled={state !== 'idle'}
                  className="w-9 h-9 flex items-center justify-center text-lg transition-transform active:scale-95"
                  style={{
                    color: filled ? '#f59e0b' : 'var(--text-secondary)',
                    opacity: filled ? 1 : 0.5,
                    background: 'transparent',
                    border: 'none',
                    cursor: state === 'idle' ? 'pointer' : 'default',
                  }}
                >
                  {filled ? '★' : '☆'}
                </button>
              )
            })}
          </div>

          {/* Worked buttons */}
          <div className="flex gap-1.5 mb-2">
            {(['yes', 'partial', 'no'] as const).map((w) => {
              const active = worked === w
              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWorked(w)}
                  disabled={state !== 'idle'}
                  className="flex-1 min-h-[36px] rounded-lg text-xs font-semibold transition-colors"
                  style={{
                    background: active ? 'var(--accent)' : 'var(--surface-2)',
                    color: active ? '#fff' : 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                    cursor: state === 'idle' ? 'pointer' : 'default',
                  }}
                >
                  {w === 'yes' ? 'Yes' : w === 'partial' ? 'Partial' : 'No'}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full min-h-[36px] rounded-lg text-xs font-bold transition-opacity disabled:opacity-40"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            {state === 'submitting' ? 'Submitting…' : 'Submit rating'}
          </button>

          {state === 'error' && (
            <p className="text-[11px] mt-2" style={{ color: '#ef4444' }}>
              Couldn’t submit: {error}. Try again.
            </p>
          )}
        </>
      )}

      {state === 'thanked' && (
        <div className="space-y-2">
          <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>
            Thanks — your rating is saved.
          </p>

          {!noteOpen && noteState === 'idle' && (
            <button
              type="button"
              onClick={() => setNoteOpen(true)}
              className="text-[11px] font-semibold"
              style={{ color: 'var(--accent)', background: 'transparent', border: 'none' }}
            >
              Add a note (optional) →
            </button>
          )}

          {noteOpen && noteState !== 'submitted' && (
            <div className="space-y-1.5">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="What worked, what didn’t — helps the next home user."
                maxLength={1000}
                rows={3}
                className="w-full rounded-lg px-2 py-1.5 text-xs outline-none border"
                style={{ background: 'var(--surface)', color: 'var(--text)', borderColor: 'var(--border)' }}
                disabled={noteState === 'submitting'}
              />
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={handleSubmitNote}
                  disabled={noteState === 'submitting' || !noteText.trim()}
                  className="flex-1 min-h-[32px] rounded-lg text-[11px] font-bold transition-opacity disabled:opacity-40"
                  style={{ background: 'var(--accent)', color: '#fff' }}
                >
                  {noteState === 'submitting' ? 'Sending…' : 'Send note (review first)'}
                </button>
                <button
                  type="button"
                  onClick={() => { setNoteOpen(false); setNoteText('') }}
                  disabled={noteState === 'submitting'}
                  className="min-h-[32px] px-3 rounded-lg text-[11px]"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                >
                  Cancel
                </button>
              </div>
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)', opacity: 0.8 }}>
                Notes are reviewed by the GONR team before anyone else sees them.
              </p>
              {noteState === 'error' && (
                <p className="text-[10px]" style={{ color: '#ef4444' }}>
                  Couldn’t send note. Try again.
                </p>
              )}
            </div>
          )}

          {noteState === 'submitted' && (
            <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              Note submitted for review. Thanks for the signal.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
