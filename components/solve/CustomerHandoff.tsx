'use client'

// CustomerHandoff.tsx
// Standalone component — inserted into ResultCard by Atlas.
// DO NOT import or reference ResultCard from here.

import { useLanguage } from '@/lib/i18n/LanguageContext'

interface HandoffData {
  canTreat: 'yes' | 'likely' | 'high-risk'
  customerScript: string
  intakeNotes: {
    stainType: string
    fiber: string
    treatment: string
    risk: string
    location?: string
  }
  watchFor: string[]
}

interface CustomerHandoffProps {
  handoff: HandoffData
}

export default function CustomerHandoff({ handoff }: CustomerHandoffProps) {
  const { t } = useLanguage()

  const canTreatConfig = {
    yes: { icon: '✅', label: t('canTreatYes'), color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)' },
    likely: { icon: '⚠️', label: t('canTreatLikely'), color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' },
    'high-risk': { icon: '🔴', label: t('canTreatHighRisk'), color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)' },
  }

  const cfg = canTreatConfig[handoff.canTreat] || canTreatConfig['likely']

  return (
    <div className="space-y-3">
      {/* Can We Treat This? */}
      <div style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: '10px',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <span style={{ fontSize: '18px' }}>{cfg.icon}</span>
        <span style={{ fontWeight: 700, fontSize: '14px', color: cfg.color }}>{cfg.label}</span>
      </div>

      {/* Customer Script */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
          {t('whatToSayLabel')}
        </p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text)', fontStyle: 'italic' }}>
          "{handoff.customerScript}"
        </p>
      </div>

      {/* Intake Notes */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
          {t('ticketNotesLabel')}
        </p>
        <div className="space-y-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <p><span style={{ fontWeight: 600, color: 'var(--text)' }}>{t('stainLabel')}:</span> {handoff.intakeNotes.stainType}</p>
          <p><span style={{ fontWeight: 600, color: 'var(--text)' }}>{t('fiberLabel')}:</span> {handoff.intakeNotes.fiber}</p>
          <p><span style={{ fontWeight: 600, color: 'var(--text)' }}>{t('treatmentLabel')}:</span> {handoff.intakeNotes.treatment}</p>
          <p><span style={{ fontWeight: 600, color: 'var(--text)' }}>{t('riskLabel')}:</span> {handoff.intakeNotes.risk}</p>
          {handoff.intakeNotes.location && (
            <p><span style={{ fontWeight: 600, color: 'var(--text)' }}>{t('locationLabel')}:</span> {handoff.intakeNotes.location}</p>
          )}
        </div>
      </div>

      {/* Watch For */}
      {handoff.watchFor && handoff.watchFor.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
            {t('spotterWatchFor')}
          </p>
          <ul className="space-y-1">
            {handoff.watchFor.map((tip, i) => (
              <li key={i} className="text-sm flex gap-2 items-start" style={{ color: 'var(--text-secondary)' }}>
                <span style={{ color: '#f59e0b', flexShrink: 0 }}>→</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
