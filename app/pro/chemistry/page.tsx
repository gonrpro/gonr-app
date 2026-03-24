'use client'

import { useState, useEffect } from 'react'

interface ChemistryCard {
  id: string
  family: string
  icon: string
  color: string
  overview: {
    summary: string
    molecularStructure?: string
    whyItMatters?: string
  }
  keyAgents?: {
    primary?: { name: string; action: string }[]
    secondary?: { name: string; action: string }[]
    avoid?: { name: string; reason: string }[]
  }
  fiberInteractions?: {
    fiber: string
    risk: string
    notes: string
  }[]
  timeFactor?: {
    fresh?: string
    aged?: string
    heatSet?: string
  }
  commonMistakes?: string[]
  dansTips?: string[]
}

const FAMILY_FILES = [
  'tannin', 'protein', 'oil', 'dye', 'combination',
  'mineral', 'mildew', 'odor', 'resin', 'particulate',
  'chemical-damage', 'maintenance'
]

export default function ChemistryPage() {
  const [cards, setCards] = useState<ChemistryCard[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const loaded: ChemistryCard[] = []
      for (const id of FAMILY_FILES) {
        try {
          const res = await fetch(`/data/chemistry/${id}.json`)
          if (res.ok) {
            const data = await res.json()
            loaded.push(data)
          }
        } catch {}
      }
      setCards(loaded)
      setLoading(false)
    }
    load()
  }, [])

  const active = cards.find(c => c.id === selected)

  return (
    <div className="space-y-4 pb-8">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Chemistry Cards</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Stain family chemistry — how each family bonds, what breaks it, what makes it permanent.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <span className="w-5 h-5 border-2 border-white/20 border-t-green-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Family chips */}
          <div className="flex flex-wrap gap-2">
            {cards.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelected(selected === c.id ? null : c.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: selected === c.id ? `${c.color}20` : 'var(--surface)',
                  border: `1.5px solid ${selected === c.id ? c.color : 'var(--border-strong)'}`,
                  color: selected === c.id ? c.color : 'var(--text)',
                }}
              >
                <span>{c.icon}</span>
                <span>{c.family}</span>
              </button>
            ))}
          </div>

          {/* Detail card */}
          {active && (
            <div className="rounded-xl p-4 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)' }}>
              {/* Header */}
              <div className="flex items-center gap-3">
                <span className="text-3xl">{active.icon}</span>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: active.color }}>{active.family} Family</h2>
                </div>
              </div>

              {/* Summary */}
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
                {typeof active.overview === 'string' ? active.overview : active.overview?.summary}
              </p>

              {/* Molecular structure */}
              {typeof active.overview !== 'string' && active.overview?.molecularStructure && (
                <div className="rounded-lg p-3" style={{ background: 'var(--surface-2)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>Molecular Structure</p>
                  <p className="text-sm" style={{ color: 'var(--text)' }}>{active.overview.molecularStructure}</p>
                </div>
              )}

              {/* Time factor */}
              {active.timeFactor && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Time Factor</p>
                  <div className="grid grid-cols-3 gap-2">
                    {active.timeFactor.fresh && (
                      <div className="rounded-lg p-2" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                        <p className="text-xs font-semibold" style={{ color: '#22c55e' }}>Fresh</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text)' }}>{active.timeFactor.fresh}</p>
                      </div>
                    )}
                    {active.timeFactor.aged && (
                      <div className="rounded-lg p-2" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                        <p className="text-xs font-semibold" style={{ color: '#f59e0b' }}>Aged</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text)' }}>{active.timeFactor.aged}</p>
                      </div>
                    )}
                    {active.timeFactor.heatSet && (
                      <div className="rounded-lg p-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <p className="text-xs font-semibold" style={{ color: '#ef4444' }}>Heat Set</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text)' }}>{active.timeFactor.heatSet}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Key agents */}
              {active.keyAgents && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Key Agents</p>
                  {active.keyAgents.primary && active.keyAgents.primary.length > 0 && (
                    <div className="space-y-1.5 mb-2">
                      {active.keyAgents.primary.map((a, i) => (
                        <div key={i} className="flex gap-2">
                          <span className="text-xs font-semibold" style={{ color: active.color, minWidth: 80 }}>{a.name}</span>
                          <span className="text-xs" style={{ color: 'var(--text)' }}>{a.action}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {active.keyAgents.avoid && active.keyAgents.avoid.length > 0 && (
                    <div className="rounded-lg p-3 mt-2" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <p className="text-xs font-semibold mb-1" style={{ color: '#ef4444' }}>Never Use</p>
                      {active.keyAgents.avoid.map((a, i) => (
                        <p key={i} className="text-xs" style={{ color: 'var(--text)' }}>• {a.name} — {a.reason}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Common mistakes */}
              {active.commonMistakes && active.commonMistakes.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#ef4444' }}>Common Mistakes</p>
                  <div className="space-y-1">
                    {active.commonMistakes.map((m, i) => (
                      <p key={i} className="text-xs" style={{ color: 'var(--text)' }}>• {typeof m === 'string' ? m : JSON.stringify(m)}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Dan's tips */}
              {active.dansTips && active.dansTips.length > 0 && (
                <div className="rounded-lg p-3" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--accent)' }}>💡 Dan's Tips</p>
                  <div className="space-y-1">
                    {active.dansTips.map((t, i) => (
                      <p key={i} className="text-sm" style={{ color: 'var(--text)' }}>• {typeof t === 'string' ? t : JSON.stringify(t)}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!selected && (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-secondary)' }}>
              Tap a stain family to see chemistry details
            </p>
          )}
        </>
      )}
    </div>
  )
}
