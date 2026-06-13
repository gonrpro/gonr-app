'use client'

// TASK-247 — client island for the chemistry cards page. The family corpus is
// NOT fetched from static-public /data/chemistry/*.json anymore: the server
// page imports data/chemistry/ and passes cards as props, so the corpus rides
// only in this route's proxy-gated RSC payload. public/data/chemistry/ was
// deleted in the same change.

import { useState } from 'react'

// The family JSONs are hand-authored and shape-drifted (keyAgents is an array
// in some files, {primary, avoid} in others; mistakes/tips mix strings and
// objects), so every field is optional and the getters normalize.
interface KeyAgentEntry {
  agent?: string
  name?: string
  mechanism?: string
  action?: string
  use?: string
  reason?: string
}
type KeyAgents = KeyAgentEntry[] | { primary?: KeyAgentEntry[]; avoid?: KeyAgentEntry[] }
type MistakeEntry = string | { mistake?: string; title?: string; whyItFails?: string; why?: string; instead?: string; fix?: string }
type TipEntry = string | { tip?: string; text?: string; summary?: string }

export interface ChemistryCard {
  id: string
  icon?: string
  family?: string
  overview?: string | { summary?: string; molecularStructure?: string }
  timeFactor?: Record<string, string | undefined>
  keyAgents?: KeyAgents
  commonMistakes?: MistakeEntry[]
  dansTips?: TipEntry[]
}

function getAgents(keyAgents: KeyAgents | undefined): { name: string; action: string }[] {
  if (!keyAgents) return []
  if (Array.isArray(keyAgents)) {
    return keyAgents.map(a => ({
      name: a.agent || a.name || '',
      action: a.mechanism || a.action || a.use || '',
    })).filter(a => a.name)
  }
  if (keyAgents.primary) {
    return keyAgents.primary.map(a => ({
      name: a.name || a.agent || '',
      action: a.action || a.mechanism || '',
    }))
  }
  return []
}

function getAvoid(keyAgents: KeyAgents | undefined): { name: string; reason: string }[] {
  if (!keyAgents || Array.isArray(keyAgents)) return []
  return (keyAgents.avoid || []).map(a => ({
    name: a.name || a.agent || '',
    reason: a.reason || '',
  }))
}

function getMistakes(mistakes: MistakeEntry[]): { mistake: string; why: string; instead: string }[] {
  if (!mistakes) return []
  return mistakes.map(m => {
    if (typeof m === 'string') return { mistake: m, why: '', instead: '' }
    return {
      mistake: m.mistake || m.title || '',
      why: m.whyItFails || m.why || '',
      instead: m.instead || m.fix || '',
    }
  }).filter(m => m.mistake)
}

function getTips(tips: TipEntry[]): string[] {
  if (!tips) return []
  return tips.map(t => typeof t === 'string' ? t : (t.tip || t.text || t.summary || '')).filter(Boolean)
}

export default function ChemistryClient({ cards }: { cards: ChemistryCard[] }) {
  const [selected, setSelected] = useState<string | null>(null)

  const active = cards.find(c => c.id === selected)

  return (
    <div className="space-y-4 pb-8">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Chemistry Cards</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Stain family chemistry — how each family bonds, what breaks it, what makes it permanent.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {cards.map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelected(selected === c.id ? null : c.id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: selected === c.id ? 'rgba(var(--brand-green-rgb), 0.12)' : 'var(--surface)',
              border: `1.5px solid ${selected === c.id ? 'var(--accent)' : 'var(--border-strong)'}`,
              color: selected === c.id ? 'var(--accent)' : 'var(--text)',
            }}
          >
            <span>{c.icon}</span>
            <span>{c.family}</span>
          </button>
        ))}
      </div>

      {active && (() => {
        const summary = typeof active.overview === 'string' ? active.overview : active.overview?.summary
        const molecular = typeof active.overview === 'object' ? active.overview?.molecularStructure : null
        const timeFactor = active.timeFactor
        const agents = getAgents(active.keyAgents)
        const avoid = getAvoid(active.keyAgents)
        const mistakes = getMistakes(active.commonMistakes || [])
        const tips = getTips(active.dansTips || [])

        return (
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)' }}>
            {/* Header */}
            <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{active.icon}</span>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>{active.family} Family</h2>
                </div>
              </div>
            </div>

            <div className="px-4 py-4 space-y-4">
              {/* Summary */}
              {summary && <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{summary}</p>}

              {/* Molecular */}
              {molecular && (
                <div className="rounded-xl p-3" style={{ background: 'var(--surface-2)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>Molecular Structure</p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{molecular}</p>
                </div>
              )}

              {/* Time factor */}
              {timeFactor && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Time Factor</p>
                  <div className="flex flex-col gap-2">
                    {[
                      { key: 'fresh', label: 'Fresh', color: 'var(--accent)', bg: 'rgba(var(--brand-green-rgb), 0.08)', border: 'rgba(var(--brand-green-rgb), 0.2)' },
                      { key: 'aged', label: 'Aged', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
                      { key: 'heatSet', label: 'Heat Set', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
                    ].map(({ key, label, color, bg, border }) => timeFactor[key] ? (
                      <div key={key} className="rounded-lg px-3 py-2 flex gap-2 items-baseline" style={{ background: bg, border: `1px solid ${border}` }}>
                        <p className="text-[11px] font-bold shrink-0 w-14" style={{ color }}>{label}</p>
                        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text)' }}>{timeFactor[key]}</p>
                      </div>
                    ) : null)}
                  </div>
                </div>
              )}

              {/* Key agents */}
              {agents.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Key Agents</p>
                  <div className="space-y-3">
                    {agents.map((a, i) => (
                      <div key={i} className="rounded-xl p-3" style={{ background: 'var(--surface-2)' }}>
                        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--accent)' }}>{a.name}</p>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{a.action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Never use */}
              {avoid.length > 0 && (
                <div className="rounded-xl p-3" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#ef4444' }}>⚠️ Never Use</p>
                  {avoid.map((a, i) => (
                    <p key={i} className="text-sm mb-1" style={{ color: 'var(--text)' }}>• <span className="font-semibold">{a.name}</span>{a.reason ? ` — ${a.reason}` : ''}</p>
                  ))}
                </div>
              )}

              {/* Common mistakes */}
              {mistakes.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#ef4444' }}>⚠️ Common Mistakes</p>
                  <div className="space-y-2">
                    {mistakes.map((m, i) => (
                      <div key={i} className="rounded-xl p-3" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
                        <p className="text-sm font-semibold" style={{ color: '#ef4444' }}>✗ {m.mistake}</p>
                        {m.why && <p className="text-xs mt-1" style={{ color: 'var(--text)' }}>{m.why}</p>}
                        {m.instead && <p className="text-xs font-medium mt-1" style={{ color: 'var(--accent)' }}>→ {m.instead}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dan's tips */}
              {tips.length > 0 && (
                <div className="rounded-xl p-3" style={{ background: 'rgba(var(--brand-green-rgb), 0.06)', border: '1px solid rgba(var(--brand-green-rgb), 0.2)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--accent)' }}>💡 Dan&apos;s Tips</p>
                  <div className="space-y-2">
                    {tips.map((t, i) => (
                      <p key={i} className="text-sm" style={{ color: 'var(--text)' }}>• {t}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {!selected && (
        <p className="text-sm text-center py-4" style={{ color: 'var(--text-secondary)' }}>Tap a stain family to see chemistry details</p>
      )}
    </div>
  )
}
