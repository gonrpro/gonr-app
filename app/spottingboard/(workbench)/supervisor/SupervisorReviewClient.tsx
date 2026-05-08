'use client'

// app/spottingboard/(workbench)/supervisor/SupervisorReviewClient.tsx
//
// TASK-161 client component for supervisor actions.
// Each item gets three primary actions:
//   - Accept: review_status → reviewed-accept
//   - Reject: review_status → reviewed-reject
//   - Request SB review: feed_mode → review-candidate (escalation path)
// Plus a "mark reviewed for plant use" safety-label upgrade for items that
// are reviewed-accept and operator wants to lift safety_label off
// needs_source_review.
//
// Each action requires a non-empty reason (RPC enforces; app-layer asks for it
// via prompt to keep the surface lean — TASK-152 §7.1 audit-mandatory).
//
// On success, the row is removed from the local list (we trust the server's
// review_status update; could re-fetch but a reload also works for v1).

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ThreeBadgeAnchor,
  type AuthorityClass,
  type RiskTier,
  type ReviewStatus,
} from '@/components/shared/ThreeBadgeAnchor'

interface ReviewQueueItem {
  id: string
  module: string
  title: string | null
  body: string
  authority_class: string
  risk_tier: string
  review_status: string
  safety_label: string
  conflict_flags: unknown[]
  runtime_eligible: boolean
  created_at: string
  reviewer_email: string | null
}

interface Props {
  plantId: string
  initialItems: ReviewQueueItem[]
}

type ActionKind = 'accept' | 'reject' | 'request-sb' | 'mark-reviewed-for-plant-use'

interface ActionConfig {
  label: string
  change_type: 'review_status' | 'safety_label' | 'feed_mode'
  to_value: string
  promptHint: string
}

const ACTIONS: Record<ActionKind, ActionConfig> = {
  accept: {
    label: 'Accept',
    change_type: 'review_status',
    to_value: 'reviewed-accept',
    promptHint: 'Why is this rule acceptable? (audit log)',
  },
  reject: {
    label: 'Reject',
    change_type: 'review_status',
    to_value: 'reviewed-reject',
    promptHint: 'Why is this rule rejected? (audit log)',
  },
  'request-sb': {
    label: 'Request SB review',
    change_type: 'feed_mode',
    to_value: 'review-candidate',
    promptHint: 'What needs SB review? (audit log)',
  },
  'mark-reviewed-for-plant-use': {
    label: 'Mark reviewed for plant use',
    change_type: 'safety_label',
    to_value: 'reviewed_for_plant_use',
    promptHint: 'Why is this safe for plant use? (audit log)',
  },
}

export function SupervisorReviewClient({ plantId, initialItems }: Props) {
  const router = useRouter()
  const [items, setItems] = useState<ReviewQueueItem[]>(initialItems)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  async function performAction(itemId: string, kind: ActionKind) {
    const action = ACTIONS[kind]
    const reason = window.prompt(action.promptHint)
    if (reason === null) return // user cancelled
    if (!reason.trim()) {
      setError('Reason required for audit log')
      return
    }

    setBusyId(itemId)
    setError(null)

    try {
      const res = await fetch(`/api/spottingboard/items/${itemId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plant_id: plantId,
          change_type: action.change_type,
          to_value: action.to_value,
          reason: reason.trim(),
        }),
      })
      const json = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok || json.ok !== true) {
        setError(json.error ?? 'unknown_error')
        setBusyId(null)
        return
      }

      // Accept is a two-step trust decision: first mark review accepted, then
      // explicitly mark reviewed-for-plant-use. Keep the item visible so the
      // second button becomes reachable. Other actions leave the active queue.
      if (kind === 'accept') {
        setItems((prev) =>
          prev.map((it) =>
            it.id === itemId ? { ...it, review_status: 'reviewed-accept' } : it,
          ),
        )
      } else {
        setItems((prev) => prev.filter((it) => it.id !== itemId))
      }
      startTransition(() => router.refresh())
    } catch (err) {
      console.error('[SupervisorReviewClient] action failed', err)
      setError('network_error')
    } finally {
      setBusyId(null)
    }
  }

  if (items.length === 0) {
    return (
      <div className="sb-stub-card">
        <h2>Queue is clear</h2>
        <p>No unreviewed or in-review items. Captured rules will appear here for your review.</p>
      </div>
    )
  }

  return (
    <>
      {error && (
        <div className="sb-form-error" role="alert">
          {error === 'role_insufficient'
            ? 'You need owner or operator role to take review actions.'
            : error === 'not_a_plant_member'
              ? "You're not a member of this plant."
              : `Action failed: ${error}`}
        </div>
      )}

      <ul className="sb-item-list">
        {items.map((item) => {
          // Show "mark reviewed for plant use" only when an accepted row is
          // still parked at the default safety_label. Already implies not
          // unsafe_do_not_use because the values are mutually exclusive.
          const showMarkReviewed =
            item.review_status === 'reviewed-accept' &&
            item.safety_label === 'needs_source_review'

          return (
            <li key={item.id} className="sb-item">
              <div className="sb-item-head">
                <h2 className="sb-item-title">{item.title ?? '(untitled)'}</h2>
                <ThreeBadgeAnchor
                  authorityClass={item.authority_class as AuthorityClass}
                  riskTier={item.risk_tier as RiskTier}
                  reviewStatus={item.review_status as ReviewStatus}
                  size="sm"
                />
              </div>
              <p className="sb-item-summary">{item.body}</p>
              <p className="sb-item-meta">
                <span className="sb-item-module">{item.module}</span>
                {' · '}
                <span>safety: {item.safety_label}</span>
                {item.runtime_eligible && (
                  <>
                    {' · '}
                    <span className="sb-runtime-pill" data-state="connected">runtime-eligible</span>
                  </>
                )}
              </p>

              {(item.conflict_flags ?? []).length > 0 && (
                <div className="sb-item-conflict">
                  <span className="sb-conflict-label">Conflict flags present</span>
                  <span className="sb-conflict-note">
                    — runtime_eligible auto-flips to false on any conflict_flags change.
                  </span>
                </div>
              )}

              <div className="sb-item-actions">
                <button
                  type="button"
                  className="sb-action sb-action-accept"
                  disabled={busyId === item.id}
                  onClick={() => performAction(item.id, 'accept')}
                >
                  Accept
                </button>
                <button
                  type="button"
                  className="sb-action sb-action-reject"
                  disabled={busyId === item.id}
                  onClick={() => performAction(item.id, 'reject')}
                >
                  Reject
                </button>
                <button
                  type="button"
                  className="sb-action sb-action-escalate"
                  disabled={busyId === item.id}
                  onClick={() => performAction(item.id, 'request-sb')}
                >
                  Request SB review
                </button>
                {showMarkReviewed && (
                  <button
                    type="button"
                    className="sb-action sb-action-promote"
                    disabled={busyId === item.id}
                    onClick={() => performAction(item.id, 'mark-reviewed-for-plant-use')}
                  >
                    Mark reviewed for plant use
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </>
  )
}
