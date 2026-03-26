'use client'

import Link from 'next/link'
import { useState } from 'react'
import GarmentAnalysis from '@/components/solve/GarmentAnalysis'
import HandoffModule from '@/components/solve/HandoffModule'
import DeepSolveModule from '@/components/solve/DeepSolveModule'

type ActiveTool = 'garment' | 'handoff' | 'deep_solve' | null

const OPERATOR_TOOLS = [
  {
    id: 'garment',
    icon: '🔍',
    title: 'Garment Analysis',
    description: 'Photo of damage → AI root cause + repair protocol + customer handoff.',
    border: 'hover:border-amber-500/30',
    badge: { label: 'OPERATOR', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  },
  {
    id: 'handoff',
    icon: '💬',
    title: 'Customer Handoff',
    description: 'Generate professional customer-facing messages for intake, release, and tough stains.',
    border: 'hover:border-green-500/30',
    badge: null,
  },
  {
    id: 'deep_solve',
    icon: '🔬',
    title: 'Deep Solve',
    description: 'AI-powered deep analysis for complex or multi-layered stains.',
    border: 'hover:border-green-500/30',
    badge: null,
  },
]

export default function OperatorPage() {
  const [activeTool, setActiveTool] = useState<ActiveTool>(null)

  if (activeTool === 'garment') {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setActiveTool(null)}
          className="flex items-center gap-2 text-xs font-mono font-bold px-3 py-1.5 rounded-lg border border-white/10 hover:border-amber-500/30 transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          ← BACK
        </button>
        <GarmentAnalysis />
      </div>
    )
  }

  if (activeTool === 'handoff') {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setActiveTool(null)}
          className="flex items-center gap-2 text-xs font-mono font-bold px-3 py-1.5 rounded-lg border border-white/10 hover:border-green-500/30 transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          ← BACK
        </button>
        <HandoffModule stain="" surface="" />
      </div>
    )
  }

  if (activeTool === 'deep_solve') {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setActiveTool(null)}
          className="flex items-center gap-2 text-xs font-mono font-bold px-3 py-1.5 rounded-lg border border-white/10 hover:border-green-500/30 transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          ← BACK
        </button>
        <DeepSolveModule />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Operator</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Advanced tools for shop owners and production managers.
        </p>
      </div>

      {OPERATOR_TOOLS.map(tool => (
        <button
          key={tool.id}
          onClick={() => setActiveTool(tool.id as ActiveTool)}
          className={`card w-full text-left space-y-2 transition-colors ${tool.border}`}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{tool.icon}</span>
            <h2 className="text-base font-bold">{tool.title}</h2>
            {tool.badge && (
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${tool.badge.color}`}>
                {tool.badge.label}
              </span>
            )}
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{tool.description}</p>
        </button>
      ))}
    </div>
  )
}
