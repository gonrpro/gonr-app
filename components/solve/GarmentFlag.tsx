'use client'

import { useState, useRef, ChangeEvent } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface GarmentFlagProps {
  initialStain?: string
  initialMaterial?: string
  solveId?: string
  onClose?: () => void
}

type StainAge = 'fresh' | 'aged' | 'set' | 'unknown'
type GarmentValue = 'low' | 'medium' | 'high' | 'luxury'

export default function GarmentFlag({
  initialStain = '',
  initialMaterial = '',
  solveId,
  onClose,
}: GarmentFlagProps) {
  useLanguage()

  // Form fields
  const [jobId, setJobId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [garmentType, setGarmentType] = useState('')
  const [material, setMaterial] = useState(initialMaterial)
  const [garmentColor, setGarmentColor] = useState('')
  const [stainDescription, setStainDescription] = useState(initialStain)
  const [stainAge, setStainAge] = useState<StainAge>('unknown')
  const [previousTreatment, setPreviousTreatment] = useState(false)
  const [preExistingDamage, setPreExistingDamage] = useState(false)
  const [garmentValue, setGarmentValue] = useState<GarmentValue>('medium')
  const [operatorNotes, setOperatorNotes] = useState('')
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null)

  // UI state
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submittedId, setSubmittedId] = useState<number | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setPhotoDataUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  function removePhoto() {
    setPhotoDataUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!garmentType.trim()) {
      setError('Garment type is required.')
      return
    }
    if (!material.trim()) {
      setError('Material / fiber is required.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/flag-garment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: jobId.trim() || null,
          customerName: customerName.trim() || null,
          garmentType: garmentType.trim(),
          material: material.trim(),
          garmentColor: garmentColor.trim() || null,
          garmentValue,
          stainDescription: stainDescription.trim() || null,
          stainAge,
          previousTreatment,
          preExistingDamage,
          operatorNotes: operatorNotes.trim() || null,
          riskLevel: 'medium',
          riskScore: 5,
          photoDataUrl: photoDataUrl || null,
          solveId: solveId || null,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Submission failed. Please try again.')
        return
      }

      setSubmittedId(json.id)
      setSuccess(true)
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  // ─── Success state ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="p-6 flex flex-col items-center text-center space-y-4">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(34,197,94,0.12)', border: '1.5px solid rgba(34,197,94,0.35)' }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div>
          <p className="text-base font-bold" style={{ color: 'var(--text)' }}>Flagged for operator review.</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Your operator will analyze this garment and provide a full assessment.
          </p>
          {submittedId && (
            <p className="text-xs mt-2 font-mono" style={{ color: 'var(--text-secondary)' }}>
              Intake #{submittedId}
            </p>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-sm font-medium mt-2 px-4 py-2 rounded-lg transition-colors"
            style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
          >
            Done
          </button>
        )}
      </div>
    )
  }

  // ─── Form ──────────────────────────────────────────────────────────────────
  const chipBase: React.CSSProperties = {
    minHeight: '36px',
    padding: '6px 14px',
    borderRadius: '999px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s',
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--text-secondary)',
  }

  const chipActive: React.CSSProperties = {
    ...chipBase,
    background: 'rgba(34,197,94,0.1)',
    borderColor: 'rgba(34,197,94,0.45)',
    color: '#22c55e',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    minHeight: '44px',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--text)',
    fontSize: '15px',
    outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: 'var(--text-secondary)',
    marginBottom: '6px',
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-5">

      {/* ── Row: Job # + Customer ── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label style={labelStyle}>Job / Ticket #</label>
          <input
            type="text"
            value={jobId}
            onChange={e => setJobId(e.target.value)}
            placeholder="Auto-generated if blank"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Customer Name</label>
          <input
            type="text"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            placeholder="Optional"
            style={inputStyle}
          />
        </div>
      </div>

      {/* ── Garment Type ── */}
      <div>
        <label style={labelStyle}>Garment Type <span style={{ color: '#ef4444' }}>*</span></label>
        <input
          type="text"
          value={garmentType}
          onChange={e => setGarmentType(e.target.value)}
          placeholder="e.g. Suit jacket, Evening gown"
          style={inputStyle}
          required
        />
      </div>

      {/* ── Row: Material + Color ── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label style={labelStyle}>Material / Fiber <span style={{ color: '#ef4444' }}>*</span></label>
          <input
            type="text"
            value={material}
            onChange={e => setMaterial(e.target.value)}
            placeholder="e.g. Wool, Silk, Acetate blend"
            style={inputStyle}
            required
          />
        </div>
        <div>
          <label style={labelStyle}>Color</label>
          <input
            type="text"
            value={garmentColor}
            onChange={e => setGarmentColor(e.target.value)}
            placeholder="e.g. Navy, Ivory"
            style={inputStyle}
          />
        </div>
      </div>

      {/* ── Stain Description ── */}
      <div>
        <label style={labelStyle}>Stain Description</label>
        <textarea
          value={stainDescription}
          onChange={e => setStainDescription(e.target.value)}
          placeholder="What's the stain, where is it, how old?"
          rows={3}
          style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
        />
      </div>

      {/* ── Stain Age chips ── */}
      <div>
        <label style={labelStyle}>Stain Age</label>
        <div className="flex flex-wrap gap-2">
          {(['fresh', 'aged', 'set', 'unknown'] as StainAge[]).map(age => (
            <button
              key={age}
              type="button"
              onClick={() => setStainAge(age)}
              style={stainAge === age ? chipActive : chipBase}
            >
              {age.charAt(0).toUpperCase() + age.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Garment Value chips ── */}
      <div>
        <label style={labelStyle}>Garment Value</label>
        <div className="flex flex-wrap gap-2">
          {([
            { value: 'low', label: 'Standard' },
            { value: 'medium', label: 'Mid-range' },
            { value: 'high', label: 'High' },
            { value: 'luxury', label: 'Luxury' },
          ] as { value: GarmentValue; label: string }[]).map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setGarmentValue(opt.value)}
              style={garmentValue === opt.value ? chipActive : chipBase}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Toggles row ── */}
      <div className="flex gap-4 flex-wrap">
        {/* Previously Treated */}
        <button
          type="button"
          onClick={() => setPreviousTreatment(v => !v)}
          className="flex items-center gap-2 text-sm font-medium"
          style={{ color: 'var(--text)', minHeight: '44px' }}
        >
          <div
            className="relative inline-flex items-center w-10 h-6 rounded-full transition-colors"
            style={{
              background: previousTreatment ? '#22c55e' : 'var(--border)',
            }}
          >
            <span
              className="absolute w-4 h-4 rounded-full bg-white shadow transition-transform"
              style={{
                transform: previousTreatment ? 'translateX(22px)' : 'translateX(3px)',
              }}
            />
          </div>
          Previously treated
        </button>

        {/* Pre-existing damage */}
        <button
          type="button"
          onClick={() => setPreExistingDamage(v => !v)}
          className="flex items-center gap-2 text-sm font-medium"
          style={{ color: 'var(--text)', minHeight: '44px' }}
        >
          <div
            className="relative inline-flex items-center w-10 h-6 rounded-full transition-colors"
            style={{
              background: preExistingDamage ? '#f59e0b' : 'var(--border)',
            }}
          >
            <span
              className="absolute w-4 h-4 rounded-full bg-white shadow transition-transform"
              style={{
                transform: preExistingDamage ? 'translateX(22px)' : 'translateX(3px)',
              }}
            />
          </div>
          Pre-existing damage
        </button>
      </div>

      {/* ── Photo capture ── */}
      <div>
        <label style={labelStyle}>Photo</label>
        {photoDataUrl ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoDataUrl}
              alt="Garment photo"
              className="rounded-xl object-cover"
              style={{ width: '120px', height: '120px', border: '1px solid var(--border)' }}
            />
            <button
              type="button"
              onClick={removePhoto}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: '#ef4444', color: '#fff' }}
              aria-label="Remove photo"
            >
              ×
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-xl text-sm font-medium transition-colors"
            style={{
              minHeight: '44px',
              padding: '10px 16px',
              border: '1.5px dashed var(--border)',
              background: 'var(--surface)',
              color: 'var(--text-secondary)',
              width: '100%',
              justifyContent: 'center',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            Add photo
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoChange}
          className="sr-only"
          aria-hidden="true"
        />
      </div>

      {/* ── Notes for Operator ── */}
      <div>
        <label style={labelStyle}>Notes for Operator</label>
        <textarea
          value={operatorNotes}
          onChange={e => setOperatorNotes(e.target.value)}
          placeholder="Anything the operator needs to know before analyzing"
          rows={3}
          style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
        />
      </div>

      {/* ── Error ── */}
      {error && (
        <div
          className="rounded-xl p-3 text-sm font-medium"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}
        >
          {error}
        </div>
      )}

      {/* ── Submit ── */}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl font-bold text-sm transition-opacity"
        style={{
          minHeight: '48px',
          background: loading ? 'var(--border)' : '#f59e0b',
          color: loading ? 'var(--text-secondary)' : '#000',
          opacity: loading ? 0.7 : 1,
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Submitting…' : 'Flag for Garment Analysis'}
      </button>
    </form>
  )
}
