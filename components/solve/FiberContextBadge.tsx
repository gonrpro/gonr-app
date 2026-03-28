'use client'

import { useLanguage } from '@/lib/i18n/LanguageContext'

interface FiberContextBadgeProps {
  fiber: string
  careSymbols: string[]
  warnings: string[]
}

const CARE_SYMBOL_KEYS: Record<string, string> = {
  'dry-clean-only': 'dryCleanOnly',
  'no-bleach': 'noBleach',
  'no-heat': 'noHeat',
  'hand-wash-only': 'handWashOnly',
  'do-not-wash': 'doNotWash',
  'no-iron': 'noIron',
}

export default function FiberContextBadge({ fiber, careSymbols, warnings }: FiberContextBadgeProps) {
  const { t } = useLanguage()

  if (!fiber) return null

  return (
    <div
      style={{
        background: 'rgba(56,189,248,0.06)',
        border: '1px solid rgba(56,189,248,0.2)',
        borderRadius: '10px',
        padding: '10px 12px',
      }}
    >
      {/* Fiber line */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(56,189,248,0.7)' }}>
          {t('fiberIdentified')}
        </span>
        <span className="text-xs font-bold" style={{ color: 'var(--text)' }}>
          {fiber}
        </span>
      </div>

      {/* Care symbol chips */}
      {careSymbols.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
          {careSymbols.map((symbol) => {
            const key = CARE_SYMBOL_KEYS[symbol]
            const label = key ? t(key) : symbol.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
            return (
              <span
                key={symbol}
                className="text-[10px] font-medium px-2 py-0.5 rounded-md"
                style={{
                  background: 'rgba(56,189,248,0.08)',
                  border: '1px solid rgba(56,189,248,0.15)',
                  color: 'var(--text-secondary)',
                }}
              >
                {label}
              </span>
            )
          })}
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="mt-1.5">
          {warnings.map((warning, i) => (
            <p
              key={i}
              className="text-[10px]"
              style={{ color: 'var(--text-secondary)' }}
            >
              {warning}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
