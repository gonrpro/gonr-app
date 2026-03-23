'use client'

import { useState } from 'react'

const STAINS = [
  'Red Wine', 'Coffee (Black)', 'Coffee with Cream', 'Tea', 'Beer',
  'Blood', 'Urine', 'Sweat', 'Egg', 'Milk', 'Vomit', 'Grass',
  'Cooking Oil', 'Butter', 'Motor Oil', 'Lipstick', 'Cosmetics',
  'Chocolate', 'Mustard', 'Curry', 'Rust', 'Ink (Ballpoint)', 'Permanent Marker',
  'Hair Dye', 'Nail Polish', 'Mildew', 'Mud', 'Collar Ring', 'Wax',
]

const FIBERS = [
  'Cotton (White)', 'Cotton (Color)', 'Silk', 'Wool', 'Cashmere',
  'Linen', 'Polyester', 'Nylon', 'Rayon', 'Denim',
  'Leather', 'Suede', 'Upholstery', 'Carpet',
]

const AGENTS = [
  'Protein', 'Tannin', 'NSD', 'POG', 'H₂O₂ 3%', 'H₂O₂ 6%',
  'Acetic Acid (diluted)', 'IPA', 'Rust Remover', 'Leveling Agent',
  'Reducing Agent', 'Ammonia (diluted)', 'Cold Water', 'Steam',
  'Dry Cleaning Solvent', 'Wet Spotter', 'Other',
]

interface Step {
  agent: string
  instruction: string
  dwellTime: string
}

export default function DanBuilderPage() {
  const [stain, setStain] = useState('')
  const [fiber, setFiber] = useState('')
  const [steps, setSteps] = useState<Step[]>([
    { agent: '', instruction: '', dwellTime: '' },
    { agent: '', instruction: '', dwellTime: '' },
    { agent: '', instruction: '', dwellTime: '' },
  ])
  const [warnings, setWarnings] = useState('')
  const [neverDo, setNeverDo] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  function addStep() {
    setSteps([...steps, { agent: '', instruction: '', dwellTime: '' }])
  }

  function removeStep(i: number) {
    setSteps(steps.filter((_, idx) => idx !== i))
  }

  function updateStep(i: number, field: keyof Step, value: string) {
    const updated = [...steps]
    updated[i] = { ...updated[i], [field]: value }
    setSteps(updated)
  }

  async function handleSave() {
    if (!stain || !fiber) {
      setError('Select a stain and fiber first')
      return
    }
    const filledSteps = steps.filter(s => s.agent && s.instruction)
    if (filledSteps.length < 2) {
      setError('Add at least 2 steps')
      return
    }

    setSaving(true)
    setError('')

    const card = {
      stain,
      fiber,
      steps: filledSteps,
      warnings: warnings.split('\n').filter(Boolean),
      neverDo: neverDo.split('\n').filter(Boolean),
      source: 'dan-eisen',
      submittedAt: new Date().toISOString(),
    }

    try {
      const res = await fetch('/api/dan-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaved(true)
      setStain('')
      setFiber('')
      setSteps([
        { agent: '', instruction: '', dwellTime: '' },
        { agent: '', instruction: '', dwellTime: '' },
        { agent: '', instruction: '', dwellTime: '' },
      ])
      setWarnings('')
      setNeverDo('')
    } catch {
      setError('Save failed — try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Dan's Protocol Builder</h1>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Select the stain and fiber, fill in your steps. AI handles the rest.
        </p>
      </div>

      {saved && (
        <div className="rounded-xl p-4 text-sm font-medium" style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--accent)', border: '1px solid rgba(34,197,94,0.3)' }}>
          ✓ Protocol saved. It'll be live in the app after review.
        </div>
      )}

      {/* Stain + Fiber */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Stain</label>
          <select
            value={stain}
            onChange={e => setStain(e.target.value)}
            className="input w-full"
          >
            <option value="">Select stain...</option>
            {STAINS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Fiber</label>
          <select
            value={fiber}
            onChange={e => setFiber(e.target.value)}
            className="input w-full"
          >
            <option value="">Select fiber...</option>
            {FIBERS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>

      {/* Protocol Steps */}
      <div className="space-y-3">
        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Protocol Steps</label>
        {steps.map((step, i) => (
          <div key={i} className="rounded-xl p-4 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)' }}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>Step {i + 1}</span>
              {steps.length > 2 && (
                <button onClick={() => removeStep(i)} className="text-xs" style={{ color: 'var(--text-secondary)' }}>Remove</button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={step.agent}
                onChange={e => updateStep(i, 'agent', e.target.value)}
                className="input text-sm"
              >
                <option value="">Agent...</option>
                {AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <input
                type="text"
                placeholder="Dwell time (e.g. 5 min)"
                value={step.dwellTime}
                onChange={e => updateStep(i, 'dwellTime', e.target.value)}
                className="input text-sm"
              />
            </div>
            <textarea
              placeholder="What to do — be specific. How to apply, what to watch for..."
              value={step.instruction}
              onChange={e => updateStep(i, 'instruction', e.target.value)}
              rows={2}
              className="input w-full text-sm resize-none"
            />
          </div>
        ))}
        <button
          onClick={addStep}
          className="w-full py-2 rounded-xl text-sm font-medium"
          style={{ background: 'var(--surface-2)', border: '1px dashed var(--border-strong)', color: 'var(--text-secondary)' }}
        >
          + Add Step
        </button>
      </div>

      {/* Warnings */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Safety Warnings <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(one per line)</span></label>
        <textarea
          placeholder="e.g. Never use hot water on protein stains&#10;Never use alkaline agents on tannin"
          value={warnings}
          onChange={e => setWarnings(e.target.value)}
          rows={3}
          className="input w-full text-sm resize-none"
        />
      </div>

      {/* Never Do */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Never Do <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(one per line)</span></label>
        <textarea
          placeholder="e.g. No hot water&#10;No bleach&#10;No machine washing"
          value={neverDo}
          onChange={e => setNeverDo(e.target.value)}
          rows={3}
          className="input w-full text-sm resize-none"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary"
      >
        {saving ? 'Saving...' : '💾 Save Protocol'}
      </button>

      <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
        AI fills in: stain chemistry, why it works, customer language, home tips, escalation. You just provide the steps.
      </p>
    </div>
  )
}
