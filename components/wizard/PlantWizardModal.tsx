'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

/**
 * TASK-023 Phase B — Plant Profile Wizard
 *
 * 5-step modal that captures the operational reality of a plant so subsequent
 * solve responses can be tuned to what the operator can actually do today.
 *
 * Steps:
 *   0. Welcome      — name the plant
 *   1. Solvent      — what dry-cleaning chemistry the plant uses
 *   2. Board        — what spotting equipment is available
 *   3. Skill level  — primary spotter's experience
 *   4. Bleach       — is bleach allowed in this plant
 *   5. House rules  — free-text operator notes
 *   6. Reveal       — show what we'll tune + commit
 *
 * Wired to /api/plant POST (create plant on first save) and PATCH (update
 * answers as the user progresses). On final commit, sets wizard_completed=true.
 */

type Solvent = 'perc' | 'hydrocarbon' | 'green-earth' | 'solvon-k4' | 'sensene' | 'intense' | 'co2' | 'wet' | 'other'
type Board = 'spotting-board-steam-vacuum' | 'spotting-board-basic' | 'no-board'
type Skill = 'beginner' | 'intermediate' | 'advanced'

interface WizardState {
  plantId: string | null
  name: string
  solvents: Solvent[]            // multi-select (TASK-023 Phase C)
  solventOther: string           // free text when 'other' is selected
  board: Board | null
  skill: Skill | null
  bleachAllowed: boolean | null
  houseRules: string
}

// Existing plant data shape from /api/plant GET — used to pre-fill the wizard
// when an operator re-opens it from /profile to edit (TASK-023 Phase D).
export interface ExistingPlant {
  id: string
  name: string
  solvents?: string[] | null
  solvent_other?: string | null
  board?: string | null
  skill_level?: string | null
  bleach_allowed?: boolean | null
  house_rules?: string | null
}

interface PlantWizardModalProps {
  open: boolean
  onClose: () => void
  onComplete: () => void
  // If provided, the wizard pre-fills state from this plant and skips the
  // POST on step 0 advance (PATCHes the name change instead). Used for the
  // /profile re-entry flow where the plant already exists.
  existingPlant?: ExistingPlant | null
}

const TOTAL_STEPS = 7

export default function PlantWizardModal({ open, onClose, onComplete, existingPlant }: PlantWizardModalProps) {
  const { t } = useLanguage()
  const [step, setStep] = useState(0)
  const [state, setState] = useState<WizardState>(() => buildInitialState(existingPlant))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Re-sync state when a different plant is passed in (e.g. user opens wizard
  // for a different account, or the plant was just refreshed).
  useEffect(() => {
    if (existingPlant?.id) {
      setState(buildInitialState(existingPlant))
      setStep(0)
    }
  }, [existingPlant?.id])

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  // ── API helpers ────────────────────────────────────────────────────────
  const ensurePlantExists = useCallback(async (name: string): Promise<string | null> => {
    const res = await fetch('/api/plant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (res.status === 409) {
      // User already has a plant — fetch it
      const get = await fetch('/api/plant')
      if (!get.ok) return null
      const data = await get.json()
      return data.plant?.id ?? null
    }
    if (!res.ok) return null
    const data = await res.json()
    return data.plant?.id ?? null
  }, [])

  const patchPlant = useCallback(async (updates: Record<string, unknown>): Promise<boolean> => {
    const res = await fetch('/api/plant', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    return res.ok
  }, [])

  // ── Step navigation ────────────────────────────────────────────────────
  const next = useCallback(async () => {
    setError('')
    setSaving(true)
    try {
      // Step 0 → create plant on first advance OR PATCH name if editing existing
      if (step === 0) {
        const name = state.name.trim()
        if (!name) { setError(t('wizardNameRequired')); setSaving(false); return }
        if (existingPlant?.id) {
          // Editing existing plant: PATCH the name only if changed.
          if (name !== existingPlant.name) {
            const ok = await patchPlant({ name })
            if (!ok) { setError(t('wizardSaveFailed')); setSaving(false); return }
          }
          // plantId already set from initial state — no POST needed.
        } else {
          const id = await ensurePlantExists(name)
          if (!id) { setError(t('wizardCreateFailed')); setSaving(false); return }
          setState(s => ({ ...s, plantId: id }))
        }
      }

      // Per-step PATCH so progress is persisted even if user closes mid-wizard
      const updates: Record<string, unknown> = {}
      if (step === 1 && state.solvents.length > 0) {
        updates.solvents = state.solvents
        if (state.solvents.includes('other')) {
          updates.solvent_other = state.solventOther.trim()
        }
      }
      if (step === 2 && state.board) updates.board = state.board
      if (step === 3 && state.skill) updates.skill_level = state.skill
      if (step === 4 && state.bleachAllowed !== null) updates.bleach_allowed = state.bleachAllowed
      if (step === 5) updates.house_rules = state.houseRules.trim()

      if (Object.keys(updates).length > 0) {
        const ok = await patchPlant(updates)
        if (!ok) { setError(t('wizardSaveFailed')); setSaving(false); return }
      }

      // Step 6 (reveal) → final commit
      if (step === 6) {
        const ok = await patchPlant({ wizard_completed: true })
        if (!ok) { setError(t('wizardSaveFailed')); setSaving(false); return }
        setSaving(false)
        onComplete()
        return
      }

      setStep(s => Math.min(s + 1, TOTAL_STEPS - 1))
    } catch {
      setError(t('wizardSaveFailed'))
    } finally {
      setSaving(false)
    }
  }, [step, state, ensurePlantExists, patchPlant, onComplete, t])

  const back = useCallback(() => {
    setError('')
    setStep(s => Math.max(s - 1, 0))
  }, [])

  if (!open) return null

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
        style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            {t('wizardTitle')} — {step + 1}/{TOTAL_STEPS}
          </span>
          <button onClick={onClose} aria-label={t('done')}
            className="text-lg w-8 h-8 rounded-full flex items-center justify-center"
            style={{ color: 'var(--text-secondary)', background: 'var(--surface-2)' }}>
            &times;
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1" style={{ background: 'var(--surface-2)' }}>
          <div className="h-full transition-all duration-300"
            style={{ background: '#22c55e', width: `${((step + 1) / TOTAL_STEPS) * 100}%` }} />
        </div>

        {/* Step body */}
        <div className="px-5 py-6 space-y-4">
          {step === 0 && <StepWelcome state={state} setState={setState} t={t} />}
          {step === 1 && <StepSolvent state={state} setState={setState} t={t} />}
          {step === 2 && <StepBoard state={state} setState={setState} t={t} />}
          {step === 3 && <StepSkill state={state} setState={setState} t={t} />}
          {step === 4 && <StepBleach state={state} setState={setState} t={t} />}
          {step === 5 && <StepHouseRules state={state} setState={setState} t={t} />}
          {step === 6 && <StepReveal state={state} t={t} />}

          {error && (
            <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-5 py-4"
          style={{ borderTop: '1px solid var(--border)' }}>
          {step > 0 && (
            <button onClick={back} disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ color: 'var(--text-secondary)', background: 'var(--surface-2)' }}>
              {t('back')}
            </button>
          )}
          <button onClick={next} disabled={saving || !canAdvance(step, state)}
            className="flex-1 min-h-[44px] rounded-lg text-sm font-semibold transition-opacity"
            style={{
              background: 'rgba(34,197,94,0.12)',
              color: '#22c55e',
              border: '1px solid rgba(34,197,94,0.3)',
              opacity: (saving || !canAdvance(step, state)) ? 0.5 : 1,
            }}>
            {saving ? '…' : (step === TOTAL_STEPS - 1 ? t('wizardFinish') : t('wizardNext'))}
          </button>
        </div>
      </div>
    </div>
  )
}

// Build initial wizard state from an existing plant (Phase D re-edit) or
// from defaults (first-time onboarding).
function buildInitialState(existing: ExistingPlant | null | undefined): WizardState {
  if (!existing) {
    return {
      plantId: null,
      name: '',
      solvents: [],
      solventOther: '',
      board: null,
      skill: null,
      bleachAllowed: null,
      houseRules: '',
    }
  }
  // Filter solvents to known enum values; unknown slugs (e.g. legacy or future)
  // are dropped from the picker but stay in DB until user re-saves.
  const KNOWN_SOLVENTS: Solvent[] = ['perc', 'hydrocarbon', 'green-earth', 'solvon-k4', 'sensene', 'intense', 'co2', 'wet', 'other']
  const validSolvents = (existing.solvents ?? []).filter((s): s is Solvent => KNOWN_SOLVENTS.includes(s as Solvent))
  return {
    plantId: existing.id,
    name: existing.name ?? '',
    solvents: validSolvents,
    solventOther: existing.solvent_other ?? '',
    board: (existing.board as Board) ?? null,
    skill: (existing.skill_level as Skill) ?? null,
    bleachAllowed: typeof existing.bleach_allowed === 'boolean' ? existing.bleach_allowed : null,
    houseRules: existing.house_rules ?? '',
  }
}

function canAdvance(step: number, state: WizardState): boolean {
  switch (step) {
    case 0: return state.name.trim().length > 0
    case 1: {
      if (state.solvents.length === 0) return false
      if (state.solvents.includes('other') && state.solventOther.trim().length === 0) return false
      return true
    }
    case 2: return state.board !== null
    case 3: return state.skill !== null
    case 4: return state.bleachAllowed !== null
    case 5: return true   // house rules optional
    case 6: return true
    default: return false
  }
}

// ─── Step components (inline to keep this single-file) ────────────────────

interface StepProps {
  state: WizardState
  setState: React.Dispatch<React.SetStateAction<WizardState>>
  t: (key: string) => string
}

function StepWelcome({ state, setState, t }: StepProps) {
  return (
    <>
      <h2 className="text-lg font-bold">{t('wizardWelcomeTitle')}</h2>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('wizardWelcomeBody')}</p>
      <input type="text" value={state.name}
        onChange={e => setState(s => ({ ...s, name: e.target.value }))}
        placeholder={t('wizardNamePlaceholder')}
        className="w-full px-3 py-2 rounded-lg text-base"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
    </>
  )
}

function StepSolvent({ state, setState, t }: StepProps) {
  const opts: { v: Solvent; label: string; reaction: string }[] = [
    { v: 'perc', label: t('wizardSolventPerc'), reaction: t('wizardSolventPercReaction') },
    { v: 'hydrocarbon', label: t('wizardSolventHydrocarbon'), reaction: t('wizardSolventHydrocarbonReaction') },
    { v: 'green-earth', label: t('wizardSolventGreenEarth'), reaction: t('wizardSolventGreenEarthReaction') },
    { v: 'solvon-k4', label: t('wizardSolventSolvonK4'), reaction: t('wizardSolventSolvonK4Reaction') },
    { v: 'sensene', label: t('wizardSolventSensene'), reaction: t('wizardSolventSenseneReaction') },
    { v: 'intense', label: t('wizardSolventIntense'), reaction: t('wizardSolventIntenseReaction') },
    { v: 'co2', label: t('wizardSolventCO2'), reaction: t('wizardSolventCO2Reaction') },
    { v: 'wet', label: t('wizardSolventWet'), reaction: t('wizardSolventWetReaction') },
    { v: 'other', label: t('wizardSolventOther'), reaction: '' },
  ]
  const toggle = (v: Solvent) => {
    setState(s => ({
      ...s,
      solvents: s.solvents.includes(v)
        ? s.solvents.filter(x => x !== v)
        : [...s.solvents, v],
    }))
  }
  // Show all reactions for currently-selected solvents (concat).
  const reactionLines = opts
    .filter(o => state.solvents.includes(o.v) && o.reaction)
    .map(o => o.reaction)

  return (
    <>
      <h2 className="text-lg font-bold">{t('wizardSolventTitle')}</h2>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('wizardSolventBodyMulti')}</p>
      <div className="grid grid-cols-2 gap-2">
        {opts.map(o => (
          <ChoiceChip key={o.v} active={state.solvents.includes(o.v)} label={o.label}
            onClick={() => toggle(o.v)} />
        ))}
      </div>
      {state.solvents.includes('other') && (
        <input
          type="text"
          value={state.solventOther}
          onChange={e => setState(s => ({ ...s, solventOther: e.target.value }))}
          placeholder={t('wizardSolventOtherPlaceholder')}
          className="w-full px-3 py-2 rounded-lg text-sm mt-2"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
        />
      )}
      {reactionLines.map((line, i) => <Reaction key={i} text={line} />)}
    </>
  )
}

function StepBoard({ state, setState, t }: StepProps) {
  const opts: { v: Board; label: string; reaction: string }[] = [
    { v: 'spotting-board-steam-vacuum', label: t('wizardBoardFull'), reaction: t('wizardBoardFullReaction') },
    { v: 'spotting-board-basic', label: t('wizardBoardBasic'), reaction: t('wizardBoardBasicReaction') },
    { v: 'no-board', label: t('wizardBoardNone'), reaction: t('wizardBoardNoneReaction') },
  ]
  const reaction = opts.find(o => o.v === state.board)?.reaction || ''
  return (
    <>
      <h2 className="text-lg font-bold">{t('wizardBoardTitle')}</h2>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('wizardBoardBody')}</p>
      <div className="grid grid-cols-1 gap-2">
        {opts.map(o => (
          <ChoiceChip key={o.v} active={state.board === o.v} label={o.label}
            onClick={() => setState(s => ({ ...s, board: o.v }))} />
        ))}
      </div>
      {reaction && <Reaction text={reaction} />}
    </>
  )
}

function StepSkill({ state, setState, t }: StepProps) {
  const opts: { v: Skill; label: string; reaction: string }[] = [
    { v: 'beginner', label: t('wizardSkillBeginner'), reaction: t('wizardSkillBeginnerReaction') },
    { v: 'intermediate', label: t('wizardSkillIntermediate'), reaction: t('wizardSkillIntermediateReaction') },
    { v: 'advanced', label: t('wizardSkillAdvanced'), reaction: t('wizardSkillAdvancedReaction') },
  ]
  const reaction = opts.find(o => o.v === state.skill)?.reaction || ''
  return (
    <>
      <h2 className="text-lg font-bold">{t('wizardSkillTitle')}</h2>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('wizardSkillBody')}</p>
      <div className="grid grid-cols-1 gap-2">
        {opts.map(o => (
          <ChoiceChip key={o.v} active={state.skill === o.v} label={o.label}
            onClick={() => setState(s => ({ ...s, skill: o.v }))} />
        ))}
      </div>
      {reaction && <Reaction text={reaction} />}
    </>
  )
}

function StepBleach({ state, setState, t }: StepProps) {
  const reaction = state.bleachAllowed === true
    ? t('wizardBleachYesReaction')
    : state.bleachAllowed === false
      ? t('wizardBleachNoReaction')
      : ''
  return (
    <>
      <h2 className="text-lg font-bold">{t('wizardBleachTitle')}</h2>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('wizardBleachBody')}</p>
      <div className="grid grid-cols-2 gap-2">
        <ChoiceChip active={state.bleachAllowed === true} label={t('wizardBleachYes')}
          onClick={() => setState(s => ({ ...s, bleachAllowed: true }))} />
        <ChoiceChip active={state.bleachAllowed === false} label={t('wizardBleachNo')}
          onClick={() => setState(s => ({ ...s, bleachAllowed: false }))} />
      </div>
      {reaction && <Reaction text={reaction} />}
    </>
  )
}

function StepHouseRules({ state, setState, t }: StepProps) {
  return (
    <>
      <h2 className="text-lg font-bold">{t('wizardHouseRulesTitle')}</h2>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('wizardHouseRulesBody')}</p>
      <textarea value={state.houseRules} rows={5}
        onChange={e => setState(s => ({ ...s, houseRules: e.target.value }))}
        placeholder={t('wizardHouseRulesPlaceholder')}
        className="w-full px-3 py-2 rounded-lg text-sm resize-none"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('wizardHouseRulesOptional')}</p>
    </>
  )
}

function StepReveal({ state, t }: { state: WizardState; t: (k: string) => string }) {
  return (
    <>
      <h2 className="text-lg font-bold">{t('wizardRevealTitle')}</h2>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('wizardRevealBody')}</p>
      <div className="rounded-lg p-3 space-y-1.5 text-sm"
        style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
        <div><strong>{t('wizardSummaryName')}:</strong> {state.name || '—'}</div>
        <div><strong>{t('wizardSummarySolvent')}:</strong> {state.solvents.length > 0 ? state.solvents.join(', ') + (state.solventOther ? ` (${state.solventOther})` : '') : '—'}</div>
        <div><strong>{t('wizardSummaryBoard')}:</strong> {state.board ?? '—'}</div>
        <div><strong>{t('wizardSummarySkill')}:</strong> {state.skill ?? '—'}</div>
        <div><strong>{t('wizardSummaryBleach')}:</strong> {state.bleachAllowed === null ? '—' : state.bleachAllowed ? t('wizardBleachYes') : t('wizardBleachNo')}</div>
        {state.houseRules && <div><strong>{t('wizardSummaryHouseRules')}:</strong> {state.houseRules}</div>}
      </div>
      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('wizardRevealFootnote')}</p>
    </>
  )
}

// ─── Shared bits ──────────────────────────────────────────────────────────

function ChoiceChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors"
      style={{
        background: active ? 'rgba(34,197,94,0.12)' : 'var(--surface)',
        border: `1px solid ${active ? 'rgba(34,197,94,0.4)' : 'var(--border)'}`,
        color: active ? '#22c55e' : 'var(--text)',
        fontWeight: active ? 600 : 400,
      }}>
      {label}
    </button>
  )
}

function Reaction({ text }: { text: string }) {
  return (
    <div className="rounded-lg p-3 text-sm leading-relaxed"
      style={{
        background: 'rgba(129,140,248,0.06)',
        border: '1px solid rgba(129,140,248,0.2)',
        color: 'var(--text)',
      }}>
      💡 {text}
    </div>
  )
}
