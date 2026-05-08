'use client'

// app/spottingboard/(workbench)/intake/IntakeChemistryRuleForm.tsx — TASK-164.
//
// Capture Coach v1 (Atlas msg 1326 + 1345): live classifier feedback while
// typing, live governance preview, post-save "why this landed here"
// explanation. No new DDL. Reuses TASK-160 classifier + SB unsafe-patterns.
//
// What changed from TASK-158/163:
//   - Inputs are now controlled (state-bound) so the coach can run on change
//   - 300ms debounced classifier run via useDebouncedValue + useMemo
//   - Live coach panel shows pattern matches, required_display copy, suggested action
//   - Live governance preview shows what the row will save as (badges + safety pill)
//   - Post-save success state renders governance_applied + classifier from the
//     TASK-160 API response shape (was hardcoded defaults_applied)

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { deriveCoachPanel, type CoachPanel } from '@/lib/spottingboard/capture-coach'
import type { PatternMatch } from '@/lib/spottingboard/classifier'

interface Props {
  plantId: string
}

interface CaptureResponse {
  ok: true
  item_id: string
  governance_applied: {
    authority_class: string
    feed_mode: string
    review_status: string
    safety_label: string
    risk_tier: string
    runtime_eligible: boolean
    promotion_status: string
  }
  classifier: {
    hard_block: boolean
    matches: PatternMatch[]
    pattern_config_version: string
  }
}

interface ErrorResponse {
  ok?: false
  error: string
  field?: string
}

type Status = 'idle' | 'submitting' | 'success' | 'error'

// ──────────────────────────────────────────────────────────────────────────────
// Debounce hook (300ms)
// ──────────────────────────────────────────────────────────────────────────────
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])
  return debounced
}

function parseList(s: string): string[] {
  return s
    .split(',')
    .map((x) => x.trim())
    .filter((x) => x.length > 0)
}

// ──────────────────────────────────────────────────────────────────────────────
// Form
// ──────────────────────────────────────────────────────────────────────────────
export function IntakeChemistryRuleForm({ plantId }: Props) {
  const router = useRouter()

  // Controlled inputs so the coach can run on change
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [stainScopeStr, setStainScopeStr] = useState('')
  const [fabricScopeStr, setFabricScopeStr] = useState('')
  const [chemistryScopeStr, setChemistryScopeStr] = useState('')

  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [errorField, setErrorField] = useState<string | null>(null)
  const [savedResponse, setSavedResponse] = useState<CaptureResponse | null>(null)

  // Debounce the classifier inputs by 300ms so we don't re-run on every keystroke
  const debouncedTitle = useDebouncedValue(title, 300)
  const debouncedBody = useDebouncedValue(body, 300)
  const debouncedStain = useDebouncedValue(stainScopeStr, 300)
  const debouncedFabric = useDebouncedValue(fabricScopeStr, 300)
  const debouncedChemistry = useDebouncedValue(chemistryScopeStr, 300)

  const coach: CoachPanel = useMemo(
    () =>
      deriveCoachPanel({
        title: debouncedTitle,
        body: debouncedBody,
        stain_scope: parseList(debouncedStain),
        fabric_scope: parseList(debouncedFabric),
        chemistry_scope: parseList(debouncedChemistry),
      }),
    [debouncedTitle, debouncedBody, debouncedStain, debouncedFabric, debouncedChemistry],
  )

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setErrorField(null)
    setStatus('submitting')

    const payload = {
      plant_id: plantId,
      module: 'chemistry_rule',
      title: title.trim(),
      body: body.trim(),
      stain_scope: parseList(stainScopeStr),
      fabric_scope: parseList(fabricScopeStr),
      chemistry_scope: parseList(chemistryScopeStr),
    }

    try {
      const res = await fetch('/api/spottingboard/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = (await res.json()) as CaptureResponse | ErrorResponse

      if (!res.ok || !('ok' in json) || json.ok !== true) {
        const err = json as ErrorResponse
        setError(err.error ?? 'unknown_error')
        setErrorField(err.field ?? null)
        setStatus('error')
        return
      }

      setSavedResponse(json)
      setStatus('success')
      // Reset inputs so the operator can capture another
      setTitle('')
      setBody('')
      setStainScopeStr('')
      setFabricScopeStr('')
      setChemistryScopeStr('')
    } catch (err) {
      console.error('[IntakeChemistryRuleForm] submit failed', err)
      setError('network_error')
      setStatus('error')
    }
  }

  function goToLibrary() {
    router.push('/spottingboard/library')
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <form className="sb-capture-form" onSubmit={handleSubmit} aria-label="Chemistry rule capture">
      <p className="sb-form-help">
        Every saved rule starts <strong>unreviewed · plant-local · needs source review · requires supervisor</strong>.
        Nothing becomes runtime guidance without supervisor + Stain Brain review.
      </p>

      <label className="sb-form-row">
        <span className="sb-form-label">Title</span>
        <input
          name="title"
          type="text"
          maxLength={200}
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Never use chlorine bleach on wool"
          aria-invalid={errorField === 'title'}
        />
      </label>

      <label className="sb-form-row">
        <span className="sb-form-label">Rule body</span>
        <textarea
          name="body"
          rows={5}
          maxLength={5000}
          required
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="State the chemistry rule. Include agent/concentration/temperature/contact time when relevant."
          aria-invalid={errorField === 'body'}
        />
      </label>

      <fieldset className="sb-form-fieldset">
        <legend>Scope (at least one of stain / fabric / chemistry is required)</legend>

        <label className="sb-form-row">
          <span className="sb-form-label">Stain scope</span>
          <input
            name="stain_scope"
            type="text"
            value={stainScopeStr}
            onChange={(e) => setStainScopeStr(e.target.value)}
            placeholder="comma-separated, e.g. coffee, tea, red wine"
            aria-invalid={errorField === 'scope'}
          />
        </label>

        <label className="sb-form-row">
          <span className="sb-form-label">Fabric scope</span>
          <input
            name="fabric_scope"
            type="text"
            value={fabricScopeStr}
            onChange={(e) => setFabricScopeStr(e.target.value)}
            placeholder="comma-separated, e.g. wool, silk, cashmere"
            aria-invalid={errorField === 'scope'}
          />
        </label>

        <label className="sb-form-row">
          <span className="sb-form-label">Chemistry scope</span>
          <input
            name="chemistry_scope"
            type="text"
            value={chemistryScopeStr}
            onChange={(e) => setChemistryScopeStr(e.target.value)}
            placeholder="comma-separated, e.g. chlorine bleach, oxygen bleach, perc"
            aria-invalid={errorField === 'scope'}
          />
        </label>
      </fieldset>

      {/* ── Live Capture Coach panel ─────────────────────────────────────── */}
      <CoachPanelView panel={coach} />

      {/* ── Server-side submission errors ─────────────────────────────────── */}
      {status === 'error' && error && (
        <div className="sb-form-error" role="alert">
          {error === 'scope_required'
            ? 'Add at least one scope (stain, fabric, or chemistry) before saving.'
            : error === 'role_insufficient'
              ? 'You need owner or operator role to save chemistry rules.'
              : error === 'not_a_plant_member'
                ? "You're not a member of this plant."
                : `Save failed: ${error}`}
        </div>
      )}

      {/* ── Post-save explanation ─────────────────────────────────────────── */}
      {status === 'success' && savedResponse && (
        <PostSaveExplanation response={savedResponse} onViewLibrary={goToLibrary} />
      )}

      <div className="sb-form-actions">
        <button type="submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Saving…' : 'Save chemistry rule'}
        </button>
      </div>
    </form>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Coach panel rendering — pure presentation
// ──────────────────────────────────────────────────────────────────────────────
function CoachPanelView({ panel }: { panel: CoachPanel }) {
  if (panel.level === 'none') {
    return (
      <div className="sb-coach sb-coach-idle" role="status" aria-live="polite">
        <p className="sb-coach-headline">{panel.headline}</p>
      </div>
    )
  }

  return (
    <div className={`sb-coach sb-coach-${panel.level}`} role="status" aria-live="polite">
      <p className="sb-coach-headline">
        <strong>{panel.headline}</strong>
      </p>
      {panel.body && <p className="sb-coach-body">{panel.body}</p>}

      {panel.matches.length > 0 && (
        <ul className="sb-coach-matches">
          {panel.matches.map((m) => (
            <li key={m.pattern_id} className="sb-coach-match">
              <span className="sb-coach-match-pattern">{m.pattern_id}</span>
              <span className="sb-coach-match-classification"> · {m.classification}</span>
              {m.matched_terms.length > 0 && (
                <span className="sb-coach-match-terms">
                  {' · matched: '}
                  {m.matched_terms.slice(0, 5).join(', ')}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {panel.suggested_action && (
        <p className="sb-coach-action">
          <strong>What to do:</strong> {panel.suggested_action}
        </p>
      )}

      <div className="sb-coach-preview">
        <span className="sb-coach-preview-label">Will save as:</span>
        <span className="sb-coach-preview-badge sb-coach-preview-authority">
          authority: {panel.preview_governance.authority_class}
        </span>
        <span className="sb-coach-preview-badge sb-coach-preview-risk">
          risk: {panel.preview_governance.risk_tier}
        </span>
        <span className="sb-coach-preview-badge sb-coach-preview-review">
          review: {panel.preview_governance.review_status}
        </span>
        <span className={`sb-coach-preview-badge sb-coach-preview-safety sb-coach-safety-${panel.preview_governance.safety_label}`}>
          safety: {panel.preview_governance.safety_label}
        </span>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Post-save explanation — uses TASK-160 governance_applied + classifier
// ──────────────────────────────────────────────────────────────────────────────
function PostSaveExplanation({
  response,
  onViewLibrary,
}: {
  response: CaptureResponse
  onViewLibrary: () => void
}) {
  const ga = response.governance_applied
  const isUnsafe = ga.safety_label === 'unsafe_do_not_use'
  const isClaim = ga.risk_tier === 'claim-sensitive'
  const matchCount = response.classifier.matches.length

  let headline = 'Saved.'
  if (isUnsafe) {
    headline = 'Saved as quarantined (unsafe — do not use).'
  } else if (isClaim) {
    headline = 'Saved with claim-sensitive flag.'
  } else if (matchCount > 0) {
    headline = 'Saved with supervisor review flag.'
  } else {
    headline = 'Saved — pending supervisor review.'
  }

  return (
    <div className="sb-form-success" role="status">
      <p>
        <strong>{headline}</strong>
      </p>
      <p>
        Item ID: <code>{response.item_id}</code>
      </p>
      <p className="sb-form-success-detail">
        Governance applied: authority <code>{ga.authority_class}</code> · risk{' '}
        <code>{ga.risk_tier}</code> · review <code>{ga.review_status}</code> · safety{' '}
        <code>{ga.safety_label}</code> · runtime-eligible <code>{String(ga.runtime_eligible)}</code>
      </p>
      {matchCount > 0 && (
        <details className="sb-form-success-classifier">
          <summary>Why this landed here ({matchCount} classifier match{matchCount === 1 ? '' : 'es'})</summary>
          <ul>
            {response.classifier.matches.map((m) => (
              <li key={m.pattern_id}>
                <strong>{m.pattern_id}</strong> ({m.classification}) — {m.reason}
              </li>
            ))}
          </ul>
          <p className="sb-form-success-version">
            Pattern config version: {response.classifier.pattern_config_version}
          </p>
        </details>
      )}
      <button type="button" className="sb-link-button" onClick={onViewLibrary}>
        View in Brain Library
      </button>
    </div>
  )
}
