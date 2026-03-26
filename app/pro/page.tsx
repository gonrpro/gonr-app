'use client'

import { useState } from 'react'
import TierGate from '@/components/ui/TierGate'
import GarmentAnalysis from '@/components/solve/GarmentAnalysis'
import { useUser } from '@/lib/hooks/useUser'
import { canAccessFeature } from '@/lib/auth/features'
import { useLanguage } from '@/lib/i18n/LanguageContext'

type ActiveTool = 'garment_analysis' | 'deep_solve' | 'handoff' | 'stain_brain' | null

export default function ProToolsPage() {
  const { t } = useLanguage()
  const { email, tier, loading } = useUser()
  const [showGate, setShowGate] = useState(false)
  const [activeTool, setActiveTool] = useState<ActiveTool>(null)

  const TOOLS: {
    id: ActiveTool & string
    feature: string
    icon: string
    titleKey: string
    descKey: string
    badgeKey: string
    badgeColor: string
    hoverBorder: string
  }[] = [
    {
      id: 'garment_analysis',
      feature: 'garment_analysis',
      icon: '🔍',
      titleKey: 'garmentAnalysis',
      descKey: 'garmentAnalysisDesc',
      badgeKey: 'operatorBadge',
      badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      hoverBorder: 'hover:border-amber-500/30',
    },
    {
      id: 'deep_solve',
      feature: 'deep_solve',
      icon: '🔬',
      titleKey: 'deepSolveTitle',
      descKey: 'deepSolveDesc',
      badgeKey: 'proBadge',
      badgeColor: 'bg-green-500/15 text-green-400 border-green-500/30',
      hoverBorder: 'hover:border-green-500/30',
    },
    {
      id: 'handoff',
      feature: 'handoff',
      icon: '💬',
      titleKey: 'customerHandoff',
      descKey: 'customerHandoffDesc',
      badgeKey: 'proBadge',
      badgeColor: 'bg-green-500/15 text-green-400 border-green-500/30',
      hoverBorder: 'hover:border-green-500/30',
    },
    {
      id: 'stain_brain',
      feature: 'deep_solve',
      icon: '🧠',
      titleKey: 'stainBrain',
      descKey: 'stainBrainDesc',
      badgeKey: 'proBadge',
      badgeColor: 'bg-green-500/15 text-green-400 border-green-500/30',
      hoverBorder: 'hover:border-green-500/30',
    },
  ]

  function handleToolClick(tool: typeof TOOLS[number]) {
    if (canAccessFeature(tier, tool.feature)) {
      setActiveTool(prev => prev === tool.id ? null : tool.id)
    } else {
      setShowGate(true)
    }
  }

  if (activeTool === 'garment_analysis') {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setActiveTool(null)}
          className="flex items-center gap-2 text-xs font-mono font-bold px-3 py-1.5 rounded-lg
            border border-white/10 hover:border-amber-500/30 transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          {t('backUpper')}
        </button>
        <GarmentAnalysis />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{t('proTools')}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {t('proToolsSubtitle')}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <span className="w-5 h-5 border-2 border-white/20 border-t-green-500 rounded-full animate-spin" />
        </div>
      ) : (
        TOOLS.map(tool => {
          const hasAccess = canAccessFeature(tier, tool.feature)
          return (
            <button
              key={tool.id}
              onClick={() => handleToolClick(tool)}
              className={`card w-full text-left space-y-2 transition-colors ${tool.hoverBorder}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{tool.icon}</span>
                <h2 className="text-base font-bold">{t(tool.titleKey)}</h2>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${tool.badgeColor}`}>
                  {t(tool.badgeKey)}
                </span>
                {!hasAccess && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md
                    bg-white/5 text-gray-500 border border-white/10 ml-auto">
                    🔒
                  </span>
                )}
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {t(tool.descKey)}
              </p>
            </button>
          )
        })
      )}

      <TierGate isOpen={showGate} onClose={() => setShowGate(false)} email={email || undefined} />
    </div>
  )
}
