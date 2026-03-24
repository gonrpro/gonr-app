'use client'

import { useState } from 'react'
import Link from 'next/link'
import TierGate from '@/components/ui/TierGate'
import GarmentAnalysis from '@/components/solve/GarmentAnalysis'
import { useUser } from '@/lib/hooks/useUser'
import { canAccessFeature } from '@/lib/auth/features'

type ActiveTool = 'garment_analysis' | 'deep_solve' | 'handoff' | 'stain_brain' | 'chemicals' | 'chemistry' | null

const TOOLS: {
  id: ActiveTool & string
  feature: string
  icon: string
  title: string
  description: string
  badge: string
  badgeColor: string
  hoverBorder: string
}[] = [
  {
    id: 'garment_analysis',
    feature: 'garment_analysis',
    icon: '🔍',
    title: 'Garment Analysis',
    description: 'Photo of damage → AI reasoning → root cause + repair protocol + customer handoff.',
    badge: 'OPERATOR',
    badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    hoverBorder: 'hover:border-amber-500/30',
  },
  {
    id: 'deep_solve',
    feature: 'deep_solve',
    icon: '🔬',
    title: 'Deep Solve',
    description: 'AI-powered deep analysis of complex or multi-layered stains.',
    badge: 'PRO',
    badgeColor: 'bg-green-500/15 text-green-400 border-green-500/30',
    hoverBorder: 'hover:border-green-500/30',
  },
  {
    id: 'handoff',
    feature: 'handoff',
    icon: '💬',
    title: 'Customer Handoff',
    description: 'Generate professional customer-facing messages for intake, release, and tough stains.',
    badge: 'PRO',
    badgeColor: 'bg-green-500/15 text-green-400 border-green-500/30',
    hoverBorder: 'hover:border-green-500/30',
  },
  {
    id: 'stain_brain',
    feature: 'deep_solve',
    icon: '🧠',
    title: 'Stain Brain',
    description: 'Chat with GONR\u2019s AI about any stain scenario. Ask anything.',
    badge: 'PRO',
    badgeColor: 'bg-green-500/15 text-green-400 border-green-500/30',
    hoverBorder: 'hover:border-green-500/30',
  },
  {
    id: 'chemicals',
    feature: 'spotter',
    icon: '🧪',
    title: 'Chemical Reference',
    description: 'Every spotting agent — what it does, when to use it, what fibers it damages, never-combine rules.',
    badge: 'SPOTTER',
    badgeColor: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    hoverBorder: 'hover:border-blue-500/30',
  },
  {
    id: 'chemistry',
    feature: 'spotter',
    icon: '⚗️',
    title: 'Chemistry Cards',
    description: 'Stain family chemistry — how each family bonds to fiber, what breaks it, what makes it permanent.',
    badge: 'SPOTTER',
    badgeColor: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    hoverBorder: 'hover:border-blue-500/30',
  },
]

export default function ProToolsPage() {
  const { email, tier, loading } = useUser()
  const [showGate, setShowGate] = useState(false)
  const [activeTool, setActiveTool] = useState<ActiveTool>(null)

  function handleToolClick(tool: typeof TOOLS[number]) {
    // If user has access, expand the tool
    if (canAccessFeature(tier, tool.feature)) {
      setActiveTool(prev => prev === tool.id ? null : tool.id)
    } else {
      // Show paywall
      setShowGate(true)
    }
  }

  // When a tool is active, show only that tool
  if (activeTool === 'garment_analysis') {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setActiveTool(null)}
          className="flex items-center gap-2 text-xs font-mono font-bold px-3 py-1.5 rounded-lg
            border border-white/10 hover:border-amber-500/30 transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          ← BACK
        </button>
        <GarmentAnalysis />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Pro Tools</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Advanced features for professional cleaners.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <span className="w-5 h-5 border-2 border-white/20 border-t-green-500 rounded-full animate-spin" />
        </div>
      ) : (
        TOOLS.map(tool => {
          const hasAccess = canAccessFeature(tier, tool.feature)
          // Tools that navigate to their own page
          if (tool.id === 'chemicals' || tool.id === 'chemistry') {
            return (
              <Link key={tool.id} href={`/pro/${tool.id}`} className={`card w-full text-left space-y-2 transition-colors ${tool.hoverBorder} block`}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{tool.icon}</span>
                  <h2 className="text-base font-bold">{tool.title}</h2>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${tool.badgeColor}`}>{tool.badge}</span>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{tool.description}</p>
              </Link>
            )
          }

          return (
            <button
              key={tool.id}
              onClick={() => handleToolClick(tool)}
              className={`card w-full text-left space-y-2 transition-colors ${tool.hoverBorder}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{tool.icon}</span>
                <h2 className="text-base font-bold">{tool.title}</h2>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${tool.badgeColor}`}>
                  {tool.badge}
                </span>
                {!hasAccess && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md
                    bg-white/5 text-gray-500 border border-white/10 ml-auto">
                    🔒
                  </span>
                )}
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {tool.description}
              </p>
            </button>
          )
        })
      )}

      <TierGate isOpen={showGate} onClose={() => setShowGate(false)} email={email || undefined} />
    </div>
  )
}
